const { Router } = require('express');

const {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment
} = require('../controllers/appointment.controller');
const {
  createAppointmentValidation,
  updateAppointmentValidation,
  updateStatusValidation,
  listAppointmentsValidation
} = require('../validators/appointment.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/', authorize('RECEPTIONIST', 'ADMIN'), createAppointmentValidation, validateRequest, createAppointment);
router.get('/', authorize('RECEPTIONIST', 'DOCTOR', 'ACCOUNTANT', 'ADMIN'), listAppointmentsValidation, validateRequest, listAppointments);
router.get('/:id', authorize('RECEPTIONIST', 'DOCTOR', 'ACCOUNTANT', 'ADMIN'), getAppointment);
router.put('/:id', authorize('RECEPTIONIST', 'ADMIN'), updateAppointmentValidation, validateRequest, updateAppointment);
router.patch('/:id/status', authorize('RECEPTIONIST', 'DOCTOR', 'ADMIN'), updateStatusValidation, validateRequest, updateAppointmentStatus);
router.delete('/:id', authorize('RECEPTIONIST', 'ADMIN'), deleteAppointment);

module.exports = router;
