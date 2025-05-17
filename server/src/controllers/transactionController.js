const Transaction = require('../models/Transaction');

// Get all transactions for a user
exports.getAllTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user._id };

    // Add date range filtering if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });
    
    res.status(200).json({
      status: 'success',
      results: transactions.length,
      data: {
        transactions
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific transaction
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'No transaction found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    // Add user ID to the transaction
    req.body.user = req.user._id;
    
    const newTransaction = await Transaction.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        transaction: newTransaction
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a transaction
exports.updateTransaction = async (req, res) => {
  try {
    // Get original transaction
    const originalTransaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!originalTransaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'No transaction found with that ID'
      });
    }
    
    const transaction = await Transaction.findOneAndUpdate(
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
    
    res.status(200).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'No transaction found with that ID'
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