const { query, param } = require('express-validator');
const { AUDIT_ACTIONS } = require('../utils/constants');

const listAuditLogsValidation = [
  query('userId').optional().isString(),
  query('action').optional().isIn(AUDIT_ACTIONS),
  query('entityType').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 200 })
];

const auditLogIdValidation = [param('id').isString().notEmpty()];

const auditEntityValidation = [
  param('entityType').notEmpty().isString(),
  param('entityId').notEmpty().isString()
];

const auditUserValidation = [param('userId').notEmpty().isString()];

const myActivityValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
];

module.exports = {
  listAuditLogsValidation,
  auditLogIdValidation,
  auditEntityValidation,
  auditUserValidation,
  myActivityValidation
};
