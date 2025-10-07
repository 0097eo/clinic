const { body, query } = require('express-validator');
const { LAB_ORDER_STATUSES } = require('../utils/constants');

const createLabOrderValidation = [
  body('patientId').trim().notEmpty().withMessage('patientId is required'),
  body('orderedBy').trim().notEmpty().withMessage('orderedBy is required'),
  body('testType').trim().notEmpty().withMessage('testType is required'),
  body('notes').optional().isString()
];

const updateLabResultValidation = [
  body('result').trim().notEmpty().withMessage('result is required')
];

const listLabOrdersValidation = [
  query('patientId').optional().isString(),
  query('orderedBy').optional().isString(),
  query('status').optional().isIn(LAB_ORDER_STATUSES),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 })
];

module.exports = {
  createLabOrderValidation,
  updateLabResultValidation,
  listLabOrdersValidation
};
