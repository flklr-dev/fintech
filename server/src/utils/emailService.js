const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create a transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send OTP verification email
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} otp - One Time Password
 * @returns {Promise} - Email send operation promise
 */
exports.sendOTPEmail = async (to, name, otp) => {
  try {
    const mailOptions = {
      from: `Fintech App <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Verify Your Fintech Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3770FF;">Verify Your Account</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
            <p>Hello ${name},</p>
            <p>Thank you for registering with Fintech App! Please use the verification code below to complete your registration:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #3770FF; background-color: #e6eeff; padding: 15px; border-radius: 8px; display: inline-block;">${otp}</div>
            </div>
            
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          
          <div style="color: #666; font-size: 12px; text-align: center;">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Fintech App. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} otp - One Time Password for reset
 * @returns {Promise} - Email send operation promise
 */
exports.sendPasswordResetEmail = async (to, name, otp) => {
  try {
    const mailOptions = {
      from: `Fintech App <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Reset Your Fintech Account Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3770FF;">Password Reset Request</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
            <p>Hello ${name},</p>
            <p>We received a request to reset your Fintech App password. Please use the verification code below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #3770FF; background-color: #e6eeff; padding: 15px; border-radius: 8px; display: inline-block;">${otp}</div>
            </div>
            
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          
          <div style="color: #666; font-size: 12px; text-align: center;">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Fintech App. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}; 