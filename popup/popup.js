// Fixed popup.js with null safety for regex matches
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

      scanButton.textContent = 'Scanning...';
      scanButton.disabled = true;

      console.log('🚀 Starting email scan...');

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          console.log('🔍 Function injected into Gmail page');
          
          try {
            // Find email content
            const emailSelectors = [
              '[role="main"] [dir="ltr"]',
              '.ii.gt div',
              '[data-message-id] [dir="ltr"]',
              '.a3s.aiL',
              '.ii.gt',
              '[role="listitem"] [dir="ltr"]'
            ];
            
            let emailBody = null;
            for (const selector of emailSelectors) {
              emailBody = document.querySelector(selector);
              if (emailBody) {
                const text = emailBody.textContent || emailBody.innerText || '';
                if (text.length > 20) {
                  console.log(`✅ Found email body with selector: "${selector}"`);
                  break;
                }
              }
            }
            
            if (!emailBody) {
              console.error('❌ No email content found');
              return [];
            }

            const emailText = emailBody.textContent || emailBody.innerText || '';
            console.log('📄 Email text length:', emailText.length);
            
            // Find subject
            const subjectSelectors = [
              'h2[data-legacy-thread-id]',
              '[role="main"] h2',
              'h2 span[data-hovercard-id]',
              '.hP',
              '.bog .bqe'
            ];
            
            let subject = 'No Subject';
            for (const selector of subjectSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent && element.textContent.trim().length > 0) {
                subject = element.textContent.trim();
                console.log(`✅ Found subject: "${subject}"`);
                break;
              }
            }

            if (!emailText || emailText.length < 10) {
              console.error('❌ Email text too short or empty');
              return [];
            }

            console.log('🎯 Processing email:', { subject, textLength: emailText.length });
            
            // Extract events
            const events = [];
            
            // Look for "Due:" pattern
            console.log('🔍 Looking for "Due:" patterns...');
            const duePattern = /due:\s*([^.\n\r]+)/gi;
            const dueMatches = [...emailText.matchAll(duePattern)];
            console.log('🎯 Due matches found:', dueMatches.length);
            
            if (dueMatches.length > 0) {
              const dueText = dueMatches[0][1] ? dueMatches[0][1].trim() : '';
              console.log('📅 Due text:', dueText);
              
              if (dueText) {
                // Extract date from due text
                const datePatterns = [
                  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?,?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)?/gi,
                  /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s*(\d{4})?,?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)?/gi
                ];
                
                let dateMatch = null;
                for (const pattern of datePatterns) {
                  dateMatch = dueText.match(pattern);
                  if (dateMatch) {
                    console.log('📅 Date match found:', dateMatch[0]);
                    break;
                  }
                }
                
                if (dateMatch) {
                  // Get course code from subject or text - FIXED: Added null checks
                  console.log('🔍 Looking for course codes...');
                  const coursePattern = /\b([A-Z]{2,4}\d{3}[A-Za-z0-9]*)/;
                  const courseMatch = (subject + ' ' + emailText).match(coursePattern);
                  const courseCode = courseMatch ? courseMatch[0] : null;
                  console.log('📚 Course code found:', courseCode);
                  
                  // Get assignment details - FIXED: Added proper null checks
                  console.log('🔍 Looking for assignment details...');
                  const assignmentPattern = /(?:assignment|lab|project|homework)\s*([^.\n\r,:;]{0,50})/gi;
                  const assignmentMatch = emailText.match(assignmentPattern);
                  // FIXED: Check if assignmentMatch exists and has valid capture group
                  const assignmentDetails = (assignmentMatch && assignmentMatch[1]) ? assignmentMatch[1].trim() : null;
                  console.log('📝 Assignment details:', assignmentDetails);
                  
                  // ALTERNATIVE: Try to extract assignment name from subject
                  let assignmentFromSubject = null;
                  if (subject.includes(':')) {
                    const subjectParts = subject.split(':');
                    if (subjectParts.length > 1) {
                      assignmentFromSubject = subjectParts[subjectParts.length - 1].trim();
                      console.log('📝 Assignment from subject:', assignmentFromSubject);
                    }
                  }
                  
                  // Build title with fallbacks
                  let title = 'Assignment';
                  if (courseCode && (assignmentDetails || assignmentFromSubject)) {
                    title = `${courseCode}: ${assignmentDetails || assignmentFromSubject}`;
                  } else if (courseCode) {
                    title = `${courseCode} Assignment`;
                  } else if (assignmentDetails) {
                    title = assignmentDetails;
                  } else if (assignmentFromSubject) {
                    title = assignmentFromSubject;
                  } else if (subject && !subject.toLowerCase().includes('do not reply')) {
                    // Use the subject but clean it up
                    title = subject.replace(/^[^:]*:\s*/, ''); // Remove prefix before colon
                  }
                  console.log('📝 Built title:', title);
                  
                  // Extract time - FIXED: Added null checks
                  console.log('🔍 Looking for time patterns...');
                  const timePattern = /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/;
                  const timeMatch = dueText.match(timePattern);
                  const time = timeMatch ? timeMatch[0] : 'Time TBD';
                  console.log('⏰ Time found:', time);
                  
                  const event = {
                    title: title,
                    date: dateMatch[0],
                    time: time,
                    description: `Due: ${dueText}`,
                    source: 'due_pattern',
                    type: 'assignment',
                    confidence: 0.9
                  };
                  
                  events.push(event);
                  console.log('✅ Created event from due pattern:', event);
                } else {
                  console.log('❌ No date match found in due text');
                }
              }
            }
            
            // If no due pattern, look for general date patterns
            if (events.length === 0) {
              console.log('🔍 No due pattern found, looking for general date patterns...');
              
              const generalDatePattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?,?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)?/gi;
              const dateMatches = [...emailText.matchAll(generalDatePattern)];
              console.log('📅 General date matches:', dateMatches.length);
              
              if (dateMatches.length > 0) {
                const coursePattern = /\b([A-Z]{2,4}\d{3}[A-Za-z0-9]*)/;
                const courseMatch = (subject + ' ' + emailText).match(coursePattern);
                const courseCode = courseMatch ? courseMatch[0] : null;
                
                // Extract title from subject if available
                let title = 'Event';
                if (subject.includes(':')) {
                  const subjectParts = subject.split(':');
                  title = subjectParts[subjectParts.length - 1].trim();
                } else if (courseCode) {
                  title = `${courseCode} Event`;
                } else {
                  title = subject || 'Event';
                }
                
                const event = {
                  title: title,
                  date: dateMatches[0][0],
                  time: dateMatches[0][5] || 'Time TBD',
                  description: `Event on ${dateMatches[0][0]}`,
                  source: 'date_pattern',
                  type: 'event',
                  confidence: 0.7
                };
                
                events.push(event);
                console.log('✅ Created event from date pattern:', event);
              }
            }
            
            console.log('🎯 Final extraction result:', events);
            return events;

          } catch (error) {
            console.error('💥 Error in injected function:', error);
            console.error('💥 Error stack:', error.stack);
            return [];
          }
        }
      });

      console.log('📨 Script execution results:', results);

      if (results && results[0] && results[0].result) {
        const events = results[0].result;
        
        if (events && events.length > 0) {
          console.log('✅ Events found:', events);
          updateStats(events.length, 0);
          showSuccess(`Found ${events.length} events`);
          
          // Store events for later use
          await chrome.storage.local.set({ lastEvents: events });
          
          // Update recent events list with add buttons
          await updateRecentEventsWithActions(events);
        } else {
          console.log('❌ No events in result');
          showError('No events found');
        }
      } else {
        console.log('❌ No results returned');
        showError('Script execution failed');
      }

    } catch (error) {
      console.error('❌ Scan failed:', error);
      showError('Could not connect to Gmail. Please refresh the page and try again.');
    } finally {
      scanButton.textContent = '📧 Scan Current Email';
      scanButton.disabled = false;
    }
  });

  // Add event to calendar function
  async function addEventToCalendar(eventData, button) {
    const originalText = button.textContent;
    const originalBackground = button.style.background;
    
    try {
      button.textContent = 'Adding...';
      button.disabled = true;
      button.style.background = '#ffc107';

      console.log('🚀 Starting event addition process...');
      console.log('Event data:', eventData);

      // Format event data for calendar API
      const formattedEvent = formatEventForCalendar(eventData);
      console.log('📝 Formatted event:', formattedEvent);
      
      // Send to background script with timeout
      const response = await sendMessageWithTimeout({
        action: 'addToCalendar',
        event: formattedEvent
      }, 30000);

      console.log('📨 Background response:', response);

      if (response && response.success) {
        showSuccess('✅ Event added to calendar!');
        button.textContent = '✅ Added';
        button.style.background = '#28a745';
        
        // Update stats
        const data = await chrome.storage.local.get(['eventsAdded']);
        const newAdded = (data.eventsAdded || 0) + 1;
        await chrome.storage.local.set({ eventsAdded: newAdded });
        const eventsAddedElement = document.getElementById('eventsAdded');
        eventsAddedElement.textContent = newAdded;
        
        // Update event status in storage
        updateEventStatus(eventData, 'added');
        
      } else {
        throw new Error(response?.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('❌ Failed to add event:', error);
      showError(`Failed to add event: ${error.message}`);
      button.textContent = '❌ Failed';
      button.style.background = '#dc3545';
      
      // Reset button after delay
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = originalBackground;
        button.disabled = false;
      }, 3000);
    }
  }

  // Helper functions
  function sendMessageWithTimeout(message, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);

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

  function formatEventForCalendar(eventData) {
    return {
      title: eventData.title || 'Event',
      date: formatDate(eventData.date),
      startTime: formatTime(eventData.time),
      endTime: addOneHour(formatTime(eventData.time)),
      description: eventData.description || '',
      location: eventData.location || null,
      type: eventData.type || 'general'
    };
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Date TBD') return getTomorrowDate();
    
    // Handle "Friday, 9 May 2025" format
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    // Default to tomorrow
    return getTomorrowDate();
  }

  function formatTime(timeStr) {
    if (!timeStr || timeStr === 'Time TBD') return null;
    
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return null;
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

  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  async function updateEventStatus(eventData, status) {
    const result = await chrome.storage.local.get(['recentEvents']);
    let recentEvents = result.recentEvents || [];
    
    const eventIndex = recentEvents.findIndex(e => 
      e.title === eventData.title && e.date === eventData.date
    );
    
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

    eventsList.innerHTML = events.map((event, index) => `
      <div class="event-item" data-event-index="${index}">
        <div class="event-details">
          <div class="event-title">${event.title}</div>
          <div class="event-datetime">${event.date} ${event.time || ''}</div>
          <div class="event-description" style="font-size: 11px; color: #666; margin-top: 2px;">
            ${event.description ? event.description.substring(0, 60) + '...' : ''}
          </div>
        </div>
        <div class="event-actions">
          <button class="add-event-btn" data-event-index="${index}" 
                  style="padding: 4px 8px; font-size: 11px; background: #1a73e8; color: white; border: none; border-radius: 3px; cursor: pointer;">
            📅 Add
          </button>
        </div>
        <span class="event-status ${event.status || 'detected'}">${event.status || 'detected'}</span>
      </div>
    `).join('');

    // Add event listeners for the add buttons
    eventsList.querySelectorAll('.add-event-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const eventIndex = parseInt(e.target.dataset.eventIndex);
        const event = events[eventIndex];
        if (event) {
          await addEventToCalendar(event, button);
        }
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
    const eventsList = document.getElementById('recentEventsList');
    
    if (recentEvents.length === 0) {
      eventsList.innerHTML = '<div class="no-events">No recent events detected</div>';
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