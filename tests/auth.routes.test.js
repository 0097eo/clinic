const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const { hashPassword, comparePassword } = require('../src/utils/hash');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

describe('Auth routes', () => {
  it('registers a new employee', async () => {
    mockPrisma.employee.count.mockResolvedValueOnce(0);
    mockPrisma.employee.findUnique.mockResolvedValueOnce(null);

    const newEmployee = {
      id: 'emp-123',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashed-password',
      role: 'ADMIN'
    };

    mockPrisma.employee.create.mockResolvedValueOnce(newEmployee);

    const payload = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password123!',
      role: 'ADMIN',
      department: 'IT',
      phone: '+254700000000'
    };

    const response = await request(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: payload
    });

    expect(response.status).toBe(201);
    expect(hashPassword).toHaveBeenCalledWith(payload.password);
    expect(mockPrisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: payload.fullName,
          email: payload.email,
          role: payload.role
        })
      })
    );
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: newEmployee.id,
        fullName: newEmployee.fullName,
        email: newEmployee.email,
        role: newEmployee.role
      })
    );
    expect(response.body.data).not.toHaveProperty('password');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityType: 'Employee',
        userId: newEmployee.id
      })
    );
  });

  it('logs in an existing employee', async () => {
    const existingEmployee = {
      id: 'emp-200',
      email: 'john@example.com',
      password: 'hashed-password',
      role: 'ADMIN',
      fullName: 'John Doe'
    };

    mockPrisma.employee.findUnique.mockResolvedValueOnce(existingEmployee);
    comparePassword.mockResolvedValueOnce(true);

    const response = await request(app, {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: existingEmployee.email,
        password: 'Password123!'
      }
    });

    expect(response.status).toBe(200);
    expect(comparePassword).toHaveBeenCalledWith('Password123!', existingEmployee.password);
    expect(response.body.token).toBeDefined();
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: existingEmployee.id,
        email: existingEmployee.email,
        role: existingEmployee.role
      })
    );
    expect(response.body.data).not.toHaveProperty('password');
  });

  it('rejects login with invalid credentials', async () => {
    const existingEmployee = {
      id: 'emp-201',
      email: 'jane@example.com',
      password: 'hashed-password',
      role: 'ADMIN',
      fullName: 'Jane Admin'
    };

    mockPrisma.employee.findUnique.mockResolvedValueOnce(existingEmployee);
    comparePassword.mockResolvedValueOnce(false);

    const response = await request(app, {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: existingEmployee.email,
        password: 'wrong'
      }
    });

    expect(response.status).toBe(401);
  });

  it('logs out the authenticated employee', async () => {
    const currentUser = {
      id: 'emp-300',
      role: 'ADMIN',
      fullName: 'Log Out',
      email: 'logout@example.com'
    };

    mockPrisma.employee.findUnique.mockResolvedValueOnce(currentUser);

    const token = signToken({ id: currentUser.id, role: currentUser.role });
    const response = await request(app, {
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(response.status).toBe(200);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGOUT',
        userId: currentUser.id
      })
    );
  });

  it('requires admin role to register additional employees', async () => {
    const currentUser = {
      id: 'emp-350',
      role: 'DOCTOR',
      fullName: 'Dr. Who',
      email: 'doctor@example.com'
    };

    mockPrisma.employee.count.mockResolvedValueOnce(3);
    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(currentUser) // authenticate optional middleware
      .mockResolvedValueOnce(null); // ensure email unused

    const token = signToken({ id: currentUser.id, role: currentUser.role });
    const response = await request(app, {
      method: 'POST',
      url: '/api/auth/register',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        fullName: 'Nurse Nancy',
        email: 'nancy@example.com',
        password: 'Password123!',
        role: 'RECEPTIONIST'
      }
    });

    expect(response.status).toBe(403);
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });

  it('returns the authenticated employee profile', async () => {
    const currentUser = {
      id: 'emp-400',
      role: 'ACCOUNTANT',
      fullName: 'Paula Pay',
      email: 'paula@example.com'
    };

    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(currentUser) // authenticate
      .mockResolvedValueOnce(currentUser); // controller lookup

    const token = signToken({ id: currentUser.id, role: currentUser.role });
    const response = await request(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role
      })
    );
    expect(response.body.data).not.toHaveProperty('password');
  });

  it('updates the employee profile', async () => {
    const currentUser = {
      id: 'emp-500',
      role: 'PHARMACIST',
      fullName: 'Phil Pharma',
      email: 'phil@example.com',
      phone: '+254700000999',
      department: 'Pharmacy'
    };

    const updated = {
      ...currentUser,
      fullName: 'Phillip Pharma'
    };

    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(currentUser) // authenticate
      .mockResolvedValueOnce(currentUser); // load current profile
    mockPrisma.employee.update.mockResolvedValueOnce(updated);

    const token = signToken({ id: currentUser.id, role: currentUser.role });
    const response = await request(app, {
      method: 'PUT',
      url: '/api/auth/me',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        fullName: 'Phillip Pharma'
      }
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: currentUser.id },
        data: expect.objectContaining({ fullName: 'Phillip Pharma' })
      })
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityType: 'Employee',
        entityId: currentUser.id
      })
    );
  });

  it('changes the employee password', async () => {
    const currentUser = {
      id: 'emp-600',
      role: 'ADMIN',
      fullName: 'Carol Control',
      email: 'carol@example.com',
      password: 'hashed-password'
    };

    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(currentUser) // authenticate
      .mockResolvedValueOnce(currentUser); // load for password check

    const token = signToken({ id: currentUser.id, role: currentUser.role });
    const response = await request(app, {
      method: 'PATCH',
      url: '/api/auth/change-password',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        currentPassword: 'Clinic123!',
        newPassword: 'Clinic456!'
      }
    });

    expect(response.status).toBe(200);
    expect(comparePassword).toHaveBeenCalledWith('Clinic123!', currentUser.password);
    expect(hashPassword).toHaveBeenCalledWith('Clinic456!');
    expect(mockPrisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: currentUser.id },
        data: { password: 'hashed-password' }
      })
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityType: 'Employee',
        entityId: currentUser.id
      })
    );
  });
});
