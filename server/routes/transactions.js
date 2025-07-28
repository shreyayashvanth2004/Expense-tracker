// server/routes/transactions.js

// Import statements...
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Format amount for display
function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// SPECIFIC ROUTES FIRST (before any parameter routes like /:id)

// @route   GET /api/transactions/check-limits
// @desc    Check if expense limits have been exceeded
// @access  Private
router.get('/check-limits', protect, async (req, res) => {
  try {
    console.log('Checking expense limits for user:', req.user._id);
    const user = await User.findById(req.user._id);
    
    console.log('User expense limits:', user.expenseLimits);
    
    // If no expense limits set or user doesn't have expenseLimits field yet
    if (!user.expenseLimits) {
      console.log('No expense limits found for user');
      return res.json({ exceeded: false, notifications: [] });
    }
    
    // Check if any limits are set
    const hasMonthlyLimit = user.expenseLimits.monthly && user.expenseLimits.monthly.amount > 0;
    const hasCategoryLimits = user.expenseLimits.category && user.expenseLimits.category.some(cat => cat.amount > 0);
    
    console.log('Has monthly limit:', hasMonthlyLimit);
    console.log('Has category limits:', hasCategoryLimits);
    
    if (!hasMonthlyLimit && !hasCategoryLimits) {
      console.log('No active expense limits found');
      return res.json({ exceeded: false, notifications: [] });
    }
    
    // Get current month's transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const transactions = await Transaction.find({
      user: req.user._id,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    console.log('Found expense transactions for this month:', transactions.length);
    
    // Calculate total monthly expenses
    const totalMonthlyExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    console.log('Total monthly expenses:', totalMonthlyExpenses);
    
    // Calculate category expenses
    const categoryExpenses = {};
    transactions.forEach(tx => {
      if (!categoryExpenses[tx.category]) {
        categoryExpenses[tx.category] = 0;
      }
      categoryExpenses[tx.category] += tx.amount;
    });
    
    console.log('Category expenses:', categoryExpenses);
    
    const notifications = [];
    let needToSaveUser = false;
    
    // Check monthly limit
    if (hasMonthlyLimit && totalMonthlyExpenses > user.expenseLimits.monthly.amount) {
      console.log('Monthly limit exceeded!');
      console.log('Current:', totalMonthlyExpenses);
      console.log('Limit:', user.expenseLimits.monthly.amount);
      console.log('Already notified:', user.expenseLimits.monthly.notified);
      
      // Only add notification if not already notified
      if (!user.expenseLimits.monthly.notified) {
        notifications.push({
          type: 'monthly',
          message: `Your monthly expenses of ${formatAmount(totalMonthlyExpenses)} have exceeded your limit of ${formatAmount(user.expenseLimits.monthly.amount)}!`,
          limit: user.expenseLimits.monthly.amount,
          current: totalMonthlyExpenses
        });
        
        // Mark as notified to avoid repeated notifications
        user.expenseLimits.monthly.notified = true;
        needToSaveUser = true;
      }
    }
    
    // Check category limits
    if (hasCategoryLimits) {
      user.expenseLimits.category.forEach((cat, index) => {
        if (cat.amount > 0 && 
            categoryExpenses[cat.name] && 
            categoryExpenses[cat.name] > cat.amount) {
          
          console.log(`Category limit exceeded for "${cat.name}"!`);
          console.log('Current:', categoryExpenses[cat.name]);
          console.log('Limit:', cat.amount);
          console.log('Already notified:', cat.notified);
          
          // Only add notification if not already notified
          if (!cat.notified) {
            notifications.push({
              type: 'category',
              category: cat.name,
              message: `Your expenses of ${formatAmount(categoryExpenses[cat.name])} in category "${cat.name}" have exceeded your limit of ${formatAmount(cat.amount)}!`,
              limit: cat.amount,
              current: categoryExpenses[cat.name]
            });
            
            // Mark as notified to avoid repeated notifications
            user.expenseLimits.category[index].notified = true;
            needToSaveUser = true;
          }
        }
      });
    }
    
    // Save user if notification status changed
    if (needToSaveUser) {
      console.log('Saving user with updated notification flags');
      await user.save();
    }
    
    console.log('Returning notifications:', notifications);
    
    res.json({
      exceeded: notifications.length > 0,
      notifications
    });
  } catch (error) {
    console.error('Error checking expense limits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/recent
// @desc    Get recent transactions
// @access  Private
router.get('/recent', protect, async (req, res) => {
  try {
    // Get limit from query param or default to 5
    const limit = parseInt(req.query.limit) || 5;
    
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ date: -1 })  // Sort by date descending (newest first)
      .limit(limit);       // Limit the number of results
    
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/summary/data
// @desc    Get transaction summary (for analytics)
// @access  Private
router.get('/summary/data', protect, async (req, res) => {
  try {
    // Get current month's transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Get transactions for current month
    const monthlyTransactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    // Calculate total income and expenses
    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const totalExpense = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    // Get category breakdown
    const categories = {};
    monthlyTransactions.forEach(transaction => {
      if (!categories[transaction.category]) {
        categories[transaction.category] = 0;
      }
      
      if (transaction.type === 'expense') {
        categories[transaction.category] += transaction.amount;
      }
    });
    
    // Format for chart.js
    const categoryLabels = Object.keys(categories);
    const categoryData = Object.values(categories);
    
    // Get last 6 months data for trend analysis
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Format monthly data for charts
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'short' });
    }).reverse();
    
    const incomeData = Array(6).fill(0);
    const expenseData = Array(6).fill(0);
    
    monthlyData.forEach(item => {
      const monthIndex = item._id.month - 1;
      const monthsFromNow = new Date().getMonth() - monthIndex;
      const normalizedIndex = monthsFromNow < 0 ? monthsFromNow + 12 : monthsFromNow;
      
      if (normalizedIndex < 6) {
        const arrayIndex = 5 - normalizedIndex;
        if (item._id.type === 'income') {
          incomeData[arrayIndex] = item.total;
        } else {
          expenseData[arrayIndex] = item.total;
        }
      }
    });
    
    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: {
        labels: categoryLabels,
        data: categoryData
      },
      monthlyTrend: {
        labels: months,
        income: incomeData,
        expense: expenseData
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ROOT and PARAMETER ROUTES LAST

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/transactions
// @desc    Add new transaction
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    
    const newTransaction = new Transaction({
      user: req.user._id,
      type,
      amount,
      category,
      description,
      date: date || Date.now()
    });
    
    const transaction = await newTransaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    // Check if transaction exists
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Check if user owns transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    
    // Find transaction by id
    let transaction = await Transaction.findById(req.params.id);
    
    // Check if transaction exists
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Check if user owns transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Update transaction
    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { type, amount, category, description, date },
      { new: true }
    );
    
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    // Check if transaction exists
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Check if user owns transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;