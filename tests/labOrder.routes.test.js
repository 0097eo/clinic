const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const notificationService = require('../src/services/notification.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const doctorUser = {
  id: 'doctor-lab-1',
  role: 'DOCTOR',
  fullName: 'Lab Doctor',
  email: 'labdoctor@clinic.com'
};

const doctorHeader = () => `Bearer ${signToken({ id: doctorUser.id, role: doctorUser.role })}`;

describe('Lab order routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(doctorUser);
    notificationService.createNotification.mockClear();
  });

  it('creates a lab order', async () => {
    const patient = { id: 'patient-500', fullName: 'Lab Patient', phone: '+254700000500' };

    const labOrder = {
      id: 'lab-1',
      patientId: patient.id,
      orderedBy: doctorUser.id,
      testType: 'Blood Test',
      status: 'PENDING',
      patient,
      orderedByUser: doctorUser
    };

    mockPrisma.patient.findUnique.mockResolvedValueOnce(patient);
    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(doctorUser) // authentication
      .mockResolvedValueOnce(doctorUser); // orderedBy lookup
    mockPrisma.labOrder.create.mockResolvedValueOnce(labOrder);

    const response = await request(app, {
      method: 'POST',
      url: '/api/lab-orders',
      headers: {
        Authorization: doctorHeader()
      },
      body: {
        patientId: patient.id,
        orderedBy: doctorUser.id,
        testType: 'Blood Test',
        notes: 'Fast for 12 hours'
      }
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.labOrder.create).toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'LabOrder',
        action: 'CREATE',
        entityId: labOrder.id
      })
    );
  });

  it('lists lab orders', async () => {
    const labOrders = [{ id: 'lab-1' }, { id: 'lab-2' }];

    mockPrisma.employee.findUnique.mockResolvedValueOnce(doctorUser);
    mockPrisma.labOrder.findMany.mockResolvedValueOnce(labOrders);
    mockPrisma.labOrder.count.mockResolvedValueOnce(labOrders.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/lab-orders?page=1&pageSize=10',
      headers: {
        Authorization: doctorHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(labOrders.length);
  });

  it('retrieves a lab order', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(doctorUser);

    const labOrder = {
      id: 'lab-3',
      patientId: 'patient-600',
      orderedBy: doctorUser.id,
      patient: {},
      orderedByUser: {}
    };

    mockPrisma.labOrder.findUnique.mockResolvedValueOnce(labOrder);

    const response = await request(app, {
      method: 'GET',
      url: `/api/lab-orders/${labOrder.id}`,
      headers: {
        Authorization: doctorHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: labOrder.id }));
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW',
        entityId: labOrder.id
      })
    );
  });

  it('updates lab order result', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(doctorUser);

    const labOrder = {
      id: 'lab-4',
      patientId: 'patient-700',
      orderedBy: doctorUser.id,
      status: 'PENDING',
      patient: { id: 'patient-700', fullName: 'Result Patient', phone: '+254700000700' },
      orderedByUser: doctorUser
    };

    const completedOrder = {
      ...labOrder,
      status: 'COMPLETED',
      result: 'All clear'
    };

    mockPrisma.labOrder.findUnique.mockResolvedValueOnce(labOrder);
    mockPrisma.labOrder.update.mockResolvedValueOnce(completedOrder);

    const response = await request(app, {
      method: 'PUT',
      url: `/api/lab-orders/${labOrder.id}/result`,
      headers: {
        Authorization: doctorHeader()
      },
      body: { result: 'All clear' }
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.labOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: labOrder.id },
        data: expect.objectContaining({ result: 'All clear', status: 'COMPLETED' })
      })
    );
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: labOrder.id
      })
    );
  });
});
