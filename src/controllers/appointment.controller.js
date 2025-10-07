const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');

const formatDateTime = (date, time) => {
  const appointmentDate = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  appointmentDate.setHours(hours);
  appointmentDate.setMinutes(minutes);
  appointmentDate.setSeconds(0, 0);
  return appointmentDate;
};

const notifyDoctor = async (doctorId, title, message, data, type = 'APPOINTMENT_CREATED') => {
  await notificationService.createNotification(
    {
      recipientId: doctorId,
      recipientType: 'EMPLOYEE',
      type,
      title,
      message,
      data,
      channel: 'IN_APP'
    },
    { deferSend: false }
  );
};

const schedulePatientReminder = async (patient, appointment, appointmentDateTime) => {
  if (!patient.phone) {
    return;
  }

  const reminderTrigger = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);

  const notification = await notificationService.createNotification(
    {
      recipientId: patient.id,
      recipientType: 'PATIENT',
      type: 'APPOINTMENT_REMINDER',
      title: 'Appointment Reminder',
      message: `Dear ${patient.fullName}, you have an appointment on ${appointmentDateTime.toLocaleString()}.`,
      data: {
        phone: patient.phone,
        appointmentId: appointment.id,
        patientId: patient.id
      },
      channel: 'SMS'
    },
    { deferSend: true }
  );

  const delay = reminderTrigger.getTime() - Date.now();
  const safeDelay = delay > 0 ? delay : 0;
  await notificationService.scheduleNotification(notification.id, 'SMS', safeDelay);
};

const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, department, date, time, notes } = req.body;

  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.employee.findUnique({ where: { id: doctorId } })
  ]);

  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  if (!doctor || doctor.role !== 'DOCTOR') {
    return res.status(400).json({ message: 'Doctor not found or invalid role' });
  }

  const appointmentDateTime = formatDateTime(date, time);

  const existing = await prisma.appointment.findFirst({
    where: {
      doctorId,
      date: new Date(date),
      time
    }
  });

  if (existing) {
    return res.status(409).json({ message: 'Doctor already has an appointment at that time' });
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      doctorId,
      department,
      date: new Date(date),
      time,
      notes
    },
    include: {
      patient: true,
      doctor: true
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Appointment',
    entityId: appointment.id,
    changes: { new: appointment },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  await notifyDoctor(
    doctorId,
    'New Appointment Scheduled',
    `You have a new appointment with ${patient.fullName} on ${appointmentDateTime.toLocaleString()}.`,
    { appointmentId: appointment.id, patientId },
    'APPOINTMENT_CREATED'
  );

  await schedulePatientReminder(patient, appointment, appointmentDateTime);

  res.status(201).json({ data: appointment });
});

const listAppointments = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const filters = {};
  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.doctorId) {
    filters.doctorId = req.query.doctorId;
  }
  if (req.query.patientId) {
    filters.patientId = req.query.patientId;
  }
  if (req.query.date) {
    filters.date = new Date(req.query.date);
  }

  const [data, total] = await Promise.all([
    prisma.appointment.findMany({
      where: filters,
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
      include: {
        patient: true,
        doctor: true,
        billing: true
      }
    }),
    prisma.appointment.count({ where: filters })
  ]);

  res.json({
    data,
    pagination: {
      page,
      pageSize,
      total
    }
  });
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      doctor: true,
      billing: true,
      prescriptions: true
    }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'VIEW',
    entityType: 'Appointment',
    entityId: appointment.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ data: appointment });
});

const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      doctor: true
    }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  const updateData = { ...req.body };
  if (req.body.date) {
    updateData.date = new Date(req.body.date);
  }

  if (req.body.time && (req.body.doctorId || req.body.date)) {
    const doctorId = req.body.doctorId || appointment.doctorId;
    const dateValue = req.body.date ? new Date(req.body.date) : appointment.date;

    const conflict = await prisma.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        doctorId,
        date: dateValue,
        time: req.body.time
      }
    });

    if (conflict) {
      return res.status(409).json({ message: 'Doctor already has an appointment at that time' });
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: updateData,
    include: {
      patient: true,
      doctor: true
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Appointment',
    entityId: appointment.id,
    changes: {
      old: appointment,
      new: updated
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  const appointmentDateTime = formatDateTime(updated.date, updated.time);
  await notifyDoctor(
    updated.doctorId,
    'Appointment Updated',
    `Appointment with ${updated.patient.fullName} updated to ${appointmentDateTime.toLocaleString()}.`,
    { appointmentId: updated.id, patientId: updated.patientId },
    'APPOINTMENT_CREATED'
  );

  res.json({ data: updated });
});

const notifyAccountantsOnCompletion = async (appointment) => {
  const accountants = await prisma.employee.findMany({ where: { role: 'ACCOUNTANT' } });
  await Promise.all(
    accountants.map((accountant) =>
      notificationService.createNotification(
        {
          recipientId: accountant.id,
          recipientType: 'EMPLOYEE',
          type: 'PAYMENT_CONFIRMATION',
          title: 'Appointment Completed',
          message: `Appointment ${appointment.id} for patient ${appointment.patient.fullName} is completed and awaits billing.`,
          data: { appointmentId: appointment.id, patientId: appointment.patientId },
          channel: 'IN_APP'
        },
        { deferSend: false }
      )
    )
  );
};

const handleAutoBilling = async (appointment) => {
  if (appointment.billing) {
    return appointment.billing;
  }

  return prisma.billing.create({
    data: {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      paymentMode: 'CASH',
      totalAmount: 0,
      paidAmount: 0,
      outstandingBalance: 0,
      status: 'DRAFT'
    }
  });
};

const handleStatusNotifications = async (appointment, status) => {
  if (status === 'COMPLETED') {
    await notifyAccountantsOnCompletion(appointment);
  }

  if (status === 'CANCELLED') {
    const { patient, doctor } = appointment;
    if (patient?.phone) {
      const cancellationNotification = await notificationService.createNotification(
        {
          recipientId: patient.id,
          recipientType: 'PATIENT',
          type: 'APPOINTMENT_CANCELLED',
          title: 'Appointment Cancelled',
          message: `Your appointment scheduled for ${appointment.date.toLocaleDateString()} at ${appointment.time} has been cancelled.`,
          data: {
            phone: patient.phone,
            appointmentId: appointment.id
          },
          channel: 'SMS'
        },
        { deferSend: true }
      );

      await notificationService.scheduleNotification(cancellationNotification.id, 'SMS', 0);
    }

    await notifyDoctor(
      doctor.id,
      'Appointment Cancelled',
      `Appointment with ${patient.fullName} on ${appointment.date.toLocaleDateString()} at ${appointment.time} was cancelled.`,
      { appointmentId: appointment.id, patientId: appointment.patientId },
      'APPOINTMENT_CANCELLED'
    );
  }
};

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      doctor: true,
      billing: true
    }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status,
      notes: notes || appointment.notes
    },
    include: {
      patient: true,
      doctor: true,
      billing: true
    }
  });

  if (status === 'COMPLETED') {
    await handleAutoBilling(updated);
  }

  await handleStatusNotifications(updated, status);

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Appointment',
    entityId: updated.id,
    changes: {
      old: appointment,
      new: updated
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ data: updated });
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      doctor: true
    }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  await handleStatusNotifications(appointment, 'CANCELLED');

  await prisma.appointment.delete({ where: { id: appointment.id } });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'DELETE',
    entityType: 'Appointment',
    entityId: appointment.id,
    changes: { old: appointment },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(204).send();
});

module.exports = {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment
};
