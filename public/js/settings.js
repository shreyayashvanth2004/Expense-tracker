// Base URL for API requests
const API_URL = window.API_URL || 'http://localhost:5001/api';

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

// Show alert message
function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('alert-message');
  if (alertBox) {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      alertBox.style.display = 'none';
    }, 3000);
  }
}

// Categories (from transactions.js)
const categories = {
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

// Populate expense categories dropdown
function populateCategorySelect() {
  const categorySelect = document.getElementById('category-select');
  if (!categorySelect) return;
  
  categorySelect.innerHTML = '<option value="">Select Category</option>';
  
  categories.expense.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

async function fetchExpenseLimits() {
  try {
    console.log('Fetching expense limits from server...');
    const response = await fetch(`${window.API_URL}/settings/expense-limits`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch expense limits');
    }
    
    const limits = await response.json();
    console.log('Fetched expense limits:', limits);
    return limits;
  } catch (error) {
    console.error('Error fetching expense limits:', error);
    showAlert('Failed to load expense limits');
    return {
      monthly: { amount: 0 },
      category: []
    };
  }
}

async function updateMonthlyLimit(amount) {
  try {
    console.log(`Updating monthly limit to ${amount}...`);
    const response = await fetch(`${window.API_URL}/settings/expense-limits/monthly`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ amount })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update monthly limit');
    }
    
    const result = await response.json();
    console.log('Monthly limit updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Error updating monthly limit:', error);
    throw error;
  }
}

async function updateCategoryLimit(name, amount) {
  try {
    console.log(`Updating category limit for "${name}" to ${amount}...`);
    const response = await fetch(`${window.API_URL}/settings/expense-limits/category`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ name, amount })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update category limit');
    }
    
    const result = await response.json();
    console.log('Category limit updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Error updating category limit:', error);
    throw error;
  }
}

// Delete category expense limit
async function deleteCategoryLimit(name) {
  try {
    console.log('Deleting category limit:', name);
    const response = await fetch(`${window.API_URL}/settings/expense-limits/category/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete category limit');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting category limit:', error);
    throw error;
  }
}

// Display expense limits
function displayExpenseLimits(limits) {
  console.log('Displaying limits:', limits);
  
  // Display monthly limit
  const monthlyLimitInput = document.getElementById('monthly-expense-limit');
  if (monthlyLimitInput) {
    monthlyLimitInput.value = limits.monthly?.amount || '';
  }
  
  // Display category limits
  const categoryLimitsContainer = document.getElementById('category-limits-list');
  const noCategoryLimitsElement = document.getElementById('no-category-limits');
  
  if (!categoryLimitsContainer) return;
  
  // Clear existing limits
  categoryLimitsContainer.innerHTML = '';
  
  if (!limits.category || limits.category.length === 0) {
    noCategoryLimitsElement.style.display = 'block';
    return;
  }
  
  noCategoryLimitsElement.style.display = 'none';
  
  // Create a list or table of category limits
  const limitsTable = document.createElement('table');
  limitsTable.className = 'limits-table';
  
  limitsTable.innerHTML = `
    <thead>
      <tr>
        <th>Category</th>
        <th>Limit</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  const tableBody = limitsTable.querySelector('tbody');
  
  limits.category.forEach(cat => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${cat.name}</td>
      <td>${formatAmount(cat.amount)}</td>
      <td>
        <button class="action-btn delete" data-category="${cat.name}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  categoryLimitsContainer.appendChild(limitsTable);
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.action-btn.delete').forEach(button => {
    button.addEventListener('click', handleDeleteCategoryLimit);
  });
}

// Handle monthly limit form submission
async function handleMonthlyLimitSubmit(e) {
  e.preventDefault();
  
  const amountInput = document.getElementById('monthly-expense-limit');
  const amount = parseFloat(amountInput.value) || 0;
  
  try {
    await updateMonthlyLimit(amount);
    showAlert('Monthly expense limit updated', 'success');
    loadExpenseLimits(); // Refresh the displayed limits
  } catch (error) {
    showAlert('Failed to update monthly limit');
  }
}

// Handle category limit form submission
async function handleCategoryLimitSubmit(e) {
  e.preventDefault();
  
  const categorySelect = document.getElementById('category-select');
  const amountInput = document.getElementById('category-expense-limit');
  
  const category = categorySelect.value;
  const amount = parseFloat(amountInput.value) || 0;
  
  if (!category) {
    showAlert('Please select a category');
    return;
  }
  
  try {
    await updateCategoryLimit(category, amount);
    showAlert('Category expense limit updated', 'success');
    
    // Reset form
    categorySelect.value = '';
    amountInput.value = '';
    
    loadExpenseLimits(); // Refresh the displayed limits
  } catch (error) {
    showAlert('Failed to update category limit');
  }
}

// Handle delete category limit
async function handleDeleteCategoryLimit(e) {
  const categoryName = e.currentTarget.getAttribute('data-category');
  
  if (!categoryName) return;
  
  const confirmed = confirm(`Are you sure you want to remove the limit for ${categoryName}?`);
  
  if (!confirmed) return;
  
  try {
    await deleteCategoryLimit(categoryName);
    showAlert('Category limit removed', 'success');
    loadExpenseLimits(); // Refresh the displayed limits
  } catch (error) {
    showAlert('Failed to remove category limit');
  }
}

// Load expense limits from the server
async function loadExpenseLimits() {
  try {
    const limits = await fetchExpenseLimits();
    displayExpenseLimits(limits);
  } catch (error) {
    console.error('Error loading expense limits:', error);
  }
}

// Initialize settings page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Settings page loaded');
  
  // Check if user is logged in
  if (!getToken()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Populate categories
  populateCategorySelect();
  
  // Add event listeners for form submissions
  const monthlyLimitForm = document.getElementById('monthly-limit-form');
  if (monthlyLimitForm) {
    console.log('Found monthly limit form, adding event listener');
    monthlyLimitForm.addEventListener('submit', handleMonthlyLimitSubmit);
  } else {
    console.error('Monthly limit form not found');
  }
  
  const categoryLimitForm = document.getElementById('category-limit-form');
  if (categoryLimitForm) {
    console.log('Found category limit form, adding event listener');
    categoryLimitForm.addEventListener('submit', handleCategoryLimitSubmit);
  } else {
    console.error('Category limit form not found');
  }
  
  // Load initial expense limits
  loadExpenseLimits();
});