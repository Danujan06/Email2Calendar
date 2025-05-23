class CalendarAPI {
  constructor() {
    this.accessToken = null;
    this.calendars = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    try {
      await this.authenticate();
      await this.loadCalendars();
      return true;
    } catch (error) {
      console.error('Failed to initialize Calendar API:', error);
      return false;
    }
  }

  async authenticate() {
    try {
      const result = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      });
      this.accessToken = result.token;
      return this.accessToken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async refreshToken() {
    try {
      await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
      return await this.authenticate();
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async loadCalendars() {
    const token = await this.getValidToken();
    
    try {
      const response = await this.makeAPIRequest(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        'GET',
        null,
        token
      );

      this.calendars = response.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor
      }));

      return this.calendars;
    } catch (error) {
      throw new Error(`Failed to load calendars: ${error.message}`);
    }
  }

  async addEvent(eventData, calendarId = 'primary') {
    const token = await this.getValidToken();
    
    // Validate event data
    if (!this.validateEventData(eventData)) {
      throw new Error('Invalid event data provided');
    }

    const event = this.formatEventForAPI(eventData);
    
    try {
      const response = await this.makeAPIRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        'POST',
        event,
        token
      );

      // Store event reference for potential updates
      await this.storeEventReference(response.id, eventData.sourceEmailId);
      
      return {
        success: true,
        eventId: response.id,
        htmlLink: response.htmlLink,
        event: response
      };
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  async updateEvent(eventId, eventData, calendarId = 'primary') {
    const token = await this.getValidToken();
    const event = this.formatEventForAPI(eventData);
    
    try {
      const response = await this.makeAPIRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        'PUT',
        event,
        token
      );

      return {
        success: true,
        eventId: response.id,
        event: response
      };
    } catch (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  async deleteEvent(eventId, calendarId = 'primary') {
    const token = await this.getValidToken();
    
    try {
      await this.makeAPIRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        'DELETE',
        null,
        token
      );

      // Remove stored reference
      await this.removeEventReference(eventId);
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  async findExistingEvent(eventData) {
    const token = await this.getValidToken();
    
    // Search for events with similar title and date
    const searchQuery = encodeURIComponent(eventData.title);
    const timeMin = this.formatDateTime(eventData.date, '00:00');
    const timeMax = this.formatDateTime(eventData.date, '23:59');
    
    try {
      const response = await this.makeAPIRequest(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${searchQuery}&timeMin=${timeMin}&timeMax=${timeMax}`,
        'GET',
        null,
        token
      );

      return response.items.filter(event => 
        this.isSimilarEvent(event, eventData)
      );
    } catch (error) {
      console.error('Error searching for existing events:', error);
      return [];
    }
  }

  formatEventForAPI(eventData) {
    const event = {
      summary: eventData.title,
      description: this.buildEventDescription(eventData),
      start: this.formatEventTime(eventData.date, eventData.startTime, eventData.allDay),
      end: this.formatEventTime(eventData.date, eventData.endTime || eventData.startTime, eventData.allDay),
      location: eventData.location || undefined,
      attendees: this.formatAttendees(eventData.attendees),
      reminders: this.getDefaultReminders(eventData),
      visibility: eventData.private ? 'private' : 'default',
      status: eventData.status || 'confirmed'
    };

    // Add recurrence if specified
    if (eventData.recurrence) {
      event.recurrence = this.formatRecurrence(eventData.recurrence);
    }

    // Add conference data for video meetings
    if (eventData.videoLink || eventData.conferenceType) {
      event.conferenceData = this.formatConferenceData(eventData);
    }

    return event;
  }

  formatEventTime(date, time, allDay = false) {
    if (allDay) {
      return { date: date };
    }

    const dateTime = time ? `${date}T${time}:00` : `${date}T09:00:00`;
    return {
      dateTime: dateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  buildEventDescription(eventData) {
    let description = eventData.description || '';
    
    if (eventData.sourceEmail) {
      description += `\n\n--- Source Email ---\n${eventData.sourceEmail}`;
    }
    
    if (eventData.extractedBy) {
      description += `\n\nExtracted by Email2Calendar Extension`;
    }

    return description.trim();
  }

  formatAttendees(attendees) {
    if (!attendees || !Array.isArray(attendees)) return undefined;
    
    return attendees.map(attendee => ({
      email: attendee.email || attendee,
      displayName: attendee.name,
      responseStatus: 'needsAction'
    }));
  }

  getDefaultReminders(eventData) {
    const defaultReminders = [
      { method: 'popup', minutes: 15 },
      { method: 'email', minutes: 60 }
    ];

    return {
      useDefault: false,
      overrides: eventData.reminders || defaultReminders
    };
  }

  formatRecurrence(recurrenceData) {
    // Convert recurrence data to RRULE format
    const rules = [];
    
    if (recurrenceData.frequency) {
      rules.push(`FREQ=${recurrenceData.frequency.toUpperCase()}`);
    }
    
    if (recurrenceData.interval) {
      rules.push(`INTERVAL=${recurrenceData.interval}`);
    }
    
    if (recurrenceData.until) {
      rules.push(`UNTIL=${recurrenceData.until.replace(/-/g, '')}`);
    }
    
    if (recurrenceData.count) {
      rules.push(`COUNT=${recurrenceData.count}`);
    }

    return [`RRULE:${rules.join(';')}`];
  }

  formatConferenceData(eventData) {
    if (eventData.videoLink) {
      return {
        entryPoints: [{
          entryPointType: 'video',
          uri: eventData.videoLink,
          label: 'Video call'
        }]
      };
    }

    if (eventData.conferenceType === 'hangouts') {
      return {
        createRequest: {
          requestId: this.generateRequestId(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }

    return undefined;
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
        // Token expired, refresh and retry
        await this.refreshToken();
        return this.makeAPIRequest(url, method, data, this.accessToken, 2);
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
      if (attempt < this.retryAttempts && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * attempt);
        return this.makeAPIRequest(url, method, data, token, attempt + 1);
      }
      throw error;
    }
  }

  async getValidToken() {
    if (!this.accessToken) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  validateEventData(eventData) {
    return eventData && 
           eventData.title && 
           eventData.date && 
           /^\d{4}-\d{2}-\d{2}$/.test(eventData.date);
  }

  isSimilarEvent(calendarEvent, eventData) {
    // Check if events are similar based on title and time
    const titleSimilarity = this.calculateSimilarity(
      calendarEvent.summary?.toLowerCase() || '',
      eventData.title?.toLowerCase() || ''
    );
    
    return titleSimilarity > 0.8;
  }

  calculateSimilarity(str1, str2) {
    // Simple similarity calculation (can be improved with more sophisticated algorithms)
    if (str1 === str2) return 1;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async storeEventReference(eventId, emailId) {
    if (!emailId) return;
    
    try {
      const result = await chrome.storage.local.get(['eventReferences']);
      const references = result.eventReferences || {};
      references[emailId] = eventId;
      await chrome.storage.local.set({ eventReferences: references });
    } catch (error) {
      console.error('Error storing event reference:', error);
    }
  }

  async removeEventReference(eventId) {
    try {
      const result = await chrome.storage.local.get(['eventReferences']);
      const references = result.eventReferences || {};
      
      // Find and remove the reference
      for (const [emailId, storedEventId] of Object.entries(references)) {
        if (storedEventId === eventId) {
          delete references[emailId];
          break;
        }
      }
      
      await chrome.storage.local.set({ eventReferences: references });
    } catch (error) {
      console.error('Error removing event reference:', error);
    }
  }

  formatDateTime(date, time) {
    return time ? `${date}T${time}:00` : `${date}T00:00:00`;
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  isRetryableError(error) {
    return error.message.includes('503') || 
           error.message.includes('429') || 
           error.message.includes('network');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to get user's calendars
  getCalendars() {
    return this.calendars || [];
  }

  // Get primary calendar
  getPrimaryCalendar() {
    return this.calendars?.find(cal => cal.primary) || { id: 'primary', summary: 'Primary' };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarAPI;
}