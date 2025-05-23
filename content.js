class GmailEventExtractor {
  constructor() {
    this.eventExtractor = new EventExtractor();
    this.isProcessing = false;
    this.processedEmails = new Set();
    this.init();
  }

  init() {
    // Wait for Gmail to load
    this.waitForGmail(() => {
      this.observeEmailChanges();
      this.addEventDetectionUI();
    });
  }

  waitForGmail(callback) {
    const checkGmail = () => {
      if (document.querySelector('[role="main"]') && 
          document.querySelector('[data-thread-id]')) {
        callback();
      } else {
        setTimeout(checkGmail, 500);
      }
    };
    checkGmail();
  }

  observeEmailChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          this.scanForNewEmails();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  scanForNewEmails() {
    if (this.isProcessing) return;
    
    const emailElements = document.querySelectorAll('[data-message-id]');
    emailElements.forEach(email => {
      const messageId = email.getAttribute('data-message-id');
      if (!this.processedEmails.has(messageId)) {
        this.processedEmails.add(messageId);
        this.processEmail(email);
      }
    });
  }

  async processEmail(emailElement) {
    const emailText = this.extractEmailText(emailElement);
    const subject = this.extractSubject(emailElement);
    
    if (!emailText) return;

    try {
      const events = await this.eventExtractor.extractEvents(emailText, subject);
      if (events && events.length > 0) {
        this.addEventButtons(emailElement, events);
      }
    } catch (error) {
      console.error('Error extracting events:', error);
    }
  }

  extractEmailText(emailElement) {
    // Extract text from Gmail's email body
    const bodyElement = emailElement.querySelector('[dir="ltr"]') || 
                       emailElement.querySelector('.ii.gt');
    return bodyElement ? bodyElement.innerText : '';
  }

  extractSubject(emailElement) {
    // Extract subject from email header or current view
    const subjectElement = document.querySelector('h2[data-thread-id] span') ||
                          emailElement.querySelector('[data-subject]');
    return subjectElement ? subjectElement.innerText : '';
  }

  addEventButtons(emailElement, events) {
    events.forEach((event, index) => {
      const button = this.createEventButton(event, index);
      this.insertEventButton(emailElement, button);
    });
  }

  createEventButton(event, index) {
    const button = document.createElement('div');
    button.className = 'email2cal-event-button';
    button.innerHTML = `
      <div class="email2cal-event-preview">
        <div class="email2cal-icon">📅</div>
        <div class="email2cal-details">
          <div class="email2cal-title">${event.title}</div>
          <div class="email2cal-datetime">${event.dateTime}</div>
          ${event.location ? `<div class="email2cal-location">${event.location}</div>` : ''}
        </div>
        <button class="email2cal-add-btn" data-event-index="${index}">
          Add to Calendar
        </button>
      </div>
    `;

    button.querySelector('.email2cal-add-btn').addEventListener('click', () => {
      this.showEventDialog(event);
    });

    return button;
  }

  insertEventButton(emailElement, button) {
    // Find appropriate location to insert the button
    const insertLocation = emailElement.querySelector('.adn') || // Gmail's action bar
                          emailElement.querySelector('.amn') ||
                          emailElement;
    
    if (insertLocation) {
      insertLocation.appendChild(button);
    }
  }

  showEventDialog(event) {
    const dialog = this.createEventDialog(event);
    document.body.appendChild(dialog);
  }

  createEventDialog(event) {
    const dialog = document.createElement('div');
    dialog.className = 'email2cal-dialog-overlay';
    dialog.innerHTML = `
      <div class="email2cal-dialog">
        <div class="email2cal-dialog-header">
          <h3>Add Event to Calendar</h3>
          <button class="email2cal-close">&times;</button>
        </div>
        <div class="email2cal-dialog-body">
          <form id="eventForm">
            <div class="form-group">
              <label>Title:</label>
              <input type="text" name="title" value="${event.title}" required>
            </div>
            <div class="form-group">
              <label>Date:</label>
              <input type="date" name="date" value="${event.date}" required>
            </div>
            <div class="form-group">
              <label>Start Time:</label>
              <input type="time" name="startTime" value="${event.startTime}">
            </div>
            <div class="form-group">
              <label>End Time:</label>
              <input type="time" name="endTime" value="${event.endTime}">
            </div>
            <div class="form-group">
              <label>Location:</label>
              <input type="text" name="location" value="${event.location || ''}">
            </div>
            <div class="form-group">
              <label>Description:</label>
              <textarea name="description">${event.description || ''}</textarea>
            </div>
          </form>
        </div>
        <div class="email2cal-dialog-footer">
          <button id="cancelBtn">Cancel</button>
          <button id="addEventBtn" class="primary">Add to Calendar</button>
        </div>
      </div>
    `;

    // Add event listeners
    dialog.querySelector('.email2cal-close').onclick = () => dialog.remove();
    dialog.querySelector('#cancelBtn').onclick = () => dialog.remove();
    dialog.querySelector('#addEventBtn').onclick = () => this.addEventToCalendar(dialog, event);
    
    return dialog;
  }

  async addEventToCalendar(dialog, originalEvent) {
    const form = dialog.querySelector('#eventForm');
    const formData = new FormData(form);
    
    const event = {
      title: formData.get('title'),
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      location: formData.get('location'),
      description: formData.get('description')
    };

    try {
      // Send to background script to add to calendar
      chrome.runtime.sendMessage({
        action: 'addToCalendar',
        event: event
      }, (response) => {
        if (response.success) {
          this.showSuccess('Event added to calendar!');
          dialog.remove();
        } else {
          this.showError('Failed to add event: ' + response.error);
        }
      });
    } catch (error) {
      this.showError('Error adding event to calendar');
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `email2cal-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }

  addEventDetectionUI() {
    // Add a toggle button to Gmail's toolbar
    const toolbar = document.querySelector('[role="toolbar"]');
    if (toolbar) {
      const toggleButton = document.createElement('div');
      toggleButton.className = 'email2cal-toggle';
      toggleButton.innerHTML = `
        <button id="email2cal-toggle" title="Toggle Email2Calendar">
          📅 Auto-detect Events
        </button>
      `;
      toolbar.appendChild(toggleButton);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GmailEventExtractor());
} else {
  new GmailEventExtractor();
}