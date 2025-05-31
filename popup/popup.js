// Enhanced popup.js with Duplicate Prevention and Advanced NLP
document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanCurrentEmail');
  const statusElement = document.getElementById('extensionStatus');
  const eventsFoundElement = document.getElementById('eventsFound');
  const eventsAddedElement = document.getElementById('eventsAdded');
  
  // Track processed events in this session to prevent duplicates
  const sessionProcessedEvents = new Set();

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

            extractEvents(emailText, subject = '') {
              console.log('🧠 Starting enhanced NLP extraction...');
              console.log('Input text:', emailText);
              
              const events = [];
              const sentences = this.splitIntoSentences(emailText);
              
              console.log('Sentences:', sentences);
              
              sentences.forEach((sentence, index) => {
                console.log(`\n🔍 Analyzing sentence ${index + 1}: "${sentence}"`);
                
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

              console.log(`   Event type: ${hasEventType}, Time: ${hasTimeIndicator}, Invitation: ${hasInvitationLanguage}`);
              
              return hasEventType || (hasTimeIndicator && hasInvitationLanguage);
            }

            extractFromSentence(sentence, subject) {
              const events = [];
              console.log(`🔬 Deep extracting from: "${sentence}"`);
              
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
              console.log('   ⏰ Extracting time from:', sentence);
              
              // Use the SAME time extraction logic as background.js
              const timeMatch = sentence.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
              
              if (timeMatch) {
                console.log('   ✅ Time match found:', timeMatch[0]);
                
                // Use the SAME normalization as background.js
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const ampm = timeMatch[3]?.toLowerCase();
                
                console.log(`   Parsed components: hours=${hours}, minutes=${minutes}, ampm="${ampm}"`);
                
                if (ampm === 'pm' && hours !== 12) hours += 12;
                if (ampm === 'am' && hours === 12) hours = 0;
                
                const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                console.log(`   ✅ Normalized time: "${result}"`);
                return result;
              }
              
              console.log('   ❌ No time match found');
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
              const today = new Date();
              return today.toISOString().split('T')[0];
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

          // Main extraction function
          console.log('🧠 Enhanced NLP extraction engine started');
          
          try {
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
          
          // Check if auto-add is enabled
          const settings = await chrome.storage.sync.get(['autoAddEvents']);
          const autoAddEnabled = settings.autoAddEvents === true;
          
          if (autoAddEnabled) {
            console.log('🤖 Auto-add enabled, adding events automatically...');
            await autoAddEventsToCalendar(events);
            showSuccess(`🧠 NLP detected and auto-added ${events.length} event${events.length > 1 ? 's' : ''}!`);
          } else {
            console.log('👁️ Auto-add disabled, showing events for manual review...');
            showSuccess(`🧠 NLP detected ${events.length} event${events.length > 1 ? 's' : ''} - Click ➕ to add to calendar`);
          }
          
          updateStats(events.length, 0);
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

  // AUTOMATIC CALENDAR ADDITION WITH DUPLICATE PREVENTION
  async function autoAddEventsToCalendar(events) {
    console.log('🤖 Auto-adding events to calendar...');
    
    let addedCount = 0;
    const results = [];
    const processedKeys = new Set(); // Track processed events in this session
    
    for (const event of events) {
      // Create unique key for this event
      const eventKey = `${event.title}-${event.date}-${event.time}`.toLowerCase();
      
      // Skip if already processed in this session
      if (processedKeys.has(eventKey)) {
        console.log(`⚠️ Skipping duplicate in session: ${event.title}`);
        continue;
      }
      
      // Skip if already processed globally
      if (sessionProcessedEvents.has(eventKey)) {
        console.log(`⚠️ Skipping globally processed event: ${event.title}`);
        continue;
      }
      
      // Auto-add events with confidence > 0.7
      if (event.confidence >= 0.7) {
        try {
          console.log(`🚀 Adding event: ${event.title}`);
          
          // Mark as processed before attempting to add
          processedKeys.add(eventKey);
          sessionProcessedEvents.add(eventKey);
          
          const result = await addEventDirectly(event);
          
          console.log(`✅ Successfully added: ${event.title}`);
          addedCount++;
          results.push({ event, success: true, result });
          
          // Update event status
          event.status = 'added';
          
          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Failed to add ${event.title}:`, error);
          results.push({ event, success: false, error: error.message });
          
          // Mark as failed but keep in processed set to prevent retries
          event.status = 'failed';
          
          // If it's a duplicate error, don't retry
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`⚠️ Duplicate detected for ${event.title}, marking as processed`);
          }
        }
      } else {
        console.log(`⚠️ Skipping low-confidence event: ${event.title} (${(event.confidence * 100).toFixed(0)}%)`);
        results.push({ event, success: false, error: 'Low confidence' });
      }
    }
    
    console.log(`📊 Auto-add results: ${addedCount}/${events.length} events added successfully`);
    
    if (addedCount > 0) {
      await updateEventStats(addedCount);
      showSuccess(`Successfully added ${addedCount} event${addedCount > 1 ? 's' : ''} to calendar!`);
    }
    
    return results;
  }

  // DIRECT EVENT ADDITION WITH DUPLICATE PREVENTION
  async function addEventDirectly(eventData) {
    console.log('📅 Adding event directly to calendar:', eventData);
    
    const formattedEvent = {
      title: eventData.title || 'Event',
      date: formatDateForCalendar(eventData.date),
      startTime: formatTimeForCalendar(eventData.time),
      endTime: formatTimeForCalendar(eventData.time) ? addOneHour(formatTimeForCalendar(eventData.time)) : null,
      location: eventData.location || null,
      description: eventData.description || '',
      type: eventData.type || 'general',
      source: eventData.source || 'manual',
      confidence: eventData.confidence || 0.5
    };
    
    console.log('📝 Formatted event data:', formattedEvent);
    
    if (!formattedEvent.date) {
      throw new Error('Invalid date format');
    }
    
    if (formattedEvent.startTime && !isValidTime(formattedEvent.startTime)) {
      console.warn('⚠️ Invalid time format, converting to all-day event');
      formattedEvent.startTime = null;
      formattedEvent.endTime = null;
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);
      
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

  // HELPER FUNCTIONS
  function formatDateForCalendar(dateStr) {
    if (!dateStr) {
      return new Date().toISOString().split('T')[0];
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
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

  function formatTimeForCalendar(timeStr) {
    if (!timeStr || timeStr === 'Time TBD' || timeStr === null) {
      return null;
    }
    
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a\.?m\.?|p\.?m\.?)?/i);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
      
      if (ampm.includes('pm') && hours !== 12) {
        hours += 12;
      } else if (ampm.includes('am') && hours === 12) {
        hours = 0;
      }
      
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    console.warn('⚠️ Could not parse time:', timeStr);
    return null;
  }

  function isValidTime(timeStr) {
    if (!timeStr) return false;
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeStr);
  }

  function addOneHour(timeStr) {
    if (!timeStr || !isValidTime(timeStr)) {
      return null;
    }
    
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const newHours = (hours + 1) % 24;
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error('❌ Error adding hour:', e);
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
        return `${dateStr} at ${formatTimeDisplay(time)}`;
      } else {
        return dateStr;
      }
    } catch (e) {
      return date + (time ? ` at ${time}` : '');
    }
  }

  function formatTimeDisplay(time) {
    if (!time) return '';
    
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return time;
    }
  }

  function getStatusIcon(status) {
    const icons = {
      'detected': '🔍',
      'added': '✅',
      'failed': '❌',
      'processing': '⏳'
    };
    return icons[status] || '❓';
  }

  // EVENT DISPLAY AND MANAGEMENT WITH DUPLICATE PREVENTION
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

    eventsList.innerHTML = events.map((event) => {
      const statusClass = event.status || 'detected';
      const statusIcon = getStatusIcon(statusClass);
      
      return `
        <div class="event-item ${statusClass}" data-event-id="${event.id}">
          <div class="event-content">
            <div class="event-title">${event.title}</div>
            <div class="event-datetime">${formatDateTime(event.date, event.time)}</div>
            ${event.location ? `<div class="event-location">📍 ${event.location}</div>` : ''}
            <div class="event-confidence">🎯 ${(event.confidence * 100).toFixed(0)}% confidence</div>
          </div>
          <div class="event-actions">
            ${event.status !== 'added' ? `
              <button class="event-btn add-event-btn" data-event-id="${event.id}">
                ➕ Add
              </button>
            ` : ''}
            <button class="event-btn delete-event-btn" data-event-id="${event.id}">
              🗑️ Delete
            </button>
          </div>
          <span class="event-status ${statusClass}">${statusIcon} ${statusClass}</span>
        </div>
      `;
    }).join('');

    // Add event listeners with duplicate prevention
    eventsList.querySelectorAll('.add-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const eventId = e.target.dataset.eventId;
        const event = events.find(e => e.id == eventId);
        
        if (event && !button.disabled) {
          try {
            // Disable button immediately to prevent double-clicks
            button.disabled = true;
            button.textContent = '⏳ Adding...';
            
            await addEventDirectly(event);
            
            button.textContent = '✅ Added';
            button.style.background = '#28a745';
            event.status = 'added';
            
            // Add to session processed events
            const eventKey = `${event.title}-${event.date}-${event.time}`.toLowerCase();
            sessionProcessedEvents.add(eventKey);
            
            showSuccess('Event added to calendar!');
            
            // Refresh display after delay
            setTimeout(() => displayEventsWithActions(events), 1000);
            
          } catch (error) {
            button.textContent = '❌ Failed';
            button.style.background = '#dc3545';
            button.disabled = false; // Re-enable on failure only if not duplicate
            
            if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
              button.disabled = false;
            }
            
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

  // STATISTICS AND STORAGE
  async function updateEventStats(addedCount = 1) {
    try {
      const data = await chrome.storage.local.get(['eventsAdded']);
      const newAdded = (data.eventsAdded || 0) + addedCount;
      await chrome.storage.local.set({ eventsAdded: newAdded });
      
      const eventsAddedElement = document.getElementById('eventsAdded');
      if (eventsAddedElement) {
        eventsAddedElement.textContent = newAdded;
      }
    } catch (error) {
      console.error('❌ Failed to update stats:', error);
    }
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

  // NOTIFICATION SYSTEM
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

  // BUTTON HANDLERS
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

  // Add auto-add toggle function
  async function toggleAutoAdd() {
    const result = await chrome.storage.sync.get(['autoAddEvents']);
    const currentState = result.autoAddEvents === true; // Default to false for safety
    const newState = !currentState;
    await chrome.storage.sync.set({ autoAddEvents: newState });
    showSuccess(`Auto-add events ${newState ? 'enabled' : 'disabled'}`);
    console.log(`🔄 Auto-add events ${newState ? 'enabled' : 'disabled'}`);
  }

  // Expose auto-add toggle function globally for console access
  window.toggleAutoAdd = toggleAutoAdd;

  // CLEAR CACHE FUNCTION
  async function clearProcessedEventsCache() {
    try {
      // Clear local session cache
      sessionProcessedEvents.clear();
      
      // Clear background script cache
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
          console.log('Cache clear response:', response);
          resolve(response);
        });
      });
      
      showSuccess('Processed events cache cleared');
      console.log('✅ All caches cleared');
      
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      showError('Failed to clear cache');
    }
  }

  // TEST FUNCTIONS
  async function testGoogleCalendarTimeSlot() {
    console.log('🧪 Testing Google Calendar time slot placement...');
    
    const testEvent = {
      title: 'Test Dinner Date - Time Slot Check',
      date: new Date().toISOString().split('T')[0],
      startTime: '22:00',
      endTime: '23:00',   
      location: 'Cinnamon Grand',
      description: 'Test event to verify correct time slot placement - should appear at 10 PM',
      type: 'social',
      source: 'manual_test',
      confidence: 1.0
    };
    
    console.log('📅 Test event data:', testEvent);
    console.log('🌍 Your timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    try {
      const result = await addEventDirectly(testEvent);
      
      console.log('✅ SUCCESS! Event created!');
      console.log('📝 Result:', result);
      console.log('📍 Check your calendar - it should appear at 10:00 PM today');
      
      showSuccess('✅ Test event created at 10 PM! Check your calendar.');
      
      return result;
      
    } catch (error) {
      console.error('❌ FAILED to create event:', error);
      showError('❌ Test failed: ' + error.message);
      throw error;
    }
  }

  async function testDinnerEmail() {
    console.log('🧠 Testing dinner email extraction...');
    
    const testEmailText = "Hello Dear,We have a dinner date tonight at 10 pm at Cinnamon Grand.Kind Regards,Danujan S.";
    
    console.log('📧 Test email:', testEmailText);
    
    const sentences = testEmailText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    console.log('📝 Sentences:', sentences);
    
    const targetSentence = sentences.find(s => s.toLowerCase().includes('dinner') && s.toLowerCase().includes('tonight'));
    console.log('🎯 Target sentence:', targetSentence);
    
    if (targetSentence) {
      const timeMatch = targetSentence.match(/(\d{1,2})\s*(pm|am)/i);
      const locationMatch = targetSentence.match(/at\s+([A-Z][a-zA-Z\s&]{2,30})/);
      const dateMatch = targetSentence.match(/tonight/i);
      
      console.log('⏰ Time extracted:', timeMatch ? timeMatch[0] : 'none');
      console.log('📍 Location extracted:', locationMatch ? locationMatch[1] : 'none');
      console.log('📅 Date extracted:', dateMatch ? 'tonight (today)' : 'none');
      
      if (timeMatch && locationMatch && dateMatch) {
        let hours = parseInt(timeMatch[1]);
        const ampm = timeMatch[2].toLowerCase();
        
        if (ampm === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'am' && hours === 12) {
          hours = 0;
        }
        
        const normalizedTime = `${hours.toString().padStart(2, '0')}:00`;
        console.log('🕐 Normalized time:', normalizedTime);
        
        const extractedEvent = {
          title: 'Dinner Date',
          date: new Date().toISOString().split('T')[0],
          startTime: normalizedTime,
          endTime: `${((hours + 1) % 24).toString().padStart(2, '0')}:00`,
          location: locationMatch[1],
          description: targetSentence,
          type: 'social',
          source: 'nlp_test',
          confidence: 0.9
        };
        
        console.log('✅ Extracted event:', extractedEvent);
        
        try {
          const result = await addEventDirectly(extractedEvent);
          console.log('🎉 Dinner date added to calendar!');
          showSuccess('🎉 Dinner date extracted and added to calendar!');
          return result;
        } catch (error) {
          console.error('❌ Failed to add dinner date:', error);
          showError('❌ Failed to add dinner date: ' + error.message);
        }
      }
    }
  }

  function debugTimeParsing() {
    console.log('🔧 Debug: Testing time parsing edge cases...');
    
    const testCases = [
      '10 pm',
      '10:00 PM', 
      '10.00 pm',
      '22:00',
      '10pm',
      '10 PM',
      '10:30 pm'
    ];
    
    testCases.forEach(timeStr => {
      const result = formatTimeForCalendar(timeStr);
      console.log(`  "${timeStr}" → "${result}"`);
    });
  }

  // Test functions are available but not displayed in UI
  // They can still be called from the console for debugging

  // DEBUG FUNCTIONS (can be removed in production)
  window.debugCalendarIntegration = async function() {
    console.log('🔍 Starting Calendar Integration Debug...');
    
    try {
      console.log('📋 Checking permissions...');
      const permissions = await chrome.permissions.getAll();
      console.log('Available permissions:', permissions);
      
      console.log('🔐 Testing authentication...');
      const result = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.readonly'
        ]
      });
      
      const token = result.token || result;
      console.log('✅ Authentication successful:', token ? 'Token received' : 'No token');
      
      console.log('📅 Testing Calendar API access...');
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Calendar API response status:', calendarResponse.status);
      
      if (calendarResponse.ok) {
        const calendars = await calendarResponse.json();
        console.log('✅ Calendar access successful. Available calendars:', calendars.items.length);
        console.log('Primary calendar:', calendars.items.find(cal => cal.primary));
      } else {
        const error = await calendarResponse.text();
        console.error('❌ Calendar API error:', error);
        return false;
      }
      
      console.log('📝 Testing event creation...');
      const testEvent = {
        summary: 'Test Event from Extension',
        description: 'This is a test event created by Email2Calendar extension',
        start: {
          dateTime: new Date(Date.now() + 3600000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(Date.now() + 7200000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testEvent)
      });
      
      console.log('Event creation response status:', createResponse.status);
      
      if (createResponse.ok) {
        const createdEvent = await createResponse.json();
        console.log('✅ Event created successfully!');
        console.log('Event ID:', createdEvent.id);
        console.log('Event link:', createdEvent.htmlLink);
        
        // Clean up - delete the test event
        setTimeout(async () => {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${createdEvent.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('🗑️ Test event cleaned up');
        }, 5000);
        
        return true;
      } else {
        const error = await createResponse.json();
        console.error('❌ Event creation failed:', error);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Debug failed:', error);
      return false;
    }
  };

  // Test message passing
  window.testMessagePassing = async function() {
    console.log('📨 Testing message passing to background script...');
    
    const testEventData = {
      title: 'Test Meeting',
      date: '2025-05-30',
      startTime: '14:00',
      endTime: '15:00',
      description: 'Test event from popup'
    };
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'addToCalendar',
        event: testEventData
      }, (response) => {
        console.log('Background script response:', response);
        if (response) {
          if (response.success) {
            console.log('✅ Event added via background script!');
            console.log('Event ID:', response.eventId);
          } else {
            console.error('❌ Background script error:', response.error);
          }
        } else {
          console.error('❌ No response from background script');
        }
        resolve(response);
      });
    });
  };

  // Clear authentication cache
  window.clearAuthCache = function() {
    chrome.identity.clearAllCachedAuthTokens(() => {
      console.log('🧹 Cleared all cached auth tokens');
      showSuccess('Authentication cache cleared');
    });
  };

  // Expose test functions globally
  window.testGoogleCalendarTimeSlot = testGoogleCalendarTimeSlot;
  window.testDinnerEmail = testDinnerEmail;
  window.debugTimeParsing = debugTimeParsing;
  window.clearProcessedEventsCache = clearProcessedEventsCache;

  // Initialize popup without test buttons
  console.log('✅ Enhanced Popup script loaded successfully with duplicate prevention');
  console.log('🔧 Debug functions available in console:');
  console.log('  - toggleAutoAdd() - Enable/disable automatic event addition');
  console.log('  - testGoogleCalendarTimeSlot() - Test calendar integration');
  console.log('  - testDinnerEmail() - Test dinner email extraction');
  console.log('  - debugTimeParsing() - Debug time parsing');
  console.log('  - clearProcessedEventsCache() - Clear duplicate prevention cache');
  console.log('  - debugCalendarIntegration() - Full calendar integration test');
  console.log('  - testMessagePassing() - Test background script communication');
  console.log('  - clearAuthCache() - Clear authentication cache');
  
  // Check current auto-add status
  chrome.storage.sync.get(['autoAddEvents'], (result) => {
    const autoAddEnabled = result.autoAddEvents === true;
    console.log(`🔄 Auto-add events is currently: ${autoAddEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log('   Use toggleAutoAdd() to change this setting');
  });
});