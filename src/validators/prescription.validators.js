const { body, query } = require('express-validator');

const prescriptionItemRules = body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array');

const createPrescriptionValidation = [
  body('patientId').trim().notEmpty().withMessage('patientId is required'),
  body('doctorId').trim().notEmpty().withMessage('doctorId is required'),
  body('appointmentId').optional().isString(),
  body('notes').optional().isString(),
  prescriptionItemRules,
  body('items.*.itemId').trim().notEmpty().withMessage('itemId is required for each item'),
  body('items.*.quantity').isInt({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('items.*.dosage').trim().notEmpty().withMessage('dosage is required'),
  body('items.*.frequency').trim().notEmpty().withMessage('frequency is required'),
  body('items.*.duration').trim().notEmpty().withMessage('duration is required'),
  body('items.*.instructions').optional().isString()
];

const listPrescriptionsValidation = [
  query('patientId').optional().isString(),
  query('doctorId').optional().isString(),
  query('dispensed').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 })
];

module.exports = {
  createPrescriptionValidation,
  listPrescriptionsValidation
};
