// server/routes/limits.js
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

// @route   GET /api/limits/check
// @desc    Check if expense limits have been exceeded
// @access  Private
router.get('/check', protect, async (req, res) => {
  try {
    console.log('Checking expense limits for user:', req.user._id);
    const user = await User.findById(req.user._id);
    
    // Debug: Log all expense limits
    console.log('User expense limits:', JSON.stringify(user.expenseLimits, null, 2));
    
    // If no expense limits set or user doesn't have expenseLimits field yet
    if (!user.expenseLimits) {
      console.log('No expense limits found for user');
      return res.json({ exceeded: false, notifications: [] });
    }
    
    // Check if any limits are set
    const hasMonthlyLimit = user.expenseLimits.monthly && user.expenseLimits.monthly.amount > 0;
    const hasCategoryLimits = user.expenseLimits.category && user.expenseLimits.category.some(cat => cat.amount > 0);
    
    console.log('Has monthly limit:', hasMonthlyLimit, 'Amount:', user.expenseLimits.monthly?.amount);
    console.log('Has category limits:', hasCategoryLimits);
    if (hasCategoryLimits) {
      console.log('Category limits:', user.expenseLimits.category.map(c => 
        `${c.name}: ${c.amount} (notified: ${c.notified})`).join(', '));
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
    
    console.log('Category expenses:', JSON.stringify(categoryExpenses, null, 2));
    
    const notifications = [];
    
    // Check monthly limit - ALWAYS show notification if exceeded
    if (hasMonthlyLimit && totalMonthlyExpenses > user.expenseLimits.monthly.amount) {
      console.log('Monthly limit exceeded!', 
                  'Current:', totalMonthlyExpenses, 
                  'Limit:', user.expenseLimits.monthly.amount);
      
      notifications.push({
        type: 'monthly',
        message: `Your monthly expenses of ${formatAmount(totalMonthlyExpenses)} have exceeded your limit of ${formatAmount(user.expenseLimits.monthly.amount)}!`,
        limit: user.expenseLimits.monthly.amount,
        current: totalMonthlyExpenses
      });
    } else if (hasMonthlyLimit) {
      console.log('Monthly limit not exceeded. Current:', totalMonthlyExpenses, 'Limit:', user.expenseLimits.monthly.amount);
    }
    
    // Check category limits - ALWAYS show notification if exceeded
    if (hasCategoryLimits) {
      user.expenseLimits.category.forEach((cat) => {
        const currentAmount = categoryExpenses[cat.name] || 0;
        console.log(`Checking category "${cat.name}":`, 
                    'Current:', currentAmount, 
                    'Limit:', cat.amount);
                    
        if (cat.amount > 0 && 
            categoryExpenses[cat.name] && 
            categoryExpenses[cat.name] > cat.amount) {
          
          console.log(`Category limit exceeded for "${cat.name}"!`);
          
          notifications.push({
            type: 'category',
            category: cat.name,
            message: `Your expenses of ${formatAmount(categoryExpenses[cat.name])} in category "${cat.name}" have exceeded your limit of ${formatAmount(cat.amount)}!`,
            limit: cat.amount,
            current: categoryExpenses[cat.name]
          });
        }
      });
    }
    
    console.log('Returning notifications:', notifications.length);
    
    res.json({
      exceeded: notifications.length > 0,
      notifications
    });
  } catch (error) {
    console.error('Error checking expense limits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;