const { Prisma } = require('@prisma/client');
const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');

const toDecimal = (value) => new Prisma.Decimal(value || 0);

const computeStatus = (total, paid) => {
  if (paid.greaterThanOrEqualTo(total)) {
    return 'PAID';
  }
  if (paid.greaterThan(0)) {
    return 'PARTIALLY_PAID';
  }
  return 'DRAFT';
};

const createBilling = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, paymentMode, totalAmount, paidAmount = 0, status } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  if (appointmentId) {
    const existingBilling = await prisma.billing.findUnique({
      where: { appointmentId },
      include: {
        patient: true,
        appointment: true
      }
    });

    if (existingBilling) {
      if (existingBilling.patientId !== patientId) {
        return res.status(400).json({ message: 'Appointment is linked to a different patient' });
      }

      const total = totalAmount !== undefined ? toDecimal(totalAmount) : existingBilling.totalAmount;
      const paid = paidAmount !== undefined ? toDecimal(paidAmount) : existingBilling.paidAmount;

      if (paid.greaterThan(total)) {
        return res.status(400).json({ message: 'paidAmount cannot exceed totalAmount' });
      }

      const updated = await prisma.billing.update({
        where: { id: existingBilling.id },
        data: {
          paymentMode: paymentMode || existingBilling.paymentMode,
          totalAmount: total,
          paidAmount: paid,
          outstandingBalance: total.minus(paid),
          status: status || computeStatus(total, paid)
        },
        include: {
          patient: true,
          appointment: true
        }
      });

      await AuditService.log({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'UPDATE',
        entityType: 'Billing',
        entityId: updated.id,
        changes: {
          old: existingBilling,
          new: updated
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json({ data: updated });
    }
  }

  const total = toDecimal(totalAmount);
  const paid = toDecimal(paidAmount);

  if (paid.greaterThan(total)) {
    return res.status(400).json({ message: 'paidAmount cannot exceed totalAmount' });
  }

  const billing = await prisma.billing.create({
    data: {
      patientId,
      appointmentId,
      paymentMode,
      totalAmount: total,
      paidAmount: paid,
      outstandingBalance: total.minus(paid),
      status: status || computeStatus(total, paid)
    },
    include: {
      patient: true,
      appointment: true
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Billing',
    entityId: billing.id,
    changes: { new: billing },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ data: billing });
});

const listBilling = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const filters = {};
  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.patientId) {
    filters.patientId = req.query.patientId;
  }
  if (req.query.appointmentId) {
    filters.appointmentId = req.query.appointmentId;
  }

  const [data, total] = await Promise.all([
    prisma.billing.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        patient: true,
        appointment: true
      }
    }),
    prisma.billing.count({ where: filters })
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

const getBilling = asyncHandler(async (req, res) => {
  const billing = await prisma.billing.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      appointment: true,
      payments: true
    }
  });

  if (!billing) {
    return res.status(404).json({ message: 'Billing record not found' });
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'VIEW',
    entityType: 'Billing',
    entityId: billing.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ data: billing });
});

const recordPayment = asyncHandler(async (req, res) => {
  const { amount, method, reference } = req.body;
  const paymentAmount = toDecimal(amount);

  let transactionResult;

  try {
    transactionResult = await prisma.$transaction(async (tx) => {
      const billing = await tx.billing.findUnique({
        where: { id: req.params.id },
        include: {
          patient: true,
          appointment: true
        }
      });

      if (!billing) {
        throw new Error('NOT_FOUND');
      }

      if (paymentAmount.greaterThan(billing.outstandingBalance)) {
        throw new Error('OVERPAY');
      }

    const newPaid = billing.paidAmount.plus(paymentAmount);
    const outstanding = billing.totalAmount.minus(newPaid);
    const status = computeStatus(billing.totalAmount, newPaid);

    const updatedBilling = await tx.billing.update({
      where: { id: billing.id },
      data: {
        paidAmount: newPaid,
        outstandingBalance: outstanding,
        status
      },
      include: {
        patient: true,
        appointment: true,
        payments: true
      }
    });

    const paymentRecord = await tx.billingPayment.create({
      data: {
        billingId: billing.id,
        amount: paymentAmount,
        method,
        reference
      }
    });

    return { updatedBilling, paymentRecord };
  });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Billing record not found' });
    }

    if (error.message === 'OVERPAY') {
      return res.status(400).json({ message: 'Payment exceeds outstanding balance' });
    }

    throw error;
  }

  const { updatedBilling, paymentRecord } = transactionResult;

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Billing',
    entityId: updatedBilling.id,
    changes: { new: updatedBilling, payment: paymentRecord },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  if (updatedBilling.patient?.phone) {
    const smsNotification = await notificationService.createNotification(
      {
        recipientId: updatedBilling.patientId,
        recipientType: 'PATIENT',
        type: 'PAYMENT_CONFIRMATION',
        title: 'Payment Received',
        message: `Payment of KES ${paymentAmount.toString()} received. Outstanding balance is KES ${updatedBilling.outstandingBalance.toString()}.`,
        data: {
          phone: updatedBilling.patient.phone,
          billingId: updatedBilling.id,
          amount: paymentAmount.toString()
        },
        channel: 'SMS'
      },
      { deferSend: true }
    );

    await notificationService.scheduleNotification(smsNotification.id, 'SMS', 0);
  }

  await notificationService.createNotification(
    {
      recipientId: updatedBilling.patientId,
      recipientType: 'PATIENT',
      type: 'PAYMENT_CONFIRMATION',
      title: 'Payment Confirmation',
      message: `Your payment of KES ${paymentAmount.toString()} has been recorded. Thank you!`,
      data: {
        billingId: updatedBilling.id,
        amount: paymentAmount.toString()
      },
      channel: 'IN_APP'
    },
    { deferSend: false }
  );

  if (updatedBilling.status === 'PAID' && updatedBilling.patient?.phone) {
    const receiptNotification = await notificationService.createNotification(
      {
        recipientId: updatedBilling.patientId,
        recipientType: 'PATIENT',
        type: 'PAYMENT_CONFIRMATION',
        title: 'Receipt Ready',
        message: `Billing ${updatedBilling.id} is fully paid. A receipt is available for collection.`,
        data: {
          phone: updatedBilling.patient.phone,
          billingId: updatedBilling.id
        },
        channel: 'SMS'
      },
      { deferSend: true }
    );

    await notificationService.scheduleNotification(receiptNotification.id, 'SMS', 0);
  }

  res.status(201).json({ data: updatedBilling });
});

const getOutstandingBills = asyncHandler(async (req, res) => {
  const bills = await prisma.billing.findMany({
    where: {
      outstandingBalance: {
        gt: toDecimal(0)
      }
    },
    include: {
      patient: true,
      appointment: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json({ data: bills });
});

module.exports = {
  createBilling,
  listBilling,
  getBilling,
  recordPayment,
  getOutstandingBills
};
