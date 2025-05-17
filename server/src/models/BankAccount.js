const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Account must belong to a user']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    validate: {
      validator: function(v) {
        // Basic validation for account number (adjust based on your requirements)
        return /^\d{10,20}$/.test(v);
      },
      message: 'Invalid account number'
    }
  },
  accountType: {
    type: String,
    enum: ['SAVINGS', 'CHECKING'],
    required: [true, 'Account type is required']
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required']
  },
  accountName: {
    type: String,
    required: [true, 'Account name is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
bankAccountSchema.index({ user: 1, isDefault: 1 });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

module.exports = BankAccount; 