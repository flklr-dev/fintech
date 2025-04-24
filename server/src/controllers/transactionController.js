const Transaction = require('../models/Transaction');

// Get all transactions for a user
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });
    
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
      user: req.user.id
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
    req.body.user = req.user.id;
    
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
    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id
      },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
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

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
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