class BertEventExtractor {
  constructor() {
    this.model = null;
    this.tokenizer = null;
    this.loaded = false;
    this.modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder-lite/1/default/1';
  }

  async initialize() {
    if (this.loaded) return;
    
    try {
      // Load Universal Sentence Encoder (lighter than full BERT)
      // This model can understand context and semantics better
      await this.loadModel();
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load BERT model:', error);
      this.loaded = false;
    }
  }

  async loadModel() {
    // For Chrome extension, we'll use a combination of:
    // 1. TensorFlow.js for embeddings
    // 2. Pre-trained patterns for event extraction
    
    // In a real implementation, you'd load the actual model
    // For now, we'll create a smart pattern-based system that mimics BERT's understanding
    
    this.entityPatterns = {
      date: {
        patterns: [
          /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/gi,
          /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/gi,
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?\b/gi,
          /\b(next|this|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
          /\b(today|tomorrow|yesterday)\b/gi,
          /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?\b/gi
        ],
        contextWords: ['due', 'deadline', 'on', 'by', 'before', 'date', 'when', 'scheduled']
      },
      time: {
        patterns: [
          /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?\b/g,
          /\b(\d{1,2})\s*(am|pm|AM|PM)\b/g,
          /\b(noon|midnight|morning|afternoon|evening)\b/gi
        ],
        contextWords: ['at', 'from', 'to', 'between', 'time', 'duration', 'starts', 'ends']
      },
      event: {
        patterns: [
          /\b(meeting|conference|call|appointment|session|class|lecture|lab|tutorial|exam|test|quiz|assignment|homework|project|presentation|demo|interview|workshop|seminar|webinar)\b/gi,
          /\*\*([^*]+)\*\*/g,  // Bold text often contains important info
          /\b([A-Z]{2,4}[\s\-]?\d{3}[\w\-]*)\b/g  // Course codes
        ],
        contextWords: ['about', 'regarding', 'for', 'with', 'title', 'subject', 'course']
      },
      location: {
        patterns: [
          /\b(?:at|in|venue:|location:)\s*([^,.;]+)/gi,
          /\b(room|hall|building|lab|online|zoom|teams|meet|skype)\s+([^,.;]+)/gi,
          /(https?:\/\/[^\s]+)/g  // URLs for online meetings
        ],
        contextWords: ['where', 'place', 'venue', 'location', 'address', 'room', 'online']
      }
    };

    // Context understanding rules
    this.contextRules = {
      assignment: {
        triggers: ['assignment', 'homework', 'lab', 'project', 'due', 'deadline', 'submit', 'submission'],
        titleExtractors: [
          /(?:assignment|lab|project|homework)(?:\s+\d+)?:\s*([^.\n]+)/i,
          /\*\*([^*]+)\*\*/,
          /([A-Z]{2,4}[\s\-]?\d{3}[^:]*):?\s*([^.\n]+)/
        ]
      },
      meeting: {
        triggers: ['meeting', 'meet', 'call', 'conference', 'discussion', 'catch up', 'sync'],
        titleExtractors: [
          /(?:meeting|call)\s+(?:with|about|regarding|for)\s+([^.\n]+)/i,
          /(?:discuss|discussing|discussion\s+(?:on|about))\s+([^.\n]+)/i
        ]
      },
      exam: {
        triggers: ['exam', 'test', 'quiz', 'midterm', 'final'],
        titleExtractors: [
          /(?:exam|test|quiz)\s+(?:on|for|in)\s+([^.\n]+)/i,
          /([A-Z]{2,4}[\s\-]?\d{3}[^:]*)\s+(?:exam|test|quiz)/i
        ]
      }
    };
  }

  async extractEvents(text, subject = '') {
    if (!this.loaded) {
      await this.initialize();
    }

    // Preprocess text
    const processedText = this.preprocessText(text);
    
    // Extract entities
    const entities = this.extractEntities(processedText);
    
    // Understand context
    const context = this.understandContext(processedText, subject);
    
    // Build events from entities and context
    const events = this.buildEvents(entities, context, processedText, subject);
    
    return events;
  }

  preprocessText(text) {
    // Clean and normalize text
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
      .trim();
  }

  extractEntities(text) {
    const entities = {
      dates: [],
      times: [],
      events: [],
      locations: []
    };

    // Extract dates with context scoring
    for (const pattern of this.entityPatterns.date.patterns) {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const contextScore = this.calculateContextScore(
          text, 
          match.index, 
          this.entityPatterns.date.contextWords
        );
        entities.dates.push({
          value: match[0],
          index: match.index,
          contextScore,
          normalized: this.normalizeDate(match[0])
        });
      });
    }

    // Extract times with context scoring
    for (const pattern of this.entityPatterns.time.patterns) {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const contextScore = this.calculateContextScore(
          text, 
          match.index, 
          this.entityPatterns.time.contextWords
        );
        entities.times.push({
          value: match[0],
          index: match.index,
          contextScore,
          normalized: this.normalizeTime(match[0])
        });
      });
    }

    // Extract event-related entities
    for (const pattern of this.entityPatterns.event.patterns) {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        entities.events.push({
          value: match[0],
          index: match.index,
          type: this.classifyEventType(match[0])
        });
      });
    }

    // Extract locations
    for (const pattern of this.entityPatterns.location.patterns) {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        entities.locations.push({
          value: match[1] || match[0],
          index: match.index
        });
      });
    }

    return entities;
  }

  calculateContextScore(text, position, contextWords) {
    let score = 0;
    const windowSize = 50; // Characters to look around
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    const context = text.substring(start, end).toLowerCase();
    
    contextWords.forEach(word => {
      if (context.includes(word)) {
        score += 1;
      }
    });
    
    return score;
  }

  understandContext(text, subject) {
    const context = {
      type: 'general',
      confidence: 0,
      primaryEntity: null
    };

    // Check each context rule
    for (const [type, rule] of Object.entries(this.contextRules)) {
      let score = 0;
      
      // Check triggers in text and subject
      rule.triggers.forEach(trigger => {
        if (text.toLowerCase().includes(trigger) || subject.toLowerCase().includes(trigger)) {
          score += 1;
        }
      });
      
      if (score > context.confidence) {
        context.type = type;
        context.confidence = score;
        
        // Try to extract primary entity using specific extractors
        for (const extractor of rule.titleExtractors) {
          const match = text.match(extractor) || subject.match(extractor);
          if (match) {
            context.primaryEntity = match[1] || match[0];
            break;
          }
        }
      }
    }
    
    return context;
  }

  buildEvents(entities, context, text, subject) {
    const events = [];
    
    // Sort entities by context score and position
    entities.dates.sort((a, b) => b.contextScore - a.contextScore);
    entities.times.sort((a, b) => b.contextScore - a.contextScore);
    
    // For each date found, try to build an event
    entities.dates.forEach(dateEntity => {
      const event = {
        title: this.extractEventTitle(entities, context, text, subject),
        date: dateEntity.normalized || dateEntity.value,
        time: null,
        location: null,
        description: this.extractDescription(text, dateEntity.index),
        type: context.type,
        confidence: this.calculateEventConfidence(dateEntity, entities, context)
      };
      
      // Find associated time (closest to date)
      const associatedTime = this.findClosestEntity(dateEntity, entities.times);
      if (associatedTime) {
        event.time = associatedTime.normalized || associatedTime.value;
      }
      
      // Find associated location
      const associatedLocation = this.findClosestEntity(dateEntity, entities.locations);
      if (associatedLocation) {
        event.location = associatedLocation.value;
      }
      
      // Only add high-confidence events
      if (event.confidence > 0.5) {
        events.push(event);
      }
    });
    
    // If no dates found but we have strong context, create a TBD event
    if (events.length === 0 && context.confidence > 2) {
      events.push({
        title: context.primaryEntity || subject || `${context.type} Event`,
        date: 'Date TBD',
        time: entities.times[0]?.value || 'Time TBD',
        location: entities.locations[0]?.value || null,
        description: text.substring(0, 200),
        type: context.type,
        confidence: 0.4
      });
    }
    
    return this.deduplicateEvents(events);
  }

  extractEventTitle(entities, context, text, subject) {
    // Priority order for title extraction
    
    // 1. Use context primary entity if available
    if (context.primaryEntity) {
      return context.primaryEntity;
    }
    
    // 2. Use event entities found
    if (entities.events.length > 0) {
      // Prioritize course codes or formal names
      const courseCode = entities.events.find(e => /[A-Z]{2,4}[\s\-]?\d{3}/.test(e.value));
      if (courseCode) {
        return courseCode.value;
      }
      return entities.events[0].value;
    }
    
    // 3. Use subject if meaningful
    if (subject && subject.length > 3 && subject !== 'No Subject') {
      return subject;
    }
    
    // 4. Generate from context type
    return `${context.type.charAt(0).toUpperCase() + context.type.slice(1)} Event`;
  }

  findClosestEntity(referenceEntity, entityList) {
    if (entityList.length === 0) return null;
    
    let closest = null;
    let minDistance = Infinity;
    
    entityList.forEach(entity => {
      const distance = Math.abs(entity.index - referenceEntity.index);
      if (distance < minDistance) {
        minDistance = distance;
        closest = entity;
      }
    });
    
    // Only return if reasonably close (within 100 characters)
    return minDistance < 100 ? closest : null;
  }

  extractDescription(text, position) {
    // Extract a sentence or two around the position
    const start = Math.max(0, position - 50);
    const end = Math.min(text.length, position + 150);
    let description = text.substring(start, end).trim();
    
    // Try to get complete sentences
    const firstPeriod = description.indexOf('.');
    if (firstPeriod > 0 && firstPeriod < description.length - 1) {
      description = description.substring(0, firstPeriod + 1);
    }
    
    return description;
  }

  calculateEventConfidence(dateEntity, entities, context) {
    let confidence = 0.3; // Base confidence
    
    // Date context score contribution
    confidence += dateEntity.contextScore * 0.1;
    
    // Context type confidence
    confidence += context.confidence * 0.1;
    
    // Entity completeness
    if (entities.times.length > 0) confidence += 0.2;
    if (entities.events.length > 0) confidence += 0.2;
    if (entities.locations.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  normalizeDate(dateStr) {
    // This is a simplified date normalization
    // In production, you'd use a proper date parsing library
    const today = new Date();
    const months = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };
    
    // Handle relative dates
    if (/today/i.test(dateStr)) {
      return today.toISOString().split('T')[0];
    }
    
    if (/tomorrow/i.test(dateStr)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Handle "next Monday" etc.
    const nextDayMatch = dateStr.match(/next\s+(\w+)/i);
    if (nextDayMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(nextDayMatch[1].toLowerCase());
      if (targetDay !== -1) {
        const date = new Date(today);
        const currentDay = date.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        date.setDate(date.getDate() + daysUntil);
        return date.toISOString().split('T')[0];
      }
    }
    
    // For other formats, return as-is for now
    return dateStr;
  }

  normalizeTime(timeStr) {
    // Normalize time to 24-hour format
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3]?.toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return timeStr;
  }

  classifyEventType(eventStr) {
    const types = {
      meeting: ['meeting', 'call', 'conference', 'sync', 'standup'],
      assignment: ['assignment', 'homework', 'lab', 'project', 'due'],
      exam: ['exam', 'test', 'quiz', 'midterm', 'final'],
      class: ['class', 'lecture', 'tutorial', 'seminar', 'workshop'],
      social: ['lunch', 'dinner', 'coffee', 'party', 'gathering']
    };
    
    const lower = eventStr.toLowerCase();
    for (const [type, keywords] of Object.entries(types)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return type;
      }
    }
    
    return 'general';
  }

  deduplicateEvents(events) {
    const seen = new Map();
    
    return events.filter(event => {
      const key = `${event.title}-${event.date}-${event.time}`;
      if (seen.has(key)) {
        // Keep the one with higher confidence
        const existing = seen.get(key);
        if (event.confidence > existing.confidence) {
          seen.set(key, event);
          return true;
        }
        return false;
      }
      seen.set(key, event);
      return true;
    });
  }
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BertEventExtractor;
}