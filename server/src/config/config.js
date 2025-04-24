const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/fintech',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Encryption settings
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your_aes_256_encryption_key_change_in_production',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100 // limit each IP to 100 requests per windowMs
}; 