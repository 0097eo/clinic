const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

describe('Employee routes', () => {
  it('lists employees for authorized users', async () => {
    const adminUser = {
      id: 'emp-admin',
      role: 'ADMIN',
      fullName: 'Admin User',
      email: 'admin@example.com'
    };

    const employees = [
      {
        id: 'emp-1',
        fullName: 'Jane Doe',
        role: 'DOCTOR',
        department: 'Internal Medicine',
        email: 'jane@example.com',
        phone: '+254700000123'
      },
      {
        id: 'emp-2',
        fullName: 'John Smith',
        role: 'PHARMACIST',
        department: 'Pharmacy',
        email: 'john@example.com',
        phone: '+254700000456'
      }
    ];

    mockPrisma.employee.findUnique.mockResolvedValueOnce(adminUser);
    mockPrisma.employee.findMany.mockResolvedValueOnce(employees);

    const token = signToken({ id: adminUser.id, role: adminUser.role });
    const response = await request(app, {
      method: 'GET',
      url: '/api/employees',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(employees);
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { fullName: 'asc' },
        select: expect.any(Object)
      })
    );
  });

  it('applies role filter when provided', async () => {
    const receptionist = {
      id: 'emp-reception',
      role: 'RECEPTIONIST',
      fullName: 'Reception User',
      email: 'reception@example.com'
    };

    mockPrisma.employee.findUnique.mockResolvedValueOnce(receptionist);
    mockPrisma.employee.findMany.mockResolvedValueOnce([]);

    const token = signToken({ id: receptionist.id, role: receptionist.role });
    await request(app, {
      method: 'GET',
      url: '/api/employees?role=DOCTOR',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: 'DOCTOR' }
      })
    );
  });
});
