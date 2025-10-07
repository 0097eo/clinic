const { Router } = require('express');

const {
  createPatient,
  listPatients,
  getPatient,
  updatePatient,
  searchPatients
} = require('../controllers/patient.controller');
const {
  createPatientValidation,
  updatePatientValidation,
  searchPatientValidation
} = require('../validators/patient.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/', authorize('RECEPTIONIST', 'ADMIN'), createPatientValidation, validateRequest, createPatient);
router.get('/', authorize('RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'ADMIN'), listPatients);
router.get('/search', authorize('RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'ADMIN'), searchPatientValidation, validateRequest, searchPatients);
router.get('/:id', authorize('RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'ADMIN'), getPatient);
router.put('/:id', authorize('RECEPTIONIST', 'ADMIN'), updatePatientValidation, validateRequest, updatePatient);

module.exports = router;
