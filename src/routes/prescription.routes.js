const { Router } = require('express');

const {
  createPrescription,
  listPrescriptions,
  getPrescription,
  dispensePrescription
} = require('../controllers/prescription.controller');
const {
  createPrescriptionValidation,
  listPrescriptionsValidation
} = require('../validators/prescription.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/', authorize('DOCTOR', 'ADMIN'), createPrescriptionValidation, validateRequest, createPrescription);
router.get('/', authorize('DOCTOR', 'PHARMACIST', 'ADMIN'), listPrescriptionsValidation, validateRequest, listPrescriptions);
router.get('/:id', authorize('DOCTOR', 'PHARMACIST', 'ADMIN'), getPrescription);
router.post('/:id/dispense', authorize('PHARMACIST', 'ADMIN'), dispensePrescription);

module.exports = router;
