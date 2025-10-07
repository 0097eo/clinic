const prisma = require('../utils/prisma');

class AuditService {
  async log({ userId, userRole, action, entityType, entityId, changes, ipAddress, userAgent }) {
    try {
      if (!userId || !userRole || !action || !entityType) {
        throw new Error('Missing required audit log properties');
      }

      await prisma.auditLog.create({
        data: {
          userId,
          userRole,
          action,
          entityType,
          entityId,
          changes,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      // Best-effort logging: avoid breaking request flow
      console.error('Failed to persist audit log', error);
    }
  }

  async getAuditTrail(entityType, entityId) {
    throw new Error('getAuditTrail not implemented');
  }

  async getUserActivity(userId, dateRange) {
    throw new Error('getUserActivity not implemented');
  }

  async getSystemActivity(filters) {
    throw new Error('getSystemActivity not implemented');
  }
}

module.exports = new AuditService();
