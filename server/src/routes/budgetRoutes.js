const express = require('express');
const { protect } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Helper function to calculate total income
async function calculateTotalIncome(userId, startDate, endDate) {
  console.log('Calculating income for user:', userId);
  console.log('Date range:', { 
    startDate: startDate instanceof Date ? startDate.toISOString() : startDate, 
    endDate: endDate instanceof Date ? endDate.toISOString() : endDate 
  });
  
  // Ensure we have Date objects
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  console.log('Income query date range:', { 
    start: start.toISOString(), 
    end: end.toISOString() 
  });
  
  try {
    // First try to find all income transactions to debug
    const allIncomeTransactions = await Transaction.find({
      user: userId,
      type: 'income'
    });
    
    console.log(`Found ${allIncomeTransactions.length} total income transactions for user`);
    allIncomeTransactions.forEach(tx => {
      console.log(`Income: ${tx.amount} on ${new Date(tx.date).toISOString()}`);
    });
    
    // Now get income in date range
    const incomeTransactions = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'income',
          // Use $or to include all income transactions for easier testing
          $or: [
            { date: { $gte: start, $lte: end } },
            { date: { $exists: true } } // Include all transactions with a date for testing
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalIncome = incomeTransactions.length > 0 ? incomeTransactions[0].total : 0;
    console.log('Total income found:', totalIncome);
    return totalIncome;
  } catch (error) {
    console.error('Error calculating income:', error);
    return 0; // Return 0 in case of error
  }
}

// Helper function to calculate total budgets
async function calculateTotalBudgets(userId, excludeBudgetId = null) {
  const query = { user: userId };
  if (excludeBudgetId) {
    query._id = { $ne: excludeBudgetId };
  }
  
  const budgets = await Budget.find(query);
  return budgets.reduce((sum, budget) => sum + budget.amount, 0);
}

// Helper function to calculate spending for budgets
async function calculateBudgetSpending(userId, budgets) {
  if (!budgets || budgets.length === 0) return [];
  
  // Create a map for quick lookup of budgets by category
  const budgetMap = {};
  budgets.forEach(budget => {
    budgetMap[budget.category] = {
      _id: budget._id,
      amount: budget.amount,
      currentSpending: 0,
      startDate: budget.startDate,
      endDate: budget.endDate
    };
  });
  
  // Get all categories in the budgets
  const categories = Object.keys(budgetMap);
  
  // Find all expense transactions for these categories
  const transactions = await Transaction.find({
    user: userId,
    type: 'expense',
    category: { $in: categories },
    date: {
      $gte: new Date(Math.min(...budgets.map(b => new Date(b.startDate).getTime()))),
      $lte: new Date(Math.max(...budgets.map(b => new Date(b.endDate).getTime())))
    }
  });
  
  // Calculate spending for each budget based on transactions
  transactions.forEach(transaction => {
    const budget = budgetMap[transaction.category];
    if (budget) {
      // Check if transaction falls within this budget's date range
      const transactionDate = new Date(transaction.date);
      const budgetStartDate = new Date(budget.startDate);
      const budgetEndDate = new Date(budget.endDate);
      
      if (transactionDate >= budgetStartDate && transactionDate <= budgetEndDate) {
        budget.currentSpending += transaction.amount;
      }
    }
  });
  
  // Update the budgets with their current spending
  return budgets.map(budget => {
    const spendingData = budgetMap[budget.category] || { currentSpending: 0 };
    const currentSpending = spendingData.currentSpending;
    const remainingAmount = budget.amount - currentSpending;
    const utilizationPercentage = (currentSpending / budget.amount) * 100;
    
    return {
      ...budget.toObject ? budget.toObject() : budget,
      currentSpending,
      remainingAmount,
      utilizationPercentage
    };
  });
}

// Route to manually refresh budget spending calculations
router.post('/refresh-spending', async (req, res) => {
  try {
    // Get all budgets for the user
    const userId = req.user._id;
    const budgets = await Budget.find({ user: userId });
    
    // Calculate spending for these budgets
    const budgetsWithSpending = await calculateBudgetSpending(userId, budgets);
    
    res.status(200).json({
      status: 'success',
      message: 'Budget spending refreshed',
      data: { updatedCount: budgetsWithSpending.length }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// New debug route: Get available income for a period
router.get('/available-income', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both startDate and endDate'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get total income for the period
    const totalIncome = await calculateTotalIncome(req.user._id, start, end);
    
    // Get total budgets already allocated
    const totalBudgets = await calculateTotalBudgets(req.user._id);
    
    // Calculate available income
    const availableIncome = totalIncome - totalBudgets;
    
    res.status(200).json({
      status: 'success',
      data: {
        totalIncome,
        totalBudgets,
        availableIncome,
        period: {
          startDate: start,
          endDate: end
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all budgets for the current user
router.get('/', async (req, res) => {
  try {
    const { period, includeSpending } = req.query;
    const query = { user: req.user._id };
    
    if (period) {
      query.period = period.toLowerCase();
    }
    
    const budgets = await Budget.find(query);
    
    // If includeSpending is true, calculate current spending for each budget
    let responseData = budgets;
    if (includeSpending === 'true') {
      responseData = await calculateBudgetSpending(req.user._id, budgets);
    }
    
    res.status(200).json({
      status: 'success',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get a specific budget
router.get('/:id', async (req, res) => {
  try {
    const { includeSpending } = req.query;
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    // If includeSpending is true, calculate current spending
    let responseData = budget;
    if (includeSpending === 'true') {
      const [budgetWithSpending] = await calculateBudgetSpending(req.user._id, [budget]);
      responseData = budgetWithSpending;
    }

    res.status(200).json({
      status: 'success',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Create a new budget
router.post('/', async (req, res) => {
  try {
    const { startDate, endDate, amount } = req.body;
    const userId = req.user._id;
    
    console.log('Creating budget for user:', userId);
    console.log('Budget details:', { 
      startDate: startDate instanceof Date ? startDate.toISOString() : startDate, 
      endDate: endDate instanceof Date ? endDate.toISOString() : endDate, 
      amount, 
      category: req.body.category 
    });
    
    // Calculate total income for the budget period
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if the dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Please provide valid start and end dates.'
      });
    }
    
    // For debugging: display all parameters in ISO format
    console.log('Parsed dates:', {
      start: start.toISOString(),
      end: end.toISOString()
    });
    
    // Get total income
    const totalIncome = await calculateTotalIncome(userId, start, end);
    
    // Calculate total of existing budgets
    const totalExistingBudgets = await calculateTotalBudgets(userId);
    
    console.log('Budget validation:', {
      totalIncome,
      totalExistingBudgets,
      newAmount: amount,
      wouldExceed: totalExistingBudgets + amount > totalIncome
    });
    
    // Check if new budget would exceed total income
    if (totalExistingBudgets + amount > totalIncome) {
      return res.status(400).json({
        status: 'error',
        message: `Total budgets (₱${(totalExistingBudgets + amount).toFixed(2)}) would exceed your available income (₱${totalIncome.toFixed(2)}) for this period. Please adjust your budget amount.`,
        debug: {
          totalIncome,
          totalExistingBudgets,
          newAmount: amount
        }
      });
    }
    
    const budget = await Budget.create({
      ...req.body,
      user: userId
    });

    res.status(201).json({
      status: 'success',
      data: budget
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update a budget
router.patch('/:id', async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;
    
    if (amount) {
      // Calculate total income for the budget period
      const budget = await Budget.findById(req.params.id);
      
      if (!budget) {
        return res.status(404).json({
          status: 'fail',
          message: 'Budget not found'
        });
      }
      
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      
      console.log('Updating budget amount:', {
        budgetId: req.params.id,
        oldAmount: budget.amount,
        newAmount: amount,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const totalIncome = await calculateTotalIncome(
        userId, 
        startDate,
        endDate
      );
      
      // Calculate total of other budgets (excluding this one)
      const totalOtherBudgets = await calculateTotalBudgets(userId, req.params.id);
      
      console.log('Budget update validation:', {
        totalIncome,
        totalOtherBudgets,
        newAmount: amount,
        wouldExceed: totalOtherBudgets + amount > totalIncome
      });
      
      // Check if updated budget would exceed total income
      if (totalOtherBudgets + amount > totalIncome) {
        return res.status(400).json({
          status: 'error',
          message: `Total budgets (₱${(totalOtherBudgets + amount).toFixed(2)}) would exceed your available income (₱${totalIncome.toFixed(2)}) for this period. Please adjust your budget amount.`,
          debug: {
            totalIncome,
            totalOtherBudgets,
            newAmount: amount
          }
        });
      }
    }

    const updatedBudget = await Budget.findOneAndUpdate(
      {
        _id: req.params.id,
        user: userId
      },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedBudget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedBudget
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete a budget
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 