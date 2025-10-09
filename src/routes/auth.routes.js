const { Router } = require('express');

const { register, login, logout, getProfile, updateProfile, changePassword } = require('../controllers/auth.controller');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../validators/auth.validators');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', optionalAuthenticate, registerValidation, validateRequest, register);

router.post('/login', loginValidation, validateRequest, login);

router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getProfile);

router.put('/me', authenticate, updateProfileValidation, validateRequest, updateProfile);

router.patch('/change-password', authenticate, changePasswordValidation, validateRequest, changePassword);

module.exports = router;
