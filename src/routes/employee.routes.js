const { Router } = require('express');

const { listEmployees } = require('../controllers/employee.controller');
const { listEmployeesValidation } = require('../validators/employee.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'),
  listEmployeesValidation,
  validateRequest,
  listEmployees
);

module.exports = router;
