const mongoose = require('mongoose');
const crypto = require('crypto-js');
const config = require('../config/config');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Transaction must belong to a user']
  },
  amount: {
    type: Number,
    required: [true, 'Transaction must have an amount']
  },
  type: {
    type: String,
    required: [true, 'Transaction must have a type'],
    enum: ['income', 'expense']
  },
  category: {
    type: String,
    required: [true, 'Transaction must have a category']
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Encrypted fields will be stored as strings
  encryptedData: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt sensitive transaction data before saving
transactionSchema.pre('save', function(next) {
  // Data to encrypt
  const sensitiveData = {
    amount: this.amount,
    description: this.description,
    category: this.category
  };
  
  // Encrypt the data using AES-256
  this.encryptedData = crypto.AES.encrypt(
    JSON.stringify(sensitiveData),
    config.ENCRYPTION_KEY
  ).toString();
  
  next();
});

// Add a virtual property to decrypt the data
transactionSchema.virtual('decryptedData').get(function() {
  if (!this.encryptedData) return null;
  
  const bytes = crypto.AES.decrypt(this.encryptedData, config.ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(crypto.enc.Utf8));
});

// Add index for faster queries
transactionSchema.index({ user: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 