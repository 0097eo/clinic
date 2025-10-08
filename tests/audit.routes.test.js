const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const adminUser = {
  id: 'admin-logs',
  role: 'ADMIN',
  fullName: 'Audit Admin',
  email: 'admin@clinic.com'
};

const adminHeader = () => `Bearer ${signToken({ id: adminUser.id, role: adminUser.role })}`;

describe('Audit log routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(adminUser);
  });

  it('lists audit logs with pagination', async () => {
    const logs = [
      { id: 'log-1', action: 'CREATE' },
      { id: 'log-2', action: 'UPDATE' }
    ];

    mockPrisma.auditLog.findMany.mockResolvedValueOnce(logs);
    mockPrisma.auditLog.count.mockResolvedValueOnce(logs.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/audit-logs?page=1&pageSize=10',
      headers: {
        Authorization: adminHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(logs.length);
    expect(response.body.pagination.total).toBe(logs.length);
  });

  it('retrieves a specific audit log', async () => {
    const log = { id: 'log-3', action: 'VIEW' };
    mockPrisma.auditLog.findUnique.mockResolvedValueOnce(log);

    const response = await request(app, {
      method: 'GET',
      url: `/api/audit-logs/${log.id}`,
      headers: {
        Authorization: adminHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(log);
  });

  it('lists audit logs for an entity', async () => {
    const logs = [{ id: 'log-4', entityId: 'patient-1' }];
    mockPrisma.auditLog.findMany.mockResolvedValueOnce(logs);

    const response = await request(app, {
      method: 'GET',
      url: '/api/audit-logs/entity/Patient/patient-1',
      headers: {
        Authorization: adminHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(logs);
  });

  it('lists audit logs for a user', async () => {
    const logs = [{ id: 'log-5', userId: 'user-1' }];
    mockPrisma.auditLog.findMany.mockResolvedValueOnce(logs);

    const response = await request(app, {
      method: 'GET',
      url: '/api/audit-logs/user/user-1',
      headers: {
        Authorization: adminHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(logs);
  });

  it('returns my activity for authenticated user', async () => {
    const activityLogs = [{ id: 'log-6', userId: adminUser.id }];
    mockPrisma.auditLog.findMany.mockResolvedValueOnce(activityLogs);

    const response = await request(app, {
      method: 'GET',
      url: '/api/audit-logs/my-activity',
      headers: {
        Authorization: adminHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(activityLogs);
  });
});
