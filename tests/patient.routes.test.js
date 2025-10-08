const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const buildAuthHeader = (user) => `Bearer ${signToken({ id: user.id, role: user.role })}`;

describe('Patient routes', () => {
  const authUser = {
    id: 'auth-user-1',
    role: 'ADMIN',
    fullName: 'Admin User',
    email: 'admin@clinic.com'
  };

  it('creates a new patient record', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const newPatient = {
      id: 'patient-1',
      fullName: 'John Doe',
      gender: 'Male',
      dateOfBirth: new Date('1990-01-01'),
      phone: '+254700000001'
    };

    mockPrisma.patient.create.mockResolvedValueOnce(newPatient);

    const payload = {
      fullName: 'John Doe',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      phone: '+254700000001'
    };

    const response = await request(app, {
      method: 'POST',
      url: '/api/patients',
      headers: {
        Authorization: buildAuthHeader(authUser)
      },
      body: payload
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: payload.fullName,
          gender: payload.gender,
          phone: payload.phone,
          dateOfBirth: expect.any(Date)
        })
      })
    );
    expect(response.body.data).toEqual(expect.objectContaining({ id: newPatient.id }));
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Patient',
        action: 'CREATE',
        entityId: newPatient.id
      })
    );
  });

  it('lists patients with pagination data', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const patients = [
      { id: 'p1', fullName: 'John Doe' },
      { id: 'p2', fullName: 'Jane Doe' }
    ];

    mockPrisma.patient.findMany.mockResolvedValueOnce(patients);
    mockPrisma.patient.count.mockResolvedValueOnce(patients.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/patients?page=1&pageSize=2',
      headers: {
        Authorization: buildAuthHeader(authUser)
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({ page: 1, pageSize: 2, total: patients.length })
    );
  });

  it('fetches a single patient', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const patient = { id: 'patient-2', fullName: 'Sam Patient' };
    mockPrisma.patient.findUnique.mockResolvedValueOnce(patient);

    const response = await request(app, {
      method: 'GET',
      url: `/api/patients/${patient.id}`,
      headers: {
        Authorization: buildAuthHeader(authUser)
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: patient.id }));
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW',
        entityId: patient.id
      })
    );
  });

  it('updates an existing patient', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const existingPatient = {
      id: 'patient-3',
      fullName: 'Grace Old',
      gender: 'Female',
      dateOfBirth: new Date('1985-05-05'),
      phone: '+254700000002'
    };

    const updatedPatient = {
      ...existingPatient,
      phone: '+254700999999'
    };

    mockPrisma.patient.findUnique.mockResolvedValueOnce(existingPatient);
    mockPrisma.patient.update.mockResolvedValueOnce(updatedPatient);

    const response = await request(app, {
      method: 'PUT',
      url: `/api/patients/${existingPatient.id}`,
      headers: {
        Authorization: buildAuthHeader(authUser)
      },
      body: {
        phone: updatedPatient.phone
      }
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: existingPatient.id },
        data: expect.objectContaining({ phone: updatedPatient.phone })
      })
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: existingPatient.id
      })
    );
  });

  it('searches patients by query', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);
    const searchResults = [{ id: 'patient-4', fullName: 'Query Match' }];
    mockPrisma.patient.findMany.mockResolvedValueOnce(searchResults);

    const response = await request(app, {
      method: 'GET',
      url: '/api/patients/search?q=Query',
      headers: {
        Authorization: buildAuthHeader(authUser)
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(searchResults);
  });
});
