const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  logout,
  updatePassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('accountType')
    .isIn(['individual', 'business'])
    .withMessage('Account type must be either individual or business'),
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
