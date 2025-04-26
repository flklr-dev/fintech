const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Food & Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Other']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'mobile_payment', 'other'],
    default: 'cash'
  },
  location: {
    type: String,
    trim: true
  },
  attachments: [{
    type: String, // URL to stored file
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      required: function() { return this.isRecurring; }
    },
    endDate: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });
expenseSchema.index({ user: 1, isRecurring: 1 });

// Virtual for formatted date
expenseSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

// Method to check if expense is within budget
expenseSchema.methods.isWithinBudget = async function(Budget) {
  const startOfMonth = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
  const endOfMonth = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0);
  
  const budget = await Budget.findOne({
    user: this.user,
    category: this.category,
    period: 'monthly',
    startDate: { $lte: this.date },
    endDate: { $gte: this.date }
  });

  if (!budget) return true; // No budget set means no limit

  const expenses = await this.constructor.aggregate([
    {
      $match: {
        user: this.user,
        category: this.category,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalExpenses = expenses.length > 0 ? expenses[0].total : 0;
  return (totalExpenses + this.amount) <= budget.amount;
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense; 