// ============================================================================
// BASIC EVENT EXTRACTOR MODULE - popup/modules/extractors/basic-extractor.js
// ============================================================================

/**
 * BasicEventExtractor provides rule-based event extraction
 * This is a fallback/alternative to AI-based extraction
 * Responsibilities:
 * - Pattern-based event detection
 * - Keyword matching
 * - Simple date/time parsing
 * - Fast, reliable extraction without external dependencies
 */
class BasicEventExtractor {
  constructor() {
    this.eventKeywords = [
      'meeting', 'meet', 'appointment', 'call', 'conference', 'zoom',
      'lunch', 'dinner', 'breakfast', 'coffee', 'drink', 'drinks',
      'event', 'party', 'celebration', 'interview', 'presentation',
      'demo', 'workshop', 'training', 'seminar', 'webinar', 'class',
      'lecture', 'session', 'due', 'deadline', 'assignment', 'exam',
      'test', 'quiz', 'submission', 'submit'
    ];

    this.timeKeywords = [
      'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 
      'thursday', 'friday', 'saturday', 'sunday', 'am', 'pm', 
      'o\'clock', ':', 'noon', 'midnight', 'morning', 'afternoon', 
      'evening', 'night'
    ];

    this.locationKeywords = [
      'at', 'in', 'room', 'office', 'venue', 'location', 'address',
      'zoom', 'teams', 'meet', 'skype', 'online', 'virtual'
    ];

    // Enhanced date patterns
    this.datePatterns = [
      // Relative dates
      /\b(today|tonight|this evening)\b/gi,
      /\b(tomorrow|tmrw|next day)\b/gi,
      /\b(yesterday)\b/gi,
      
      // Day names with optional modifiers
      /\b(next|this|coming|last)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(next|this|coming)?\b/gi,
      
      // Month/day patterns
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/gi,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/gi,
      
      // Numeric date patterns
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
      /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g,
      
      // Day month patterns
      /\b(\d{1,2})(?:st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?\b/gi,
      /\b(\d{1,2})(?:st|nd|rd|th)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*(\d{4})?\b/gi,
      
      // Due date patterns
      /\bdue:?\s*(.+?)(?:\.|,|$)/gi,
      /\bdeadline:?\s*(.+?)(?:\.|,|$)/gi,
      /\bon\s+(.+?)(?:\.|,|at|$)/gi
    ];

    // Enhanced time patterns
    this.timePatterns = [
      // Standard time formats
      /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
      /\b(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
      /\b(\d{1,2})\.(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
      
      // 24-hour format
      /\b(\d{1,2}):(\d{2})\b/g,
      /\b(\d{4})\s*hrs?\b/gi, // 1400 hrs
      
      // Word-based times
      /\b(noon|midnight|midday)\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi,
      
      // Casual time expressions
      /\b(early|late)?\s*(morning|afternoon|evening|night)\b/gi,
      /\bat\s+(\d{1,2})\b/gi, // "at 3"
      
      // Written numbers
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(am|pm|a\.?m\.?|p\.?m\.?|o'clock)\b/gi
    ];

    // Location patterns
    this.locationPatterns = [
      // Explicit location indicators
      /\b(?:at|in|venue:|location:)\s*([^,.;!?]+)/gi,
      /\b(?:room|hall|building|office)\s+([A-Za-z0-9\s\-]+)/gi,
      
      // Online meeting patterns
      /\b(zoom|teams|meet|skype|webex)\s*(?:meeting|call|link)?\s*:?\s*([^\s,.;!?]+)?/gi,
      
      // URLs for online meetings
      /(https?:\/\/[^\s]+)/g,
      
      // Address patterns
      /\b(\d+[A-Za-z]?\s+[A-Z][a-zA-Z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd))/gi,
      
      // Business/venue names
      /\b([A-Z][a-zA-Z\s&]*(Restaurant|Cafe|Bar|Hotel|Grand|Plaza|Center|Mall|University|College|School))/gi,
      
      // Generic location after prepositions
      /\bat\s+([A-Z][a-zA-Z\s&]{2,30})/g,
      /\bin\s+([A-Z][a-zA-Z\s]{2,20})/g
    ];

    // Event type classifications
    this.eventTypes = {
      'meeting': { 
        keywords: ['meeting', 'meet', 'discussion', 'conference', 'call'], 
        type: 'professional', 
        defaultDuration: 60,
        icon: '👥'
      },
      'appointment': { 
        keywords: ['appointment', 'visit', 'consultation', 'checkup'], 
        type: 'professional', 
        defaultDuration: 60,
        icon: '📅'
      },
      'social': { 
        keywords: ['lunch', 'dinner', 'coffee', 'drinks', 'party', 'celebration'], 
        type: 'social', 
        defaultDuration: 120,
        icon: '🍽️'
      },
      'academic': { 
        keywords: ['class', 'lecture', 'seminar', 'workshop', 'training', 'exam', 'test'], 
        type: 'academic', 
        defaultDuration: 90,
        icon: '🎓'
      },
      'deadline': { 
        keywords: ['due', 'deadline', 'submit', 'submission', 'assignment'], 
        type: 'deadline', 
        defaultDuration: 0,
        icon: '⏰'
      },
      'presentation': { 
        keywords: ['presentation', 'demo', 'showcase', 'pitch'], 
        type: 'professional', 
        defaultDuration: 45,
        icon: '📊'
      }
    };

    // Common patterns for extracting event titles
    this.titlePatterns = [
      // Meeting patterns
      /(?:meeting|call)\s+(?:with|about|regarding|for)\s+([^.\n!?]+)/gi,
      /(?:discuss|discussing|discussion\s+(?:on|about))\s+([^.\n!?]+)/gi,
      
      // Assignment patterns
      /(?:assignment|homework|lab|project)(?:\s+\d+)?:\s*([^.\n!?]+)/gi,
      /\*\*([^*]+)\*\*/g, // Bold text often contains titles
      
      // Event patterns
      /(?:event|party|celebration)\s+(?:for|about|regarding)\s+([^.\n!?]+)/gi,
      
      // Course codes and academic titles
      /\b([A-Z]{2,4}[\s\-]?\d{3}[A-Za-z0-9\s\-:]*)/g,
      
      // Generic patterns
      /(?:title|subject|about):\s*([^.\n!?]+)/gi
    ];
  }

  /**
   * Main extraction method
   */
  async extractEvents(emailText, subject = '') {
    console.log('🔍 Starting basic pattern-based extraction...');
    
    const events = [];
    const processedText = this.preprocessText(emailText);
    const sentences = this.splitIntoSentences(processedText);
    
    // Process each sentence
    for (const [index, sentence] of sentences.entries()) {
      console.log(`📝 Processing sentence ${index + 1}: "${sentence.substring(0, 100)}..."`);
      
      if (this.containsEventKeywords(sentence)) {
        const extractedEvents = this.extractFromSentence(sentence, subject, processedText);
        events.push(...extractedEvents);
      }
    }

    // Look for cross-sentence patterns
    const crossSentenceEvents = this.extractCrossSentenceEvents(sentences, subject);
    events.push(...crossSentenceEvents);

    // Process subject line separately if it looks like an event
    if (subject && this.containsEventKeywords(subject)) {
      const subjectEvents = this.extractFromSentence(subject, subject, processedText);
      events.push(...subjectEvents);
    }

    const finalEvents = this.deduplicateAndRank(events);
    console.log(`✅ Basic extraction complete: ${finalEvents.length} events found`);
    
    return finalEvents;
  }

  /**
   * Preprocess text for better extraction
   */
  preprocessText(text) {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();
  }

  /**
   * Split text into meaningful sentences
   */
  splitIntoSentences(text) {
    // Split on sentence boundaries but preserve structure
    const sentences = text.split(/[.!?]+\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 15); // Filter out very short fragments

    // Also split on line breaks for email structure
    const lines = text.split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    // Combine both approaches
    const allSentences = [...new Set([...sentences, ...lines])];
    
    return allSentences;
  }

  /**
   * Check if sentence contains event-related keywords
   */
  containsEventKeywords(sentence) {
    const lowerSentence = sentence.toLowerCase();
    
    const hasEventKeyword = this.eventKeywords.some(keyword => 
      lowerSentence.includes(keyword.toLowerCase())
    );
    
    const hasTimeKeyword = this.timeKeywords.some(keyword => 
      lowerSentence.includes(keyword.toLowerCase())
    );

    // Additional heuristics
    const hasInvitationLanguage = [
      'let\'s', 'we should', 'can we', 'would you like', 'join us',
      'invite you', 'looking forward', 'see you', 'we have'
    ].some(phrase => lowerSentence.includes(phrase));

    const hasSchedulingLanguage = [
      'scheduled', 'planned', 'arranged', 'set up', 'organize',
      'when', 'what time', 'available'
    ].some(phrase => lowerSentence.includes(phrase));

    return hasEventKeyword || 
           (hasTimeKeyword && (hasInvitationLanguage || hasSchedulingLanguage)) ||
           (hasInvitationLanguage && hasTimeKeyword);
  }

  /**
   * Extract events from a single sentence
   */
  extractFromSentence(sentence, subject, fullText) {
    const events = [];
    
    // Extract components
    const eventType = this.detectEventType(sentence);
    const dates = this.extractDates(sentence);
    const times = this.extractTimes(sentence);
    const locations = this.extractLocations(sentence);
    const title = this.extractTitle(sentence, subject, eventType);

    // Create events for each date found
    dates.forEach(date => {
      const event = {
        id: this.generateId(),
        title: title,
        date: date,
        time: times.length > 0 ? times[0] : null,
        location: locations.length > 0 ? locations[0] : null,
        description: sentence.trim(),
        type: eventType?.type || 'general',
        eventCategory: eventType?.name || 'general',
        confidence: this.calculateConfidence(eventType, date, times, locations, sentence),
        source: 'basic_extractor',
        extractedAt: new Date().toISOString(),
        icon: eventType?.icon || '📅'
      };

      events.push(event);
    });

    // If no dates found but has strong event indicators, create a TBD event
    if (dates.length === 0 && eventType && this.hasStrongEventIndicators(sentence)) {
      const event = {
        id: this.generateId(),
        title: title,
        date: this.getDefaultDate(),
        time: times.length > 0 ? times[0] : null,
        location: locations.length > 0 ? locations[0] : null,
        description: sentence.trim(),
        type: eventType.type,
        eventCategory: eventType.name,
        confidence: 0.4, // Lower confidence for TBD dates
        source: 'basic_extractor',
        extractedAt: new Date().toISOString(),
        icon: eventType.icon,
        flags: ['date_tbd']
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Extract events that span multiple sentences
   */
  extractCrossSentenceEvents(sentences, subject) {
    const events = [];
    
    // Look for patterns like:
    // "Let's have dinner" (sentence 1)
    // "How about tomorrow at 7pm?" (sentence 2)
    
    for (let i = 0; i < sentences.length - 1; i++) {
      const currentSentence = sentences[i];
      const nextSentence = sentences[i + 1];
      
      // Check if current sentence has event but no time/date
      if (this.hasEventKeywordOnly(currentSentence) && this.hasTimeOrDate(nextSentence)) {
        const eventType = this.detectEventType(currentSentence);
        const dates = this.extractDates(nextSentence);
        const times = this.extractTimes(nextSentence);
        const locations = this.extractLocations(currentSentence + ' ' + nextSentence);
        const title = this.extractTitle(currentSentence, subject, eventType);

        if (dates.length > 0) {
          const event = {
            id: this.generateId(),
            title: title,
            date: dates[0],
            time: times.length > 0 ? times[0] : null,
            location: locations.length > 0 ? locations[0] : null,
            description: `${currentSentence.trim()} ${nextSentence.trim()}`,
            type: eventType?.type || 'general',
            eventCategory: eventType?.name || 'general',
            confidence: this.calculateConfidence(eventType, dates[0], times, locations, currentSentence),
            source: 'basic_extractor',
            extractedAt: new Date().toISOString(),
            icon: eventType?.icon || '📅',
            flags: ['cross_sentence']
          };

          events.push(event);
        }
      }
    }

    return events;
  }

  /**
   * Detect event type from sentence
   */
  detectEventType(sentence) {
    const lowerSentence = sentence.toLowerCase();
    
    for (const [typeName, typeInfo] of Object.entries(this.eventTypes)) {
      const hasKeyword = typeInfo.keywords.some(keyword => 
        lowerSentence.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        return { name: typeName, ...typeInfo };
      }
    }
    
    return null;
  }

  /**
   * Extract dates using multiple patterns
   */
  extractDates(text) {
    const dates = [];
    const seenDates = new Set();
    
    for (const pattern of this.datePatterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        const normalizedDate = this.normalizeDate(match[0]);
        
        if (normalizedDate && !seenDates.has(normalizedDate)) {
          seenDates.add(normalizedDate);
          dates.push(normalizedDate);
        }
      }
    }
    
    return dates;
  }

  /**
   * Extract times using multiple patterns
   */
  extractTimes(text) {
    const times = [];
    const seenTimes = new Set();
    
    for (const pattern of this.timePatterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        const normalizedTime = this.normalizeTime(match[0], match);
        
        if (normalizedTime && !seenTimes.has(normalizedTime)) {
          seenTimes.add(normalizedTime);
          times.push(normalizedTime);
        }
      }
    }
    
    return times;
  }

  /**
   * Extract locations using multiple patterns
   */
  extractLocations(text) {
    const locations = [];
    const seenLocations = new Set();
    
    for (const pattern of this.locationPatterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        let location = match[1] || match[0];
        location = this.cleanLocation(location);
        
        if (location && location.length > 2 && !seenLocations.has(location.toLowerCase())) {
          seenLocations.add(location.toLowerCase());
          locations.push(location);
        }
      }
    }
    
    return locations;
  }

  /**
   * Extract event title using various strategies
   */
  extractTitle(sentence, subject, eventType) {
    // Try pattern-based extraction first
    for (const pattern of this.titlePatterns) {
      const match = sentence.match(pattern);
      if (match && match[1]) {
        return this.cleanTitle(match[1]);
      }
    }

    // Use subject if it's meaningful
    if (subject && subject.length > 3 && 
        !subject.toLowerCase().includes('inbox') && 
        !subject.toLowerCase().includes('re:') &&
        !subject.toLowerCase().includes('fwd:')) {
      return this.cleanTitle(subject);
    }

    // Generate from event type
    if (eventType) {
      return eventType.name.charAt(0).toUpperCase() + eventType.name.slice(1);
    }

    // Extract from sentence structure
    const shortSentence = sentence.substring(0, 50).trim();
    if (shortSentence.length > 5) {
      return this.cleanTitle(shortSentence);
    }

    return 'Event';
  }

  /**
   * Normalize date string to ISO format
   */
  normalizeDate(dateStr) {
    const today = new Date();
    const lowerDate = dateStr.toLowerCase();
    
    // Handle relative dates
    if (lowerDate.includes('today') || lowerDate.includes('tonight')) {
      return today.toISOString().split('T')[0];
    }
    
    if (lowerDate.includes('tomorrow') || lowerDate.includes('tmrw')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    if (lowerDate.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    
    // Handle day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = lowerDate.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    
    if (dayMatch) {
      const targetDay = days.indexOf(dayMatch[1]);
      const currentDay = today.getDay();
      
      // Determine if it's next week or this week
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7; // Next week if it's the same day
      
      // Check for "next" modifier
      if (lowerDate.includes('next')) {
        daysUntil += 7;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);
      return targetDate.toISOString().split('T')[0];
    }
    
    // Handle month/day patterns
    const monthMatch = lowerDate.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/);
    
    if (monthMatch) {
      const monthName = monthMatch[1];
      const day = parseInt(monthMatch[2]);
      const year = monthMatch[3] ? parseInt(monthMatch[3]) : today.getFullYear();
      
      const monthIndex = this.getMonthIndex(monthName);
      if (monthIndex !== -1) {
        const date = new Date(year, monthIndex, day);
        return date.toISOString().split('T')[0];
      }
    }
    
    // Handle numeric dates
    const numericMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (numericMatch) {
      let month = parseInt(numericMatch[1]);
      let day = parseInt(numericMatch[2]);
      let year = parseInt(numericMatch[3]);
      
      // Handle 2-digit years
      if (year < 50) {
        year += 2000;
      } else if (year < 100) {
        year += 1900;
      }
      
      // Assume MM/DD/YYYY format for US dates
      if (month <= 12 && day <= 31) {
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  }

  /**
   * Normalize time string to 24-hour format
   */
  normalizeTime(timeStr, match) {
    const lowerTime = timeStr.toLowerCase();
    
    // Handle special cases
    if (lowerTime.includes('noon') || lowerTime.includes('midday')) {
      return '12:00';
    }
    
    if (lowerTime.includes('midnight')) {
      return '00:00';
    }
    
    // Handle word-based times
    const wordTimes = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
      'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12
    };
    
    for (const [word, num] of Object.entries(wordTimes)) {
      if (lowerTime.includes(word)) {
        const isPM = lowerTime.includes('pm') || lowerTime.includes('p.m');
        let hours = num;
        
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:00`;
      }
    }
    
    // Handle numeric times
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm && ampm.includes('pm') && hours !== 12) {
        hours += 12;
      } else if (ampm && ampm.includes('am') && hours === 12) {
        hours = 0;
      }
      
      // Validate time
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    // Handle 24-hour format
    const militaryMatch = timeStr.match(/(\d{4})\s*hrs?/i);
    if (militaryMatch) {
      const timeNum = militaryMatch[1];
      const hours = Math.floor(timeNum / 100);
      const minutes = timeNum % 100;
      
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    return null;
  }

  /**
   * Clean and format location string
   */
  cleanLocation(location) {
    if (!location) return null;
    
    return location
      .replace(/^(at|in|on|venue:|location:)\s+/i, '')
      .replace(/\s+/g, ' ')
      .replace(/[,;]$/, '') // Remove trailing punctuation
      .trim();
  }

  /**
   * Clean and format title string
   */
  cleanTitle(title) {
    if (!title) return 'Event';
    
    return title
      .replace(/^(re:|fwd:|meeting|call|about|regarding):\s*/i, '')
      .replace(/^\W+/, '') // Remove leading non-word characters
      .replace(/\W+$/, '') // Remove trailing non-word characters
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(eventType, date, times, locations, sentence) {
    let confidence = 0.2; // Base confidence
    
    // Event type bonus
    if (eventType) {
      confidence += 0.3;
    }
    
    // Date/time bonuses
    if (date) {
      confidence += 0.2;
    }
    
    if (times && times.length > 0) {
      confidence += 0.2;
    }
    
    // Location bonus
    if (locations && locations.length > 0) {
      confidence += 0.1;
    }
    
    // Sentence structure bonuses
    if (sentence.toLowerCase().includes('let\'s') || 
        sentence.toLowerCase().includes('we should') ||
        sentence.toLowerCase().includes('invite')) {
      confidence += 0.1;
    }
    
    // Specific patterns that indicate high confidence
    if (sentence.toLowerCase().includes('meeting') && 
        sentence.toLowerCase().includes('at') && 
        times && times.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Helper methods
   */
  hasEventKeywordOnly(sentence) {
    const lowerSentence = sentence.toLowerCase();
    return this.eventKeywords.some(keyword => 
      lowerSentence.includes(keyword.toLowerCase())
    ) && !this.hasTimeOrDate(sentence);
  }

  hasTimeOrDate(sentence) {
    return this.extractDates(sentence).length > 0 || 
           this.extractTimes(sentence).length > 0;
  }

  hasStrongEventIndicators(sentence) {
    const lowerSentence = sentence.toLowerCase();
    const strongIndicators = [
      'meeting', 'appointment', 'lunch', 'dinner', 'call',
      'let\'s', 'we should', 'join us', 'invite you'
    ];
    
    return strongIndicators.some(indicator => 
      lowerSentence.includes(indicator)
    );
  }

  getMonthIndex(monthName) {
    const months = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };
    
    return months[monthName.toLowerCase()] ?? -1;
  }

  getDefaultDate() {
    return new Date().toISOString().split('T')[0];
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Remove duplicate events and rank by confidence
   */
  deduplicateAndRank(events) {
    // Sort by confidence (highest first)
    events.sort((a, b) => b.confidence - a.confidence);
    
    const unique = [];
    const seen = new Set();
    
    events.forEach(event => {
      const key = `${event.title.toLowerCase()}-${event.date}-${event.time}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    });
    
    return unique;
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats() {
    return {
      extractorType: 'basic',
      version: '1.0.0',
      supportedPatterns: {
        datePatterns: this.datePatterns.length,
        timePatterns: this.timePatterns.length,
        locationPatterns: this.locationPatterns.length,
        eventTypes: Object.keys(this.eventTypes).length
      },
      features: [
        'pattern-based extraction',
        'cross-sentence analysis',
        'confidence scoring',
        'duplicate prevention',
        'multiple date/time formats'
      ]
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasicEventExtractor;
}