class CalendarAPI {
  constructor() {
    this.accessToken = null;
  }

  async getAccessToken() {
    if (!this.accessToken) {
      try {
        // Updated API call for Manifest V3
        const result = await chrome.identity.getAuthToken({ 
          interactive: true,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/gmail.readonly'
          ]
        });
        this.accessToken = result;
      } catch (error) {
        console.error('Authentication failed:', error);
        throw new Error('Authentication failed');
      }
    }
    return this.accessToken;
  }

  async addEvent(eventData) {
    const token = await this.getAccessToken();
    
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: this.formatDateTime(eventData.date, eventData.startTime),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: this.formatDateTime(eventData.date, eventData.endTime || this.addHour(eventData.startTime)),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    if (eventData.location) {
      event.location = eventData.location;
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Calendar API error:', errorData);
        throw new Error(`Calendar API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  formatDateTime(date, time) {
    if (!time) {
      // All-day event - return just the date
      return date;
    }
    
    // Ensure proper ISO format
    const dateStr = date.includes('T') ? date.split('T')[0] : date;
    const timeStr = time.includes(':') ? time : `${time}:00`;
    
    return `${dateStr}T${timeStr}:00`;
  }

  addHour(time) {
    if (!time) return null;
    
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

// Background script message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addToCalendar') {
    const calendarAPI = new CalendarAPI();
    
    calendarAPI.addEvent(request.event)
      .then(result => {
        console.log('Event added successfully:', result);
        sendResponse({ success: true, eventId: result.id, event: result });
      })
      .catch(error => {
        console.error('Failed to add event:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'authenticate') {
    const calendarAPI = new CalendarAPI();
    
    calendarAPI.getAccessToken()
      .then(token => {
        sendResponse({ success: true, authenticated: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
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