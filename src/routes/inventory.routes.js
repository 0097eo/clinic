const { Router } = require('express');

const {
  createItem,
  listItems,
  getLowStockItems,
  adjustStock,
  getExpiringItems
} = require('../controllers/inventory.controller');
const {
  createItemValidation,
  adjustStockValidation,
  listItemsValidation
} = require('../validators/inventory.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/', authorize('PHARMACIST', 'ADMIN'), createItemValidation, validateRequest, createItem);
router.get('/', authorize('PHARMACIST', 'DOCTOR', 'ADMIN'), listItemsValidation, validateRequest, listItems);
router.get('/low-stock', authorize('PHARMACIST', 'ADMIN'), getLowStockItems);
router.post('/:id/stock', authorize('PHARMACIST', 'ADMIN'), adjustStockValidation, validateRequest, adjustStock);
router.get('/expiring', authorize('PHARMACIST', 'ADMIN'), getExpiringItems);

module.exports = router;
