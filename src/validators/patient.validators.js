const { body, query } = require('express-validator');

const createPatientValidation = [
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('gender').trim().notEmpty().withMessage('gender is required'),
  body('dateOfBirth').isISO8601().withMessage('dateOfBirth must be a valid date'),
  body('phone').trim().notEmpty().withMessage('phone is required'),
  body('email').optional().isEmail().withMessage('email must be valid'),
  body('idNumber').optional().isString().trim(),
  body('nhifNumber').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('emergencyContact').optional().isObject(),
  body('medicalHistory').optional().isString()
];

const updatePatientValidation = [
  body('fullName').optional().trim().notEmpty(),
  body('gender').optional().trim().notEmpty(),
  body('dateOfBirth').optional().isISO8601(),
  body('phone').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('idNumber').optional().isString().trim(),
  body('nhifNumber').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('emergencyContact').optional().isObject(),
  body('medicalHistory').optional().isString()
];

const searchPatientValidation = [
  query('q').trim().notEmpty().withMessage('Search query q is required')
];

module.exports = {
  createPatientValidation,
  updatePatientValidation,
  searchPatientValidation
};
