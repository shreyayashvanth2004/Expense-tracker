// Instead of:
// const API_URL = window.API_URL || 'http://localhost:5001/api';

// Use window.API_URL directly in your code
function getToken() {
  return localStorage.getItem('token');
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

// Fetch all transactions
async function fetchTransactions(filters = {}) {
  try {
    console.log('Fetching with filters:', filters);
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    if (filters.type && filters.type !== 'all') {
      queryParams.append('type', filters.type);
    }
    
    if (filters.category && filters.category !== 'all') {
      queryParams.append('category', filters.category);
    }
    
    if (filters.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    console.log('Query string:', queryString);
    
    // Temporarily filter client-side since our backend doesn't fully support filtering yet
    const response = await fetch(`${API_URL}/transactions`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    
    let transactions = await response.json();
    console.log('All transactions:', transactions);
    
    // Apply filters client-side
    if (filters.type && filters.type !== 'all') {
      transactions = transactions.filter(t => t.type === filters.type);
    }
    
    if (filters.category && filters.category !== 'all') {
      transactions = transactions.filter(t => t.category === filters.category);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      transactions = transactions.filter(t => new Date(t.date) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      transactions = transactions.filter(t => new Date(t.date) <= toDate);
    }
    
    console.log('Filtered transactions:', transactions);
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// Add new transaction
async function addTransaction(transactionData) {
  try {
    const response = await fetch(`${window.API_URL}/transactions`, {
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

// Update transaction
async function updateTransaction(id, transactionData) {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(transactionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update transaction');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}

// Delete transaction
async function deleteTransaction(id) {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete transaction');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}

// Format date for display
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format amount for display
function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
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
// Populate category select based on transaction type
function populateCategorySelect(selectElement, type) {
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

// Event handler for Add Transaction button
function handleAddTransactionClick() {
  // Reset form
  document.getElementById('transaction-form').reset();
  
  // Set default date to today
  document.getElementById('transaction-date').value = getTodayFormatted();
  
  // Show form
  document.getElementById('transaction-form-container').style.display = 'block';
}

// Event handler for Cancel button on transaction form
function handleCancelTransactionClick() {
  document.getElementById('transaction-form-container').style.display = 'none';
}

// Event handler for transaction type change
function handleTransactionTypeChange(e) {
  const type = e.target.value;
  populateCategorySelect(document.getElementById('transaction-category'), type);
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

// Render transactions in table
function renderTransactionsTable(transactions) {
  const tableBody = document.getElementById('transactions-table-body');
  const noTransactionsElement = document.getElementById('no-transactions');
  
  tableBody.innerHTML = '';
  
  if (transactions.length === 0) {
    noTransactionsElement.style.display = 'block';
    return;
  }
  
  noTransactionsElement.style.display = 'none';
  
  transactions.forEach(transaction => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${formatDate(transaction.date)}</td>
      <td>${transaction.description}</td>
      <td>${transaction.category}</td>
      <td>
        <span class="type-badge ${transaction.type}">
          ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
        </span>
      </td>
      <td class="amount ${transaction.type}">
        ${transaction.type === 'income' ? '+' : '-'} 
        ${formatAmount(transaction.amount)}
      </td>
      <td class="actions">
        <button class="action-btn edit" data-id="${transaction._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete" data-id="${transaction._id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners to edit and delete buttons
  document.querySelectorAll('.action-btn.edit').forEach(button => {
    button.addEventListener('click', () => handleEditClick(button.dataset.id));
  });
  
  document.querySelectorAll('.action-btn.delete').forEach(button => {
    button.addEventListener('click', () => handleDeleteClick(button.dataset.id));
  });
}

// Filter data based on user selections
function getFilterValues() {
  return {
    type: document.getElementById('filter-type').value,
    category: document.getElementById('filter-category').value,
    dateFrom: document.getElementById('filter-date-from').value,
    dateTo: document.getElementById('filter-date-to').value
  };
}

// Apply filters
async function applyFilters() {
  console.log('Applying filters');
  const filters = getFilterValues();
  console.log('Filter values:', filters);
  await loadTransactions(filters);
}

// Reset filters
async function resetFilters() {
  console.log('Resetting filters');
  document.getElementById('filter-type').value = 'all';
  document.getElementById('filter-category').value = 'all';
  document.getElementById('filter-date-from').value = '';
  document.getElementById('filter-date-to').value = '';
  
  await loadTransactions();
}

// Load transactions data
async function loadTransactions(filters = {}) {
  try {
    const transactions = await fetchTransactions(filters);
    renderTransactionsTable(transactions);
    
    // Update filter categories based on data
    updateFilterCategories(transactions);
  } catch (error) {
    console.error('Error loading transactions:', error);
    alert('Failed to load transactions. Please try again.');
  }
}

// Update category filter options based on user data
function updateFilterCategories(transactions) {
  const categorySelect = document.getElementById('filter-category');
  const existingCategories = new Set();
  
  // Get current value to preserve it
  const currentValue = categorySelect.value;
  
  // Clear options except the first one
  categorySelect.innerHTML = '<option value="all">All Categories</option>';
  
  // Add all unique categories from transactions
  transactions.forEach(transaction => {
    existingCategories.add(transaction.category);
  });
  
  // Add options for each category
  existingCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  
  // Restore previous value if it exists
  if (currentValue && Array.from(existingCategories).includes(currentValue)) {
    categorySelect.value = currentValue;
  }
}

// Handle edit transaction
async function handleEditClick(transactionId) {
  try {
    // Fetch transaction details
    const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch transaction details');
    }
    
    const transaction = await response.json();
    
    // Populate edit form
    const form = document.getElementById('edit-transaction-form');
    form.elements['edit-transaction-id'].value = transaction._id;
    form.elements['edit-transaction-type'].value = transaction.type;
    form.elements['edit-transaction-amount'].value = transaction.amount;
    
    // Populate category dropdown based on type
    populateCategorySelect(document.getElementById('edit-transaction-category'), transaction.type);
    
    // Set the category value after populating options
    setTimeout(() => {
      form.elements['edit-transaction-category'].value = transaction.category;
    }, 0);
    
    form.elements['edit-transaction-description'].value = transaction.description;
    
    // Format date for input (YYYY-MM-DD)
    const date = new Date(transaction.date);
    const formattedDate = date.toISOString().split('T')[0];
    form.elements['edit-transaction-date'].value = formattedDate;
    
    // Show modal
    document.getElementById('edit-modal').style.display = 'flex';
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    alert('Failed to load transaction details. Please try again.');
  }
}

// Handle delete transaction
function handleDeleteClick(transactionId) {
  document.getElementById('delete-transaction-id').value = transactionId;
  document.getElementById('delete-modal').style.display = 'flex';
}

// Handle update transaction
async function handleUpdateTransaction(e) {
  e.preventDefault();
  
  const form = e.target;
  const id = form.elements['edit-transaction-id'].value;
  const type = form.elements['edit-transaction-type'].value;
  const amount = parseFloat(form.elements['edit-transaction-amount'].value);
  const category = form.elements['edit-transaction-category'].value;
  const description = form.elements['edit-transaction-description'].value;
  const date = form.elements['edit-transaction-date'].value;
  
  try {
    await updateTransaction(id, {
      type,
      amount,
      category,
      description,
      date: new Date(date)
    });
    
    // Hide modal
    document.getElementById('edit-modal').style.display = 'none';
    
    // Reload transactions
    loadTransactions(getFilterValues());
    
    // Show success message
    alert('Transaction updated successfully');
  } catch (error) {
    alert(`Failed to update transaction: ${error.message}`);
  }
}

// Handle confirm delete
async function handleConfirmDelete() {
  const id = document.getElementById('delete-transaction-id').value;
  
  try {
    await deleteTransaction(id);
    
    // Hide modal
    document.getElementById('delete-modal').style.display = 'none';
    
    // Reload transactions
    loadTransactions(getFilterValues());
    
    // Show success message
    alert('Transaction deleted successfully');
  } catch (error) {
    alert(`Failed to delete transaction: ${error.message}`);
  }
}

// Setup modal close buttons
function setupModalCloseButtons() {
  // Close modals when clicking the x button or cancel button
  document.querySelectorAll('.close-modal, #cancel-edit, #cancel-delete').forEach(element => {
    element.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });
  
  // Close modals when clicking outside the content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners for Add Transaction button
  const addTransactionBtn = document.getElementById('add-transaction-btn');
  if (addTransactionBtn) {
    addTransactionBtn.addEventListener('click', handleAddTransactionClick);
  }
  
  // Add event listener for Cancel button
  const cancelTransactionBtn = document.getElementById('cancel-transaction');
  if (cancelTransactionBtn) {
    cancelTransactionBtn.addEventListener('click', handleCancelTransactionClick);
  }
  
  // Add event listener for transaction type change
  const transactionTypeSelect = document.getElementById('transaction-type');
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener('change', handleTransactionTypeChange);
  }
  
  // Same for edit form
  const editTransactionTypeSelect = document.getElementById('edit-transaction-type');
  if (editTransactionTypeSelect) {
    editTransactionTypeSelect.addEventListener('change', (e) => {
      populateCategorySelect(document.getElementById('edit-transaction-category'), e.target.value);
    });
  }
  
  // Add event listener for transaction form submission
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', handleTransactionFormSubmit);
  }
  
  // Add event listener for edit form submission
  const editTransactionForm = document.getElementById('edit-transaction-form');
  if (editTransactionForm) {
    editTransactionForm.addEventListener('submit', handleUpdateTransaction);
  }
  
  // Add event listener for confirm delete
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }
  
  // Add event listeners for filter controls
  const applyFiltersBtn = document.getElementById('apply-filters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyFilters);
  }
  
  const resetFiltersBtn = document.getElementById('reset-filters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
  }
  
  // Setup modal close buttons
  setupModalCloseButtons();
  
  // Load initial transactions
  loadTransactions();
});