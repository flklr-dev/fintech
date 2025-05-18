const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const config = require('../config/config');
const admin = require('../config/firebaseAdmin');
const emailService = require('../utils/emailService');
const otpUtils = require('../utils/otpUtils');

// Create a token for a user ID
const signToken = id => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// Create and send a token to the client
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from the output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Signup user
exports.signup = async (req, res) => {
  try {
    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      // If user exists but is not verified, allow re-registration
      if (!existingUser.isVerified && existingUser.authProvider === 'local') {
        await User.deleteOne({ _id: existingUser._id });
      } else {
        return res.status(400).json({
          status: 'fail',
          message: 'Email already exists. Please use a different email or login.'
        });
      }
    }

    // Create a new user with verification status set to false
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      isVerified: false, // User is not verified until OTP is confirmed
      authProvider: 'local'
    });

    // Generate OTP for verification
    const otp = otpUtils.generateOTP();
    const otpExpiry = otpUtils.generateOTPExpiry();

    // Save OTP to user document
    newUser.otp = {
      code: otp,
      expiresAt: otpExpiry,
      attempts: 0
    };
    
    await newUser.save({ validateBeforeSave: false });

    // Send OTP email
    try {
      await emailService.sendOTPEmail(newUser.email, newUser.name, otp);

      // Send response without token (user is not fully registered yet)
      res.status(201).json({
        status: 'success',
        message: 'Registration initiated. Please verify your email with the OTP sent.',
        data: {
          userId: newUser._id,
          email: newUser.email
        }
      });
    } catch (emailError) {
      // If email sending fails, delete the user and return error
      await User.deleteOne({ _id: newUser._id });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send verification email. Please try again later.'
      });
    }
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Verify OTP and complete registration
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    // Validate input
    if (!userId || !otp) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID and OTP are required'
      });
    }

    // Validate OTP format
    if (!otpUtils.isValidOTPFormat(otp)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid OTP format. Must be 6 digits.'
      });
    }

    // Find user with the provided ID and include OTP fields
    const user = await User.findById(userId).select('+otp.code +otp.expiresAt +otp.attempts');

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        status: 'fail',
        message: 'User is already verified'
      });
    }

    // Check if OTP is expired
    if (otpUtils.isOTPExpired(user.otp.expiresAt)) {
      return res.status(400).json({
        status: 'fail',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check if too many attempts
    if (user.otp.attempts >= 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (user.otp.code !== otp) {
      // Increment attempts counter
      user.otp.attempts += 1;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        status: 'fail',
        message: 'Invalid OTP',
        attemptsLeft: 5 - user.otp.attempts
      });
    }

    // OTP is valid - mark user as verified
    user.isVerified = true;
    
    // Clear OTP data
    user.otp = undefined;
    
    await user.save({ validateBeforeSave: false });

    // Generate authentication token
    createSendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to verify OTP'
    });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        status: 'fail',
        message: 'User is already verified'
      });
    }

    // Generate new OTP
    const otp = otpUtils.generateOTP();
    const otpExpiry = otpUtils.generateOTPExpiry();

    // Update user with new OTP
    user.otp = {
      code: otp,
      expiresAt: otpExpiry,
      attempts: 0
    };

    await user.save({ validateBeforeSave: false });

    // Send OTP email
    await emailService.sendOTPEmail(user.email, user.name, otp);

    res.status(200).json({
      status: 'success',
      message: 'OTP has been resent to your email'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to resend OTP'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }
    
    // Check if user is verified for local auth
    if (user.authProvider === 'local' && !user.isVerified) {
      // Generate new OTP for verification
      const otp = otpUtils.generateOTP();
      const otpExpiry = otpUtils.generateOTPExpiry();

      // Save OTP to user document
      user.otp = {
        code: otp,
        expiresAt: otpExpiry,
        attempts: 0
      };
      
      await user.save({ validateBeforeSave: false });

      // Send OTP email
      await emailService.sendOTPEmail(user.email, user.name, otp);

      return res.status(403).json({
        status: 'fail',
        message: 'Account not verified. A new verification code has been sent to your email.',
        requiresVerification: true,
        data: {
          userId: user._id,
          email: user.email
        }
      });
    }
    
    // Send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Protect routes - verify token
exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }
    
    // Verify token
    const decoded = await promisify(jwt.verify)(token, config.JWT_SECRET);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }
    
    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Not authorized'
    });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    // User data is already attached to req by the protect middleware
    const user = req.user;
    
    // Remove sensitive fields
    user.password = undefined;
    
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
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

exports.googleSignIn = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google token is required'
      });
    }
    
    // Verify the Google token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, picture } = decodedToken;
    
    // Check if user exists with this email
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        email,
        name,
        photo: picture,
        authProvider: 'google',
        isVerified: true
      });
    } else if (user.authProvider !== 'google') {
      // If user exists but registered with different method, link the accounts
      user.authProvider = 'google';
      user.isVerified = true;
      await user.save();
    }
    
    // Generate JWT token for our API
    const authToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      status: 'success',
      token: authToken,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          photo: user.photo
        }
      }
    });
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message || 'Failed to authenticate with Google'
    });
  }
}; 