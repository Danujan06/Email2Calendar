// ============================================================================
// HYBRID LLAMA 3.1 EVENT EXTRACTOR (CSP-COMPLIANT VERSION)
// ============================================================================

/**
 * HybridEventExtractor uses Llama 3.1 for advanced semantic understanding
 * with fallback to basic pattern matching (Compromise.js removed due to CSP)
 */
class HybridEventExtractor {
  constructor() {
    this.compromiseInitialized = false;
    this.llamaEndpoint = 'https://api.together.xyz/v1/chat/completions'; // FIXED: Correct endpoint
    this.llamaModel = 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'; // FIXED: Working model
    this.llamaOnlyMode = true; // Skip Compromise.js due to CSP
    
    // Event type classification
    this.eventTypes = {
      'meeting': { keywords: ['meeting', 'meet', 'conference', 'discussion'], confidence: 0.8 },
      'social': { keywords: ['lunch', 'dinner', 'coffee', 'drinks', 'party'], confidence: 0.9 },
      'academic': { keywords: ['class', 'lecture', 'exam', 'assignment', 'due'], confidence: 0.85 },
      'professional': { keywords: ['call', 'appointment', 'interview', 'presentation'], confidence: 0.8 },
      'deadline': { keywords: ['due', 'deadline', 'submit', 'submission'], confidence: 0.9 }
    };

    // Skip Compromise.js initialization due to CSP
    console.log('🔄 Hybrid extractor initialized in Llama-only mode (CSP compliant)');
  }

  /**
   * Initialize Compromise.js - SKIP DUE TO CSP
   */
  async initializeCompromise() {
    try {
      // Check if already loaded
      if (typeof nlp !== 'undefined') {
        console.log('✅ Compromise.js already available');
        this.extendCompromiseWithEventPatterns();
        this.compromiseInitialized = true;
        return true;
      }

      console.log('📦 Compromise.js not available due to CSP restrictions');
      console.log('🔄 Continuing with Llama 3.1 only mode...');
      
      // Set flag to skip Compromise.js and use Llama-only mode
      this.compromiseInitialized = false;
      this.llamaOnlyMode = true;
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to initialize Compromise.js:', error);
      console.log('🔄 Will continue with Llama 3.1 only');
      this.compromiseInitialized = false;
      this.llamaOnlyMode = true;
      return false;
    }
  }

  /**
   * Main extraction method - CSP-COMPLIANT VERSION
   */
  async extractEvents(emailText, subject = '') {
    console.log('🔄 Starting hybrid extraction (Llama 3.1 focused due to CSP)...');
    
    try {
      // Skip Compromise.js entirely due to CSP restrictions
      console.log('⚠️ Skipping Compromise.js due to CSP restrictions');
      
      // Go directly to Llama 3.1 extraction
      console.log('🧠 Using Llama 3.1 for extraction...');
      
      try {
        const llamaResults = await this.extractWithLlamaOnly(emailText, subject);
        console.log(`🧠 Llama 3.1 extraction: ${llamaResults.length} events`);
        
        if (llamaResults.length > 0) {
          const validatedResults = this.validateAndCleanResults(llamaResults);
          console.log(`✅ Hybrid extraction complete: ${validatedResults.length} final events`);
          return validatedResults;
        }
      } catch (llamaError) {
        console.warn('⚠️ Llama 3.1 extraction failed:', llamaError.message);
      }

      // If Llama fails, use basic pattern matching as fallback
      console.log('🔄 Falling back to basic pattern extraction...');
      const basicResults = this.basicPatternExtraction(emailText, subject);
      
      const validatedResults = this.validateAndCleanResults(basicResults);
      console.log(`✅ Fallback extraction complete: ${validatedResults.length} final events`);
      return validatedResults;

    } catch (error) {
      console.error('❌ Hybrid extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract events using Llama 3.1 only (main method)
   */
  async extractWithLlamaOnly(emailText, subject) {
    console.log('🧠 Direct extraction with Llama 3.1...');
    
    const prompt = this.buildLlamaExtractionPrompt(emailText, subject);
    const response = await this.callLlama(prompt);
    
    return this.parseLlamaResponse(response);
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
   * Call Llama 3.1 via Together AI API - FIXED VERSION
   */
  async callLlama(prompt) {
    const apiKey = await this.getTogetherAPIKey();
    if (!apiKey) {
      throw new Error('Together AI API key not found');
    }

    console.log('🚀 Calling Llama 3.1...');
    
    // FIXED: Use the correct Together AI endpoint and format
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO', // FIXED: Use working model
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        top_p: 0.9,
        frequency_penalty: 0.1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Together AI API Error:', response.status, errorText);
      throw new Error(`Llama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📡 Llama 3.1 response received');
    
    // Extract the response content from the new format
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Get Together AI API key - FIXED VERSION
   */
  async getTogetherAPIKey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // FIXED: Try both possible key names (camelCase from settings, underscore from old code)
        const result = await chrome.storage.sync.get(['togetherApiKey', 'together_api_key']);
        
        // Prefer camelCase (from settings page), fallback to underscore
        const apiKey = result.togetherApiKey || result.together_api_key;
        
        if (apiKey) {
          console.log('🔑 Together AI API key found');
          return apiKey;
        } else {
          console.log('❌ Together AI API key not found in storage');
          return null;
        }
      }
      // Fallback for testing
      return process.env.TOGETHER_API_KEY || null;
    } catch (error) {
      console.warn('⚠️ Could not retrieve API key:', error);
      return null;
    }
  }

  /**
   * Basic pattern extraction as fallback when Llama fails
   */
  basicPatternExtraction(emailText, subject) {
    console.log('🔍 Using basic pattern extraction...');
    
    const events = [];
    const text = emailText.toLowerCase();
    
    // Simple event detection patterns
    const eventPatterns = [
      {
        pattern: /meet(?:ing)?\s+(?:me\s+)?(?:tomorrow|today|(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/,
        type: 'meeting'
      },
      {
        pattern: /lunch\s+(?:tomorrow|today|(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/,
        type: 'social'
      },
      {
        pattern: /dinner\s+(?:tomorrow|today|(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/,
        type: 'social'
      },
      {
        pattern: /(?:appointment|call)\s+(?:tomorrow|today|(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/,
        type: 'professional'
      }
    ];
    
    // Time patterns
    const timePattern = /(\d{1,2})(?:[:.]\d{2})?\s*(?:am|pm|a\.?m\.?|p\.?m\.?)/i;
    const locationPattern = /(?:at|in)\s+(?:the\s+)?([^.,\n]+)/i;
    
    for (const eventDef of eventPatterns) {
      if (eventDef.pattern.test(text)) {
        console.log(`✅ Found ${eventDef.type} pattern`);
        
        // Extract time
        const timeMatch = emailText.match(timePattern);
        let time = null;
        if (timeMatch) {
          time = this.normalizeTime(timeMatch[0]);
        }
        
        // Extract location
        const locationMatch = emailText.match(locationPattern);
        let location = null;
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
        
        // Determine date
        let date = new Date().toISOString().split('T')[0]; // Today
        if (text.includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          date = tomorrow.toISOString().split('T')[0];
        }
        
        events.push({
          id: this.generateId(),
          title: subject || `${eventDef.type.charAt(0).toUpperCase() + eventDef.type.slice(1)} Event`,
          date: date,
          time: time,
          location: location,
          description: emailText.substring(0, 100).trim(),
          type: eventDef.type,
          confidence: 0.7,
          source: 'basic_pattern',
          extractedAt: new Date().toISOString()
        });
        
        break; // Only create one event to avoid duplicates
      }
    }
    
    return events;
  }

  /**
   * Normalize time to HH:MM format
   */
  normalizeTime(timeStr) {
    const match = timeStr.match(/(\d{1,2})(?:[:.]\d{2})?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const ampm = match[2]?.toLowerCase();
      
      if (ampm && ampm.includes('pm') && hours !== 12) {
        hours += 12;
      } else if (ampm && ampm.includes('am') && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:00`;
    }
    
    return null;
  }

  /**
   * Parse Llama 3.1 JSON response
   */
  parseLlamaResponse(response) {
    try {
      // Clean the response - extract JSON array
      let cleanResponse = response.trim();
      
      // Find JSON array in response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);
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
      version: '2.0.0',
      components: {
        compromise: this.compromiseInitialized,
        llama: !!this.llamaEndpoint,
        cspCompliant: true
      },
      features: [
        'advanced reasoning with Llama 3.1',
        'CSP-compliant design',
        'basic pattern fallback',
        'confidence scoring',
        'input validation'
      ],
      supportedEventTypes: Object.keys(this.eventTypes)
    };
  }

  /**
   * Test the hybrid extraction
   */
  async testExtraction() {
    const testEmail = `
      Subject: Team Meeting
      
      Hi everyone,
      
      Let's have our weekly team meeting tomorrow at 2 PM in the conference room.
      
      Best regards,
      John
    `;
    
    console.log('🧪 Testing hybrid extraction...');
    const results = await this.extractEvents(testEmail, 'Team Meeting');
    console.log('🎯 Test results:', results);
    return results;
  }

  // Stub methods for compatibility (Compromise.js methods that are no longer used)
  extendCompromiseWithEventPatterns() { /* CSP: No longer used */ }
  extractWithCompromise() { return []; }
  enhanceWithLlama() { return []; }
  mergeResults(_, llamaResults) { return llamaResults; }
  eventsConflict() { return false; }
  titlesSimilar() { return false; }
  levenshteinDistance() { return 0; }
  detectEventTypeCompromise() { return null; }
  extractTitleCompromise() { return 'Event'; }
  normalizeDateCompromise() { return null; }
  normalizeTimeCompromise() { return null; }
  extractLocationCompromise() { return null; }
  calculateCompromiseConfidence() { return 0.5; }
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HybridEventExtractor;
}

// Auto-initialize for browser usage
if (typeof window !== 'undefined') {
  window.HybridEventExtractor = HybridEventExtractor;
}