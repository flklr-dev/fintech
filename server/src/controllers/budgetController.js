const Budget = require('../models/Budget');
const { catchAsync } = require('../utils/catchAsync');

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

  console.log('Budget query:', query);
  const budgets = await Budget.find(query);
  console.log('Found budgets count:', budgets.length);

  // Calculate current spending for each budget
  const budgetsWithSpending = await Promise.all(budgets.map(async (budget) => {
    const spending = await budget.getCurrentSpending();
    const budgetObj = budget.toObject();
    return {
      ...budgetObj,
      currentSpending: spending,
      remainingAmount: budget.getRemainingBudget(spending),
      utilizationPercentage: budget.getUtilizationPercentage(spending)
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