const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');

const createLabOrder = asyncHandler(async (req, res) => {
  const { patientId, orderedBy, testType, notes } = req.body;

  const [patient, employee] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.employee.findUnique({ where: { id: orderedBy } })
  ]);

  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  if (!employee) {
    return res.status(404).json({ message: 'Ordering employee not found' });
  }

  const labOrder = await prisma.labOrder.create({
    data: {
      patientId,
      orderedBy,
      testType,
      notes,
      result: null,
      status: 'PENDING'
    },
    include: {
      patient: true,
      orderedByUser: true
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'LabOrder',
    entityId: labOrder.id,
    changes: { new: labOrder },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  if (patient.phone) {
    const smsNotification = await notificationService.createNotification(
      {
        recipientId: patient.id,
        recipientType: 'PATIENT',
        type: 'LAB_RESULT_READY',
        title: 'Lab Test Scheduled',
        message: `A lab test (${testType}) has been scheduled. We will notify you once results are ready.`,
        data: {
          phone: patient.phone,
          labOrderId: labOrder.id
        },
        channel: 'SMS'
      },
      { deferSend: true }
    );

    await notificationService.scheduleNotification(smsNotification.id, 'SMS', 0);
  }

  await notificationService.createNotification(
    {
      recipientId: orderedBy,
      recipientType: 'EMPLOYEE',
      type: 'LAB_RESULT_READY',
      title: 'Lab Order Created',
      message: `Lab test ${testType} created for patient ${patient.fullName}.`,
      data: {
        labOrderId: labOrder.id,
        patientId
      },
      channel: 'IN_APP'
    },
    { deferSend: false }
  );

  res.status(201).json({ data: labOrder });
});

const listLabOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const filters = {};
  if (req.query.patientId) {
    filters.patientId = req.query.patientId;
  }
  if (req.query.orderedBy) {
    filters.orderedBy = req.query.orderedBy;
  }
  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [data, total] = await Promise.all([
    prisma.labOrder.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        patient: true,
        orderedByUser: true
      }
    }),
    prisma.labOrder.count({ where: filters })
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

const getLabOrder = asyncHandler(async (req, res) => {
  const labOrder = await prisma.labOrder.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      orderedByUser: true
    }
  });

  if (!labOrder) {
    return res.status(404).json({ message: 'Lab order not found' });
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'VIEW',
    entityType: 'LabOrder',
    entityId: labOrder.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ data: labOrder });
});

const updateLabResult = asyncHandler(async (req, res) => {
  const labOrder = await prisma.labOrder.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      orderedByUser: true
    }
  });

  if (!labOrder) {
    return res.status(404).json({ message: 'Lab order not found' });
  }

  const updated = await prisma.labOrder.update({
    where: { id: labOrder.id },
    data: {
      result: req.body.result,
      status: 'COMPLETED'
    },
    include: {
      patient: true,
      orderedByUser: true
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'LabOrder',
    entityId: updated.id,
    changes: {
      old: labOrder,
      new: updated
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  if (updated.orderedByUser) {
    await notificationService.createNotification(
      {
        recipientId: updated.orderedByUser.id,
        recipientType: 'EMPLOYEE',
        type: 'LAB_RESULT_READY',
        title: 'Lab Result Ready',
        message: `Lab results for patient ${updated.patient.fullName} (${updated.testType}) are ready.`,
        data: {
          labOrderId: updated.id,
          patientId: updated.patientId
        },
        channel: 'IN_APP'
      },
      { deferSend: false }
    );
  }

  if (updated.patient?.phone) {
    const smsNotification = await notificationService.createNotification(
      {
        recipientId: updated.patientId,
        recipientType: 'PATIENT',
        type: 'LAB_RESULT_READY',
        title: 'Lab Result Ready',
        message: `Your lab results for ${updated.testType} are ready. Please contact the clinic.`,
        data: {
          phone: updated.patient.phone,
          labOrderId: updated.id
        },
        channel: 'SMS'
      },
      { deferSend: true }
    );

    await notificationService.scheduleNotification(smsNotification.id, 'SMS', 0);
  }

  res.json({ data: updated });
});

module.exports = {
  createLabOrder,
  listLabOrders,
  getLabOrder,
  updateLabResult
};
