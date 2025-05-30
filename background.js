// Fixed background.js
class CalendarAPI {
  constructor() {
    this.accessToken = null;
    this.isAuthenticating = false;
  }

  async getAccessToken() {
    // Prevent multiple simultaneous auth attempts
    if (this.isAuthenticating) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.accessToken;
    }

    if (!this.accessToken) {
      this.isAuthenticating = true;
      try {
        console.log('Starting OAuth flow...');
        
        // Try non-interactive first
        let result;
        try {
          result = await chrome.identity.getAuthToken({ 
            interactive: false,
            scopes: [
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/calendar.events'
            ]
          });
          console.log('Non-interactive auth result:', result);
        } catch (nonInteractiveError) {
          console.log('Non-interactive auth failed, trying interactive:', nonInteractiveError);
          
          // Clear any cached tokens first
          await this.clearTokens();
          
          result = await chrome.identity.getAuthToken({ 
            interactive: true,
            scopes: [
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/calendar.events'
            ]
          });
          console.log('Interactive auth result:', result);
        }
        
        // Handle different response formats
        this.accessToken = result?.token || result;
        
        if (!this.accessToken) {
          throw new Error('No access token received');
        }
        
        console.log('✅ Authentication successful');
        
        // Validate token by making a test request
        await this.validateToken();
        
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        this.accessToken = null;
        throw new Error(`Authentication failed: ${error.message}`);
      } finally {
        this.isAuthenticating = false;
      }
    }
    
    return this.accessToken;
  }

  async validateToken() {
    if (!this.accessToken) return false;
    
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.log('Token expired, clearing...');
        await this.clearTokens();
        this.accessToken = null;
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  async clearTokens() {
    try {
      if (this.accessToken) {
        await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
      }
      await chrome.identity.clearAllCachedAuthTokens();
      this.accessToken = null;
      console.log('🗑️ Cleared cached tokens');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  async addEvent(eventData) {
    console.log('📅 Adding event:', eventData);
    
    // Validate input
    if (!eventData.title || !eventData.date) {
      throw new Error('Missing required event data (title and date)');
    }

    const token = await this.getAccessToken();
    
    // Create properly formatted event
    const event = this.formatEventForAPI(eventData);
    console.log('📝 Formatted event:', event);

    try {
      const response = await this.makeAPIRequest(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        'POST',
        event,
        token
      );

      console.log('✅ Event created successfully:', response);
      return {
        success: true,
        eventId: response.id,
        htmlLink: response.htmlLink,
        event: response
      };
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  formatEventForAPI(eventData) {
    const event = {
      summary: eventData.title || 'Meeting',
      description: this.buildDescription(eventData)
    };

    // Handle date/time formatting
    if (eventData.startTime && eventData.startTime !== 'Time TBD') {
      // Timed event
      const startDateTime = this.formatDateTime(eventData.date, eventData.startTime);
      const endDateTime = this.formatDateTime(eventData.date, eventData.endTime || this.addOneHour(eventData.startTime));
      
      event.start = {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } else {
      // All-day event
      const eventDate = this.normalizeDate(eventData.date);
      event.start = { date: eventDate };
      event.end = { date: this.getNextDay(eventDate) };
    }

    // Add location if provided
    if (eventData.location) {
      event.location = eventData.location;
    }

    // Add default reminders
    event.reminders = {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'email', minutes: 60 }
      ]
    };

    return event;
  }

  buildDescription(eventData) {
    let description = eventData.description || '';
    
    if (eventData.type) {
      description += `\nType: ${eventData.type}`;
    }
    
    description += '\n\n--- Created by Email2Calendar Extension ---';
    
    return description.trim();
  }

  formatDateTime(date, time) {
    // Normalize date to YYYY-MM-DD format
    const normalizedDate = this.normalizeDate(date);
    
    // Normalize time to HH:MM format
    const normalizedTime = this.normalizeTime(time);
    
    return `${normalizedDate}T${normalizedTime}:00`;
  }

  normalizeDate(dateStr) {
    if (!dateStr || dateStr === 'Date TBD') {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle relative dates
    if (dateStr.toLowerCase().includes('today')) {
      return new Date().toISOString().split('T')[0];
    }
    
    if (dateStr.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }
    }

    // Try to parse as Date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Could not parse date:', dateStr);
    }

    // Fallback to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  normalizeTime(timeStr) {
    if (!timeStr || timeStr === 'Time TBD') {
      return '09:00'; // Default to 9 AM
    }

    // Handle various time formats
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return '09:00'; // Default fallback
  }

  addOneHour(timeStr) {
    try {
      const normalizedTime = this.normalizeTime(timeStr);
      const [hours, minutes] = normalizedTime.split(':').map(Number);
      const newHours = (hours + 1) % 24;
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '10:00'; // Default to 10 AM
    }
  }

  getNextDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  async makeAPIRequest(url, method, data, token, retryCount = 0) {
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      // Handle token expiration
      if (response.status === 401 && retryCount === 0) {
        console.log('Token expired, refreshing...');
        await this.clearTokens();
        this.accessToken = null;
        const newToken = await this.getAccessToken();
        return this.makeAPIRequest(url, method, data, newToken, 1);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Enhanced message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request.action);
  
  if (request.action === 'addToCalendar') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        const result = await calendarAPI.addEvent(request.event);
        console.log('✅ Event added successfully');
        sendResponse(result);
      } catch (error) {
        console.error('❌ Failed to add event:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'authenticate') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        await calendarAPI.getAccessToken();
        sendResponse({ success: true, authenticated: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }

  if (request.action === 'clearAuth') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        await calendarAPI.clearTokens();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }
});

// Handle extension installation/startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('📦 Email2Calendar extension installed');
  
  // Clear any cached tokens on fresh install
  try {
    await chrome.identity.clearAllCachedAuthTokens();
    console.log('🗑️ Cleared cached auth tokens on install');
  } catch (error) {
    console.error('Error clearing tokens on install:', error);
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Email2Calendar extension started');
});