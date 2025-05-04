const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebaseAdmin');
const config = require('../config/config');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth middleware received token');
    }

    if (!token) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    let decoded;
    let user;

    // First, try to verify as a JWT token (our own token)
    try {
      console.log('Auth middleware: Attempting to verify JWT token');
      decoded = jwt.verify(token, config.JWT_SECRET);
      console.log('Auth middleware: JWT verification successful');
      
      // Check if user still exists
      user = await User.findById(decoded.id);
      if (!user) {
        console.log('Auth middleware: User not found with JWT');
        return res.status(401).json({
          status: 'fail',
          message: 'The user belonging to this token no longer exists.'
        });
      }
      
      console.log('Auth middleware: JWT user found:', user.email);
    } catch (jwtError) {
      console.log('Auth middleware: JWT verification failed, trying Firebase');
      
      // If JWT verification fails, try Firebase verification
      try {
        decoded = await admin.auth().verifyIdToken(token);
        console.log('Auth middleware: Firebase verification successful');
        
        // Find user by email from Firebase token
        user = await User.findOne({ email: decoded.email });
        if (!user) {
          console.log('Auth middleware: User not found with Firebase token');
          return res.status(401).json({
            status: 'fail',
            message: 'The user belonging to this token no longer exists.'
          });
        }
        
        console.log('Auth middleware: Firebase user found:', user.email);
      } catch (firebaseError) {
        console.error('Auth middleware: All verification methods failed');
        console.error('JWT error:', jwtError);
        console.error('Firebase error:', firebaseError);
        
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid token or token expired.'
        });
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware: Unexpected error:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Not authorized'
    });
  }
}; 