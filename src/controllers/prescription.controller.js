const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const inventoryService = require('../services/inventory.service');

const createPrescription = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, doctorId, notes, items } = req.body;

  const [patient, doctor, appointment] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.employee.findUnique({ where: { id: doctorId } }),
    appointmentId ? prisma.appointment.findUnique({ where: { id: appointmentId } }) : Promise.resolve(null)
  ]);

  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  if (!doctor || doctor.role !== 'DOCTOR') {
    return res.status(400).json({ message: 'Doctor not found or invalid role' });
  }

  if (appointmentId && !appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  if (appointment && appointment.patientId !== patientId) {
    return res.status(400).json({ message: 'Appointment does not belong to the specified patient' });
  }

  const prescription = await prisma.prescription.create({
    data: {
      patientId,
      appointmentId,
      doctorId,
      notes,
      items: {
        create: items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        }))
      }
    },
    include: {
      items: true,
      patient: true,
      doctor: true
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Prescription',
    entityId: prescription.id,
    changes: { new: prescription },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  const pharmacists = await prisma.employee.findMany({ where: { role: 'PHARMACIST' } });

  await Promise.all(
    pharmacists.map((pharmacist) =>
      notificationService
        .createNotification(
          {
            recipientId: pharmacist.id,
            recipientType: 'EMPLOYEE',
            type: 'PRESCRIPTION_READY',
            title: 'Prescription Ready for Dispensing',
            message: `New prescription for patient ${patient.fullName} requires dispensing.`,
            data: {
              prescriptionId: prescription.id,
              patientId
            },
            channel: 'IN_APP'
          },
          { deferSend: false }
        )
        .catch((error) => console.error('Failed to notify pharmacist', error))
    )
  );

  if (patient.phone) {
    const smsNotification = await notificationService.createNotification(
      {
        recipientId: patient.id,
        recipientType: 'PATIENT',
        type: 'PRESCRIPTION_READY',
        title: 'Prescription Ready',
        message: `Your prescription from Dr. ${doctor.fullName} is ready for pickup at the pharmacy.`,
        data: {
          phone: patient.phone,
          prescriptionId: prescription.id
        },
        channel: 'SMS'
      },
      { deferSend: true }
    );

    await notificationService.scheduleNotification(smsNotification.id, 'SMS', 0);
  }

  await notificationService.createNotification(
    {
      recipientId: patient.id,
      recipientType: 'PATIENT',
      type: 'PRESCRIPTION_READY',
      title: 'Prescription Created',
      message: `Prescription ${prescription.id} has been created and will be ready soon.`,
      data: {
        prescriptionId: prescription.id
      },
      channel: 'IN_APP'
    },
    { deferSend: false }
  );

  res.status(201).json({ data: prescription });
});

const listPrescriptions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const filters = {};
  if (req.query.patientId) {
    filters.patientId = req.query.patientId;
  }
  if (req.query.doctorId) {
    filters.doctorId = req.query.doctorId;
  }
  if (req.query.dispensed !== undefined) {
    filters.dispensed = req.query.dispensed === 'true';
  }

  const [data, total] = await Promise.all([
    prisma.prescription.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        items: true,
        patient: true,
        doctor: true
      }
    }),
    prisma.prescription.count({ where: filters })
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

const getPrescription = asyncHandler(async (req, res) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id: req.params.id },
    include: {
      items: {
        include: {
          item: true
        }
      },
      patient: true,
      doctor: true
    }
  });

  if (!prescription) {
    return res.status(404).json({ message: 'Prescription not found' });
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'VIEW',
    entityType: 'Prescription',
    entityId: prescription.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ data: prescription });
});

const dispensePrescription = asyncHandler(async (req, res) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      patient: true
    }
  });

  if (!prescription) {
    return res.status(404).json({ message: 'Prescription not found' });
  }

  if (prescription.dispensed) {
    return res.status(400).json({ message: 'Prescription already dispensed' });
  }

  const reference = `Prescription:${prescription.id}`;

  let result;

  try {
    result = await prisma.$transaction(async (tx) => {
      for (const item of prescription.items) {
        await inventoryService.applyStockChange(tx, {
          itemId: item.itemId,
          type: 'OUT',
          quantity: item.quantity,
          reference
        });
      }

      const updated = await tx.prescription.update({
        where: { id: prescription.id },
        data: {
          dispensed: true,
          dispensedAt: new Date(),
          dispensedBy: req.user.id
        },
        include: {
          items: true,
          patient: true
        }
      });

      return updated;
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ message: 'Insufficient stock to dispense prescription' });
    }

    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'One or more items linked to this prescription were not found' });
    }

    throw error;
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Prescription',
    entityId: result.id,
    changes: {
      old: prescription,
      new: result
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  for (const item of prescription.items) {
    await inventoryService.handleLowStockCheck(item.itemId);
  }

  res.json({ data: result });
});

module.exports = {
  createPrescription,
  listPrescriptions,
  getPrescription,
  dispensePrescription
};
