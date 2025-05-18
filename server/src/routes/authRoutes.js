const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', authController.login);
router.post('/google', authController.googleSignIn);

// Get current user (protected route)
router.get(
  '/me',
  protect,
  authController.getCurrentUser
);

module.exports = router; 