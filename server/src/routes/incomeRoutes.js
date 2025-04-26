const express = require('express');
const { protect } = require('../middleware/auth');
const Income = require('../models/Income');
const router = express.Router();

// Protect all routes
router.use(protect);

// Get all income entries with filters
router.get('/', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      source,
      category,
      page = 1,
      limit = 10
    } = req.query;

    const query = { user: req.user._id };

    // Apply filters if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (source) query.source = source;
    if (category) query.category = category;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const income = await Income.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Income.countDocuments(query);

    res.json({
      results: income,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new income entry
router.post('/', async (req, res) => {
  try {
    const income = new Income({
      ...req.body,
      user: req.user._id
    });
    const savedIncome = await income.save();
    res.status(201).json(savedIncome);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get income statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = {};

    if (startDate && endDate) {
      dateMatch.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Income.aggregate([
      {
        $match: {
          user: req.user._id,
          ...dateMatch
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          count: 1,
          avgAmount: { $round: ['$avgAmount', 2] },
          _id: 0
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly income totals
router.get('/monthly', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const monthlyTotals = await Income.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          total: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json(monthlyTotals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single income entry
router.get('/:id', async (req, res) => {
  try {
    const income = await Income.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-__v');

    if (!income) {
      return res.status(404).json({ message: 'Income entry not found' });
    }

    res.json(income);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update income entry
router.patch('/:id', async (req, res) => {
  try {
    const income = await Income.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!income) {
      return res.status(404).json({ message: 'Income entry not found' });
    }

    res.json(income);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete income entry
router.delete('/:id', async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!income) {
      return res.status(404).json({ message: 'Income entry not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 