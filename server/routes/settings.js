// server/routes/settings.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/settings/expense-limits
// @desc    Get user's expense limits
// @access  Private
router.get('/expense-limits', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // If expenseLimits doesn't exist yet, initialize it
    if (!user.expenseLimits) {
      user.expenseLimits = {
        monthly: { amount: 0, notified: false },
        category: []
      };
      await user.save();
    }
    
    res.json(user.expenseLimits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/settings/expense-limits/monthly
// @desc    Update monthly expense limit
// @access  Private
router.put('/expense-limits/monthly', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount === undefined || amount < 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Initialize expenseLimits if it doesn't exist
    if (!user.expenseLimits) {
      user.expenseLimits = {
        monthly: { amount: 0, notified: false },
        category: []
      };
    }
    
    // Reset notification flag when limit is updated, but it's not necessary anymore
    // since we're always displaying exceeded limits
    user.expenseLimits.monthly = {
      amount: amount,
      notified: false
    };
    
    await user.save();
    
    res.json(user.expenseLimits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/settings/expense-limits/category
// @desc    Add or update category limit
// @access  Private
router.put('/expense-limits/category', protect, async (req, res) => {
  try {
    const { name, amount } = req.body;
    
    if (!name || amount === undefined || amount < 0) {
      return res.status(400).json({ message: 'Invalid category details' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Initialize expenseLimits if it doesn't exist
    if (!user.expenseLimits) {
      user.expenseLimits = {
        monthly: { amount: 0, notified: false },
        category: []
      };
    }
    
    // Check if category exists
    const categoryIndex = user.expenseLimits.category.findIndex(
      cat => cat.name === name
    );
    
    if (categoryIndex !== -1) {
      // Update existing category
      user.expenseLimits.category[categoryIndex] = {
        name,
        amount,
        notified: false // Reset notification flag, but not necessary anymore
      };
    } else {
      // Add new category
      user.expenseLimits.category.push({
        name,
        amount,
        notified: false
      });
    }
    
    await user.save();
    
    res.json(user.expenseLimits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/settings/expense-limits/category/:name
// @desc    Delete category limit
// @access  Private
router.delete('/expense-limits/category/:name', protect, async (req, res) => {
  try {
    const categoryName = req.params.name;
    
    const user = await User.findById(req.user._id);
    
    if (!user.expenseLimits || !user.expenseLimits.category) {
      return res.status(404).json({ message: 'No category limits found' });
    }
    
    // Filter out the category to delete
    user.expenseLimits.category = user.expenseLimits.category.filter(
      cat => cat.name !== categoryName
    );
    
    await user.save();
    
    res.json(user.expenseLimits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;