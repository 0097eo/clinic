const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const { hashPassword, comparePassword } = require('../src/utils/hash');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

describe('Auth routes', () => {
  it('registers a new employee', async () => {
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
});
