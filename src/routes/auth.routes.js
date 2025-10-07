const { Router } = require('express');

const { register, login, logout } = require('../controllers/auth.controller');
const { registerValidation, loginValidation } = require('../validators/auth.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', registerValidation, validateRequest, register);

router.post('/login', loginValidation, validateRequest, login);

router.post('/logout', authenticate, logout);

module.exports = router;
