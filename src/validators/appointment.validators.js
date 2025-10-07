const { body, query, param } = require('express-validator');
const { APPOINTMENT_STATUSES } = require('../utils/constants');

const createAppointmentValidation = [
  body('patientId').trim().notEmpty().withMessage('patientId is required'),
  body('doctorId').trim().notEmpty().withMessage('doctorId is required'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('date').isISO8601().withMessage('date must be a valid date'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('time must be in HH:MM format'),
  body('notes').optional().isString()
];

const updateAppointmentValidation = [
  body('department').optional().trim().notEmpty(),
  body('date').optional().isISO8601(),
  body('time').optional().matches(/^\d{2}:\d{2}$/),
  body('notes').optional().isString()
];

const updateStatusValidation = [
  param('id').trim().notEmpty(),
  body('status')
    .isIn(APPOINTMENT_STATUSES)
    .withMessage(`status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`),
  body('notes').optional().isString()
];

const listAppointmentsValidation = [
  query('status').optional().isIn(APPOINTMENT_STATUSES),
  query('doctorId').optional().isString(),
  query('patientId').optional().isString(),
  query('date').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 })
];

module.exports = {
  createAppointmentValidation,
  updateAppointmentValidation,
  updateStatusValidation,
  listAppointmentsValidation
};
