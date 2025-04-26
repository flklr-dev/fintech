const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Food & Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Other']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    required: true,
    enum: ['weekly', 'monthly', 'yearly']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    threshold: {
      type: Number,
      default: 80, // percentage
      min: 1,
      max: 100
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
budgetSchema.index({ user: 1, category: 1, period: 1 });

// Method to check if budget is exceeded
budgetSchema.methods.isExceeded = function(currentSpending) {
  return currentSpending > this.amount;
};

// Method to calculate remaining budget
budgetSchema.methods.getRemainingBudget = function(currentSpending) {
  return this.amount - currentSpending;
};

// Method to calculate budget utilization percentage
budgetSchema.methods.getUtilizationPercentage = function(currentSpending) {
  return (currentSpending / this.amount) * 100;
};

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget; 