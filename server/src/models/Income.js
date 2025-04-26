const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Income must be associated with a user']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Salary', 'Freelance', 'Investment', 'Business', 'Rental', 'Other'],
      message: '{VALUE} is not a valid income category'
    }
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: {
      values: ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'],
      message: '{VALUE} is not a valid recurring frequency'
    },
    default: 'None'
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
      required: function() { return this.isRecurring; }
    },
    nextDate: {
      type: Date,
      required: function() { return this.isRecurring; }
    },
    endDate: {
      type: Date
    }
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'check', 'digital_payment', 'other'],
    required: true
  },
  attachments: [{
    type: String, // URL to stored file
    trim: true
  }],
  taxable: {
    type: Boolean,
    default: true
  },
  taxCategory: {
    type: String,
    enum: ['employment', 'self_employment', 'investment', 'rental', 'other'],
    required: function() { return this.taxable; }
  },
  status: {
    type: String,
    enum: ['pending', 'received', 'cancelled'],
    default: 'received'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for formatted amount
incomeSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Pre-save middleware to handle recurring frequency
incomeSchema.pre('save', function(next) {
  if (!this.isRecurring) {
    this.recurringFrequency = 'None';
  }
  next();
});

// Indexes for efficient querying
incomeSchema.index({ user: 1, date: -1 });
incomeSchema.index({ user: 1, category: 1 });

// Virtual for formatted date
incomeSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

// Method to calculate next occurrence for recurring income
incomeSchema.methods.calculateNextOccurrence = function() {
  if (!this.isRecurring) return null;

  const currentDate = this.recurringDetails.nextDate || this.date;
  let nextDate = new Date(currentDate);

  switch (this.recurringDetails.frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};

// Method to check if income is still active
incomeSchema.methods.isActive = function() {
  if (!this.isRecurring) return false;
  if (!this.recurringDetails.endDate) return true;
  return new Date() <= this.recurringDetails.endDate;
};

const Income = mongoose.model('Income', incomeSchema);

module.exports = Income; 