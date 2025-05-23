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
    // Try multiple free AI services in order
    const services = [
      { name: 'Hugging Face', method: this.callHuggingFace.bind(this) },
      { name: 'Groq', method: this.callGroq.bind(this) },
      { name: 'Together AI', method: this.callTogetherAI.bind(this) }
    ];

    for (const service of services) {
      try {
        console.log(`Trying ${service.name}...`);
        return await service.method(prompt);
      } catch (error) {
        console.log(`${service.name} failed:`, error.message);
      }
    }

    throw new Error('All AI services failed');
  }

  // Hugging Face Inference API (Free)
  async callHuggingFace(prompt) {
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) throw new Error(`HF API failed: ${response.status}`);
    
    const data = await response.json();
    return data[0]?.generated_text || prompt;
  }

  // Groq (Free tier available)
  async callGroq(prompt) {
    const apiKey = await this.getGroqKey();
    if (!apiKey) throw new Error('Groq API key not found');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) throw new Error(`Groq API failed: ${response.status}`);
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Together AI (Free tier)
  async callTogetherAI(prompt) {
    const apiKey = await this.getTogetherKey();
    if (!apiKey) throw new Error('Together API key not found');

    const response = await fetch('https://api.together.xyz/inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'togethercomputer/llama-2-7b-chat',
        prompt: prompt,
        max_tokens: 512,
        temperature: 0.3
      })
    });

    if (!response.ok) throw new Error(`Together API failed: ${response.status}`);
    
    const data = await response.json();
    return data.output.choices[0].text;
  }

  async getGroqKey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(['groq_api_key']);
        return result.groq_api_key;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getTogetherKey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(['together_api_key']);
        return result.together_api_key;
      }
      return null;
    } catch (error) {
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