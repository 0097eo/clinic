const { query } = require('express-validator');
const { EMPLOYEE_ROLES } = require('../utils/constants');

const listEmployeesValidation = [
  query('role')
    .optional()
    .isIn(EMPLOYEE_ROLES)
    .withMessage(`role must be one of: ${EMPLOYEE_ROLES.join(', ')}`)
];

module.exports = {
  listEmployeesValidation
};
