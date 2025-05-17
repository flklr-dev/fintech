const mongoose = require('mongoose');

const bankCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Card must belong to a user']
  },
  cardNumber: {
    type: String,
    required: [true, 'Card number is required'],
    validate: {
      validator: function(v) {
        // Basic Luhn algorithm validation
        let sum = 0;
        let isEven = false;
        
        // Loop through values starting from the rightmost digit
        for (let i = v.length - 1; i >= 0; i--) {
          let digit = parseInt(v[i]);
          
          if (isEven) {
            digit *= 2;
            if (digit > 9) {
              digit -= 9;
            }
          }
          
          sum += digit;
          isEven = !isEven;
        }
        
        return sum % 10 === 0;
      },
      message: 'Invalid card number'
    }
  },
  cardType: {
    type: String,
    enum: ['VISA', 'MASTERCARD', 'AMEX', 'OTHER'],
    required: true
  },
  cardholderName: {
    type: String,
    required: [true, 'Cardholder name is required']
  },
  expiryDate: {
    type: String,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(v) {
        // Format: MM/YY
        const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        if (!regex.test(v)) return false;
        
        const [month, year] = v.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        
        if (parseInt(year) < currentYear) return false;
        if (parseInt(year) === currentYear && parseInt(month) < currentMonth) return false;
        
        return true;
      },
      message: 'Invalid expiry date'
    }
  },
  lastFourDigits: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required']
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
bankCardSchema.index({ user: 1, isDefault: 1 });

const BankCard = mongoose.model('BankCard', bankCardSchema);

module.exports = BankCard; 