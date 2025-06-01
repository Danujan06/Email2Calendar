class EnhancedNLPExtractor {
  constructor() {
    this.eventTypes = {
      'dinner': { type: 'social', keywords: ['dinner', 'dine', 'eat', 'meal', 'restaurant'], duration: 120 },
      'lunch': { type: 'social', keywords: ['lunch', 'luncheon'], duration: 90 },
      'breakfast': { type: 'social', keywords: ['breakfast', 'brunch'], duration: 60 },
      'meeting': { type: 'professional', keywords: ['meeting', 'meet', 'discussion', 'conference'], duration: 60 },
      'call': { type: 'professional', keywords: ['call', 'phone', 'ring', 'dial'], duration: 30 },
      'appointment': { type: 'professional', keywords: ['appointment', 'visit', 'consultation'], duration: 60 },
      'coffee': { type: 'social', keywords: ['coffee', 'cafe', 'espresso', 'latte'], duration: 45 },
      'drinks': { type: 'social', keywords: ['drinks', 'cocktails', 'bar', 'pub'], duration: 90 },
      'date': { type: 'social', keywords: ['date', 'romantic'], duration: 120 }
    };

    this.timePatterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
      /\b(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
      /\b(\d{1,2})\.(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
      /\b(\d{1,2}):(\d{2})\b/g,
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(am|pm|a\.?m\.?|p\.?m\.?|o'clock)\b/gi,
      /\b(noon|midnight|evening|morning|afternoon)\b/gi
    ];

    this.datePatterns = [
      /\b(today|tonight|this evening)\b/gi,
      /\b(tomorrow|tmrw)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(next|this|coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?\b/gi,
      /\b(\d{1,2})(st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
    ];

    this.locationPatterns = [
      /\bat\s+([A-Z][a-zA-Z\s&]+(?:Hotel|Restaurant|Cafe|Bar|Grand|Plaza|Center|Mall|Building))/g,
      /\bat\s+([A-Z][a-zA-Z\s&]{2,30})/g,
      /\bin\s+([A-Z][a-zA-Z\s]{2,20})/g,
      /\b(\d+[A-Za-z]?\s+[A-Z][a-zA-Z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr))/g,
      /\b([A-Z][a-zA-Z\s&]*(Restaurant|Cafe|Bar|Hotel|Grand|Plaza|Center))/g
    ];
  }

  async extractEvents(emailText, subject = '') {
    console.log('🧠 Starting enhanced NLP extraction...');
    
    const events = [];
    const sentences = this.splitIntoSentences(emailText);
    
    for (const [index, sentence] of sentences.entries()) {
      console.log(`🔍 Analyzing sentence ${index + 1}: "${sentence}"`);
      
      if (this.containsEventIndicators(sentence)) {
        const extractedEvents = this.extractFromSentence(sentence, subject);
        events.push(...extractedEvents);
      }
    }

    console.log(`🎯 Total events extracted: ${events.length}`);
    return this.deduplicateAndRank(events);
  }

  splitIntoSentences(text) {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  containsEventIndicators(sentence) {
    const lowerSentence = sentence.toLowerCase();
    
    const hasEventType = Object.values(this.eventTypes).some(eventType => 
      eventType.keywords.some(keyword => lowerSentence.includes(keyword))
    );
    
    const hasTimeIndicator = this.timePatterns.some(pattern => pattern.test(sentence)) ||
      ['tonight', 'today', 'tomorrow', 'evening', 'morning', 'afternoon'].some(word => 
        lowerSentence.includes(word)
      );
    
    const hasInvitationLanguage = [
      'we have', 'let\'s', 'join', 'come', 'meet', 'see you', 'dinner date', 'lunch date'
    ].some(phrase => lowerSentence.includes(phrase));

    return hasEventType || (hasTimeIndicator && hasInvitationLanguage);
  }

  extractFromSentence(sentence, subject) {
    const events = [];
    
    const eventType = this.extractEventType(sentence);
    const dateInfo = this.extractDate(sentence);
    const timeInfo = this.extractTime(sentence);
    const location = this.extractLocation(sentence);
    
    if (eventType || (dateInfo && timeInfo)) {
      const event = {
        id: this.generateId(),
        title: this.generateTitle(eventType, sentence, subject),
        date: dateInfo || this.getDefaultDate(),
        time: timeInfo,
        location: location,
        description: sentence.trim(),
        type: eventType?.type || 'general',
        confidence: this.calculateConfidence(eventType, dateInfo, timeInfo, location),
        source: 'enhanced_nlp'
      };
      
      events.push(event);
    }
    
    return events;
  }

  extractEventType(sentence) {
    const lowerSentence = sentence.toLowerCase();
    
    for (const [typeName, typeInfo] of Object.entries(this.eventTypes)) {
      const hasKeyword = typeInfo.keywords.some(keyword => 
        lowerSentence.includes(keyword)
      );
      
      if (hasKeyword) {
        return { name: typeName, ...typeInfo };
      }
    }
    
    return null;
  }

  extractDate(sentence) {
    for (const pattern of this.datePatterns) {
      const match = sentence.match(pattern);
      if (match) {
        return this.normalizeDate(match[0]);
      }
    }
    return null;
  }

  extractTime(sentence) {
    const timeMatch = sentence.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return null;
  }

  extractLocation(sentence) {
    for (const pattern of this.locationPatterns) {
      const matches = [...sentence.matchAll(pattern)];
      if (matches.length > 0) {
        const location = matches[0][1] || matches[0][0];
        return this.cleanLocation(location);
      }
    }
    return null;
  }

  normalizeDate(dateStr) {
    const today = new Date();
    const lowerDate = dateStr.toLowerCase();
    
    if (lowerDate.includes('today') || lowerDate.includes('tonight')) {
      return today.toISOString().split('T')[0];
    }
    
    if (lowerDate.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = lowerDate.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    
    if (dayMatch) {
      const targetDay = days.indexOf(dayMatch[1]);
      const currentDay = today.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      
      if (daysUntil === 0) daysUntil = 7;
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);
      return targetDate.toISOString().split('T')[0];
    }
    
    return null;
  }

  cleanLocation(location) {
    if (!location) return null;
    
    return location
      .replace(/^(at|in|on)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  generateTitle(eventType, sentence, subject) {
    if (subject && subject.trim() && !subject.toLowerCase().includes('inbox')) {
      return subject.trim();
    }
    
    if (eventType) {
      return eventType.name.charAt(0).toUpperCase() + eventType.name.slice(1);
    }
    
    const actionMatch = sentence.match(/\b(dinner|lunch|meeting|call|appointment|coffee|drinks|date)\b/i);
    if (actionMatch) {
      return actionMatch[1].charAt(0).toUpperCase() + actionMatch[1].slice(1);
    }
    
    return 'Event';
  }

  calculateConfidence(eventType, dateInfo, timeInfo, location) {
    let confidence = 0.3;
    
    if (eventType) confidence += 0.3;
    if (dateInfo) confidence += 0.2;
    if (timeInfo) confidence += 0.2;
    if (location) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  getDefaultDate() {
    return new Date().toISOString().split('T')[0];
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  deduplicateAndRank(events) {
    events.sort((a, b) => b.confidence - a.confidence);
    
    const unique = [];
    const seen = new Set();
    
    events.forEach(event => {
      const key = `${event.title}-${event.date}-${event.time}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    });
    
    return unique;
  }
}
