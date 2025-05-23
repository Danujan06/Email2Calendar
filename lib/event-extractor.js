class EventExtractor {
  constructor() {
    this.dateParser = new DateParser();
  }

  async extractEvents(emailText, subject = '') {
    const events = [];
    
    // Method 1: Use local pattern matching
    const localEvents = this.extractEventsLocally(emailText, subject);
    events.push(...localEvents);

    // Method 2: Use AI API (OpenAI, Anthropic, etc.)
    try {
      const aiEvents = await this.extractEventsWithAI(emailText, subject);
      events.push(...aiEvents);
    } catch (error) {
      console.log('AI extraction failed:', error.message);
    }

    return this.deduplicateEvents(events);
  }

  extractEventsLocally(text, subject) {
    const events = [];
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      if (this.containsEventKeywords(sentence)) {
        const event = this.parseEventFromSentence(sentence, subject);
        if (event) events.push(event);
      }
    });

    return events;
  }

  containsEventKeywords(text) {
    const eventKeywords = [
      'meeting', 'meet', 'appointment', 'call', 'conference',
      'lunch', 'dinner', 'breakfast', 'coffee', 'drink',
      'event', 'party', 'celebration', 'interview',
      'presentation', 'demo', 'workshop', 'training'
    ];
    
    const timeKeywords = [
      'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 
      'thursday', 'friday', 'saturday', 'sunday',
      'am', 'pm', 'o\'clock', ':'
    ];

    const hasEventKeyword = eventKeywords.some(keyword => 
      text.toLowerCase().includes(keyword));
    const hasTimeKeyword = timeKeywords.some(keyword => 
      text.toLowerCase().includes(keyword));

    return hasEventKeyword && hasTimeKeyword;
  }

  parseEventFromSentence(sentence, subject) {
    // Extract title
    const title = this.extractTitle(sentence, subject);
    
    // Extract date and time
    const dateTime = this.dateParser.parseDateTime(sentence);
    if (!dateTime) return null;

    // Extract location
    const location = this.extractLocation(sentence);

    return {
      title: title,
      date: dateTime.date,
      startTime: dateTime.startTime,
      endTime: dateTime.endTime,
      dateTime: dateTime.display,
      location: location,
      description: sentence.trim(),
      confidence: 0.7
    };
  }

  extractTitle(sentence, subject) {
    // Try to extract title from sentence or use subject
    const meetingMatch = sentence.match(/(?:meeting|call|appointment)\s+(?:about|for|regarding)\s+([^,\.\!]+)/i);
    if (meetingMatch) return meetingMatch[1].trim();

    const withMatch = sentence.match(/(?:meeting|call|lunch|dinner)\s+with\s+([^,\.\!]+)/i);
    if (withMatch) return `Meeting with ${withMatch[1].trim()}`;

    return subject || 'Meeting';
  }

  extractLocation(sentence) {
    const locationKeywords = ['at', 'in', 'room', 'office', 'zoom', 'teams', 'google meet'];
    
    for (const keyword of locationKeywords) {
      const regex = new RegExp(`\\b${keyword}\\s+([^,\\.\\!]+)`, 'i');
      const match = sentence.match(regex);
      if (match) return match[1].trim();
    }

    // Look for URLs (Zoom, Teams, etc.)
    const urlMatch = sentence.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) return urlMatch[1];

    return null;
  }

  async extractEventsWithAI(emailText, subject) {
    // This would call an AI service (OpenAI, etc.)
    const prompt = `Extract calendar events from this email:
    
    Subject: ${subject}
    Content: ${emailText}
    
    Return JSON array with events containing: title, date, startTime, endTime, location, description.
    Only include events that have clear date/time information.`;

    try {
      const response = await this.callAIService(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('AI extraction failed:', error);
      return [];
    }
  }

  async callAIService(prompt) {
    try {
      // Check if API key exists
      const apiKey = await this.getAPIKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('Invalid API response structure');
      }

      if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('No content in API response');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI service call failed:', error);
      throw error;
    }
  }

  async getAPIKey() {
    try {
      // Check if chrome.storage is available (Chrome extension context)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(['openai_api_key']);
        return result.openai_api_key;
      } else {
        // Fallback for non-extension environments
        console.warn('Chrome storage not available, API key retrieval failed');
        return null;
      }
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      return null;
    }
  }

  deduplicateEvents(events) {
    // Remove duplicate events based on title, date, and time
    const seen = new Set();
    return events.filter(event => {
      const key = `${event.title}-${event.date}-${event.startTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}