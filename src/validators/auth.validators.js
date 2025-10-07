const { body } = require('express-validator');
const { EMPLOYEE_ROLES } = require('../utils/constants');

const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(EMPLOYEE_ROLES)
    .withMessage(`Role must be one of: ${EMPLOYEE_ROLES.join(', ')}`),
  body('phone').optional().isString().trim(),
  body('department').optional().isString().trim()
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = {
  registerValidation,
  loginValidation
};
