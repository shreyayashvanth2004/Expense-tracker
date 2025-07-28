// Base URL for API requests
window.API_URL = 'http://localhost:5001/api';

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('token') !== null;
}

// Redirect if not logged in (for protected pages)
function checkAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// Redirect if already logged in (for auth pages)
function checkAlreadyLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
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

// Handle login form submission
function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // Simple validation
  if (!email || !password) {
    showAlert('Please enter email and password');
    return;
  }
  
  // Send login request
  fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.token) {
      // Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data._id,
        name: data.name,
        email: data.email
      }));
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      showAlert(data.message || 'Login failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showAlert('An error occurred. Please try again.');
  });
}

// Handle signup form submission
function handleSignup(e) {
  e.preventDefault();
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;
  
  // Simple validation
  if (!name || !email || !password) {
    showAlert('Please fill in all fields');
    return;
  }
  
  if (password !== password2) {
    showAlert('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    showAlert('Password must be at least 6 characters');
    return;
  }
  
  // Send signup request
  fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.token) {
      // Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data._id,
        name: data.name,
        email: data.email
      }));
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      showAlert(data.message || 'Registration failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showAlert('An error occurred. Please try again.');
  });
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check page type and apply appropriate behaviors
  const currentPage = window.location.pathname.split('/').pop();
  
  // Get user info if logged in
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  
  // Setup logout button if it exists
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
  
  // Handle different pages
  switch (currentPage) {
    case 'login.html':
      checkAlreadyLoggedIn();
      const loginForm = document.getElementById('login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
      }
      break;
      
    case 'signup.html':
      checkAlreadyLoggedIn();
      const signupForm = document.getElementById('signup-form');
      if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
      }
      break;
      
    case 'dashboard.html':
    case 'history.html':
    case 'analytics.html':
      checkAuth();
      
      // Update user name if element exists
      const userNameElement = document.getElementById('user-name');
      if (userNameElement && user) {
        userNameElement.textContent = user.name;
      }
      
      // Set current date if element exists
      const currentDateElement = document.getElementById('current-date');
      if (currentDateElement) {
        currentDateElement.textContent = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      break;
      
    default:
      // Do nothing for other pages
      break;
  }
});