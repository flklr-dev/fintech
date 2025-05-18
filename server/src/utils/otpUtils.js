/**
 * Generate a random numeric OTP of specified length
 * @param {number} length - Length of OTP to generate
 * @returns {string} - Generated OTP
 */
exports.generateOTP = (length = 6) => {
  // Generate OTP of specified length
  const characters = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += characters[Math.floor(Math.random() * characters.length)];
  }
  
  return otp;
};

/**
 * Check if OTP is expired
 * @param {Date} expiryDate - OTP expiry timestamp
 * @returns {boolean} - Whether OTP is expired
 */
exports.isOTPExpired = (expiryDate) => {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
};

/**
 * Generate expiry date for OTP (10 minutes from now)
 * @returns {Date} - Expiry date
 */
exports.generateOTPExpiry = () => {
  const now = new Date();
  return new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
};

/**
 * Validate OTP code format
 * @param {string} otp - OTP to validate
 * @returns {boolean} - Whether OTP is valid format
 */
exports.isValidOTPFormat = (otp) => {
  // Check if OTP is 6 digits
  return /^\d{6}$/.test(otp);
}; 