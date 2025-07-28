// File: public/js/dashboard.js

// Use the global API_URL from auth.js
// Do not redeclare API_URL with const to avoid errors

// Use window.API_URL directly in the code, or make a local reference variable
// with a different name, such as:
const dashboardApiUrl = window.API_URL || 'http://localhost:5001/api';

// Get token from local storage
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

// Format date for display
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Get today's date in YYYY-MM-DD format for input fields
function getTodayFormatted() {
  const today = new Date();
  const year = today.getFullYear();
  let month = today.getMonth() + 1;
  let day = today.getDate();
  
  month = month < 10 ? `0${month}` : month;
  day = day < 10 ? `0${day}` : day;
  
  return `${year}-${month}-${day}`;
}

// Categories
const categories = {
  income: [
    'Salary',
    'Freelance',
    'Investments',
    'Rental Income',
    'Gifts',
    'Refunds',
    'Other Income'
  ],
  expense: [
    'Food & Dining',
    'Groceries',
    'Transportation',
    'Utilities',
    'Rent/Mortgage',
    'Entertainment',
    'Shopping',
    'Health & Fitness',
    'Travel',
    'Education',
    'Personal Care',
    'Gifts & Donations',
    'Bills',
    'Insurance',
    'Taxes',
    'Other Expenses'
  ]
};

// Add refresh button to the dashboard
function addRefreshButton() {
  const userGreeting = document.querySelector('.user-greeting');
  if (userGreeting) {
    // Check if button already exists
    if (userGreeting.querySelector('.refresh-btn')) {
      return;
    }
    
    const refreshButton = document.createElement('button');
    refreshButton.className = 'btn btn-primary refresh-btn';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
    refreshButton.style.marginLeft = '1rem';
    refreshButton.addEventListener('click', () => {
      // Show loading indicator
      refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
      refreshButton.disabled = true;
      
      // Force a cache-busting request by adding a timestamp
      Promise.all([
        fetch(`${window.API_URL}/transactions?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Cache-Control': 'no-cache'
          }
        }),
        fetch(`${window.API_URL}/transactions/summary/data?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Cache-Control': 'no-cache'
          }
        })
      ])
      .then(() => {
        // After pre-fetching, reload dashboard data
        return loadDashboardData();
      })
      .finally(() => {
        // Reset button state
        setTimeout(() => {
          refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
          refreshButton.disabled = false;
        }, 500);
      });
    });
    
    userGreeting.appendChild(refreshButton);
  }
}

// Chart instances
let incomeExpenseChart;
let expensePieChart;
let trendChart;
let dailySpendingChart;

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

// Fetch analytics data based on time period
async function fetchAnalyticsData(timePeriod = 'month', dateFrom = null, dateTo = null, forceFresh = false) {
  try {
    console.log('Fetching analytics with time period:', timePeriod);

    // Get all transactions and do calculations client-side as fallback
    // Add cache-busting query parameter if forceFresh is true
    const cacheBuster = forceFresh ? `?t=${Date.now()}` : '';

    const response = await fetch(`${window.API_URL}/transactions${cacheBuster}`, {
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
    const categoryDict = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        if (!categoryDict[transaction.category]) {
          categoryDict[transaction.category] = 0;
        }
        categoryDict[transaction.category] += transaction.amount;
      });

    // Format for charts
    const categoryLabels = Object.keys(categoryDict);
    const categoryData = Object.values(categoryDict);
    
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

// Update summary cards
function updateSummaryCards(data) {
  if (!data) return;

  // For analytics page
  if (document.getElementById('analytics-income')) {
    document.getElementById('analytics-income').textContent = formatAmount(data.totalIncome);
    document.getElementById('analytics-expense').textContent = formatAmount(data.totalExpense);
    document.getElementById('analytics-savings').textContent = formatAmount(data.balance);

    // Calculate savings rate
    const savingsRate = data.totalIncome > 0
      ? ((data.balance / data.totalIncome) * 100).toFixed(1)
      : 0;

    document.getElementById('analytics-savings-rate').textContent = `${savingsRate}%`;
  }
  
  // For dashboard page
  if (document.getElementById('total-income')) {
    document.getElementById('total-income').textContent = formatAmount(data.totalIncome);
    document.getElementById('total-expense').textContent = formatAmount(data.totalExpense);
    document.getElementById('current-balance').textContent = formatAmount(data.balance);
  }
}

// Initialize or update charts (continued)
function updateCharts(data) {
  if (!data) {
    console.error('No data provided to updateCharts');
    return;
  }
  console.log('Updating charts with data:', data);
  console.log('Categories data:', data.categories);

  // Make sure categories exist
  if (!data.categories || !Array.isArray(data.categories.labels) || !Array.isArray(data.categories.data)) {
    console.error('Invalid categories data structure');
    data.categories = {
      labels: ['No Expenses'],
      data: [0]
    };
  }

  // Income vs Expense Chart
  const incomeExpenseCtx = document.getElementById('income-expense-chart');
  if (incomeExpenseCtx) {
    const incomeExpenseCtxContext = incomeExpenseCtx.getContext('2d');

    if (incomeExpenseChart) {
      incomeExpenseChart.destroy();
      incomeExpenseChart = null;
    }
    
    // Store chart instances in window object as well for better cleanup
    if (window.incomeExpenseChart) {
      window.incomeExpenseChart.destroy();
      window.incomeExpenseChart = null;
    }

    incomeExpenseChart = window.incomeExpenseChart = new Chart(incomeExpenseCtxContext, {
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
  const expensePieCtx = document.getElementById('expense-categories-chart');
  if (expensePieCtx) {
    console.log('Found expense chart canvas element');

    // Destroy existing chart if it exists
    if (window.expensePieChart) {
      console.log('Destroying existing expense chart');
      window.expensePieChart.destroy();
      window.expensePieChart = null;
    }

    try {
      console.log('Creating new expense chart with labels:', data.categories.labels, 'and data:', data.categories.data);
      
      window.expensePieChart = new Chart(expensePieCtx.getContext('2d'), {
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
                  
                  if (data.totalExpense === 0) {
                    return label;
                  }
                  
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
      
      console.log('Expense chart created successfully');
    } catch (error) {
      console.error('Error creating expense chart:', error);
    }
  }

  // Monthly Overview Chart for dashboard
  const monthlyOverviewCtx = document.getElementById('monthly-overview-chart');
  if (monthlyOverviewCtx) {
    if (window.monthlyOverviewChart) {
      window.monthlyOverviewChart.destroy();
      window.monthlyOverviewChart = null;
    }
    
    window.monthlyOverviewChart = new Chart(
      monthlyOverviewCtx.getContext('2d'),
      {
        type: 'bar',
        data: {
          labels: data.monthlyTrend.labels,
          datasets: [
            {
              label: 'Income',
              data: data.monthlyTrend.income,
              backgroundColor: 'rgba(106, 176, 76, 0.7)',
              borderColor: 'rgba(106, 176, 76, 1)',
              borderWidth: 1,
              barPercentage: 0.6,
              categoryPercentage: 0.8
            },
            {
              label: 'Expenses',
              data: data.monthlyTrend.expense,
              backgroundColor: 'rgba(235, 77, 75, 0.7)',
              borderColor: 'rgba(235, 77, 75, 1)',
              borderWidth: 1,
              barPercentage: 0.6,
              categoryPercentage: 0.8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
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
                  return context.dataset.label + ': ' + formatAmount(context.parsed.y);
                }
              }
            },
            legend: {
              position: 'top'
            }
          }
        }
      }
    );
  }

  // Monthly Trend Chart for analytics
  const trendCtx = document.getElementById('trend-chart');
  if (trendCtx) {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    
    if (window.trendChart) {
      window.trendChart.destroy();
      window.trendChart = null;
    }
    
    trendChart = window.trendChart = new Chart(trendCtx.getContext('2d'), {
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
    
    if (window.dailySpendingChart) {
      window.dailySpendingChart.destroy();
      window.dailySpendingChart = null;
    }
    
    dailySpendingChart = window.dailySpendingChart = new Chart(dailySpendingCtx.getContext('2d'), {
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
  if (!insightsContainer) {
    // Silently return if the container doesn't exist on this page
    return;
  }
  
  const noInsightsElement = document.getElementById('no-insights');
  
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

// Event handler for Add Transaction button
function handleAddTransactionClick() {
  // Reset form
  const form = document.getElementById('transaction-form');
  if (form) {
    form.reset();
  }
  
  // Set default date to today
  const dateInput = document.getElementById('transaction-date');
  if (dateInput) {
    dateInput.value = getTodayFormatted();
  }
  
  // Show form
  const formContainer = document.getElementById('transaction-form-container');
  if (formContainer) {
    formContainer.style.display = 'block';
  }
}

// Event handler for Cancel button on transaction form
function handleCancelTransactionClick() {
  const formContainer = document.getElementById('transaction-form-container');
  if (formContainer) {
    formContainer.style.display = 'none';
  }
}

// Populate category select based on transaction type
function populateCategorySelect(selectElement, type) {
  if (!selectElement) return;
  
  selectElement.innerHTML = '<option value="">Select Category</option>';
  
  if (!type) return;
  
  const categoryList = categories[type] || [];
  
  categoryList.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    selectElement.appendChild(option);
  });
}

// Event handler for transaction type change
function handleTransactionTypeChange(e) {
  const type = e.target.value;
  const categorySelect = document.getElementById('transaction-category');
  if (categorySelect) {
    populateCategorySelect(categorySelect, type);
  }
}

// Add new transaction
async function addTransaction(transactionData) {
  try {
    console.log('Adding transaction:', transactionData);
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(transactionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add transaction');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
}

// Event handler for adding a transaction
async function handleTransactionFormSubmit(e) {
  e.preventDefault();
  console.log('Form submitted');
  
  const form = e.target;
  const type = form.elements['type'].value;
  const amount = parseFloat(form.elements['amount'].value);
  const category = form.elements['category'].value;
  const description = form.elements['description'].value;
  const date = form.elements['date'].value;
  
  if (!type || !amount || !category || !description || !date) {
    alert('Please fill in all fields');
    return;
  }
  
  console.log('Transaction data:', { type, amount, category, description, date });
  
  try {
    await addTransaction({
      type,
      amount,
      category,
      description,
      date: new Date(date)
    });
    
    // Reset and hide form
    form.reset();
    const formContainer = document.getElementById('transaction-form-container');
    if (formContainer) {
      formContainer.style.display = 'none';
    }
    
    // Show success message
    alert('Transaction added successfully');
    
    // Add a small delay before reloading dashboard data
    setTimeout(async () => {
      await loadDashboardData();
      
      // Check expense limits specifically if this was an expense
      if (type === 'expense') {
        await checkExpenseLimits();
      }
    }, 1000); // 1 second delay
  } catch (error) {
    console.error('Transaction error:', error);
    alert(`Failed to add transaction: ${error.message}`);
  }
}

// Fetch recent transactions for the dashboard
async function fetchRecentTransactions(limit = 5, forceFresh = false) {
  try {
    const cacheBuster = forceFresh ? `?t=${Date.now()}&limit=${limit}` : `?limit=${limit}`;
    
    // Use the main transactions endpoint with sorting and limiting
    const response = await fetch(`${window.API_URL}/transactions${cacheBuster}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        ...(forceFresh ? { 'Cache-Control': 'no-cache' } : {})
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    
    const transactions = await response.json();
    
    // Sort by date, newest first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Limit to the specified number
    return transactions.slice(0, limit);
    
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }
}

// Render recent transactions in the dashboard
function renderRecentTransactions(transactions) {
  // First try the recent-transactions-list container
  let container = document.getElementById('recent-transactions-list');
  
  if (!container) {
    // Silently return if the container doesn't exist on this page
    return;
  }
  
  container.innerHTML = '';
  
  const noTransactionsElement = document.getElementById('no-transactions');
  
  if (!transactions || transactions.length === 0) {
    if (noTransactionsElement) {
      noTransactionsElement.style.display = 'block';
    } else {
      container.innerHTML = '<div class="no-data">No recent transactions</div>';
    }
    return;
  }
  
  if (noTransactionsElement) {
    noTransactionsElement.style.display = 'none';
  }
  
  transactions.forEach(tx => {
    const txElement = document.createElement('div');
    txElement.className = `transaction-item`;
    
    const amount = tx.type === 'income' ? 
      `<div class="transaction-amount income">+ ${formatAmount(tx.amount)}</div>` : 
      `<div class="transaction-amount expense">- ${formatAmount(tx.amount)}</div>`;
    
    txElement.innerHTML = `
      <div class="transaction-details">
        <div class="transaction-title">${tx.description}</div>
        <div class="transaction-meta">
          ${tx.category} • ${formatDate(tx.date)}
        </div>
      </div>
      ${amount}
    `;
    
    container.appendChild(txElement);
  });
}

// Initialize charts with additional options
function initializeCharts(summaryData) {
  if (!summaryData) return;

  // Use the same data as our existing chart functions
  updateCharts(summaryData);
}

// Update the checkExpenseLimits function in dashboard.js
async function checkExpenseLimits() {
  try {
    console.log('Checking expense limits...');
    const response = await fetch(`${window.API_URL}/limits/check`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check expense limits');
    }
    
    const data = await response.json();
    console.log('Expense limit check result:', data);
    
    if (data.exceeded) {
      console.log('Limits exceeded! Showing notifications:', data.notifications);
      displayNotifications(data.notifications);
    } else {
      console.log('No expense limits exceeded');
      // Clear any existing notifications when no limits are exceeded
      const notificationsContainer = document.getElementById('notifications-container');
      if (notificationsContainer) {
        notificationsContainer.innerHTML = '';
      }
    }
  } catch (error) {
    console.error('Error checking expense limits:', error);
  }
}

// Function to display notifications
function displayNotifications(notifications) {
  if (!notifications || notifications.length === 0) {
    return;
  }
  
  // Create a notifications container if it doesn't exist
  let notificationsContainer = document.getElementById('notifications-container');
  
  if (!notificationsContainer) {
    notificationsContainer = document.createElement('div');
    notificationsContainer.id = 'notifications-container';
    notificationsContainer.className = 'notifications-container';
    
    // Try to find a place to insert the notifications
    const userGreeting = document.querySelector('.user-greeting');
    if (userGreeting && userGreeting.parentNode) {
      userGreeting.parentNode.insertBefore(notificationsContainer, userGreeting.nextSibling);
    } else {
      // Fallback to prepending to the main container
      const mainContainer = document.querySelector('.dashboard-container .container');
      if (mainContainer) {
        mainContainer.prepend(notificationsContainer);
      } else {
        // If we can't find a suitable container, just don't show notifications
        return;
      }
    }
  }
   
  // Clear any existing notifications
  notificationsContainer.innerHTML = '';
  
  // Add each notification
  notifications.forEach(notification => {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-warning`;
    
    // Format amounts
    const formattedLimit = formatAmount(notification.limit);
    const formattedCurrent = formatAmount(notification.current);
    
    // Create notification content
    notificationElement.innerHTML = `
      <div class="notification-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="notification-content">
        <h4>${notification.type === 'monthly' ? 'Monthly Limit Exceeded!' : `Category "${notification.category}" Limit Exceeded!`}</h4>
        <p>${notification.message}</p>
        <div class="expense-limit-progress">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${Math.min(100, (notification.current / notification.limit) * 100)}%"></div>
          </div>
          <div class="progress-values">
            <span class="limit">Limit: ${formattedLimit}</span>
            <span class="current">Current: ${formattedCurrent}</span>
          </div>
        </div>
      </div>
      <div class="notification-close">
        <button class="close-notification">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Add close button functionality
    const closeButton = notificationElement.querySelector('.close-notification');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        notificationElement.style.display = 'none';
      });
    }
    
    notificationsContainer.appendChild(notificationElement);
  });
}

// Load dashboard data with fresh data option
async function loadDashboardData() {
  try {
    // Clear any existing charts to force redraw
    if (window.monthlyOverviewChart) {
      window.monthlyOverviewChart.destroy();
      window.monthlyOverviewChart = null;
    }
    
    if (window.expenseCategoriesChart) {
      window.expenseCategoriesChart.destroy();
      window.expenseCategoriesChart = null;
    }
    
    // Fetch fresh analytics data
    const defaultData = await fetchAnalyticsData('month', null, null, true);
    
    // Update overview cards on dashboard
    const totalIncomeElement = document.getElementById('total-income');
    if (totalIncomeElement) {
      totalIncomeElement.textContent = formatAmount(defaultData.totalIncome);
      document.getElementById('total-expense').textContent = formatAmount(defaultData.totalExpense);
      document.getElementById('current-balance').textContent = formatAmount(defaultData.balance);
    }
    
    // Initialize charts
    initializeCharts(defaultData);
    
    try {
      // Fetch recent transactions
      const recentTransactions = await fetchRecentTransactions(5, true);
      renderRecentTransactions(recentTransactions);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      // Continue execution even if transactions fail to load
    }
    
    // Add refresh button if not already added
    addRefreshButton();
    
    try {
      // Check expense limits and show notifications
      await checkExpenseLimits();
    } catch (error) {
      console.error('Error checking expense limits:', error);
      // Continue execution even if expense limits check fails
    }
    
    console.log('Dashboard data loaded');
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check if we're on the dashboard page by looking for dashboard elements
  const isDashboardPage = document.querySelector('.dashboard-container') !== null;
  
  if (isDashboardPage) {
    // Add event listeners for Add Transaction button
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    if (addTransactionBtn) {
      console.log('Found add transaction button, adding event listener');
      addTransactionBtn.addEventListener('click', handleAddTransactionClick);
    }
    
    // Add event listener for Cancel button
    const cancelTransactionBtn = document.getElementById('cancel-transaction');
    if (cancelTransactionBtn) {
      console.log('Found cancel transaction button, adding event listener');
      cancelTransactionBtn.addEventListener('click', handleCancelTransactionClick);
    }
    
    // Add event listener for transaction type change
    const transactionTypeSelect = document.getElementById('transaction-type');
    if (transactionTypeSelect) {
      console.log('Found transaction type select, adding event listener');
      transactionTypeSelect.addEventListener('change', handleTransactionTypeChange);
    }
    
    // Add event listener for transaction form submission
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
      console.log('Found transaction form, adding event listener');
      transactionForm.addEventListener('submit', handleTransactionFormSubmit);
    }
    
    // Load dashboard data
    console.log('Loading dashboard data...');
    await loadDashboardData();
    console.log('Dashboard data loaded');
  }
});