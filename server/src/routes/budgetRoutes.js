const express = require('express');
const { protect } = require('../middleware/auth');
const Budget = require('../models/Budget');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Get all budgets for the current user
router.get('/', async (req, res) => {
  try {
    const { period } = req.query;
    const query = { user: req.user._id };
    
    if (period) {
      query.period = period.toLowerCase();
    }
    
    const budgets = await Budget.find(query);
    
    res.status(200).json({
      status: 'success',
      data: budgets
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
    const budget = await Budget.create({
      ...req.body,
      user: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: budget
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get a specific budget
router.get('/:id', async (req, res) => {
  try {
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

    res.status(200).json({
      status: 'success',
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update a budget
router.patch('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
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

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: budget
    });
  } catch (error) {
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