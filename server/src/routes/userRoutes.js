const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get user profile
router.get('/profile', userController.getUserProfile);

// Update user profile
router.patch('/profile', userController.updateUserProfile);

// Change password
router.patch('/change-password', userController.changePassword);

module.exports = router; 