class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadStatus();
    this.bindEvents();
    await this.loadRecentEvents();
  }

  async loadStatus() {
    try {
      // Get extension status from storage
      const result = await chrome.storage.local.get([
        'extensionEnabled', 'eventsFound', 'eventsAdded'
      ]);

      document.getElementById('extensionStatus').textContent = 
        result.extensionEnabled !== false ? 'Active' : 'Disabled';
      document.getElementById('eventsFound').textContent = 
        result.eventsFound || 0;
      document.getElementById('eventsAdded').textContent = 
        result.eventsAdded || 0;

      // Update toggle button text
      const toggleBtn = document.getElementById('toggleAutoDetection');
      toggleBtn.textContent = result.extensionEnabled !== false ? 
        '⏸️ Disable Auto-Detection' : '▶️ Enable Auto-Detection';

    } catch (error) {
      console.error('Error loading status:', error);
    }
  }

  bindEvents() {
    document.getElementById('scanCurrentEmail').addEventListener('click', 
      () => this.scanCurrentEmail());
    
    document.getElementById('toggleAutoDetection').addEventListener('click', 
      () => this.toggleAutoDetection());
    
    document.getElementById('openSettings').addEventListener('click', 
      () => this.openSettings());
    
    document.getElementById('viewHelp').addEventListener('click', 
      () => this.viewHelp());
    
    document.getElementById('reportIssue').addEventListener('click', 
      () => this.reportIssue());
  }

  async scanCurrentEmail() {
    try {
      // Send message to content script to scan current email
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('mail.google.com')) {
        this.showError('Please navigate to Gmail to scan emails');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'scanCurrentEmail' }, (response) => {
        if (chrome.runtime.lastError) {
          this.showError('Could not connect to Gmail. Please refresh the page.');
          return;
        }

        if (response && response.success) {
          this.showSuccess(`Found ${response.eventsCount} event(s)`);
          this.updateStatus('eventsFound', response.eventsCount);
        } else {
          this.showInfo('No events found in current email');
        }
      });
    } catch (error) {
      this.showError('Error scanning email');
    }
  }

  async toggleAutoDetection() {
    try {
      const result = await chrome.storage.local.get(['extensionEnabled']);
      const newStatus = !(result.extensionEnabled !== false);
      
      await chrome.storage.local.set({ extensionEnabled: newStatus });
      
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url.includes('mail.google.com')) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleAutoDetection', 
          enabled: newStatus 
        });
      }

      await this.loadStatus();
      this.showSuccess(`Auto-detection ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.showError('Error toggling auto-detection');
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  viewHelp() {
    chrome.tabs.create({ 
      url: 'https://github.com/your-repo/email2calendar-extension/wiki' 
    });
  }

  reportIssue() {
    chrome.tabs.create({ 
      url: 'https://github.com/your-repo/email2calendar-extension/issues' 
    });
  }

  async loadRecentEvents() {
    try {
      const result = await chrome.storage.local.get(['recentEvents']);
      const events = result.recentEvents || [];
      
      const eventsList = document.getElementById('recentEventsList');
      eventsList.innerHTML = '';

      if (events.length === 0) {
        eventsList.innerHTML = '<div class="no-events">No recent events detected</div>';
        return;
      }

      events.slice(0, 5).forEach(event => {
        const eventElement = this.createEventElement(event);
        eventsList.appendChild(eventElement);
      });
    } catch (error) {
      console.error('Error loading recent events:', error);
    }
  }

  createEventElement(event) {
    const element = document.createElement('div');
    element.className = 'event-item';
    element.innerHTML = `
      <div class="event-title">${event.title}</div>
      <div class="event-datetime">${event.dateTime}</div>
      <div class="event-status ${event.status}">${event.status}</div>
    `;
    return element;
  }

  async updateStatus(key, value) {
    const current = await chrome.storage.local.get([key]);
    const newValue = (current[key] || 0) + value;
    await chrome.storage.local.set({ [key]: newValue });
    document.getElementById(key).textContent = newValue;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showNotification(message, type) {
    // Create and show notification in popup
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});