// ============================================================================
// HYBRID COMPROMISE.JS + LLAMA 3.1 EVENT EXTRACTOR
// ============================================================================

/**
 * HybridEventExtractor combines Compromise.js for fast NLP processing
 * with Llama 3.1 for advanced semantic understanding
 */
class HybridEventExtractor {
  constructor() {
    this.compromiseInitialized = false;
    this.llamaEndpoint = 'https://api.together.xyz/inference'; // Together AI endpoint
    this.llamaModel = 'meta-llama/Llama-3.1-8B-Instruct-Turbo';
    
    // Event type classification
    this.eventTypes = {
      'meeting': { keywords: ['meeting', 'meet', 'conference', 'discussion'], confidence: 0.8 },
      'social': { keywords: ['lunch', 'dinner', 'coffee', 'drinks', 'party'], confidence: 0.9 },
      'academic': { keywords: ['class', 'lecture', 'exam', 'assignment', 'due'], confidence: 0.85 },
      'professional': { keywords: ['call', 'appointment', 'interview', 'presentation'], confidence: 0.8 },
      'deadline': { keywords: ['due', 'deadline', 'submit', 'submission'], confidence: 0.9 }
    };

    // Initialize Compromise.js
    this.initializeCompromise();
  }

  /**
   * Initialize Compromise.js NLP library
   */
  async initializeCompromise() {
    try {
      // Load Compromise.js from CDN if not already loaded
      if (typeof nlp === 'undefined') {
        await this.loadCompromiseJS();
      }
      
      // Extend Compromise with custom patterns for events
      this.extendCompromiseWithEventPatterns();
      this.compromiseInitialized = true;
      console.log('✅ Compromise.js initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Compromise.js:', error);
      this.compromiseInitialized = false;
    }
  }

  /**
   * Load Compromise.js from CDN
   */
  async loadCompromiseJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/compromise@latest/builds/compromise.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Extend Compromise with custom event patterns
   */
  extendCompromiseWithEventPatterns() {
    if (typeof nlp === 'undefined') return;

    // Add custom event-related terms and patterns
    const eventTerms = {
      'meeting': 'Event',
      'lunch': 'Event',
      'dinner': 'Event',
      'coffee': 'Event',
      'appointment': 'Event',
      'conference': 'Event',
      'call': 'Event',
      'interview': 'Event',
      'presentation': 'Event',
      'assignment': 'Event',
      'deadline': 'Event',
      'due': 'Event',
      'exam': 'Event',
      'quiz': 'Event'
    };

    // Add time-related terms
    const timeTerms = {
      'today': 'Date',
      'tomorrow': 'Date',
      'yesterday': 'Date',
      'monday': 'Date',
      'tuesday': 'Date',
      'wednesday': 'Date',
      'thursday': 'Date',
      'friday': 'Date',
      'saturday': 'Date',
      'sunday': 'Date',
      'noon': 'Time',
      'midnight': 'Time'
    };

    // Extend Compromise lexicon
    try {
      nlp.extend({
        words: { ...eventTerms, ...timeTerms },
        patterns: {
          // Event patterns
          '#Event (with|about|regarding) #Noun': 'EventWithTopic',
          '#Event at #Time': 'EventWithTime',
          '#Event on #Date': 'EventWithDate',
          '#Event at #Place': 'EventWithLocation',
          
          // Time patterns
          '#Value #Time': 'SpecificTime',
          '#Date at #Time': 'DateTimeCombo',
          
          // Academic patterns
          '#Noun (due|deadline) #Date': 'Assignment',
          '(submit|submission) by #Date': 'Assignment'
        }
      });
      console.log('🔧 Compromise.js extended with event patterns');
    } catch (error) {
      console.warn('⚠️ Could not extend Compromise.js patterns:', error);
    }
  }

  /**
   * Main extraction method - Hybrid approach
   */
  async extractEvents(emailText, subject = '') {
    console.log('🔄 Starting hybrid extraction (Compromise.js + Llama 3.1)...');
    
    try {
      // Step 1: Fast initial processing with Compromise.js
      const compromiseResults = await this.extractWithCompromise(emailText, subject);
      console.log(`📊 Compromise.js found ${compromiseResults.length} potential events`);

      // Step 2: If we found potential events, enhance with Llama 3.1
      let finalResults = compromiseResults;
      
      if (compromiseResults.length > 0) {
        try {
          const llamaResults = await this.enhanceWithLlama(emailText, subject, compromiseResults);
          finalResults = this.mergeResults(compromiseResults, llamaResults);
          console.log(`🧠 Llama 3.1 enhanced results: ${finalResults.length} events`);
        } catch (llamaError) {
          console.warn('⚠️ Llama 3.1 enhancement failed, using Compromise.js results:', llamaError);
          // Fallback to Compromise.js results
        }
      } else {
        // If Compromise.js found nothing, try Llama 3.1 directly
        console.log('🔄 No events from Compromise.js, trying Llama 3.1 directly...');
        try {
          finalResults = await this.extractWithLlamaOnly(emailText, subject);
          console.log(`🧠 Llama 3.1 direct extraction: ${finalResults.length} events`);
        } catch (llamaError) {
          console.warn('⚠️ Llama 3.1 direct extraction failed:', llamaError);
          finalResults = [];
        }
      }

      // Step 3: Post-process and validate results
      const validatedResults = this.validateAndCleanResults(finalResults);
      
      console.log(`✅ Hybrid extraction complete: ${validatedResults.length} final events`);
      return validatedResults;

    } catch (error) {
      console.error('❌ Hybrid extraction failed:', error);
      // Ultimate fallback - return empty array
      return [];
    }
  }

  /**
   * Extract events using Compromise.js NLP
   */
  async extractWithCompromise(emailText, subject) {
    if (!this.compromiseInitialized || typeof nlp === 'undefined') {
      console.warn('⚠️ Compromise.js not available, skipping');
      return [];
    }

    console.log('🔍 Processing with Compromise.js...');
    
    try {
      const events = [];
      const doc = nlp(emailText + ' ' + subject);
      
      // Extract dates using Compromise.js
      const dates = doc.dates().json();
      const times = doc.match('#Time').json();
      
      // Extract event-related sentences
      const eventSentences = doc.sentences().filter(sentence => {
        const hasEvent = sentence.has('#Event');
        const hasInvitation = sentence.has('(let us|lets|join|meet|see you)');
        const hasScheduling = sentence.has('(when|what time|available|schedule)');
        
        return hasEvent || hasInvitation || hasScheduling;
      });

      console.log(`📊 Found ${eventSentences.length} event-related sentences`);
      console.log(`📊 Found ${dates.length} dates, ${times.length} times`);

      // Process each event sentence
      eventSentences.forEach((sentence, index) => {
        const sentenceText = sentence.text();
        console.log(`🔍 Processing sentence: "${sentenceText}"`);
        
        // Extract components using Compromise.js
        const sentenceDoc = nlp(sentenceText);
        
        // Get event type
        const eventType = this.detectEventTypeCompromise(sentenceDoc);
        
        // Get dates and times from this sentence
        const sentenceDates = sentenceDoc.dates().json();
        const sentenceTimes = sentenceDoc.match('#Time|#Value (am|pm)').json();
        
        // Get locations
        const locations = sentenceDoc.places().json();
        const atLocations = sentenceDoc.match('at #Noun+').json();
        
        // Create event if we have enough information
        if (eventType || sentenceDates.length > 0 || sentenceTimes.length > 0) {
          const event = {
            id: this.generateId(),
            title: this.extractTitleCompromise(sentenceDoc, subject, eventType),
            date: this.normalizeDateCompromise(sentenceDates[0] || dates[0]),
            time: this.normalizeTimeCompromise(sentenceTimes[0] || times[0]),
            location: this.extractLocationCompromise(locations, atLocations),
            description: sentenceText,
            type: eventType?.type || 'general',
            confidence: this.calculateCompromiseConfidence(eventType, sentenceDates, sentenceTimes, locations),
            source: 'compromise_js',
            extractedAt: new Date().toISOString()
          };
          
          console.log(`✅ Compromise.js event ${index + 1}:`, event);
          events.push(event);
        }
      });

      return this.deduplicateEvents(events);

    } catch (error) {
      console.error('❌ Compromise.js extraction failed:', error);
      return [];
    }
  }

  /**
   * Enhance results with Llama 3.1
   */
  async enhanceWithLlama(emailText, subject, compromiseResults) {
    console.log('🧠 Enhancing with Llama 3.1...');
    
    const prompt = this.buildLlamaEnhancementPrompt(emailText, subject, compromiseResults);
    const response = await this.callLlama(prompt);
    
    return this.parseLlamaResponse(response);
  }

  /**
   * Extract events using Llama 3.1 only (fallback)
   */
  async extractWithLlamaOnly(emailText, subject) {
    console.log('🧠 Direct extraction with Llama 3.1...');
    
    const prompt = this.buildLlamaExtractionPrompt(emailText, subject);
    const response = await this.callLlama(prompt);
    
    return this.parseLlamaResponse(response);
  }

  /**
   * Build prompt for Llama 3.1 enhancement
   */
  buildLlamaEnhancementPrompt(emailText, subject, compromiseResults) {
    return `You are an expert at extracting calendar events from emails. I've already found some potential events using basic NLP, but I need you to enhance and validate them.

Email Subject: ${subject}

Email Content:
${emailText}

Potential events found by basic NLP:
${JSON.stringify(compromiseResults, null, 2)}

Please enhance these events by:
1. Improving titles to be more descriptive
2. Correcting any date/time parsing errors
3. Adding missing information (location, context)
4. Adjusting confidence scores based on context
5. Removing false positives
6. Adding any obvious events that were missed

Return ONLY a JSON array of events in this exact format:
[
  {
    "id": "unique_id",
    "title": "Event Title",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" or null,
    "location": "Location" or null,
    "description": "Brief description",
    "type": "meeting|social|academic|professional|deadline",
    "confidence": 0.0-1.0,
    "source": "llama_enhanced"
  }
]

Be conservative - only include events you're confident about. If there are no clear events, return an empty array [].`;
  }

  /**
   * Build prompt for Llama 3.1 direct extraction
   */
  buildLlamaExtractionPrompt(emailText, subject) {
    return `Extract calendar events from this email. Be precise and conservative.

Subject: ${subject}

Content:
${emailText}

Find events like meetings, appointments, deadlines, social events, classes, etc.

Return ONLY a JSON array in this exact format:
[
  {
    "id": "unique_id",
    "title": "Event Title",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" or null,
    "location": "Location" or null,
    "description": "Brief description",
    "type": "meeting|social|academic|professional|deadline",
    "confidence": 0.0-1.0,
    "source": "llama_direct"
  }
]

Rules:
- Only include events with clear date/time information
- Use today's date (${new Date().toISOString().split('T')[0]}) as reference
- For "tomorrow", use ${this.getTomorrowDate()}
- Convert times to 24-hour format (HH:MM)
- Be conservative with confidence scores
- If no clear events, return []`;
  }

  /**
   * Call Llama 3.1 via Together AI API
   */
  async callLlama(prompt) {
    const apiKey = await this.getTogetherAPIKey();
    if (!apiKey) {
      throw new Error('Together AI API key not found');
    }

    console.log('🚀 Calling Llama 3.1...');
    
    const response = await fetch(this.llamaEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.llamaModel,
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.1, // Low temperature for consistent extraction
        top_p: 0.9,
        repetition_penalty: 1.1,
        stop: ['</s>', 'Human:', 'Assistant:']
      })
    });

    if (!response.ok) {
      throw new Error(`Llama API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📡 Llama 3.1 response received');
    
    return data.output?.choices?.[0]?.text || data.choices?.[0]?.text || '';
  }

  /**
   * Parse Llama 3.1 JSON response
   */
  parseLlamaResponse(response) {
    try {
      // Clean the response - extract JSON array
      let cleanResponse = response.trim();
      
      // Find JSON array in response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      // Parse JSON
      const events = JSON.parse(cleanResponse);
      
      if (!Array.isArray(events)) {
        console.warn('⚠️ Llama response is not an array');
        return [];
      }
      
      // Validate and clean each event
      return events
        .filter(event => event && typeof event === 'object')
        .map(event => ({
          id: event.id || this.generateId(),
          title: event.title || 'Event',
          date: this.validateDate(event.date),
          time: this.validateTime(event.time),
          location: event.location || null,
          description: event.description || '',
          type: event.type || 'general',
          confidence: Math.min(Math.max(event.confidence || 0.5, 0), 1),
          source: event.source || 'llama',
          extractedAt: new Date().toISOString()
        }))
        .filter(event => event.date); // Only keep events with valid dates
        
    } catch (error) {
      console.error('❌ Failed to parse Llama response:', error);
      console.log('Raw response:', response);
      return [];
    }
  }

  /**
   * Merge Compromise.js and Llama 3.1 results
   */
  mergeResults(compromiseResults, llamaResults) {
    console.log('🔀 Merging results...');
    
    // Start with Llama results (higher quality)
    let merged = [...llamaResults];
    
    // Add Compromise results that don't conflict
    compromiseResults.forEach(compEvent => {
      const hasConflict = merged.some(llamaEvent => 
        this.eventsConflict(compEvent, llamaEvent)
      );
      
      if (!hasConflict) {
        // Adjust confidence for Compromise-only events
        compEvent.confidence = Math.max(compEvent.confidence - 0.1, 0.3);
        merged.push(compEvent);
      }
    });
    
    return this.deduplicateEvents(merged);
  }

  /**
   * Check if two events conflict (same time/date)
   */
  eventsConflict(event1, event2) {
    return event1.date === event2.date && 
           event1.time === event2.time &&
           this.titlesSimilar(event1.title, event2.title);
  }

  /**
   * Check if titles are similar
   */
  titlesSimilar(title1, title2) {
    const clean1 = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = title2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if one contains the other or they're very similar
    return clean1.includes(clean2) || 
           clean2.includes(clean1) || 
           this.levenshteinDistance(clean1, clean2) < 3;
  }

  /**
   * Calculate Levenshtein distance
   */
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

  // =========================================================================
  // COMPROMISE.JS HELPER METHODS
  // =========================================================================

  /**
   * Detect event type using Compromise.js
   */
  detectEventTypeCompromise(doc) {
    for (const [typeName, typeInfo] of Object.entries(this.eventTypes)) {
      const hasKeyword = typeInfo.keywords.some(keyword => 
        doc.has(keyword)
      );
      
      if (hasKeyword) {
        return { name: typeName, type: typeName, ...typeInfo };
      }
    }
    return null;
  }

  /**
   * Extract title using Compromise.js
   */
  extractTitleCompromise(doc, subject, eventType) {
    // Try to extract the main topic
    const topics = doc.topics().json();
    if (topics.length > 0) {
      return topics[0].text;
    }
    
    // Try to find meeting/event phrases
    const eventPhrases = doc.match('#Event (with|about|regarding) #Noun+').json();
    if (eventPhrases.length > 0) {
      return eventPhrases[0].text;
    }
    
    // Use subject if available
    if (subject && subject.length > 3) {
      return subject.replace(/^(re:|fwd:)/i, '').trim();
    }
    
    // Use event type as fallback
    if (eventType) {
      return eventType.name.charAt(0).toUpperCase() + eventType.name.slice(1);
    }
    
    return 'Event';
  }

  /**
   * Normalize date from Compromise.js
   */
  normalizeDateCompromise(dateObj) {
    if (!dateObj) return null;
    
    try {
      if (dateObj.text) {
        // Handle relative dates
        const text = dateObj.text.toLowerCase();
        const today = new Date();
        
        if (text.includes('today')) {
          return today.toISOString().split('T')[0];
        }
        
        if (text.includes('tomorrow')) {
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          return tomorrow.toISOString().split('T')[0];
        }
        
        // Try to parse the date
        const parsed = new Date(dateObj.text);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Date normalization failed:', error);
      return null;
    }
  }

  /**
   * Normalize time from Compromise.js
   */
  normalizeTimeCompromise(timeObj) {
    if (!timeObj || !timeObj.text) return null;
    
    try {
      const text = timeObj.text.toLowerCase();
      
      // Handle special cases
      if (text.includes('noon')) return '12:00';
      if (text.includes('midnight')) return '00:00';
      
      // Parse time
      const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3];
        
        if (ampm && ampm.includes('pm') && hours !== 12) {
          hours += 12;
        } else if (ampm && ampm.includes('am') && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Time normalization failed:', error);
      return null;
    }
  }

  /**
   * Extract location from Compromise.js results
   */
  extractLocationCompromise(places, atLocations) {
    if (places.length > 0) {
      return places[0].text;
    }
    
    if (atLocations.length > 0) {
      return atLocations[0].text.replace(/^at\s+/i, '');
    }
    
    return null;
  }

  /**
   * Calculate confidence for Compromise.js results
   */
  calculateCompromiseConfidence(eventType, dates, times, locations) {
    let confidence = 0.3;
    
    if (eventType) confidence += 0.3;
    if (dates.length > 0) confidence += 0.2;
    if (times.length > 0) confidence += 0.2;
    if (locations.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Get Together AI API key
   */
  async getTogetherAPIKey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(['together_api_key']);
        return result.together_api_key;
      }
      // Fallback for testing
      return process.env.TOGETHER_API_KEY || null;
    } catch (error) {
      console.warn('⚠️ Could not retrieve API key:', error);
      return null;
    }
  }

  /**
   * Validate and normalize date
   */
  validateDate(dateStr) {
    if (!dateStr) return null;
    
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('⚠️ Invalid date:', dateStr);
    }
    
    return null;
  }

  /**
   * Validate and normalize time
   */
  validateTime(timeStr) {
    if (!timeStr) return null;
    
    // If already in HH:MM format
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // Parse various formats
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm && ampm.includes('pm') && hours !== 12) {
        hours += 12;
      } else if (ampm && ampm.includes('am') && hours === 12) {
        hours = 0;
      }
      
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    return null;
  }

  /**
   * Validate and clean final results
   */
  validateAndCleanResults(events) {
    return events
      .filter(event => event && event.title && event.date)
      .map(event => ({
        ...event,
        title: event.title.substring(0, 100),
        description: event.description?.substring(0, 200) || '',
        confidence: Math.min(Math.max(event.confidence || 0.5, 0), 1)
      }));
  }

  /**
   * Remove duplicate events
   */
  deduplicateEvents(events) {
    const seen = new Map();
    
    return events.filter(event => {
      const key = `${event.title.toLowerCase()}-${event.date}-${event.time}`;
      
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

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get tomorrow's date
   */
  getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   * Get extractor statistics
   */
  getExtractorStats() {
    return {
      extractorType: 'hybrid',
      version: '1.0.0',
      components: {
        compromise: this.compromiseInitialized,
        llama: !!this.llamaEndpoint
      },
      features: [
        'fast NLP with Compromise.js',
        'advanced reasoning with Llama 3.1',
        'confidence scoring',
        'result merging',
        'fallback mechanisms'
      ],
      supportedEventTypes: Object.keys(this.eventTypes)
    };
  }

  /**
   * Test the hybrid extraction
   */
  async testExtraction() {
    const testEmail = `
      Subject: Team Meeting and Assignment Due
      
      Hi everyone,
      
      Let's have our weekly team meeting tomorrow at 2 PM in the conference room.
      
      Also, don't forget that the CS101 assignment is due on Monday, December 9th at 11:59 PM.
      
      After the meeting, would anyone like to grab coffee?
      
      Best regards,
      John
    `;
    
    console.log('🧪 Testing hybrid extraction...');
    const results = await this.extractEvents(testEmail, 'Team Meeting and Assignment Due');
    console.log('🎯 Test results:', results);
    return results;
  }
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HybridEventExtractor;
}

// Auto-initialize for browser usage
if (typeof window !== 'undefined') {
  window.HybridEventExtractor = HybridEventExtractor;
}