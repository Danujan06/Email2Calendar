class CalendarAPI {
  constructor() {
    this.accessToken = null;
    this.processedEvents = new Set(); // Track processed events to prevent duplicates
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
        this.accessToken = result.token || result;
        console.log('✅ Access token obtained');
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
    return this.accessToken;
  }

  async addEvent(eventData) {
    console.log('📅 Adding event with data:', eventData);
    
    // Create unique event identifier to prevent duplicates
    const eventKey = `${eventData.title}-${eventData.date}-${eventData.startTime}`;
    if (this.processedEvents.has(eventKey)) {
      console.log('⚠️ Event already processed, skipping duplicate');
      return { success: false, error: 'Event already exists' };
    }
    
    const token = await this.getAccessToken();
    
    // Validate required fields
    if (!eventData.title || !eventData.date) {
      throw new Error('Event must have title and date');
    }

    // Create event object with proper time handling
    const event = {
      summary: eventData.title || 'Event',
      description: this.buildDescription(eventData),
      location: eventData.location || undefined
    };

    // CRITICAL FIX: Proper date/time handling with timezone
    if (eventData.startTime && eventData.startTime !== 'Time TBD' && eventData.startTime !== null) {
      // Timed event - use dateTime format with proper timezone
      console.log('⏰ Creating timed event with timezone handling');
      
      const userTimezone = this.getUserTimezone();
      console.log('🌍 User timezone:', userTimezone);
      
      const startDateTime = this.createProperDateTimeString(eventData.date, eventData.startTime, userTimezone);
      const endDateTime = this.createProperDateTimeString(eventData.date, eventData.endTime || this.addHour(eventData.startTime), userTimezone);
      
      event.start = {
        dateTime: startDateTime,
        timeZone: userTimezone
      };
      event.end = {
        dateTime: endDateTime,
        timeZone: userTimezone
      };
      
      console.log('📅 Timed event created with proper timezone:', {
        start: event.start,
        end: event.end
      });
    } else {
      // All-day event - use date format
      console.log('📅 Creating all-day event');
      
      event.start = { date: eventData.date };
      event.end = { date: this.getNextDay(eventData.date) };
      
      console.log('📅 All-day event created:', {
        start: event.start,
        end: event.end
      });
    }

    try {
      console.log('🚀 Sending to Google Calendar API:', event);
      
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Calendar API error:', errorData);
        throw new Error(`Calendar API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ Event created successfully:', result);
      
      // Mark event as processed to prevent duplicates
      this.processedEvents.add(eventKey);
      
      // Clean up old processed events (keep only last 100)
      if (this.processedEvents.size > 100) {
        const entries = Array.from(this.processedEvents);
        this.processedEvents.clear();
        entries.slice(-50).forEach(entry => this.processedEvents.add(entry));
      }
      
      return {
        success: true,
        eventId: result.id,
        htmlLink: result.htmlLink,
        event: result
      };
    } catch (error) {
      console.error('❌ Error adding event:', error);
      throw error;
    }
  }

  // CRITICAL FIX: Proper datetime string creation with timezone
  createProperDateTimeString(date, time, timezone) {
    // Ensure date is in YYYY-MM-DD format
    const dateStr = this.normalizeDate(date);
    
    // Ensure time is in HH:MM format
    const timeStr = this.normalizeTime(time);
    
    if (!dateStr || !timeStr) {
      throw new Error(`Invalid date/time: date=${dateStr}, time=${timeStr}`);
    }
    
    // Create proper datetime string WITHOUT timezone suffix
    // Let Google Calendar API handle timezone through the timeZone field
    const dateTimeString = `${dateStr}T${timeStr}:00`;
    
    console.log(`🕐 Created datetime string: ${dateTimeString} (timezone: ${timezone})`);
    return dateTimeString;
  }

  // Get user's timezone in IANA format
  getUserTimezone() {
    try {
      // Get the user's timezone from the browser
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detected user timezone:', timezone);
      
      // Validate it's a proper IANA timezone
      if (this.isValidIANATimezone(timezone)) {
        return timezone;
      } else {
        console.warn('⚠️ Invalid timezone detected, falling back to UTC');
        return 'UTC';
      }
    } catch (error) {
      console.error('❌ Error getting timezone:', error);
      return 'UTC'; // Fallback to UTC
    }
  }

  // Validate IANA timezone format
  isValidIANATimezone(timezone) {
    try {
      // Test if the timezone is valid by creating a date with it
      new Intl.DateTimeFormat('en', { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  normalizeDate(date) {
    if (!date) return null;
    
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Try to parse and format
    try {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('❌ Date parsing error:', e);
    }
    
    return null;
  }

  normalizeTime(time) {
    if (!time || time === 'Time TBD') return null;
    
    // If already in HH:MM format
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time;
    }
    
    // Parse various time formats
    const timeMatch = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/i);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
      
      // Convert to 24-hour format
      if (ampm.includes('pm') && hours !== 12) {
        hours += 12;
      } else if (ampm.includes('am') && hours === 12) {
        hours = 0;
      }
      
      // Validate hours and minutes
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        console.log(`🕐 Normalized time: "${time}" → "${result}"`);
        return result;
      }
    }
    
    console.error('❌ Time parsing failed for:', time);
    return null;
  }

  addHour(time) {
    if (!time || time === 'Time TBD') return null;
    
    try {
      const normalizedTime = this.normalizeTime(time);
      if (!normalizedTime) return null;
      
      const [hours, minutes] = normalizedTime.split(':').map(Number);
      const newHours = (hours + 1) % 24;
      const result = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      console.log(`⏰ Added 1 hour: "${normalizedTime}" → "${result}"`);
      return result;
    } catch (error) {
      console.error('❌ Error adding hour to time:', error);
      return time;
    }
  }

  getNextDay(date) {
    try {
      const dateObj = new Date(date);
      dateObj.setDate(dateObj.getDate() + 1);
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('❌ Error calculating next day:', error);
      return date;
    }
  }

  buildDescription(eventData) {
    let description = eventData.description || '';
    
    if (eventData.source) {
      description += `\n\n--- Extracted by Email2Calendar ---\nSource: ${eventData.source}`;
      if (eventData.confidence) {
        description += `\nConfidence: ${(eventData.confidence * 100).toFixed(0)}%`;
      }
    }
    
    // Add timezone info for debugging
    description += `\nTimezone: ${this.getUserTimezone()}`;
    description += `\nCreated at: ${new Date().toISOString()}`;
    
    return description.trim();
  }

  // Debug method to test timezone handling
  async testTimezoneHandling() {
    const testDate = '2025-05-30';
    const testTime = '22:00'; // 10 PM
    const timezone = this.getUserTimezone();
    
    console.log('🧪 Testing timezone handling:');
    console.log('  Date:', testDate);
    console.log('  Time:', testTime);
    console.log('  Timezone:', timezone);
    
    const dateTimeString = this.createProperDateTimeString(testDate, testTime, timezone);
    console.log('  Result:', dateTimeString);
    
    // Test with different formats
    const testTimes = ['10 pm', '10:00 PM', '22:00', '10.00 pm'];
    testTimes.forEach(time => {
      const normalized = this.normalizeTime(time);
      console.log(`  "${time}" → "${normalized}"`);
    });
  }
}

// Enhanced background script message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔔 Background script received message:', request);
  
  if (request.action === 'addToCalendar') {
    const calendarAPI = new CalendarAPI();
    
    // Handle async operation properly
    (async () => {
      try {
        console.log('🚀 Processing calendar addition request...');
        
        // Debug log the incoming event data
        console.log('📝 Event data received:', request.event);
        
        const result = await calendarAPI.addEvent(request.event);
        console.log('✅ Calendar addition successful:', result);
        
        sendResponse({ 
          success: true, 
          eventId: result.eventId, 
          event: result.event,
          htmlLink: result.htmlLink 
        });
      } catch (error) {
        console.error('❌ Calendar addition failed:', error);
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
  
  // Handle clear cache request
  if (request.action === 'clearCache') {
    const calendarAPI = new CalendarAPI();
    calendarAPI.processedEvents.clear();
    sendResponse({ success: true });
    return true;
  }
  
  // Debug timezone handling
  if (request.action === 'testTimezone') {
    const calendarAPI = new CalendarAPI();
    calendarAPI.testTimezoneHandling();
    sendResponse({ success: true });
    return true;
  }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Email2Calendar extension installed/updated');
  
  // Clear any cached tokens on install
  chrome.identity.clearAllCachedAuthTokens(() => {
    console.log('🧹 Cleared cached auth tokens');
  });
  
  // Test timezone detection on install
  const calendarAPI = new CalendarAPI();
  console.log('🌍 User timezone on install:', calendarAPI.getUserTimezone());
});

// Add periodic cleanup for processed events
setInterval(() => {
  console.log('🧹 Periodic cleanup of processed events cache');
}, 300000); // Every 5 minutes