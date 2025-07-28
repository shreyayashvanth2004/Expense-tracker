// Instead of:
// const API_URL = window.API_URL || 'http://localhost:5001/api';

// Use window.API_URL directly in your code
function getToken() {
  return localStorage.getItem('token');
}
// Format amount for display
function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Chart instances
let incomeExpenseChart;
let expensePieChart;
let trendChart;
let dailySpendingChart;

// Fetch analytics data based on time period
async function fetchAnalyticsData(timePeriod = 'month', dateFrom = null, dateTo = null, forceFresh = false) {
  try {
    console.log('Fetching analytics with time period:', timePeriod);

    // Get all transactions and do calculations client-side as fallback
    // Add cache-busting query parameter if forceFresh is true
    const cacheBuster = forceFresh ? `?t=${Date.now()}` : '';
    
    const response = await fetch(`${API_URL}/transactions${cacheBuster}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        // Add cache control header if forceFresh is true
        ...(forceFresh ? { 'Cache-Control': 'no-cache' } : {})
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const transactions = await response.json();
    console.log('Got transactions for analytics:', transactions.length);

    // Filter transactions based on selected time period
    let filteredTransactions = [...transactions];
    const now = new Date();

    if (timePeriod === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth);
    } else if (timePeriod === '3months') {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      filteredTransactions = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
    } else if (timePeriod === '6months') {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      filteredTransactions = transactions.filter(t => new Date(t.date) >= sixMonthsAgo);
    } else if (timePeriod === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredTransactions = transactions.filter(t => new Date(t.date) >= startOfYear);
    } else if (timePeriod === 'custom' && dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filteredTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= fromDate && txDate <= toDate;
      });
    }

    console.log('Filtered transactions:', filteredTransactions.length);

    // Calculate totals
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate category breakdown
    const categories = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        if (!categories[transaction.category]) {
          categories[transaction.category] = 0;
        }
        categories[transaction.category] += transaction.amount;
      });

    // Format for charts
    const categoryLabels = Object.keys(categories);
    const categoryData = Object.values(categories);
    
    console.log('Category labels:', categoryLabels);
    console.log('Category data:', categoryData);
    
    // If no expenses, provide default data
    if (categoryLabels.length === 0) {
      categoryLabels.push('No Expenses');
      categoryData.push(0);
    }

    // Generate monthly trend data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyIncome = Array(6).fill(0);
    const monthlyExpense = Array(6).fill(0);

    // Get last 6 months
    const last6Months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6Months.unshift({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: months[d.getMonth()]
      });
    }

    // Group transactions by month and calculate totals
    filteredTransactions.forEach(transaction => {
      const txDate = new Date(transaction.date);
      const txMonth = txDate.getMonth();
      const txYear = txDate.getFullYear();

      for (let i = 0; i < last6Months.length; i++) {
        if (txYear === last6Months[i].year && txMonth === last6Months[i].month) {
          if (transaction.type === 'income') {
            monthlyIncome[i] += transaction.amount;
          } else {
            monthlyExpense[i] += transaction.amount;
          }
          break;
        }
      }
    });

    const monthLabels = last6Months.map(m => m.label);
    
    // Generate daily spending pattern data
    const dailySpendingData = calculateDailySpendingPattern(filteredTransactions);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: {
        labels: categoryLabels,
        data: categoryData
      },
      monthlyTrend: {
        labels: monthLabels,
        income: monthlyIncome,
        expense: monthlyExpense
      },
      dailySpending: dailySpendingData
    };
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      categories: {
        labels: ['No Expenses'],
        data: [0]
      },
      monthlyTrend: {
        labels: [],
        income: [],
        expense: []
      },
      dailySpending: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        data: [0, 0, 0, 0, 0, 0, 0]
      }
    };
  }
}

// Calculate daily spending pattern
function calculateDailySpendingPattern(transactions) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
  
  // Only include expense transactions
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  // Group by day of week
  expenseTransactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    dailyTotals[dayOfWeek] += transaction.amount;
  });
  
  // If we have no data, generate some placeholder data
  if (expenseTransactions.length === 0) {
    // Generate random values between 100 and 1000
    for (let i = 0; i < 7; i++) {
      dailyTotals[i] = Math.floor(Math.random() * 900) + 100;
    }
  }
  
  return {
    labels: daysOfWeek,
    data: dailyTotals
  };
}

// Update summary cards
function updateSummaryCards(data) {
  if (!data) return;

  document.getElementById('analytics-income').textContent = formatAmount(data.totalIncome);
  document.getElementById('analytics-expense').textContent = formatAmount(data.totalExpense);
  document.getElementById('analytics-savings').textContent = formatAmount(data.balance);

  // Calculate savings rate
  const savingsRate = data.totalIncome > 0
    ? ((data.balance / data.totalIncome) * 100).toFixed(1)
    : 0;

  document.getElementById('analytics-savings-rate').textContent = `${savingsRate}%`;
}

// Initialize or update charts
function updateCharts(data) {
  if (!data) return;

  // Income vs Expense Chart
  const incomeExpenseCtx = document.getElementById('income-expense-chart');
  if (incomeExpenseCtx) {
    if (incomeExpenseChart) {
      incomeExpenseChart.destroy();
      incomeExpenseChart = null;
    }
    
    incomeExpenseChart = new Chart(incomeExpenseCtx.getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          data: [data.totalIncome, data.totalExpense],
          backgroundColor: [
            'rgba(106, 176, 76, 0.7)',
            'rgba(235, 77, 75, 0.7)'
          ],
          borderColor: [
            'rgba(106, 176, 76, 1)',
            'rgba(235, 77, 75, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = formatAmount(context.raw);
                const percentage = ((context.raw / (data.totalIncome + data.totalExpense)) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // Expense Breakdown Chart
  const expensePieCtx = document.getElementById('expense-pie-chart');
  if (expensePieCtx) {
    if (expensePieChart) {
      expensePieChart.destroy();
      expensePieChart = null;
    }
    
    expensePieChart = new Chart(expensePieCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: data.categories.labels,
        datasets: [{
          data: data.categories.data,
          backgroundColor: [
            'rgba(74, 105, 189, 0.7)',
            'rgba(235, 77, 75, 0.7)',
            'rgba(106, 176, 76, 0.7)',
            'rgba(240, 147, 43, 0.7)',
            'rgba(165, 94, 234, 0.7)',
            'rgba(45, 152, 218, 0.7)',
            'rgba(214, 48, 49, 0.7)',
            'rgba(39, 174, 96, 0.7)',
            'rgba(211, 84, 0, 0.7)',
            'rgba(119, 140, 163, 0.7)'
          ],
          borderColor: [
            'rgba(74, 105, 189, 1)',
            'rgba(235, 77, 75, 1)',
            'rgba(106, 176, 76, 1)',
            'rgba(240, 147, 43, 1)',
            'rgba(165, 94, 234, 1)',
            'rgba(45, 152, 218, 1)',
            'rgba(214, 48, 49, 1)',
            'rgba(39, 174, 96, 1)',
            'rgba(211, 84, 0, 1)',
            'rgba(119, 140, 163, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = formatAmount(context.raw);
                const percentage = ((context.raw / data.totalExpense) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          },
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: {
                size: 10
              }
            }
          }
        }
      }
    });
  }

  // Monthly Trend Chart
  const trendCtx = document.getElementById('trend-chart');
  if (trendCtx) {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    
    trendChart = new Chart(trendCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: data.monthlyTrend.labels,
        datasets: [
          {
            label: 'Income',
            data: data.monthlyTrend.income,
            borderColor: 'rgba(46, 204, 113, 1)',
            backgroundColor: 'rgba(46, 204, 113, 0.2)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Expenses',
            data: data.monthlyTrend.expense,
            borderColor: 'rgba(231, 76, 60, 1)',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatAmount(context.raw)}`;
              }
            }
          }
        }
      }
    });
  }
  
  // Daily Spending Pattern chart
  const dailySpendingCtx = document.getElementById('daily-spending-chart');
  if (dailySpendingCtx && data.dailySpending) {
    if (dailySpendingChart) {
      dailySpendingChart.destroy();
      dailySpendingChart = null;
    }
    
    dailySpendingChart = new Chart(dailySpendingCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.dailySpending.labels,
        datasets: [{
          label: 'Daily Spending',
          data: data.dailySpending.data,
          backgroundColor: 'rgba(45, 152, 218, 0.7)',
          borderColor: 'rgba(45, 152, 218, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString('en-IN');
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Spending: ' + formatAmount(context.parsed.y);
              }
            }
          }
        }
      }
    });
  }
  
  // Generate insights
  generateInsights(data);
}

// Generate financial insights
function generateInsights(data) {
  if (!data) return;
  
  const insightsContainer = document.getElementById('financial-insights');
  const noInsightsElement = document.getElementById('no-insights');
  
  if (!insightsContainer) {
    console.error('Insights container not found');
    return;
  }
  
  // Clear insights container
  insightsContainer.innerHTML = '';
  
  // Array to store our insights
  const insights = [];
  
  // Check for high spending categories
  if (data.categories.labels.length > 0) {
    const highestCategory = {
      name: data.categories.labels[0],
      amount: data.categories.data[0]
    };
    
    for (let i = 1; i < data.categories.labels.length; i++) {
      if (data.categories.data[i] > highestCategory.amount) {
        highestCategory.name = data.categories.labels[i];
        highestCategory.amount = data.categories.data[i];
      }
    }
    
    if (highestCategory.amount > 0 && highestCategory.name !== 'No Expenses') {
      insights.push({
        title: 'Highest Spending Category',
        content: `Your highest spending is in ${highestCategory.name} (${formatAmount(highestCategory.amount)}). Consider reviewing these expenses to identify potential savings.`,
        type: 'warning'
      });
    }
  }
  
  // Check savings rate
  if (data.totalIncome > 0) {
    const savingsRate = (data.balance / data.totalIncome) * 100;
    
    if (savingsRate < 20) {
      insights.push({
        title: 'Low Savings Rate',
        content: `Your current savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of your income. Try looking for ways to increase income or reduce expenses.`,
        type: 'warning'
      });
    } else if (savingsRate >= 20) {
      insights.push({
        title: 'Healthy Savings Rate',
        content: `Great job! Your savings rate is ${savingsRate.toFixed(1)}%, which meets or exceeds the recommended 20%. Keep it up!`,
        type: 'success'
      });
    }
  }
  
  // Check monthly trend
  if (data.monthlyTrend.expense.length >= 2) {
    const currentMonth = data.monthlyTrend.expense[data.monthlyTrend.expense.length - 1];
    const previousMonth = data.monthlyTrend.expense[data.monthlyTrend.expense.length - 2];
    
    if (currentMonth > previousMonth && previousMonth > 0 && (currentMonth - previousMonth) / previousMonth > 0.1) {
      insights.push({
        title: 'Spending Increase',
        content: `Your spending has increased by ${((currentMonth - previousMonth) / previousMonth * 100).toFixed(1)}% compared to last month. Review your recent expenses to understand what changed.`,
        type: 'warning'
      });
    } else if (previousMonth > currentMonth && previousMonth > 0 && (previousMonth - currentMonth) / previousMonth > 0.1) {
      insights.push({
        title: 'Spending Decrease',
        content: `Your spending has decreased by ${((previousMonth - currentMonth) / previousMonth * 100).toFixed(1)}% compared to last month. Great job controlling your expenses!`,
        type: 'success'
      });
    }
  }
  
  // If no insights were generated, add a default one
  if (insights.length === 0) {
    insights.push({
      title: 'Getting Started',
      content: 'Add more transactions to get personalized financial insights. We analyze your spending patterns to provide useful recommendations.',
      type: 'info'
    });
  }
  
  // Render insights
  if (insights.length > 0) {
    if (noInsightsElement) {
      noInsightsElement.style.display = 'none';
    }
    
    insights.forEach(insight => {
      const insightCard = document.createElement('div');
      insightCard.className = `insight-card insight-${insight.type}`;
      
      insightCard.innerHTML = `
        <h4>${insight.title}</h4>
        <p>${insight.content}</p>
      `;
      
      insightsContainer.appendChild(insightCard);
    });
  } else if (noInsightsElement) {
    noInsightsElement.style.display = 'block';
  }
}

// Handle time period change
function handleTimePeriodChange() {
  const timePeriod = document.getElementById('time-period').value;
  const customDateRange = document.getElementById('custom-date-range');
  
  if (timePeriod === 'custom') {
    customDateRange.style.display = 'flex';
  } else {
    customDateRange.style.display = 'none';
    loadAnalyticsData(timePeriod);
  }
}

// Handle custom date range
function handleCustomDateRange() {
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;
  
  if (dateFrom && dateTo) {
    loadAnalyticsData('custom', dateFrom, dateTo);
  } else {
    alert('Please select both start and end dates');
  }
}

// Load analytics data based on selected time period
async function loadAnalyticsData(timePeriod = 'month', dateFrom = null, dateTo = null) {
  try {
    const data = await fetchAnalyticsData(timePeriod, dateFrom, dateTo);
    
    if (data) {
      updateSummaryCards(data);
      updateCharts(data);
    }
  } catch (error) {
    console.error('Error loading analytics data:', error);
    alert('Failed to load analytics data. Please try again.');
  }
}

// Initialize analytics page
document.addEventListener('DOMContentLoaded', () => {
  // Add event listener for time period change
  const timePeriodSelect = document.getElementById('time-period');
  if (timePeriodSelect) {
    timePeriodSelect.addEventListener('change', handleTimePeriodChange);
  }
  
  // Add event listener for custom date range
  const applyDateRangeBtn = document.getElementById('apply-date-range');
  if (applyDateRangeBtn) {
    applyDateRangeBtn.addEventListener('click', handleCustomDateRange);
  }
  
  // Load initial analytics data
  loadAnalyticsData();
  
  // Handle window resize to redraw charts
  window.addEventListener('resize', () => {
    if (trendChart) trendChart.resize();
    if (incomeExpenseChart) incomeExpenseChart.resize();
    if (expensePieChart) expensePieChart.resize();
    if (dailySpendingChart) dailySpendingChart.resize();
  });
});