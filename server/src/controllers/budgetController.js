const Budget = require('../models/Budget');
const { catchAsync } = require('../utils/catchAsync');
const Transaction = require('../models/Transaction');

exports.createBudget = catchAsync(async (req, res) => {
  const {
    category,
    amount,
    period,
    startDate,
    endDate,
    isRecurring,
    notifications
  } = req.body;

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Start date must be before end date'
    });
  }

  // Validate amount
  if (amount <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Amount must be greater than 0'
    });
  }

  const budget = await Budget.create({
    user: req.user._id,
    category,
    amount,
    period,
    startDate,
    endDate,
    notifications: {
      enabled: notifications?.enabled ?? true,
      threshold: notifications?.threshold ?? 80
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      budget
    }
  });
});

exports.getBudgets = catchAsync(async (req, res) => {
  const { period, status } = req.query;
  const query = { user: req.user._id };

  if (period) {
    query.period = period;
  }

  const budgets = await Budget.find(query);

  // For each budget, calculate spending-related properties
  const budgetsWithSpending = await Promise.all(budgets.map(async (budget) => {
    // Get transactions in budget's date range and category
    const transactions = await Transaction.find({
      user: req.user._id,
      type: 'expense',
      category: budget.category,
      date: {
        $gte: new Date(budget.startDate),
        $lte: new Date(budget.endDate)
      }
    });
    
    // Calculate current spending
    const spending = transactions.reduce((total, tx) => total + tx.amount, 0);
    
    // Convert budget to object and add calculated properties
    const budgetObj = budget.toObject();
    return {
      ...budgetObj,
      currentSpending: spending,
      remainingAmount: budget.amount - spending,
      utilizationPercentage: (spending / budget.amount) * 100
    };
  }));

  res.status(200).json({
    status: 'success',
    data: budgetsWithSpending
  });
});

exports.updateBudget = catchAsync(async (req, res) => {
  const { budgetId } = req.params;
  const updates = req.body;

  // Prevent updating user field
  delete updates.user;

  const budget = await Budget.findOneAndUpdate(
    { _id: budgetId, user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!budget) {
    return res.status(404).json({
      status: 'error',
      message: 'Budget not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      budget
    }
  });
});

exports.deleteBudget = catchAsync(async (req, res) => {
  const { budgetId } = req.params;

  const budget = await Budget.findOneAndDelete({
    _id: budgetId,
    user: req.user._id
  });

  if (!budget) {
    return res.status(404).json({
      status: 'error',
      message: 'Budget not found'
    });
  }

  res.status(204).send();
}); 