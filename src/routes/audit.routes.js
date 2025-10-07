const { Router } = require('express');

const {
  listAuditLogs,
  getAuditLog,
  getLogsForEntity,
  getLogsForUser,
  getMyActivity
} = require('../controllers/audit.controller');
const {
  listAuditLogsValidation,
  auditLogIdValidation,
  auditEntityValidation,
  auditUserValidation,
  myActivityValidation
} = require('../validators/audit.validators');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), listAuditLogsValidation, validateRequest, listAuditLogs);
router.get('/my-activity', myActivityValidation, validateRequest, getMyActivity);
router.get('/entity/:entityType/:entityId', authorize('ADMIN'), auditEntityValidation, validateRequest, getLogsForEntity);
router.get('/user/:userId', authorize('ADMIN'), auditUserValidation, validateRequest, getLogsForUser);
router.get('/:id', authorize('ADMIN'), auditLogIdValidation, validateRequest, getAuditLog);

module.exports = router;
