// Alternative authentication using chrome.identity.launchWebAuthFlow
class AlternativeAuth {
  constructor() {
    // Replace these with your actual OAuth2 credentials
    // This is only for the web application
    this.clientId = '223116250257-gc6gnbjt6ocdaieubhe4h54tdmoak0pr.apps.googleusercontent.com';
    this.clientSecret = 'YOUR_CLIENT_SECRET'; // Only needed for some flows
    this.redirectUri = chrome.identity.getRedirectURL(); // https://<extension-id>.chromiumapp.org/
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    
    console.log('Redirect URI:', this.redirectUri);
  }

  async authenticate() {
    try {
      // Step 1: Get authorization code
      const authCode = await this.getAuthorizationCode();
      
      // Step 2: Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(authCode);
      
      // Store tokens
      await chrome.storage.local.set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: Date.now() + (tokens.expires_in * 1000)
      });
      
      return tokens.access_token;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async getAuthorizationCode() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.readonly'
    ].join(' ');

    const authParams = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent'
    });

    const authFullUrl = `${this.authUrl}?${authParams.toString()}`;

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authFullUrl,
          interactive: true
        },
        (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const url = new URL(redirectUrl);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            reject(new Error(`OAuth error: ${error}`));
          } else if (code) {
            resolve(code);
          } else {
            reject(new Error('No authorization code received'));
          }
        }
      );
    });
  }

  async exchangeCodeForTokens(code) {
    const tokenParams = new URLSearchParams({
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return await response.json();
  }

  async getValidToken() {
    const stored = await chrome.storage.local.get(['accessToken', 'tokenExpiry', 'refreshToken']);
    
    // Check if token exists and is not expired
    if (stored.accessToken && stored.tokenExpiry > Date.now() + 60000) {
      return stored.accessToken;
    }
    
    // Try to refresh if we have a refresh token
    if (stored.refreshToken) {
      try {
        return await this.refreshAccessToken(stored.refreshToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }
    
    // Otherwise, re-authenticate
    return await this.authenticate();
  }

  async refreshAccessToken(refreshToken) {
    const refreshParams = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token'
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: refreshParams.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const tokens = await response.json();
    
    // Update stored tokens
    await chrome.storage.local.set({
      accessToken: tokens.access_token,
      tokenExpiry: Date.now() + (tokens.expires_in * 1000)
    });
    
    return tokens.access_token;
  }
}

// Enhanced CalendarAPI class with alternative authentication
class CalendarAPI {
  constructor() {
    this.accessToken = null;
    this.altAuth = new AlternativeAuth();
  }

  async getAccessToken() {
    if (!this.accessToken) {
      try {
        // First try the standard Chrome identity API
        const result = await chrome.identity.getAuthToken({ 
          interactive: true,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/gmail.readonly'
          ]
        });
        
        this.accessToken = result.token || result;
        console.log('Standard auth successful:', this.accessToken ? 'Success' : 'Failed');
        return this.accessToken;
        
      } catch (error) {
        console.log('Standard auth failed, trying alternative method:', error.message);
        
        try {
          // Fall back to launchWebAuthFlow
          this.accessToken = await this.altAuth.getValidToken();
          console.log('Alternative auth successful');
          return this.accessToken;
        } catch (altError) {
          console.error('Both authentication methods failed:', altError);
          throw new Error(`Authentication failed: ${altError.message}`);
        }
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
      const response = await this.makeAPIRequest(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        'POST',
        event,
        token
      );

      console.log('Event created successfully:', response);
      return response;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  async makeAPIRequest(url, method, data, token, attempt = 1) {
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
      
      if (response.status === 401 && attempt === 1) {
        // Token expired, clear cached token and retry
        this.accessToken = null;
        await chrome.storage.local.remove(['accessToken']);
        
        const newToken = await this.getAccessToken();
        return this.makeAPIRequest(url, method, data, newToken, 2);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      if (method === 'DELETE') {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      if (attempt < 3 && this.isRetryableError(error)) {
        await this.delay(1000 * attempt);
        return this.makeAPIRequest(url, method, data, token, attempt + 1);
      }
      throw error;
    }
  }

  isRetryableError(error) {
    return error.message.includes('503') || 
           error.message.includes('429') || 
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  // Additional utility methods for calendar management
  async listCalendars() {
    const token = await this.getAccessToken();
    return this.makeAPIRequest(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      'GET',
      null,
      token
    );
  }

  async deleteEvent(eventId, calendarId = 'primary') {
    const token = await this.getAccessToken();
    return this.makeAPIRequest(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      'DELETE',
      null,
      token
    );
  }

  async updateEvent(eventId, eventData, calendarId = 'primary') {
    const token = await this.getAccessToken();
    const event = this.formatEventForAPI(eventData);
    
    return this.makeAPIRequest(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      'PUT',
      event,
      token
    );
  }

  formatEventForAPI(eventData) {
    const event = {
      summary: eventData.title || 'Meeting',
      description: eventData.description || '',
      location: eventData.location || undefined
    };

    if (eventData.startTime && eventData.startTime !== 'Time TBD') {
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
      event.start = { date: eventData.date };
      event.end = { date: this.getNextDay(eventData.date) };
    }

    return event;
  }
}

// Background script message handling with enhanced error handling
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

  if (request.action === 'listCalendars') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        const calendars = await calendarAPI.listCalendars();
        sendResponse({ success: true, calendars: calendars.items });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }

  if (request.action === 'deleteEvent') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        await calendarAPI.deleteEvent(request.eventId, request.calendarId);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }

  if (request.action === 'updateEvent') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        const result = await calendarAPI.updateEvent(request.eventId, request.event, request.calendarId);
        sendResponse({ success: true, event: result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }

  // Debug endpoint to test authentication
  if (request.action === 'debugAuth') {
    const calendarAPI = new CalendarAPI();
    
    (async () => {
      try {
        const token = await calendarAPI.getAccessToken();
        const calendars = await calendarAPI.listCalendars();
        
        sendResponse({ 
          success: true, 
          token: token ? 'Token obtained' : 'No token',
          calendarsCount: calendars.items ? calendars.items.length : 0,
          primaryCalendar: calendars.items ? calendars.items.find(cal => cal.primary) : null
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message, stack: error.stack });
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

  // Clear alternative auth tokens as well
  chrome.storage.local.remove(['accessToken', 'refreshToken', 'tokenExpiry'], () => {
    console.log('Cleared alternative auth tokens');
  });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Email2Calendar extension started');
});

// Handle when extension is suspended (Chrome removes it from memory)
chrome.runtime.onSuspend.addListener(() => {
  console.log('Email2Calendar extension suspended');
});

// Handle alarm events (for future scheduled tasks)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  if (alarm.name === 'tokenRefresh') {
    // Refresh tokens if needed
    const calendarAPI = new CalendarAPI();
    calendarAPI.getAccessToken().catch(error => {
      console.error('Token refresh failed:', error);
    });
  }
});

// Set up periodic token refresh (every 30 minutes)
chrome.alarms.create('tokenRefresh', { periodInMinutes: 30 });

// Export classes for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AlternativeAuth, CalendarAPI };
}