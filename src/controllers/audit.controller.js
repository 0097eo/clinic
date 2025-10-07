const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');

const buildDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return undefined;
  const range = {};
  if (startDate) {
    range.gte = new Date(startDate);
  }
  if (endDate) {
    range.lte = new Date(endDate);
  }
  return range;
};

const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);
  const skip = (page - 1) * pageSize;

  const where = {};
  if (req.query.userId) {
    where.userId = req.query.userId;
  }
  if (req.query.action) {
    where.action = req.query.action;
  }
  if (req.query.entityType) {
    where.entityType = req.query.entityType;
  }

  const timestampRange = buildDateRange(req.query.startDate, req.query.endDate);
  if (timestampRange) {
    where.timestamp = timestampRange;
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.auditLog.count({ where })
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

const getAuditLog = asyncHandler(async (req, res) => {
  const log = await prisma.auditLog.findUnique({ where: { id: req.params.id } });
  if (!log) {
    return res.status(404).json({ message: 'Audit log not found' });
  }
  res.json({ data: log });
});

const getLogsForEntity = asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: req.params.entityType,
      entityId: req.params.entityId
    },
    orderBy: { timestamp: 'desc' }
  });
  res.json({ data: logs });
});

const getLogsForUser = asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId: req.params.userId
    },
    orderBy: { timestamp: 'desc' }
  });
  res.json({ data: logs });
});

const getMyActivity = asyncHandler(async (req, res) => {
  const timestampRange = buildDateRange(req.query.startDate, req.query.endDate);
  const logs = await prisma.auditLog.findMany({
    where: {
      userId: req.user.id,
      ...(timestampRange ? { timestamp: timestampRange } : {})
    },
    orderBy: { timestamp: 'desc' }
  });
  res.json({ data: logs });
});

module.exports = {
  listAuditLogs,
  getAuditLog,
  getLogsForEntity,
  getLogsForUser,
  getMyActivity
};
