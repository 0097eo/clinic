const { body, query } = require('express-validator');

const createItemValidation = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('category').optional().isString(),
  body('unit').optional().isString(),
  body('batchNumber').optional().isString(),
  body('expiryDate').optional().isISO8601(),
  body('stock').optional().isInt({ min: 0 }),
  body('reorderLevel').optional().isInt({ min: 0 })
];

const adjustStockValidation = [
  body('type').isIn(['IN', 'OUT']).withMessage('type must be either IN or OUT'),
  body('quantity').isInt({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('reference').optional().isString()
];

const listItemsValidation = [
  query('category').optional().isString(),
  query('name').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 })
];

module.exports = {
  createItemValidation,
  adjustStockValidation,
  listItemsValidation
};
