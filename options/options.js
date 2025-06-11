class OptionsManager {
  constructor() {
    this.defaultSettings = {
      aiProvider: 'local',
      apiKey: '',
      confidenceThreshold: 0.7,
      defaultCalendar: 'primary',
      defaultDuration: 60,
      addAsPrivate: false,
      requireConfirmation: true,
      autoDetection: true,
      emailFilters: 'meeting\nappointment\ncall\nlunch\ndinner\nconference\ninterview',
      excludePatterns: 'newsletter\nunsubscribe\nautomated\nno-reply',
      showNotifications: true,
      soundEnabled: false,
      localProcessing: true,
      logActivity: false,
      extractorType: 'hybrid',
      togetherApiKey: '',
      hybridMode: 'compromise_first'
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    await this.loadCalendars();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings);
      
      // Populate form fields
      Object.keys(result).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = result[key];
          } else {
            element.value = result[key];
          }
        }
      });

      // Update confidence value display
      const confidenceValue = document.getElementById('confidenceValue');
      if (confidenceValue) {
        confidenceValue.textContent = result.confidenceThreshold;
      }

      // Show/hide API key field based on provider
      this.toggleAPIKeyField(result.aiProvider);
      
      // FIXED: Show/hide hybrid settings based on extractor type
      this.toggleHybridSettings(result.extractorType);

    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  bindEvents() {
    // AI Provider change
    const aiProvider = document.getElementById('aiProvider');
    if (aiProvider) {
      aiProvider.addEventListener('change', (e) => {
        this.toggleAPIKeyField(e.target.value);
      });
    }

    // FIXED: Extractor type change - properly bound
    const extractorType = document.getElementById('extractorType');
    if (extractorType) {
      extractorType.addEventListener('change', (e) => {
        console.log('Extractor type changed to:', e.target.value);
        this.toggleHybridSettings(e.target.value);
      });
    }

    // Confidence threshold slider
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    if (confidenceThreshold) {
      confidenceThreshold.addEventListener('input', (e) => {
        const confidenceValue = document.getElementById('confidenceValue');
        if (confidenceValue) {
          confidenceValue.textContent = e.target.value;
        }
      });
    }

    // Save settings
    const saveSettings = document.getElementById('saveSettings');
    if (saveSettings) {
      saveSettings.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // Reset settings
    const resetSettings = document.getElementById('resetSettings');
    if (resetSettings) {
      resetSettings.addEventListener('click', () => {
        this.resetSettings();
      });
    }

    // Clear data
    const clearData = document.getElementById('clearData');
    if (clearData) {
      clearData.addEventListener('click', () => {
        this.clearAllData();
      });
    }
  }

  toggleAPIKeyField(provider) {
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    if (apiKeyGroup) {
      apiKeyGroup.style.display = provider === 'local' ? 'none' : 'block';
    }
  }

  // FIXED: Proper hybrid settings toggle
  toggleHybridSettings(extractorType) {
    console.log('Toggling hybrid settings for:', extractorType);
    
    const togetherApiKeyGroup = document.getElementById('togetherApiKeyGroup');
    const hybridModeGroup = document.getElementById('hybridModeGroup');
    
    console.log('togetherApiKeyGroup found:', !!togetherApiKeyGroup);
    console.log('hybridModeGroup found:', !!hybridModeGroup);
    
    if (togetherApiKeyGroup && hybridModeGroup) {
      const showHybridSettings = extractorType === 'hybrid';
      console.log('Should show hybrid settings:', showHybridSettings);
      
      togetherApiKeyGroup.style.display = showHybridSettings ? 'block' : 'none';
      hybridModeGroup.style.display = showHybridSettings ? 'block' : 'none';
      
      // Debug: Log current display status
      console.log('togetherApiKeyGroup display:', togetherApiKeyGroup.style.display);
      console.log('hybridModeGroup display:', hybridModeGroup.style.display);
    } else {
      console.error('Hybrid settings elements not found!');
    }
  }

  async saveSettings() {
    try {
      const settings = {};
      
      // Collect all form values
      Object.keys(this.defaultSettings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === 'checkbox') {
            settings[key] = element.checked;
          } else if (element.type === 'number' || element.type === 'range') {
            settings[key] = parseFloat(element.value);
          } else {
            settings[key] = element.value;
          }
        }
      });

      console.log('Saving settings:', settings);
      await chrome.storage.sync.set(settings);
      
      // Notify content scripts of settings change
      const tabs = await chrome.tabs.query({ url: '*://mail.google.com/*' });
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsUpdated', 
          settings: settings 
        });
      });

      this.showSaveStatus('Settings saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showSaveStatus('Error saving settings', 'error');
    }
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        await chrome.storage.sync.clear();
        await this.loadSettings();
        this.showSaveStatus('Settings reset to defaults', 'success');
      } catch (error) {
        console.error('Error resetting settings:', error);
        this.showSaveStatus('Error resetting settings', 'error');
      }
    }
  }

  async clearAllData() {
    if (confirm('This will clear all stored data including settings, logs, and cache. Continue?')) {
      try {
        await chrome.storage.sync.clear();
        await chrome.storage.local.clear();
        this.showSaveStatus('All data cleared', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Error clearing data:', error);
        this.showSaveStatus('Error clearing data', 'error');
      }
    }
  }

  async loadCalendars() {
    try {
      // Get access token and fetch calendars
      const token = await this.getAccessToken();
      if (!token) return;

      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const select = document.getElementById('defaultCalendar');
        
        if (select) {
          // Clear existing options except primary
          while (select.children.length > 1) {
            select.removeChild(select.lastChild);
          }

          // Add calendar options
          data.items.forEach(calendar => {
            if (calendar.id !== 'primary') {
              const option = document.createElement('option');
              option.value = calendar.id;
              option.textContent = calendar.summary;
              select.appendChild(option);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  }

  async getAccessToken() {
    try {
      const result = await chrome.identity.getAuthToken({ interactive: false });
      return result.token;
    } catch (error) {
      return null;
    }
  }

  showSaveStatus(message, type) {
    const status = document.getElementById('saveStatus');
    if (status) {
      status.textContent = message;
      status.className = `save-status ${type}`;
      
      setTimeout(() => {
        status.textContent = '';
        status.className = 'save-status';
      }, 3000);
    }
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing OptionsManager...');
  new OptionsManager();
});