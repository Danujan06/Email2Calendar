// Updated popup.js with Enhanced NLP - No Dialog, Direct ML Addition
document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanCurrentEmail');
  const statusElement = document.getElementById('extensionStatus');
  const eventsFoundElement = document.getElementById('eventsFound');
  const eventsAddedElement = document.getElementById('eventsAdded');

  // Load saved stats
  loadStats();
  loadRecentEvents();

  scanButton.addEventListener('click', async function() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('mail.google.com')) {
        showError('Please navigate to Gmail first');
        return;
      }

      // Update button state during scan
      const originalHTML = scanButton.innerHTML;
      scanButton.innerHTML = `<span class="btn-icon">🧠</span><span class="btn-label">NLP Processing</span>`;
      scanButton.disabled = true;

      console.log('🚀 Starting Enhanced NLP email scan...');

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // ENHANCED NLP EXTRACTOR - Injected into Gmail page
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
                // Standard time formats
                /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
                /\b(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
                /\b(\d{1,2})\.(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/gi,
                // 24-hour format
                /\b(\d{1,2}):(\d{2})\b/g,
                // Written numbers
                /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(am|pm|a\.?m\.?|p\.?m\.?|o'clock)\b/gi,
                // Casual time references
                /\b(noon|midnight|evening|morning|afternoon)\b/gi
              ];

              this.datePatterns = [
                // Explicit dates
                /\b(today|tonight|this evening)\b/gi,
                /\b(tomorrow|tmrw)\b/gi,
                /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
                /\b(next|this|coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
                /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
                /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?\b/gi,
                /\b(\d{1,2})(st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
              ];

              this.locationPatterns = [
                // Specific venue patterns
                /\bat\s+([A-Z][a-zA-Z\s&]+(?:Hotel|Restaurant|Cafe|Bar|Grand|Plaza|Center|Mall|Building))/g,
                /\bat\s+([A-Z][a-zA-Z\s&]{2,30})/g,
                /\bin\s+([A-Z][a-zA-Z\s]{2,20})/g,
                // Address patterns
                /\b(\d+[A-Za-z]?\s+[A-Z][a-zA-Z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr))/g,
                // Restaurant/venue specific
                /\b([A-Z][a-zA-Z\s&]*(Restaurant|Cafe|Bar|Hotel|Grand|Plaza|Center))/g
              ];
            }

            extractEvents(emailText, subject = '') {
              console.log('🧠 Starting enhanced NLP extraction...');
              console.log('Input text:', emailText);
              
              const events = [];
              const sentences = this.splitIntoSentences(emailText);
              
              console.log('Sentences:', sentences);
              
              sentences.forEach((sentence, index) => {
                console.log(`\n🔍 Analyzing sentence ${index + 1}: "${sentence}"`);
                
                // Check if sentence contains event indicators
                if (this.containsEventIndicators(sentence)) {
                  console.log('✅ Contains event indicators');
                  
                  const extractedEvents = this.extractFromSentence(sentence, subject);
                  events.push(...extractedEvents);
                }
              });

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
              
              // Check for event type keywords
              const hasEventType = Object.values(this.eventTypes).some(eventType => 
                eventType.keywords.some(keyword => lowerSentence.includes(keyword))
              );
              
              // Check for time indicators
              const hasTimeIndicator = this.timePatterns.some(pattern => pattern.test(sentence)) ||
                ['tonight', 'today', 'tomorrow', 'evening', 'morning', 'afternoon'].some(word => 
                  lowerSentence.includes(word)
                );
              
              // Check for invitation language
              const hasInvitationLanguage = [
                'we have', 'let\'s', 'join', 'come', 'meet', 'see you', 'dinner date', 'lunch date'
              ].some(phrase => lowerSentence.includes(phrase));

              console.log(`   Event type: ${hasEventType}, Time: ${hasTimeIndicator}, Invitation: ${hasInvitationLanguage}`);
              
              return hasEventType || (hasTimeIndicator && hasInvitationLanguage);
            }

            extractFromSentence(sentence, subject) {
              const events = [];
              console.log(`🔬 Deep extracting from: "${sentence}"`);
              
              // Extract components
              const eventType = this.extractEventType(sentence);
              const dateInfo = this.extractDate(sentence);
              const timeInfo = this.extractTime(sentence);
              const location = this.extractLocation(sentence);
              
              console.log('Extracted components:', { eventType, dateInfo, timeInfo, location });
              
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
                
                console.log('✅ Created event:', event);
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
                  console.log(`   Found event type: ${typeName}`);
                  return { name: typeName, ...typeInfo };
                }
              }
              
              // Check for compound phrases like "dinner date"
              if (lowerSentence.includes('dinner date') || lowerSentence.includes('lunch date')) {
                console.log('   Found compound event type: date');
                return { name: 'date', ...this.eventTypes['date'] };
              }
              
              return null;
            }

            extractDate(sentence) {
              console.log('   🗓️ Extracting date...');
              
              for (const pattern of this.datePatterns) {
                const match = sentence.match(pattern);
                if (match) {
                  console.log(`   Date match: "${match[0]}"`);
                  return this.normalizeDate(match[0]);
                }
              }
              
              return null;
            }

            extractTime(sentence) {
              console.log('   ⏰ Extracting time...');
              
              for (const pattern of this.timePatterns) {
                const matches = [...sentence.matchAll(pattern)];
                if (matches.length > 0) {
                  const timeStr = matches[0][0];
                  console.log(`   Time match: "${timeStr}"`);
                  return this.normalizeTime(timeStr);
                }
              }
              
              return null;
            }

            extractLocation(sentence) {
              console.log('   📍 Extracting location...');
              
              for (const pattern of this.locationPatterns) {
                const matches = [...sentence.matchAll(pattern)];
                if (matches.length > 0) {
                  const location = matches[0][1] || matches[0][0];
                  console.log(`   Location match: "${location}"`);
                  return this.cleanLocation(location);
                }
              }
              
              return null;
            }

            normalizeDate(dateStr) {
              const today = new Date();
              const lowerDate = dateStr.toLowerCase();
              
              if (lowerDate.includes('today')) {
                return today.toISOString().split('T')[0];
              }
              
              if (lowerDate.includes('tonight') || lowerDate.includes('this evening')) {
                return today.toISOString().split('T')[0];
              }
              
              if (lowerDate.includes('tomorrow') || lowerDate.includes('tmrw')) {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                return tomorrow.toISOString().split('T')[0];
              }
              
              // Handle day names
              const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const dayMatch = lowerDate.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
              
              if (dayMatch) {
                const targetDay = days.indexOf(dayMatch[1]);
                const currentDay = today.getDay();
                let daysUntil = (targetDay - currentDay + 7) % 7;
                
                if (daysUntil === 0) daysUntil = 7; // Next week if same day
                
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + daysUntil);
                return targetDate.toISOString().split('T')[0];
              }
              
              return null;
            }

            normalizeTime(timeStr) {
              const cleanTime = timeStr.toLowerCase().replace(/[^\w:\.]/g, ' ').trim();
              
              // Handle written numbers
              const numberWords = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
                'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12
              };
              
              let processedTime = cleanTime;
              Object.entries(numberWords).forEach(([word, num]) => {
                processedTime = processedTime.replace(new RegExp(`\\b${word}\\b`, 'g'), num.toString());
              });
              
              // Handle special cases
              if (processedTime.includes('noon')) return '12:00';
              if (processedTime.includes('midnight')) return '00:00';
              if (processedTime.includes('evening') && !processedTime.match(/\d/)) return '19:00';
              if (processedTime.includes('morning') && !processedTime.match(/\d/)) return '09:00';
              if (processedTime.includes('afternoon') && !processedTime.match(/\d/)) return '14:00';
              
              // Parse numeric time
              const timeMatch = processedTime.match(/(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/);
              
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const ampm = timeMatch[3] || '';
                
                // Convert to 24-hour format
                if (ampm.includes('pm') && hours !== 12) {
                  hours += 12;
                } else if (ampm.includes('am') && hours === 12) {
                  hours = 0;
                } else if (!ampm && hours >= 1 && hours <= 12) {
                  // For evening times like "10 pm", assume PM if no AM/PM specified and it's a reasonable evening time
                  if (hours >= 6 && hours <= 11) {
                    hours += 12;
                  }
                }
                
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
              // Priority: subject, then event type, then extract from sentence
              if (subject && subject.trim() && !subject.toLowerCase().includes('inbox')) {
                return subject.trim();
              }
              
              if (eventType) {
                return eventType.name.charAt(0).toUpperCase() + eventType.name.slice(1);
              }
              
              // Extract action from sentence
              const actionMatch = sentence.match(/\b(dinner|lunch|meeting|call|appointment|coffee|drinks|date)\b/i);
              if (actionMatch) {
                return actionMatch[1].charAt(0).toUpperCase() + actionMatch[1].slice(1);
              }
              
              return 'Event';
            }

            calculateConfidence(eventType, dateInfo, timeInfo, location) {
              let confidence = 0.3; // Base confidence
              
              if (eventType) confidence += 0.3;
              if (dateInfo) confidence += 0.2;
              if (timeInfo) confidence += 0.2;
              if (location) confidence += 0.1;
              
              return Math.min(confidence, 1.0);
            }

            getDefaultDate() {
              // Default to today if no specific date found
              const today = new Date();
              return today.toISOString().split('T')[0];
            }

            generateId() {
              return Date.now() + Math.random().toString(36).substr(2, 9);
            }

            deduplicateAndRank(events) {
              // Sort by confidence
              events.sort((a, b) => b.confidence - a.confidence);
              
              // Remove duplicates
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

          // Main extraction function
          console.log('🧠 Enhanced NLP extraction engine started');
          
          try {
            // Find email content
            const emailSelectors = [
              '[role="main"] [dir="ltr"]',
              '.ii.gt div',
              '.a3s.aiL',
              '.ii.gt',
              '[data-message-id] [dir="ltr"]'
            ];
            
            let emailText = '';
            for (const selector of emailSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                emailText = element.textContent || element.innerText || '';
                if (emailText.length > 10) break;
              }
            }
            
            if (!emailText) {
              console.error('❌ No email content found');
              return [];
            }
            
            // Find subject
            const subjectSelectors = [
              'h2[data-legacy-thread-id]',
              '[role="main"] h2',
              'h2 span[data-hovercard-id]'
            ];
            
            let subject = '';
            for (const selector of subjectSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent) {
                subject = element.textContent.trim();
                break;
              }
            }
            
            console.log('Enhanced NLP extraction starting...');
            console.log('Email text:', emailText);
            console.log('Subject:', subject);
            
            // Create extractor and extract events
            const extractor = new EnhancedNLPExtractor();
            const events = extractor.extractEvents(emailText, subject);
            
            console.log('Final extracted events:', events);
            return events;
            
          } catch (error) {
            console.error('Enhanced NLP extraction error:', error);
            return [];
          }
        }
      });

      console.log('📨 Enhanced NLP scan results:', results);

      if (results && results[0] && results[0].result) {
        const events = results[0].result;
        
        if (events && events.length > 0) {
          console.log('✅ NLP detected events:', events);
          
          // Automatically add high-confidence events to calendar
          await autoAddEventsToCalendar(events);
          
          updateStats(events.length, 0);
          showSuccess(`🧠 NLP detected ${events.length} event${events.length > 1 ? 's' : ''}`);
          
          await chrome.storage.local.set({ lastEvents: events });
          await updateRecentEventsWithActions(events);
        } else {
          console.log('❌ No events detected by NLP');
          showError('No events detected in this email');
        }
      } else {
        showError('NLP processing failed');
      }

    } catch (error) {
      console.error('❌ NLP scan failed:', error);
      showError('NLP processing error. Please try again.');
    } finally {
      scanButton.innerHTML = originalHTML;
      scanButton.disabled = false;
    }
  });

  // AUTOMATIC CALENDAR ADDITION (No Dialog)
  async function autoAddEventsToCalendar(events) {
    console.log('🤖 Auto-adding events to calendar...');
    
    for (const event of events) {
      // Auto-add all detected events with confidence > 0.7
      if (event.confidence >= 0.7) {
        try {
          await addEventDirectly(event);
          console.log(`✅ Auto-added: ${event.title}`);
        } catch (error) {
          console.error(`❌ Failed to auto-add ${event.title}:`, error);
        }
      }
    }
  }

  // Direct event addition to calendar
  async function addEventDirectly(eventData) {
    console.log('📅 Adding event directly to calendar:', eventData);
    
    const formattedEvent = {
      title: eventData.title,
      date: eventData.date,
      startTime: eventData.time,
      endTime: eventData.time ? addOneHour(eventData.time) : null,
      location: eventData.location,
      description: eventData.description,
      type: eventData.type
    };
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'addToCalendar',
        event: formattedEvent
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          // Update stats
          updateEventStats();
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  async function updateEventStats() {
    const data = await chrome.storage.local.get(['eventsAdded']);
    const newAdded = (data.eventsAdded || 0) + 1;
    await chrome.storage.local.set({ eventsAdded: newAdded });
    eventsAddedElement.textContent = newAdded;
  }

  function addOneHour(timeStr) {
    if (!timeStr) return null;
    
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const newHours = (hours + 1) % 24;
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      return timeStr;
    }
  }

  function formatDateTime(date, time) {
    if (!date) return 'Date TBD';
    
    try {
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (time) {
        return `${dateStr} at ${time}`;
      } else {
        return dateStr;
      }
    } catch (e) {
      return date + (time ? ` at ${time}` : '');
    }
  }

  async function updateRecentEventsWithActions(newEvents) {
    const result = await chrome.storage.local.get(['recentEvents']);
    let recentEvents = result.recentEvents || [];
    
    newEvents.forEach(event => {
      event.timestamp = new Date().toISOString();
      event.status = 'detected';
    });
    
    recentEvents = [...newEvents, ...recentEvents].slice(0, 10);
    await chrome.storage.local.set({ recentEvents });
    
    displayEventsWithActions(newEvents);
  }

  function displayEventsWithActions(events) {
    const eventsList = document.getElementById('recentEventsList');
    
    if (events.length === 0) {
      eventsList.innerHTML = '<div class="no-events">No recent events detected</div>';
      return;
    }

    eventsList.innerHTML = events.map((event) => `
      <div class="event-item" data-event-id="${event.id}">
        <div class="event-content">
          <div class="event-title">${event.title}</div>
          <div class="event-datetime">${formatDateTime(event.date, event.time)}</div>
          ${event.location ? `<div class="event-location">📍 ${event.location}</div>` : ''}
          <div class="event-confidence">🎯 ${(event.confidence * 100).toFixed(0)}% confidence</div>
        </div>
        <div class="event-actions">
          <button class="event-btn add-event-btn" data-event-id="${event.id}">
            ➕ Add
          </button>
          <button class="event-btn delete-event-btn" data-event-id="${event.id}">
            🗑️ Delete
          </button>
        </div>
        ${event.status === 'added' ? '<span class="event-status added">✅ Added</span>' : ''}
      </div>
    `).join('');

    // Add event listeners
    eventsList.querySelectorAll('.add-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const eventId = e.target.dataset.eventId;
        const event = events.find(e => e.id == eventId);
        if (event) {
          try {
            await addEventDirectly(event);
            button.textContent = '✅ Added';
            button.style.background = '#28a745';
            button.disabled = true;
            showSuccess('Event added to calendar!');
          } catch (error) {
            showError('Failed to add event: ' + error.message);
          }
        }
      });
    });

    eventsList.querySelectorAll('.delete-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const eventId = e.target.dataset.eventId;
        const eventElement = e.target.closest('.event-item');
        await deleteEvent(eventId, eventElement);
      });
    });
  }

  async function deleteEvent(eventId, eventElement) {
    try {
      const result = await chrome.storage.local.get(['recentEvents']);
      let recentEvents = result.recentEvents || [];
      
      recentEvents = recentEvents.filter(event => event.id !== eventId);
      await chrome.storage.local.set({ recentEvents });
      
      eventElement.style.transform = 'translateX(100%)';
      eventElement.style.opacity = '0';
      
      setTimeout(() => {
        eventElement.remove();
        const eventsList = document.getElementById('recentEventsList');
        if (eventsList.children.length === 0) {
          eventsList.innerHTML = '<div class="no-events">No recent events detected</div>';
        }
      }, 300);
      
      showSuccess('Event deleted');
      
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      showError('Failed to delete event');
    }
  }

  // Utility functions
  function showError(message) {
    showNotification(message, 'error');
    statusElement.textContent = 'Error';
    statusElement.style.color = '#d93025';
  }

  function showSuccess(message) {
    showNotification(message, 'success');
    statusElement.textContent = 'Active';
    statusElement.style.color = '#137333';
  }

  function showNotification(message, type) {
    const existing = document.querySelector('.popup-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  async function loadStats() {
    const data = await chrome.storage.local.get(['eventsFound', 'eventsAdded']);
    eventsFoundElement.textContent = data.eventsFound || 0;
    eventsAddedElement.textContent = data.eventsAdded || 0;
  }

  async function updateStats(found, added) {
    const data = await chrome.storage.local.get(['eventsFound', 'eventsAdded']);
    const newFound = (data.eventsFound || 0) + found;
    const newAdded = (data.eventsAdded || 0) + added;
    
    await chrome.storage.local.set({
      eventsFound: newFound,
      eventsAdded: newAdded
    });
    
    eventsFoundElement.textContent = newFound;
    eventsAddedElement.textContent = newAdded;
  }

  async function loadRecentEvents() {
    const result = await chrome.storage.local.get(['recentEvents']);
    const recentEvents = result.recentEvents || [];
    
    if (recentEvents.length === 0) {
      document.getElementById('recentEventsList').innerHTML = '<div class="no-events">No recent events detected</div>';
    } else {
      displayEventsWithActions(recentEvents.slice(0, 5));
    }
  }

  // Button handlers
  document.getElementById('toggleAutoDetection').addEventListener('click', async () => {
    const result = await chrome.storage.sync.get(['autoDetection']);
    const currentState = result.autoDetection !== false;
    const newState = !currentState;
    await chrome.storage.sync.set({ autoDetection: newState });
    showSuccess(`Auto-detection ${newState ? 'enabled' : 'disabled'}`);
  });

  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});