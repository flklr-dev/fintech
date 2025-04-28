const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Get current user (protected route)
router.get(
  '/me',
  authController.protect,
  authController.getCurrentUser
);

module.exports = router; 