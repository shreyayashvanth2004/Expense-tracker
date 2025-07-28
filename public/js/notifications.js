// public/js/notifications.js
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

// Check for expense limit notifications
async function checkExpenseLimits() {
  try {
    // Use the correct endpoint path for limit checking
    const response = await fetch(`${window.API_URL}/limits/check`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      console.error('Error response:', response.status);
      return; // Silently return if there's an error
    }
    
    const data = await response.json();
    
    if (data.exceeded) {
      displayNotifications(data.notifications);
    } else {
      // Clear existing notifications if no limits are exceeded
      const notificationsContainer = document.getElementById('notifications-container');
      if (notificationsContainer) {
        notificationsContainer.innerHTML = '';
      }
    }
  } catch (error) {
    console.error('Error checking expense limits:', error);
    // Don't do anything else - just log the error
  }
}

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

// Show desktop notification if browser supports it
function showDesktopNotification(title, message) {
  // Check if the browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications");
    return;
  }
  
  // Check if permission is already granted
  if (Notification.permission === "granted") {
    createNotification(title, message);
  }
  // Otherwise, ask the user for permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        createNotification(title, message);
      }
    });
  }
  
  function createNotification(title, message) {
    const notification = new Notification(title, {
      body: message,
      icon: '/images/wallet-icon.png' // You'll need to add this image
    });
    
    // Close the notification after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    // Navigate to dashboard when clicked
    notification.onclick = function() {
      window.focus();
      this.close();
    };
  }
}