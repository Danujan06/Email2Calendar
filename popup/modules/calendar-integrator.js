// ============================================================================
// CALENDAR INTEGRATOR MODULE - popup/modules/calendar-integrator.js
// ============================================================================

/**
 * CalendarIntegrator handles Google Calendar API interactions
 * Responsibilities:
 * - Event formatting for Calendar API
 * - Duplicate prevention
 * - Auto-add functionality
 * - API communication with background script
 */
class CalendarIntegrator {
  constructor() {
    this.processedEvents = new Set(); // Session-level duplicate prevention
    this.apiTimeout = 30000; // 30 seconds
  }

  /**
   * Add a single event to calendar
   */
  async addEventToCalendar(eventData) {
    console.log('📅 Adding event to calendar:', eventData);
    
    // Check for session duplicates
    const eventKey = this.generateEventKey(eventData);
    if (this.processedEvents.has(eventKey)) {
      throw new Error('Event already processed in this session');
    }
    
    const formattedEvent = this.formatEventForCalendar(eventData);
    
    if (!formattedEvent.date) {
      throw new Error('Invalid date format');
    }
    
    if (formattedEvent.startTime && !this.isValidTime(formattedEvent.startTime)) {
      console.warn('⚠️ Invalid time format, converting to all-day event');
      formattedEvent.startTime = null;
      formattedEvent.endTime = null;
    }
    
    // Mark as processed before attempting to add
    this.processedEvents.add(eventKey);
    
    try {
      const result = await this.sendToCalendarAPI(formattedEvent);
      console.log('✅ Event added successfully:', result);
      return result;
    } catch (error) {
      // If it fails due to duplicate, keep it marked as processed
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`⚠️ Duplicate detected for ${eventData.title}, keeping in processed set`);
      } else {
        // Remove from processed set if it failed for other reasons
        this.processedEvents.delete(eventKey);
      }
      throw error;
    }
  }

  /**
   * Auto-add multiple events based on confidence threshold
   */
  async autoAddEvents(events, confidenceThreshold = 0.7) {
    console.log('🤖 Auto-adding events to calendar...');
    
    let addedCount = 0;
    const results = [];
    
    for (const event of events) {
      // Auto-add events with sufficient confidence
      if ((event.confidence || 0) >= confidenceThreshold) {
        try {
          console.log(`🚀 Adding high-confidence event: ${event.title} (${Math.round(event.confidence * 100)}%)`);
          
          const result = await this.addEventToCalendar(event);
          addedCount++;
          results.push({ event, success: true, result });
          event.status = 'added';
          
          // Delay to avoid rate limiting
          await this.delay(1000);
          
        } catch (error) {
          console.error(`❌ Failed to add ${event.title}:`, error);
          results.push({ event, success: false, error: error.message });
          event.status = 'failed';
        }
      } else {
        console.log(`⚠️ Skipping low-confidence event: ${event.title} (${Math.round((event.confidence || 0) * 100)}%)`);
        results.push({ event, success: false, error: 'Low confidence' });
      }
    }
    
    console.log(`📊 Auto-add results: ${addedCount}/${events.length} events added successfully`);
    return { addedCount, results };
  }

  /**
   * Format event data for Google Calendar API
   */
  formatEventForCalendar(eventData) {
    const formatted = {
      title: this.cleanTitle(eventData.title),
      date: this.formatDate(eventData.date),
      startTime: this.formatTime(eventData.time),
      endTime: null,
      location: this.cleanLocation(eventData.location),
      description: this.buildDescription(eventData),
      type: eventData.type || 'general',
      source: eventData.source || 'manual',
      confidence: eventData.confidence || 0.5
    };
    
    // Calculate end time
    if (formatted.startTime) {
      formatted.endTime = this.calculateEndTime(formatted.startTime, eventData.type);
    }
    
    console.log('📝 Formatted event:', formatted);
    return formatted;
  }

  /**
   * Format date to YYYY-MM-DD format
   */
  formatDate(dateStr) {
    if (!dateStr) {
      return new Date().toISOString().split('T')[0];
    }
    
    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    const today = new Date();
    const lowerDate = dateStr.toLowerCase();
    
    // Handle relative dates
    if (lowerDate.includes('today') || lowerDate.includes('tonight')) {
      return today.toISOString().split('T')[0];
    }
    
    if (lowerDate.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Try to parse as date
    try {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('❌ Date parsing failed:', dateStr);
    }
    
    return today.toISOString().split('T')[0];
  }

  /**
   * Format time to HH:MM format (24-hour)
   */
  formatTime(timeStr) {
    if (!timeStr || timeStr === 'Time TBD' || timeStr === null) {
      return null;
    }
    
    // Already in correct format
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // Parse various time formats
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/i);
    
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
      
      // Validate time
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    console.warn('⚠️ Could not parse time:', timeStr);
    return null;
  }

  /**
   * Calculate end time based on start time and event type
   */
  calculateEndTime(startTime, eventType) {
    if (!startTime || !this.isValidTime(startTime)) {
      return null;
    }
    
    // Default durations by event type (in minutes)
    const durations = {
      'meeting': 60,
      'call': 30,
      'lunch': 90,
      'dinner': 120,
      'coffee': 45,
      'appointment': 60,
      'social': 120,
      'professional': 60,
      'academic': 90,
      'general': 60
    };
    
    const duration = durations[eventType] || 60;
    
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;
      
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error('❌ Error calculating end time:', e);
      return startTime;
    }
  }

  /**
   * Validate time format
   */
  isValidTime(timeStr) {
    if (!timeStr) return false;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeStr);
  }

  /**
   * Clean and format title
   */
  cleanTitle(title) {
    if (!title) return 'Event';
    
    return title
      .replace(/^(re:|fwd:|meeting|call):\s*/i, '')
      .replace(/^\W+/, '')
      .replace(/\W+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Clean and format location
   */
  cleanLocation(location) {
    if (!location) return null;
    
    return location
      .replace(/^(at|in|on|venue:|location:)\s+/i, '')
      .replace(/\s+/g, ' ')
      .replace(/[,;]$/, '')
      .trim()
      .substring(0, 200);
  }

  /**
   * Build event description
   */
  buildDescription(eventData) {
    const parts = [];
    
    if (eventData.description) {
      parts.push(eventData.description);
    }
    
    // Add metadata
    parts.push('');
    parts.push('--- Event Details ---');
    
    if (eventData.confidence) {
      parts.push(`Confidence: ${Math.round(eventData.confidence * 100)}%`);
    }
    
    if (eventData.source) {
      parts.push(`Extracted by: ${eventData.source}`);
    }
    
    if (eventData.extractedAt) {
      parts.push(`Extracted at: ${new Date(eventData.extractedAt).toLocaleString()}`);
    }
    
    parts.push('');
    parts.push('Created by Email2Calendar Extension');
    
    return parts.join('\n');
  }

  /**
   * Generate unique key for event
   */
  generateEventKey(eventData) {
    return `${(eventData.title || '').toLowerCase()}-${eventData.date}-${eventData.time}`;
  }

  /**
   * Send event to background script for Calendar API
   */
  async sendToCalendarAPI(formattedEvent) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.apiTimeout);
      
      chrome.runtime.sendMessage({
        action: 'addToCalendar',
        event: formattedEvent
      }, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  /**
   * Clear session cache
   */
  clearCache() {
    this.processedEvents.clear();
    console.log('✅ Calendar integrator cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      processedEventsCount: this.processedEvents.size,
      processedEvents: Array.from(this.processedEvents)
    };
  }

  /**
   * Check if event is already processed
   */
  isEventProcessed(eventData) {
    const key = this.generateEventKey(eventData);
    return this.processedEvents.has(key);
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate event data before processing
   */
  validateEventData(eventData) {
    const errors = [];
    
    if (!eventData.title || eventData.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (!eventData.date) {
      errors.push('Date is required');
    }
    
    if (eventData.date && !this.isValidDate(eventData.date)) {
      errors.push('Invalid date format');
    }
    
    if (eventData.time && !this.isValidTime(this.formatTime(eventData.time))) {
      errors.push('Invalid time format');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate date format
   */
  isValidDate(dateStr) {
    if (!dateStr) return false;
    
    try {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    } catch (e) {
      return false;
    }
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats() {
    return {
      version: '1.0.0',
      processedEventsCount: this.processedEvents.size,
      apiTimeout: this.apiTimeout,
      features: [
        'duplicate prevention',
        'auto-add functionality',
        'event validation',
        'time zone handling',
        'confidence-based filtering'
      ]
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarIntegrator;
}