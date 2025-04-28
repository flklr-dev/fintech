const User = require('../models/User');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    // User is already attached to request by auth middleware
    const user = req.user;
    
    // Return user data without sensitive information
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({
        status: 'fail',
        message: 'Name is required'
      });
    }
    
    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    );
    
    // Return updated user data
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user profile'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Current password and new password are required'
      });
    }
    
    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isMatch = await user.correctPassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update password'
    });
  }
}; 