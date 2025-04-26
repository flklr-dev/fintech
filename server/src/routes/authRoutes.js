const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Get current user (protected route)
router.get(
  '/me',
  authController.protect,
  async (req, res) => {
    try {
      // User data is already attached to req by the protect middleware
      const user = req.user;
      
      // Remove sensitive fields
      user.password = undefined;
      
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

module.exports = router; 