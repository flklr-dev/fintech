const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['in_progress', 'achieved', 'behind_schedule', 'cancelled'],
    default: 'in_progress'
  },
  contributions: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  autoContribute: {
    enabled: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      min: 0,
      required: function() { return this.autoContribute.enabled; }
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly'],
      required: function() { return this.autoContribute.enabled; }
    }
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    milestones: {
      type: [Number],
      default: [25, 50, 75, 100] // percentage milestones
    }
  },
  notes: {
    type: String,
    trim: true,
    maxLength: 500
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
savingsGoalSchema.index({ user: 1, status: 1 });
savingsGoalSchema.index({ user: 1, targetDate: 1 });

// Virtual for progress percentage
savingsGoalSchema.virtual('progressPercentage').get(function() {
  return (this.currentAmount / this.targetAmount) * 100;
});

// Virtual for remaining amount
savingsGoalSchema.virtual('remainingAmount').get(function() {
  return this.targetAmount - this.currentAmount;
});

// Virtual for monthly required savings
savingsGoalSchema.virtual('monthlyRequiredSavings').get(function() {
  const today = new Date();
  const monthsRemaining = (this.targetDate.getFullYear() - today.getFullYear()) * 12 +
    (this.targetDate.getMonth() - today.getMonth());
  
  if (monthsRemaining <= 0) return 0;
  return (this.targetAmount - this.currentAmount) / monthsRemaining;
});

// Method to add a contribution
savingsGoalSchema.methods.addContribution = function(amount, note = '') {
  this.contributions.push({
    amount,
    note,
    date: new Date()
  });
  this.currentAmount += amount;
  
  // Update status based on progress
  const progress = this.progressPercentage;
  if (progress >= 100) {
    this.status = 'achieved';
  } else {
    const today = new Date();
    const totalDays = (this.targetDate - this.startDate) / (1000 * 60 * 60 * 24);
    const daysPassed = (today - this.startDate) / (1000 * 60 * 60 * 24);
    const expectedProgress = (daysPassed / totalDays) * 100;
    
    this.status = progress >= expectedProgress ? 'in_progress' : 'behind_schedule';
  }
  
  return this.save();
};

// Method to check if goal is achievable
savingsGoalSchema.methods.isAchievable = function() {
  const monthlyRequired = this.monthlyRequiredSavings;
  if (monthlyRequired <= 0) return false;
  
  // You might want to compare this with user's average monthly savings
  // or available income to determine if it's realistically achievable
  return true;
};

const SavingsGoal = mongoose.model('SavingsGoal', savingsGoalSchema);

module.exports = SavingsGoal; 