const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const inventoryService = require('../src/services/inventory.service');
const notificationService = require('../src/services/notification.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const doctorUser = {
  id: 'doctor-auth-1',
  role: 'DOCTOR',
  fullName: 'Doctor Auth',
  email: 'doctor@clinic.com'
};

const pharmacistUser = {
  id: 'pharmacist-1',
  role: 'PHARMACIST',
  email: 'pharmacist@clinic.com'
};

const doctorHeader = () => `Bearer ${signToken({ id: doctorUser.id, role: doctorUser.role })}`;

describe('Prescription routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(doctorUser);
    mockPrisma.employee.findMany.mockReset();
    mockPrisma.employee.findMany.mockResolvedValue([pharmacistUser]);
    notificationService.createNotification.mockClear();
  });

  it('creates a prescription with items', async () => {
    const patient = {
      id: 'patient-200',
      fullName: 'Prescription Patient',
      phone: '+254700000200'
    };

    const createdPrescription = {
      id: 'rx-1',
      patientId: patient.id,
      doctorId: doctorUser.id,
      notes: 'Take after meals',
      items: [
        {
          id: 'item-1',
          itemId: 'drug-1',
          quantity: 2,
          dosage: '1 tab',
          frequency: 'twice daily',
          duration: '5 days'
        }
      ],
      patient,
      doctor: doctorUser
    };

    mockPrisma.patient.findUnique.mockResolvedValueOnce(patient);
    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(doctorUser) // auth
      .mockResolvedValueOnce(doctorUser); // doctor verification
    mockPrisma.prescription.create.mockResolvedValueOnce(createdPrescription);

    const response = await request(app, {
      method: 'POST',
      url: '/api/prescriptions',
      headers: {
        Authorization: doctorHeader()
      },
      body: {
        patientId: patient.id,
        doctorId: doctorUser.id,
        notes: createdPrescription.notes,
        items: [
          {
            itemId: 'drug-1',
            quantity: 2,
            dosage: '1 tab',
            frequency: 'twice daily',
            duration: '5 days'
          }
        ]
      }
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.prescription.create).toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Prescription',
        action: 'CREATE',
        entityId: createdPrescription.id
      })
    );
  });

  it('lists prescriptions', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(doctorUser);

    const prescriptions = [{ id: 'rx-1' }, { id: 'rx-2' }];

    mockPrisma.prescription.findMany.mockResolvedValueOnce(prescriptions);
    mockPrisma.prescription.count.mockResolvedValueOnce(prescriptions.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/prescriptions',
      headers: {
        Authorization: doctorHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(prescriptions.length);
  });

  it('retrieves a prescription', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(doctorUser);

    const prescription = {
      id: 'rx-3',
      patientId: 'patient-300',
      doctorId: doctorUser.id,
      items: [],
      patient: {},
      doctor: {}
    };

    mockPrisma.prescription.findUnique.mockResolvedValueOnce(prescription);

    const response = await request(app, {
      method: 'GET',
      url: `/api/prescriptions/${prescription.id}`,
      headers: {
        Authorization: doctorHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: prescription.id }));
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW',
        entityId: prescription.id
      })
    );
  });

  it('dispenses a prescription and updates stock', async () => {
    const pharmacist = { id: 'pharmacist-auth', role: 'PHARMACIST' };
    const authHeader = `Bearer ${signToken({ id: pharmacist.id, role: pharmacist.role })}`;

    const pendingPrescription = {
      id: 'rx-4',
      dispensed: false,
      patientId: 'patient-400',
      patient: { id: 'patient-400', fullName: 'Dispense Patient' },
      items: [
        { id: 'item-1', itemId: 'drug-10', quantity: 1 },
        { id: 'item-2', itemId: 'drug-11', quantity: 2 }
      ]
    };

    const dispensed = {
      ...pendingPrescription,
      dispensed: true,
      dispensedBy: pharmacist.id,
      dispensedAt: new Date()
    };

    mockPrisma.employee.findUnique.mockResolvedValueOnce(pharmacist);
    mockPrisma.prescription.findUnique.mockResolvedValueOnce(pendingPrescription);
    inventoryService.applyStockChange.mockResolvedValueOnce().mockResolvedValueOnce();
    mockPrisma.prescription.update.mockResolvedValueOnce(dispensed);
    inventoryService.handleLowStockCheck.mockResolvedValue();

    const response = await request(app, {
      method: 'POST',
      url: `/api/prescriptions/${pendingPrescription.id}/dispense`,
      headers: {
        Authorization: authHeader
      }
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.prescription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: pendingPrescription.id },
        data: expect.objectContaining({ dispensed: true, dispensedBy: pharmacist.id })
      })
    );
    expect(inventoryService.applyStockChange).toHaveBeenCalledTimes(pendingPrescription.items.length);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: pendingPrescription.id
      })
    );
  });
});
