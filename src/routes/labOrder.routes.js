const { Router } = require('express');

const {
  createLabOrder,
  listLabOrders,
  getLabOrder,
  updateLabResult
} = require('../controllers/labOrder.controller');
const {
  createLabOrderValidation,
  updateLabResultValidation,
  listLabOrdersValidation
} = require('../validators/labOrder.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/', authorize('DOCTOR', 'ADMIN'), createLabOrderValidation, validateRequest, createLabOrder);
router.get('/', authorize('DOCTOR', 'PHARMACIST', 'ADMIN'), listLabOrdersValidation, validateRequest, listLabOrders);
router.get('/:id', authorize('DOCTOR', 'PHARMACIST', 'ADMIN'), getLabOrder);
router.put('/:id/result', authorize('DOCTOR', 'ADMIN'), updateLabResultValidation, validateRequest, updateLabResult);

module.exports = router;
