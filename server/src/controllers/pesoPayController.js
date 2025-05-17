const BankCard = require('../models/BankCard');
const BankAccount = require('../models/BankAccount');

// Get all linked cards for a user
exports.getLinkedCards = async (req, res) => {
  try {
    const cards = await BankCard.find({ user: req.user._id });
    
    res.status(200).json({
      status: 'success',
      data: {
        cards
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Link a new card
exports.linkCard = async (req, res) => {
  try {
    // Add user ID to the card
    req.body.user = req.user._id;
    
    // Extract last 4 digits for display
    const cardNumber = req.body.cardNumber;
    req.body.lastFourDigits = cardNumber.slice(-4);
    
    // Determine card type
    if (cardNumber.startsWith('4')) {
      req.body.cardType = 'VISA';
    } else if (cardNumber.startsWith('5')) {
      req.body.cardType = 'MASTERCARD';
    } else if (cardNumber.startsWith('3')) {
      req.body.cardType = 'AMEX';
    } else {
      req.body.cardType = 'OTHER';
    }
    
    const newCard = await BankCard.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        card: newCard
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a card
exports.removeCard = async (req, res) => {
  try {
    const card = await BankCard.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!card) {
      return res.status(404).json({
        status: 'fail',
        message: 'No card found with that ID'
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

// Set default card
exports.setDefaultCard = async (req, res) => {
  try {
    // First, unset all default cards for this user
    await BankCard.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );
    
    // Then set the selected card as default
    const card = await BankCard.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      { isDefault: true },
      { new: true }
    );
    
    if (!card) {
      return res.status(404).json({
        status: 'fail',
        message: 'No card found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        card
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all linked bank accounts for a user
exports.getLinkedAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ user: req.user._id });
    
    res.status(200).json({
      status: 'success',
      data: {
        accounts
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Link a new bank account
exports.linkAccount = async (req, res) => {
  try {
    // Add user ID to the account
    req.body.user = req.user._id;
    
    const newAccount = await BankAccount.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        account: newAccount
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a bank account
exports.removeAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!account) {
      return res.status(404).json({
        status: 'fail',
        message: 'No account found with that ID'
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

// Set default bank account
exports.setDefaultAccount = async (req, res) => {
  try {
    // First, unset all default accounts for this user
    await BankAccount.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );
    
    // Then set the selected account as default
    const account = await BankAccount.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      { isDefault: true },
      { new: true }
    );
    
    if (!account) {
      return res.status(404).json({
        status: 'fail',
        message: 'No account found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
}; 