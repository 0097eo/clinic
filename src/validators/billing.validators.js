const { body, query } = require('express-validator');
const { PAYMENT_MODES, BILLING_STATUSES } = require('../utils/constants');

const createBillingValidation = [
  body('patientId').trim().notEmpty().withMessage('patientId is required'),
  body('appointmentId').optional().isString(),
  body('paymentMode')
    .isIn(PAYMENT_MODES)
    .withMessage(`paymentMode must be one of: ${PAYMENT_MODES.join(', ')}`),
  body('totalAmount').isFloat({ gt: 0 }).withMessage('totalAmount must be greater than 0'),
  body('paidAmount').optional().isFloat({ min: 0 }),
  body('status')
    .optional()
    .isIn(BILLING_STATUSES)
    .withMessage(`status must be one of: ${BILLING_STATUSES.join(', ')}`)
];

const recordPaymentValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('method').isIn(PAYMENT_MODES).withMessage(`method must be one of: ${PAYMENT_MODES.join(', ')}`),
  body('reference').optional().isString().trim()
];

const listBillingValidation = [
  query('status').optional().isIn(BILLING_STATUSES),
  query('patientId').optional().isString(),
  query('appointmentId').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 })
];

module.exports = {
  createBillingValidation,
  recordPaymentValidation,
  listBillingValidation
};
