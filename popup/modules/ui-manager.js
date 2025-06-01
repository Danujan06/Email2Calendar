// ============================================================================
// UI MANAGER MODULE - popup/modules/ui-manager.js (COMPLETE FIXED VERSION)
// ============================================================================

/**
 * UIManager handles all user interface interactions and updates
 * Responsibilities:
 * - DOM element management
 * - User notifications
 * - Event display and animations
 * - Button state management
 * - Form handling
 */
class UIManager {
  constructor() {
    this.elements = this.initializeElements();
    this.notificationQueue = [];
    this.isShowingNotification = false;
  }

  /**
   * Initialize and cache DOM elements
   */
  initializeElements() {
    const elements = {
      // Main controls
      scanButton: document.getElementById('scanCurrentEmail'),
      toggleAutoDetection: document.getElementById('toggleAutoDetection'),
      openSettings: document.getElementById('openSettings'),
      
      // Status elements
      statusElement: document.getElementById('extensionStatus'),
      eventsFoundElement: document.getElementById('eventsFound'),
      eventsAddedElement: document.getElementById('eventsAdded'),
      
      // Event display
      recentEventsList: document.getElementById('recentEventsList'),
      
      // Help elements
      viewHelp: document.getElementById('viewHelp'),
      reportIssue: document.getElementById('reportIssue')
    };

    // Validate that required elements exist
    const requiredElements = ['scanButton', 'statusElement', 'eventsFoundElement', 'eventsAddedElement', 'recentEventsList'];
    const missingElements = requiredElements.filter(key => !elements[key]);
    
    if (missingElements.length > 0) {
      console.warn('⚠️ Missing UI elements:', missingElements);
    }

    return elements;
  }

  /**
   * Set the scan button state (scanning/idle)
   */
  setScanButtonState(scanning, customText = null) {
    if (!this.elements.scanButton) return;

    if (scanning) {
      this.elements.scanButton.innerHTML = customText || `
        <span class="btn-icon">🧠</span>
        <span class="btn-label">NLP Processing</span>
      `;
      this.elements.scanButton.disabled = true;
      this.elements.scanButton.classList.add('scanning');
    } else {
      this.elements.scanButton.innerHTML = `
        <span class="btn-icon">📧</span>
        <span class="btn-label">Scan Current Email</span>
      `;
      this.elements.scanButton.disabled = false;
      this.elements.scanButton.classList.remove('scanning');
    }
  }

  /**
   * Update statistics display
   */
  updateStats(stats) {
    if (this.elements.eventsFoundElement) {
      this.elements.eventsFoundElement.textContent = stats.eventsFound || 0;
    }
    if (this.elements.eventsAddedElement) {
      this.elements.eventsAddedElement.textContent = stats.eventsAdded || 0;
    }
  }

  /**
   * Update extension status
   */
  setStatus(status, color = null) {
    if (!this.elements.statusElement) return;

    this.elements.statusElement.textContent = status;
    if (color) {
      this.elements.statusElement.style.color = color;
    }
  }

  /**
   * Show success message and update status
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
    this.setStatus('Active', '#137333');
  }

  /**
   * Show error message and update status
   */
  showError(message) {
    this.showNotification(message, 'error');
    this.setStatus('Error', '#d93025');
  }

  /**
   * Show info message
   */
  showInfo(message) {
    this.showNotification(message, 'info');
  }

  /**
   * Enhanced notification system with queue
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = {
      message,
      type,
      duration,
      id: Date.now() + Math.random()
    };

    this.notificationQueue.push(notification);
    this.processNotificationQueue();
  }

  /**
   * Process notification queue to prevent overlapping
   */
  async processNotificationQueue() {
    if (this.isShowingNotification || this.notificationQueue.length === 0) {
      return;
    }

    this.isShowingNotification = true;
    
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      await this.displayNotification(notification);
    }

    this.isShowingNotification = false;
  }

  /**
   * Display individual notification with animation
   */
  displayNotification(notification) {
    return new Promise((resolve) => {
      // Remove existing notification
      const existing = document.querySelector('.popup-notification');
      if (existing) existing.remove();

      // Create notification element
      const notificationEl = document.createElement('div');
      notificationEl.className = `popup-notification ${notification.type}`;
      notificationEl.innerHTML = `
        <span class="notification-icon">${this.getNotificationIcon(notification.type)}</span>
        <span class="notification-message">${notification.message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
      `;

      // Add to DOM
      document.body.appendChild(notificationEl);

      // Animate in
      requestAnimationFrame(() => {
        notificationEl.classList.add('show');
      });

      // Auto remove after duration
      setTimeout(() => {
        if (notificationEl.parentElement) {
          notificationEl.classList.add('hide');
          setTimeout(() => {
            if (notificationEl.parentElement) {
              notificationEl.remove();
            }
            resolve();
          }, 300);
        } else {
          resolve();
        }
      }, notification.duration);
    });
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    return icons[type] || 'ℹ️';
  }

  /**
   * Display events with interactive controls - COMPACT VERSION
   */
  displayEvents(events, onAddEvent, onDeleteEvent) {
    if (!this.elements.recentEventsList) return;

    if (events.length === 0) {
      this.elements.recentEventsList.innerHTML = `
        <div class="no-events">
          <div class="no-events-icon">📭</div>
          <div class="no-events-message">No recent events detected</div>
          <div class="no-events-hint">Scan an email to detect events</div>
        </div>
      `;
      return;
    }

    this.elements.recentEventsList.innerHTML = events.map((event) => 
      this.createEventHTML(event)
    ).join('');

    // Bind event listeners
    this.bindEventListeners(events, onAddEvent, onDeleteEvent);
  }

  /**
   * Create HTML for individual event - COMPACT VERSION
   */
  createEventHTML(event) {
    const statusClass = event.status || 'detected';
    
    return `
      <div class="event-item ${statusClass}" data-event-id="${event.id}">
        <div class="event-content">
          <div class="event-header">
            <div class="event-title">${this.truncateText(event.title, 40)}</div>
            <div class="event-type-badge ${event.type || 'general'}">${event.type || 'general'}</div>
          </div>
          
          <div class="event-datetime">
            <span class="datetime-icon">🗓️</span>
            ${this.formatDateTime(event.date, event.time)}
          </div>
          
          ${event.location ? `
            <div class="event-location">
              <span class="location-icon">📍</span>
              ${this.truncateText(event.location, 30)}
            </div>
          ` : ''}
        </div>
        
        <div class="event-actions">
          ${this.createEventActionButtons(event)}
        </div>
      </div>
    `;
  }

  /**
   * Create action buttons based on event status - COMPACT VERSION
   */
  createEventActionButtons(event) {
    const buttons = [];

    // Add button (if not already added)
    if (event.status !== 'added' && event.status !== 'processing') {
      buttons.push(`
        <button class="event-btn add-event-btn" data-event-id="${event.id}" title="Add to Calendar">
          <span class="btn-icon">➕</span>
          <span class="btn-text">Add</span>
        </button>
      `);
    }

    // Delete button
    buttons.push(`
      <button class="event-btn delete-event-btn" data-event-id="${event.id}" title="Delete Event">
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">Delete</span>
      </button>
    `);

    return buttons.join('');
  }

  /**
   * Bind event listeners to action buttons - SIMPLIFIED
   */
  bindEventListeners(events, onAddEvent, onDeleteEvent) {
    // Add event listeners
    this.elements.recentEventsList.querySelectorAll('.add-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const eventId = e.currentTarget.dataset.eventId;
        const event = events.find(e => e.id == eventId);
        
        if (event && !button.disabled) {
          await this.handleAddEventClick(button, event, onAddEvent);
        }
      });
    });

    // Delete event listeners
    this.elements.recentEventsList.querySelectorAll('.delete-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const eventId = e.currentTarget.dataset.eventId;
        const eventElement = e.currentTarget.closest('.event-item');
        
        // Show confirmation dialog
        if (await this.showConfirmDialog('Delete Event', 'Are you sure you want to delete this event? It won\'t appear again.')) {
          await onDeleteEvent(eventId, eventElement);
        }
      });
    });
  }

  /**
   * Handle add event button click with UI feedback
   */
  async handleAddEventClick(button, event, onAddEvent) {
    const originalHTML = button.innerHTML;
    
    try {
      // Disable button and show loading state
      button.disabled = true;
      button.innerHTML = `
        <span class="btn-icon">⏳</span>
        <span class="btn-text">Adding...</span>
      `;
      button.classList.add('loading');

      // Call the add event handler
      await onAddEvent(event);

      // Success state
      button.innerHTML = `
        <span class="btn-icon">✅</span>
        <span class="btn-text">Added</span>
      `;
      button.classList.remove('loading');
      button.classList.add('success');
      
      // Update event status in the UI
      const eventElement = button.closest('.event-item');
      if (eventElement) {
        eventElement.classList.remove('detected');
        eventElement.classList.add('added');
      }

    } catch (error) {
      // Error state
      button.innerHTML = `
        <span class="btn-icon">❌</span>
        <span class="btn-text">Failed</span>
      `;
      button.classList.remove('loading');
      button.classList.add('error');
      
      // Re-enable button if it's not a duplicate error
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.disabled = false;
          button.classList.remove('error');
        }, 3000);
      }
      
      throw error; // Re-throw so the controller can handle it
    }
  }

  /**
   * Animate event removal
   */
  async animateEventRemoval(eventElement) {
    if (!eventElement) return;

    // Add removal class for animation
    eventElement.classList.add('removing');
    
    // Wait for animation to complete
    await new Promise(resolve => {
      eventElement.addEventListener('transitionend', resolve, { once: true });
      
      // Fallback timeout in case transition doesn't fire
      setTimeout(resolve, 500);
    });
    
    // Remove element
    eventElement.remove();
    
    // Check if list is empty and update accordingly
    if (this.elements.recentEventsList.children.length === 0) {
      this.elements.recentEventsList.innerHTML = `
        <div class="no-events">
          <div class="no-events-icon">📭</div>
          <div class="no-events-message">No recent events</div>
        </div>
      `;
    }
  }

  /**
   * Show confirmation dialog
   */
  showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog-overlay';
      dialog.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-dialog-header">
            <h3>${title}</h3>
          </div>
          <div class="confirm-dialog-body">
            <p>${message}</p>
          </div>
          <div class="confirm-dialog-footer">
            <button class="confirm-btn cancel-btn">Cancel</button>
            <button class="confirm-btn confirm-btn">Confirm</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // Handle clicks
      dialog.querySelector('.cancel-btn').onclick = () => {
        dialog.remove();
        resolve(false);
      };

      dialog.querySelector('.confirm-btn').onclick = () => {
        dialog.remove();
        resolve(true);
      };

      // Handle backdrop click
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          dialog.remove();
          resolve(false);
        }
      };
    });
  }

  /**
   * Utility methods for formatting and display
   */
  formatDateTime(date, time) {
    if (!date) return 'Date TBD';
    
    try {
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (time && time !== 'Time TBD') {
        return `${dateStr} at ${this.formatTimeDisplay(time)}`;
      } else {
        return dateStr;
      }
    } catch (e) {
      return date + (time ? ` at ${time}` : '');
    }
  }

  /**
   * Format time for display (12-hour format)
   */
  formatTimeDisplay(time) {
    if (!time || time === 'Time TBD') return '';
    
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return time;
    }
  }

  /**
   * Get status icon for event status
   */
  getStatusIcon(status) {
    const icons = {
      'detected': '🔍',
      'added': '✅',
      'failed': '❌',
      'processing': '⏳',
      'edited': '✏️'
    };
    return icons[status] || '❓';
  }

  /**
   * Format status text for display
   */
  formatStatusText(status) {
    const texts = {
      'detected': 'Detected',
      'added': 'Added',
      'failed': 'Failed',
      'processing': 'Processing',
      'edited': 'Edited'
    };
    return texts[status] || 'Unknown';
  }

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Show loading state
   */
  showLoading(message = 'Loading...') {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
      </div>
    `;
    document.body.appendChild(loading);
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loading = document.querySelector('.loading-overlay');
    if (loading) {
      loading.remove();
    }
  }

  /**
   * Update auto-detection toggle state
   */
  updateAutoDetectionToggle(enabled) {
    if (this.elements.toggleAutoDetection) {
      this.elements.toggleAutoDetection.innerHTML = `
        <span class="btn-icon">${enabled ? '🔄' : '⏸️'}</span>
        <span class="btn-text">${enabled ? 'Auto-On' : 'Auto-Off'}</span>
      `;
      this.elements.toggleAutoDetection.classList.toggle('active', enabled);
    }
  }

  /**
   * Get current theme preference
   */
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save preference
    chrome.storage.sync.set({ theme: newTheme });
    
    return newTheme;
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    this.notificationQueue = [];
    const existing = document.querySelector('.popup-notification');
    if (existing) existing.remove();
  }

  /**
   * Get UI statistics for debugging
   */
  getUIStats() {
    return {
      elementsFound: Object.keys(this.elements).length,
      elementsAvailable: Object.values(this.elements).filter(el => el).length,
      notificationQueueLength: this.notificationQueue.length,
      isShowingNotification: this.isShowingNotification,
      currentTheme: this.getCurrentTheme()
    };
  }

  /**
   * Validate UI elements
   */
  validateElements() {
    const validation = {};
    Object.entries(this.elements).forEach(([key, element]) => {
      validation[key] = {
        exists: !!element,
        inDOM: element ? document.contains(element) : false
      };
    });
    return validation;
  }

  /**
   * Refresh UI elements (re-initialize if needed)
   */
  refreshElements() {
    this.elements = this.initializeElements();
    console.log('🔄 UI elements refreshed');
  }

  /**
   * Set button loading state
   */
  setButtonLoading(buttonElement, loading = true) {
    if (!buttonElement) return;
    
    if (loading) {
      buttonElement.disabled = true;
      buttonElement.classList.add('loading');
    } else {
      buttonElement.disabled = false;
      buttonElement.classList.remove('loading');
    }
  }

  /**
   * Reset all button states
   */
  resetAllButtons() {
    const buttons = document.querySelectorAll('.action-btn, .event-btn');
    buttons.forEach(button => {
      button.disabled = false;
      button.classList.remove('loading', 'success', 'error');
    });
  }

  /**
   * Update event count in UI
   */
  updateEventCount(count) {
    const eventsList = this.elements.recentEventsList;
    if (eventsList) {
      const eventsCount = eventsList.querySelectorAll('.event-item').length;
      console.log(`📊 UI showing ${eventsCount} events (expected: ${count})`);
    }
  }

  /**
   * Flash element for attention
   */
  flashElement(element, duration = 1000) {
    if (!element) return;
    
    element.style.transition = 'background-color 0.3s ease';
    const originalBackground = element.style.backgroundColor;
    
    element.style.backgroundColor = '#fff3cd';
    
    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
      setTimeout(() => {
        element.style.transition = '';
      }, 300);
    }, duration);
  }

  /**
   * Scroll to element
   */
  scrollToElement(element) {
    if (element && element.scrollIntoView) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }

  /**
   * Get element visibility
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}