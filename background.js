class CalendarAPI {
  constructor() {
    this.accessToken = null;
  }

  async getAccessToken() {
    if (!this.accessToken) {
      try {
        const result = await chrome.identity.getAuthToken({ 
          interactive: true,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/gmail.readonly'
          ]
        });
        this.accessToken = result.token || result; // Handle both formats
        console.log('Access token obtained:', this.accessToken ? 'Success' : 'Failed');
      } catch (error) {
        console.error('Authentication failed:', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
    return this.accessToken;
  }

  async addEvent(eventData) {
    console.log('Adding event:', eventData);
    const token = await this.getAccessToken();
    
    // Create event object with proper formatting
    const event = {
      summary: eventData.title || 'Meeting',
      description: eventData.description || '',
      location: eventData.location || undefined
    };

    // Handle date/time formatting properly
    if (eventData.startTime && eventData.startTime !== 'Time TBD') {
      // Specific time event
      const startDateTime = this.formatDateTime(eventData.date, eventData.startTime);
      const endDateTime = this.formatDateTime(eventData.date, eventData.endTime || this.addHour(eventData.startTime));
      
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
      event.start = { date: eventData.date };
      event.end = { date: this.getNextDay(eventData.date) };
    }

    console.log('Formatted event:', event);

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Calendar API error:', errorData);
        throw new Error(`Calendar API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Event created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  formatDateTime(date, time) {
    if (!time || time === 'Time TBD') {
      return null;
    }
    
    // Ensure proper ISO format
    const dateStr = date.includes('T') ? date.split('T')[0] : date;
    
    // Handle different time formats
    let timeStr = time;
    if (!timeStr.includes(':')) {
      timeStr = timeStr + ':00';
    }
    if (timeStr.length === 5) {
      timeStr = timeStr + ':00';
    }
    
    return `${dateStr}T${timeStr}`;
  }

  addHour(time) {
    if (!time || time === 'Time TBD') return null;
    
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const newHours = (hours + 1) % 24;
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error adding hour to time:', error);
      return time;
    }
  }

  getNextDay(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }
}

// Background script message handling with better error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  if (request.action === 'addToCalendar') {
    const calendarAPI = new CalendarAPI();
    
    // Handle async operation properly
    (async () => {
      try {
        const result = await calendarAPI.addEvent(request.event);
        console.log('Event added successfully:', result);
        sendResponse({ 
          success: true, 
          eventId: result.id, 
          event: result,
          htmlLink: result.htmlLink 
        });
      } catch (error) {
        console.error('Failed to add event:', error);
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
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Email2Calendar extension installed');
  
  // Clear any cached tokens on install
  chrome.identity.clearAllCachedAuthTokens(() => {
    console.log('Cleared cached auth tokens');
  });
});