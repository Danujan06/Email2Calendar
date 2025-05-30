// Updated popup.js with enhanced natural language extraction
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

      // Preserve button styling during scan
      const originalHTML = scanButton.innerHTML;
      scanButton.innerHTML = `
        <span class="btn-icon">⏳</span>
        <span class="btn-label">Scanning</span>
      `;
      scanButton.disabled = true;

      console.log('🚀 Starting enhanced email scan...');

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // ENHANCED EXTRACTION ENGINE - Injected into Gmail page
          console.log('🔍 Enhanced extraction engine started');
          
          try {
            // Find email content with improved selectors
            const emailSelectors = [
              '[role="main"] [dir="ltr"]',
              '.ii.gt div',
              '.a3s.aiL',
              '.ii.gt',
              '[data-message-id] [dir="ltr"]',
              '[role="listitem"] [dir="ltr"]',
              '.adn .a3s',
              '.gmail_default'
            ];
            
            let emailBody = null;
            let emailText = '';
            
            for (const selector of emailSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                const text = element.textContent || element.innerText || '';
                if (text.length > 20) {
                  emailBody = element;
                  emailText = text;
                  console.log(`✅ Found email content: "${text.substring(0, 200)}..."`);
                  break;
                }
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
              'h2 span[data-hovercard-id]',
              '.hP',
              'h2'
            ];
            
            let subject = '';
            for (const selector of subjectSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent && element.textContent.trim().length > 0) {
                subject = element.textContent.trim();
                console.log(`✅ Found subject: "${subject}"`);
                break;
              }
            }

            console.log('🎯 Processing email:', { subject, textLength: emailText.length });
            
            // ENHANCED MULTI-STRATEGY EXTRACTION
            return extractEventsWithMultipleStrategies(emailText, subject);

          } catch (error) {
            console.error('💥 Enhanced extraction error:', error);
            return [];
          }

          // EXTRACTION STRATEGIES
          function extractEventsWithMultipleStrategies(emailText, subject) {
            const events = [];
            const text = emailText.toLowerCase();
            const originalText = emailText;
            
            console.log('🔍 Starting multi-strategy extraction...');
            
            // Strategy 1: Meeting invitation patterns (PRIMARY for your email type)
            const meetingEvents = extractMeetingInvitations(originalText, subject);
            events.push(...meetingEvents);
            
            // Strategy 2: Natural language temporal expressions
            const temporalEvents = extractTemporalEvents(originalText, subject);
            events.push(...temporalEvents);
            
            // Strategy 3: Academic deadline patterns
            const deadlineEvents = extractDeadlineEvents(originalText, subject);
            events.push(...deadlineEvents);
            
            console.log(`🎯 Total events found: ${events.length}`);
            
            // Deduplicate and rank by confidence
            return deduplicateAndRank(events);
          }

          // Strategy 1: Meeting invitation patterns (MAIN STRATEGY for your email)
          function extractMeetingInvitations(text, subject) {
            const events = [];
            
            console.log('🔍 Strategy 1: Looking for meeting invitations...');
            
            // Enhanced patterns for natural language
            const patterns = [
              // "Meet me tomorrow in the faculty canteen at 10.00 am"
              /meet\s+(?:me\s+)?(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at|in|on))?\s+(?:the\s+)?([\w\s]+?)(?:\s+at\s+)?(\d{1,2}(?:\.\d{2}|\:\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/gi,
              
              // "Let's meet tomorrow at 10"
              /let'?s\s+meet\s+(?:tomorrow|today)(?:\s+(?:at|in|on))?\s*([\w\s]*?)(?:\s+at\s+)?(\d{1,2}(?:\.\d{2}|\:\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/gi,
              
              // "See you tomorrow at 10"
              /see\s+you\s+(?:tomorrow|today)(?:\s+(?:at|in|on))?\s*([\w\s]*?)(?:\s+at\s+)?(\d{1,2}(?:\.\d{2}|\:\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/gi,
              
              // More flexible: just look for "tomorrow" + time
              /(tomorrow|today)(?:\s+(?:at|in|on))?\s*([\w\s]*?)(?:\s+at\s+)?(\d{1,2}(?:\.\d{2}|\:\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/gi
            ];
            
            patterns.forEach((pattern, index) => {
              const matches = [...text.matchAll(pattern)];
              console.log(`   Pattern ${index + 1}: Found ${matches.length} matches`);
              
              matches.forEach(match => {
                console.log(`   Match:`, match[0]);
                
                let temporalWord, location, timeStr;
                
                if (match.length === 4) {
                  // Format: temporal + location + time
                  temporalWord = match[1];
                  location = match[2] ? match[2].trim() : '';
                  timeStr = match[3] ? match[3].trim() : '';
                } else {
                  // Simpler format
                  temporalWord = 'tomorrow'; // Default
                  location = match[1] ? match[1].trim() : '';
                  timeStr = match[2] ? match[2].trim() : '';
                }
                
                // Clean up location (remove connecting words)
                location = location.replace(/\b(at|in|on|the)\b/gi, '').trim();
                
                const dateStr = extractDateFromTemporalExpression(temporalWord);
                const time = normalizeTime(timeStr);
                
                console.log(`   Extracted: date="${dateStr}", time="${time}", location="${location}"`);
                
                if (dateStr && time) {
                  const event = {
                    id: Date.now() + Math.random(),
                    title: generateMeetingTitle(subject, location, text),
                    date: dateStr,
                    time: time,
                    location: location || null,
                    description: `Meeting: ${match[0]}`,
                    source: 'meeting_invitation',
                    type: 'meeting',
                    confidence: 0.95
                  };
                  
                  events.push(event);
                  console.log(`✅ Created meeting event:`, event);
                }
              });
            });
            
            return events;
          }

          // Strategy 2: Natural language temporal expressions
          function extractTemporalEvents(text, subject) {
            const events = [];
            
            console.log('🔍 Strategy 2: Looking for temporal expressions...');
            
            // Look for time expressions
            const timePattern = /\b(\d{1,2}(?:\.\d{2}|\:\d{2})?)\s*(am|pm|a\.m\.|p\.m\.)\b/gi;
            const timeMatches = [...text.matchAll(timePattern)];
            
            console.log(`   Found ${timeMatches.length} time expressions`);
            
            if (timeMatches.length > 0) {
              timeMatches.forEach(timeMatch => {
                const timeStr = timeMatch[0];
                const timeIndex = timeMatch.index;
                
                // Look for temporal words in the same sentence
                const sentences = text.split(/[.!?]+/);
                const currentSentence = sentences.find(sentence => 
                  sentence.includes(timeStr) || 
                  Math.abs(sentence.indexOf(timeStr.toLowerCase()) - timeIndex) < 50
                );
                
                if (currentSentence) {
                  console.log(`   Sentence with time: "${currentSentence}"`);
                  
                  // Check for temporal indicators
                  const temporalIndicators = ['tomorrow', 'today', 'yesterday'];
                  const foundIndicator = temporalIndicators.find(indicator => 
                    currentSentence.toLowerCase().includes(indicator)
                  );
                  
                  if (foundIndicator) {
                    const dateStr = extractDateFromTemporalExpression(foundIndicator);
                    const time = normalizeTime(timeStr);
                    const location = extractLocationFromContext(currentSentence);
                    
                    if (dateStr && time) {
                      const event = {
                        id: Date.now() + Math.random(),
                        title: generateEventTitle(subject, currentSentence, location),
                        date: dateStr,
                        time: time,
                        location: location,
                        description: currentSentence.trim(),
                        source: 'temporal_expression',
                        type: 'meeting',
                        confidence: 0.8
                      };
                      
                      events.push(event);
                      console.log(`✅ Created temporal event:`, event);
                    }
                  }
                }
              });
            }
            
            return events;
          }

          // Strategy 3: Academic deadline patterns (existing logic)
          function extractDeadlineEvents(text, subject) {
            const events = [];
            
            console.log('🔍 Strategy 3: Looking for academic deadlines...');
            
            const duePattern = /due:\s*([^.\n\r]+)/gi;
            const dueMatches = [...text.matchAll(duePattern)];
            
            if (dueMatches.length > 0) {
              console.log(`   Found ${dueMatches.length} due patterns`);
              // ... existing due date logic here
            }
            
            return events;
          }

          // HELPER FUNCTIONS
          function extractDateFromTemporalExpression(expression) {
            const expr = expression.toLowerCase();
            const today = new Date();
            
            if (expr.includes('today')) {
              return today.toISOString().split('T')[0];
            }
            
            if (expr.includes('tomorrow')) {
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);
              return tomorrow.toISOString().split('T')[0];
            }
            
            if (expr.includes('yesterday')) {
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              return yesterday.toISOString().split('T')[0];
            }
            
            return null;
          }

          function normalizeTime(timeStr) {
            if (!timeStr) return null;
            
            console.log(`   Normalizing time: "${timeStr}"`);
            
            // Handle "10.00 am" format
            let cleanTime = timeStr.replace(/\s+/g, ' ').trim();
            cleanTime = cleanTime.replace(/\.(\d{2})/, ':$1');
            
            const timeMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
            
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
              
              const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              console.log(`   Normalized to: "${result}"`);
              return result;
            }
            
            return null;
          }

          function extractLocationFromContext(context) {
            const locationKeywords = [
              'canteen', 'cafeteria', 'restaurant', 'office', 'room', 'hall',
              'building', 'library', 'lab', 'classroom', 'auditorium', 'faculty'
            ];
            
            const contextLower = context.toLowerCase();
            
            for (const keyword of locationKeywords) {
              if (contextLower.includes(keyword)) {
                // Try to extract the full location phrase
                const pattern = new RegExp(`\\b((?:\\w+\\s+)?${keyword}(?:\\s+\\w+)?)\\b`, 'i');
                const match = context.match(pattern);
                if (match) {
                  return match[1].trim();
                }
              }
            }
            
            return null;
          }

          function generateMeetingTitle(subject, location, text) {
            if (subject && subject !== '(no subject)' && !subject.toLowerCase().includes('inbox')) {
              return subject;
            }
            
            if (location) {
              return `Meeting at ${location}`;
            }
            
            // Look for person names in text
            const namePattern = /(?:from|by|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
            const nameMatch = text.match(namePattern);
            if (nameMatch) {
              return `Meeting with ${nameMatch[1]}`;
            }
            
            return 'Meeting';
          }

          function generateEventTitle(subject, context, location) {
            if (subject && subject !== '(no subject)' && !subject.toLowerCase().includes('inbox')) {
              return subject;
            }
            
            if (location) {
              return `Event at ${location}`;
            }
            
            return 'Event';
          }

          function deduplicateAndRank(events) {
            // Remove duplicates and rank by confidence
            const uniqueEvents = [];
            const seen = new Set();
            
            // Sort by confidence first
            events.sort((a, b) => b.confidence - a.confidence);
            
            events.forEach(event => {
              const key = `${event.date}-${event.time}-${event.title.substring(0, 20)}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
              }
            });
            
            return uniqueEvents;
          }
        }
      });

      console.log('📨 Enhanced scan results:', results);

      if (results && results[0] && results[0].result) {
        const events = results[0].result;
        
        if (events && events.length > 0) {
          console.log('✅ Events found:', events);
          updateStats(events.length, 0);
          showSuccess(`Found ${events.length} event${events.length > 1 ? 's' : ''}`);
          
          await chrome.storage.local.set({ lastEvents: events });
          await updateRecentEventsWithActions(events);
        } else {
          console.log('❌ No events found');
          showError('No events found in this email');
        }
      } else {
        showError('Failed to scan email');
      }

    } catch (error) {
      console.error('❌ Enhanced scan failed:', error);
      showError('Could not scan email. Please try again.');
    } finally {
      // Restore original button styling
      scanButton.innerHTML = originalHTML;
      scanButton.disabled = false;
    }
  });

  // Enhanced add event to calendar with dialog
  async function addEventToCalendar(eventData, button) {
    try {
      console.log('🚀 Opening event dialog for:', eventData);
      showEventDialog(eventData, button);
    } catch (error) {
      console.error('❌ Failed to open event dialog:', error);
      showError('Failed to open event dialog');
    }
  }

  // Show event editing dialog
  function showEventDialog(eventData, originalButton) {
    const existingDialog = document.querySelector('.event-dialog-overlay');
    if (existingDialog) existingDialog.remove();
    
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'event-dialog-overlay';
    
    dialogOverlay.innerHTML = `
      <div class="event-dialog">
        <div class="event-dialog-header">
          <h3>Add Event to Calendar</h3>
          <button class="event-dialog-close" type="button">×</button>
        </div>
        
        <div class="event-dialog-body">
          <form id="eventForm" class="event-form">
            <div class="form-group">
              <label for="eventTitle">Title:</label>
              <input type="text" id="eventTitle" name="title" value="${eventData.title || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="eventDate">Date:</label>
              <input type="date" id="eventDate" name="date" value="${formatDateForInput(eventData.date)}" required>
            </div>
            
            <div class="form-group">
              <label for="eventStartTime">Start Time:</label>
              <input type="time" id="eventStartTime" name="startTime" value="${formatTimeForInput(eventData.time)}">
            </div>
            
            <div class="form-group">
              <label for="eventEndTime">End Time:</label>
              <input type="time" id="eventEndTime" name="endTime" value="${formatEndTimeForInput(eventData.time)}">
            </div>
            
            <div class="form-group">
              <label for="eventLocation">Location:</label>
              <input type="text" id="eventLocation" name="location" value="${eventData.location || ''}" placeholder="Meeting room, address, Zoom link">
            </div>
            
            <div class="form-group">
              <label for="eventDescription">Description:</label>
              <textarea id="eventDescription" name="description" rows="3">${eventData.description || ''}</textarea>
            </div>
          </form>
        </div>
        
        <div class="event-dialog-footer">
          <button type="button" class="dialog-btn cancel-btn">Cancel</button>
          <button type="button" class="dialog-btn add-btn primary">Add to Calendar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialogOverlay);
    setupDialogEventListeners(dialogOverlay, eventData, originalButton);
    
    // Focus on title field
    setTimeout(() => {
      const titleInput = dialogOverlay.querySelector('#eventTitle');
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 100);
  }

  // Setup dialog event listeners
  function setupDialogEventListeners(dialogOverlay, originalEventData, originalButton) {
    const dialog = dialogOverlay.querySelector('.event-dialog');
    const closeBtn = dialogOverlay.querySelector('.event-dialog-close');
    const cancelBtn = dialogOverlay.querySelector('.cancel-btn');
    const addBtn = dialogOverlay.querySelector('.add-btn');
    const form = dialogOverlay.querySelector('#eventForm');
    
    const closeDialog = () => {
      dialogOverlay.style.opacity = '0';
      setTimeout(() => dialogOverlay.remove(), 200);
    };
    
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    dialogOverlay.addEventListener('click', (e) => {
      if (e.target === dialogOverlay) closeDialog();
    });
    
    dialog.addEventListener('click', (e) => e.stopPropagation());
    
    addBtn.addEventListener('click', async () => {
      await handleAddToCalendar(form, originalEventData, originalButton, closeDialog);
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAddToCalendar(form, originalEventData, originalButton, closeDialog);
    });
    
    // Auto-update end time
    const startTimeInput = form.querySelector('#eventStartTime');
    const endTimeInput = form.querySelector('#eventEndTime');
    
    startTimeInput.addEventListener('change', () => {
      if (startTimeInput.value && !endTimeInput.value) {
        endTimeInput.value = addOneHour(startTimeInput.value);
      }
    });
  }

  // Handle adding event from dialog
  async function handleAddToCalendar(form, originalEventData, originalButton, closeDialog) {
    const addBtn = form.parentElement.parentElement.querySelector('.add-btn');
    const originalText = addBtn.textContent;
    
    try {
      addBtn.textContent = '⏳ Adding...';
      addBtn.disabled = true;
      
      const formData = new FormData(form);
      const eventData = {
        title: formData.get('title'),
        date: formData.get('date'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        location: formData.get('location'),
        description: formData.get('description'),
        type: originalEventData.type || 'event'
      };
      
      console.log('📝 Adding event to calendar:', eventData);
      
      const response = await sendMessageWithTimeout({
        action: 'addToCalendar',
        event: eventData
      }, 30000);
      
      if (response && response.success) {
        showSuccess('✅ Event added to calendar!');
        
        if (originalButton) {
          originalButton.textContent = '✅ Added';
          originalButton.style.background = 'linear-gradient(135deg, #34a853 0%, #0f9d58 100%)';
          originalButton.disabled = true;
        }
        
        const data = await chrome.storage.local.get(['eventsAdded']);
        const newAdded = (data.eventsAdded || 0) + 1;
        await chrome.storage.local.set({ eventsAdded: newAdded });
        eventsAddedElement.textContent = newAdded;
        
        updateEventStatus(originalEventData.id, 'added');
        closeDialog();
        
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('❌ Failed to add event:', error);
      showError(`Failed to add event: ${error.message}`);
      addBtn.textContent = originalText;
      addBtn.disabled = false;
    }
  }

  // Delete event function
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

  // Helper functions
  function sendMessageWithTimeout(message, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  function formatDateForInput(dateStr) {
    if (!dateStr) return getTomorrowDate();
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    return getTomorrowDate();
  }

  function formatTimeForInput(timeStr) {
    if (!timeStr) return '';
    
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
    
    return '';
  }

  function formatEndTimeForInput(timeStr) {
    if (!timeStr) return '';
    const startTime = formatTimeForInput(timeStr);
    if (startTime) {
      return addOneHour(startTime);
    }
    return '';
  }

  function addOneHour(timeStr) {
    if (!timeStr) return '';
    
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const newHours = (hours + 1) % 24;
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      return timeStr;
    }
  }

  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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

  async function updateEventStatus(eventId, status) {
    const result = await chrome.storage.local.get(['recentEvents']);
    let recentEvents = result.recentEvents || [];
    
    const eventIndex = recentEvents.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
      recentEvents[eventIndex].status = status;
      await chrome.storage.local.set({ recentEvents });
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
        </div>
        <div class="event-actions">
          <button class="event-btn add-event-btn" data-event-id="${event.id}">
            ➕ Add
          </button>
          <button class="event-btn delete-event-btn" data-event-id="${event.id}">
            🗑️ Delete
          </button>
        </div>
        ${event.status === 'added' ? '<span class="event-status added">Added</span>' : ''}
      </div>
    `).join('');

    // Add event listeners
    eventsList.querySelectorAll('.add-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const eventId = e.target.dataset.eventId;
        const event = events.find(e => e.id == eventId);
        if (event) {
          await addEventToCalendar(event, button);
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