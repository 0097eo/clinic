const { Prisma } = require('@prisma/client');
const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const notificationService = require('../src/services/notification.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const accountantUser = {
  id: 'accountant-1',
  role: 'ACCOUNTANT',
  fullName: 'Accountant User',
  email: 'accountant@clinic.com'
};

const authHeader = () => `Bearer ${signToken({ id: accountantUser.id, role: accountantUser.role })}`;

describe('Billing routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(accountantUser);
    notificationService.createNotification.mockClear();
  });

  it('creates a billing record when none exists', async () => {
    const patient = { id: 'patient-100', fullName: 'Billing Patient', phone: '+254700000100' };

    mockPrisma.patient.findUnique.mockResolvedValueOnce(patient);
    mockPrisma.billing.findUnique.mockResolvedValueOnce(null);

    const billingRecord = {
      id: 'billing-1',
      patientId: patient.id,
      appointmentId: null,
      paymentMode: 'CASH',
      totalAmount: new Prisma.Decimal(1200),
      paidAmount: new Prisma.Decimal(200),
      outstandingBalance: new Prisma.Decimal(1000),
      status: 'PARTIALLY_PAID',
      patient,
      appointment: null
    };

    mockPrisma.billing.create.mockResolvedValueOnce(billingRecord);

    const response = await request(app, {
      method: 'POST',
      url: '/api/billing',
      headers: {
        Authorization: authHeader()
      },
      body: {
        patientId: patient.id,
        paymentMode: 'CASH',
        totalAmount: 1200,
        paidAmount: 200
      }
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.billing.create).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Billing',
        action: 'CREATE',
        entityId: billingRecord.id
      })
    );
  });

  it('lists billing records', async () => {
    const records = [
      { id: 'billing-1', patientId: 'patient-1' },
      { id: 'billing-2', patientId: 'patient-2' }
    ];

    mockPrisma.billing.findMany.mockResolvedValueOnce(records);
    mockPrisma.billing.count.mockResolvedValueOnce(records.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/billing?page=1&pageSize=5',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(records.length);
    expect(response.body.pagination.total).toBe(records.length);
  });

  it('retrieves billing details', async () => {
    const billing = { id: 'billing-3', patientId: 'patient-3', payments: [] };

    mockPrisma.billing.findUnique.mockResolvedValueOnce(billing);

    const response = await request(app, {
      method: 'GET',
      url: `/api/billing/${billing.id}`,
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: billing.id }));
  });

  it('records a billing payment', async () => {
    const billing = {
      id: 'billing-4',
      patientId: 'patient-4',
      outstandingBalance: new Prisma.Decimal(500),
      paidAmount: new Prisma.Decimal(500),
      totalAmount: new Prisma.Decimal(1000),
      patient: { id: 'patient-4', fullName: 'Paid Patient', phone: '+254700000400' },
      appointment: null,
      payments: []
    };

    const updatedBilling = {
      ...billing,
      outstandingBalance: new Prisma.Decimal(300),
      paidAmount: new Prisma.Decimal(700)
    };

    const paymentRecord = {
      id: 'payment-1',
      billingId: billing.id,
      amount: new Prisma.Decimal(200),
      method: 'MPESA',
      reference: 'MPESA12345'
    };

    mockPrisma.billing.findUnique.mockResolvedValueOnce({ ...billing, status: 'PARTIALLY_PAID' });
    mockPrisma.billing.update.mockResolvedValueOnce(updatedBilling);
    mockPrisma.billingPayment.create.mockResolvedValueOnce(paymentRecord);

    const response = await request(app, {
      method: 'POST',
      url: `/api/billing/${billing.id}/payment`,
      headers: {
        Authorization: authHeader()
      },
      body: {
        amount: 200,
        method: 'MPESA',
        reference: 'MPESA12345'
      }
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.billing.update).toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: billing.id
      })
    );
  });

  it('lists outstanding bills', async () => {
    const outstanding = [
      { id: 'billing-5', outstandingBalance: '100' },
      { id: 'billing-6', outstandingBalance: '200' }
    ];

    mockPrisma.billing.findMany.mockResolvedValueOnce(outstanding);

    const response = await request(app, {
      method: 'GET',
      url: '/api/billing/outstanding',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(outstanding);
  });
});
