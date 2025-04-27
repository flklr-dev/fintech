const SavingsGoal = require('../models/SavingsGoal');

// Get all savings goals for a user
exports.getAllGoals = async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ user: req.user._id });
    
    res.status(200).json({
      status: 'success',
      results: goals.length,
      data: {
        goals
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific savings goal
exports.getGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        status: 'fail',
        message: 'No savings goal found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new savings goal
exports.createGoal = async (req, res) => {
  try {
    // Validate target date is in the future
    if (new Date(req.body.targetDate) <= new Date()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Target date must be in the future'
      });
    }
    
    // Validate target amount is positive
    if (req.body.targetAmount <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Target amount must be greater than 0'
      });
    }
    
    // Add user ID to the savings goal
    req.body.user = req.user._id;
    
    const newGoal = await SavingsGoal.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        goal: newGoal
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a savings goal
exports.updateGoal = async (req, res) => {
  try {
    // Validate target date if provided
    if (req.body.targetDate && new Date(req.body.targetDate) <= new Date()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Target date must be in the future'
      });
    }
    
    // Validate target amount if provided
    if (req.body.targetAmount && req.body.targetAmount <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Target amount must be greater than 0'
      });
    }
    
    const goal = await SavingsGoal.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!goal) {
      return res.status(404).json({
        status: 'fail',
        message: 'No savings goal found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a savings goal
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        status: 'fail',
        message: 'No savings goal found with that ID'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Add a contribution to a savings goal
exports.addContribution = async (req, res) => {
  try {
    // Validate contribution amount
    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Contribution amount must be greater than 0'
      });
    }
    
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        status: 'fail',
        message: 'No savings goal found with that ID'
      });
    }
    
    await goal.addContribution(req.body.amount, req.body.note);
    
    res.status(200).json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
}; 