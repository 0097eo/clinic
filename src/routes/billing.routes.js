const { Router } = require('express');

const {
  createBilling,
  listBilling,
  getBilling,
  recordPayment,
  getOutstandingBills
} = require('../controllers/billing.controller');
const {
  createBillingValidation,
  recordPaymentValidation,
  listBillingValidation
} = require('../validators/billing.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/', authorize('ACCOUNTANT', 'ADMIN'), createBillingValidation, validateRequest, createBilling);
router.get('/', authorize('ACCOUNTANT', 'ADMIN'), listBillingValidation, validateRequest, listBilling);
router.get('/outstanding', authorize('ACCOUNTANT', 'ADMIN'), getOutstandingBills);
router.get('/:id', authorize('ACCOUNTANT', 'ADMIN'), getBilling);
router.post('/:id/payment', authorize('ACCOUNTANT', 'ADMIN'), recordPaymentValidation, validateRequest, recordPayment);

module.exports = router;
