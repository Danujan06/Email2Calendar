// popup.js
// Enhanced popup.js with direct event addition capability
document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanCurrentEmail');
  const statusElement = document.getElementById('extensionStatus');
  const eventsFoundElement = document.getElementById('eventsFound');
  const eventsAddedElement = document.getElementById('eventsAdded');
  let lastDetectedEvents = [];

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

      // Inject content script and scan
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scanCurrentEmail
      });

      if (results && results[0] && results[0].result) {
        const events = results[0].result;
        lastDetectedEvents = events; // Store for adding to calendar
        
        updateStats(events.length, 0);
        showSuccess(`Found ${events.length} events`);
        
        // Store events for later use
        await chrome.storage.local.set({ lastEvents: events });
        
        // Update recent events list with add buttons
        await updateRecentEventsWithActions(events);
      } else {
        showError('No events found');
        lastDetectedEvents = [];
      }

    } catch (error) {
      console.error('Scan failed:', error);
      showError('Could not connect to Gmail. Please refresh the page.');
    } finally {
      scanButton.textContent = '📧 Scan Current Email';
      scanButton.disabled = false;
    }
  });

  // Add function to add events directly from popup
  async function addEventToCalendar(eventData, button) {
    try {
      button.textContent = 'Adding...';
      button.disabled = true;

      // Format event data for calendar API
      const formattedEvent = formatEventForCalendar(eventData);
      
      // Send to background script
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'addToCalendar',
          event: formattedEvent
        }, resolve);
      });

      if (response && response.success) {
        showSuccess('Event added to calendar!');
        button.textContent = '✅ Added';
        button.style.background = '#28a745';
        
        // Update stats
        const data = await chrome.storage.local.get(['eventsAdded']);
        const newAdded = (data.eventsAdded || 0) + 1;
        await chrome.storage.local.set({ eventsAdded: newAdded });
        eventsAddedElement.textContent = newAdded;
        
        // Update event status in storage
        updateEventStatus(eventData, 'added');
        
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Failed to add event:', error);
      showError('Failed to add event: ' + error.message);
      button.textContent = '❌ Failed';
      button.style.background = '#dc3545';
    }
  }

  function formatEventForCalendar(eventData) {
    // Convert detected event format to calendar API format
    return {
      title: eventData.title || 'Event',
      date: formatDate(eventData.date),
      startTime: formatTime(eventData.time),
      endTime: addOneHour(formatTime(eventData.time)),
      description: eventData.description || '',
      location: eventData.location || null
    };
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Date TBD') return getTomorrowDate();
    
    // Handle various date formats
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    
    // Handle relative dates
    if (dateStr.toLowerCase().includes('today')) {
      return new Date().toISOString().split('T')[0];
    }
    
    if (dateStr.toLowerCase().includes('tomorrow')) {
      return getTomorrowDate();
    }
    
    // Try to parse as-is
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
    
    // Handle various time formats
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
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
    
    // Find and update the event
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
    
    // Add new events to the beginning
    newEvents.forEach(event => {
      event.timestamp = new Date().toISOString();
      event.status = 'detected';
    });
    
    recentEvents = [...newEvents, ...recentEvents].slice(0, 10);
    await chrome.storage.local.set({ recentEvents });
    
    // Display with action buttons
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

  // Rest of the existing functions...
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

  // Existing button handlers...
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

// The scanCurrentEmail function remains the same as in your existing code...

// This function runs in the Gmail tab context
function scanCurrentEmail() {
  // Define extractEventsBasic inside scanCurrentEmail so it's available in the injected context
  function extractEventsBasic(text, subject) {
    const events = [];
    
    // Split text into lines for better parsing
    const lines = text.split(/[\n\r]+/);
    const fullText = text.toLowerCase();
    
    // Extended event keywords including academic terms
    const eventKeywords = [
      'meeting', 'meet', 'appointment', 'call', 'lunch', 'dinner', 'event', 
      'conference', 'workshop', 'webinar', 'due', 'deadline', 'assignment', 
      'exam', 'test', 'quiz', 'submission', 'submit', 'presentation', 'demo',
      'interview', 'class', 'lecture', 'seminar', 'tutorial', 'lab'
    ];
    
    // Date patterns
    const datePatterns = [
      // Day names
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?\b/i,
      // Month day, year
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?\b/i,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s*(\d{4})?\b/i,
      // Numeric dates
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
      // Relative dates
      /\b(today|tomorrow|yesterday)\b/i,
      /\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      // Due dates
      /\bdue:?\s*(.+?)(?:\.|,|$)/i,
      /\bdeadline:?\s*(.+?)(?:\.|,|$)/i
    ];
    
    // Time patterns
    const timePatterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/,
      /\b(\d{1,2})\s*(am|pm|AM|PM)\b/,
      /\b(\d{1,2}):(\d{2})\b/,
      /\b(noon|midnight)\b/i
    ];

    // Process each line
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      // Check if this line or nearby lines contain event keywords
      const hasEventKeyword = eventKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasEventKeyword || lowerLine.includes('due') || lowerLine.includes('deadline')) {
        let eventDate = null;
        let eventTime = null;
        let eventTitle = null;
        
        // Look for dates in current line and next few lines
        const searchText = lines.slice(index, index + 3).join(' ');
        
        // Try each date pattern
        for (const pattern of datePatterns) {
          const match = searchText.match(pattern);
          if (match) {
            eventDate = match[0];
            break;
          }
        }
        
        // Try each time pattern
        for (const pattern of timePatterns) {
          const match = searchText.match(pattern);
          if (match) {
            eventTime = match[0];
            break;
          }
        }
        
        // Extract title based on context
        if (line.includes('assignment') || line.includes('Assignment')) {
          // For assignments, extract the course/assignment name
          const assignmentMatch = line.match(/\*\*(.+?)\*\*/) || 
                                 line.match(/\b([A-Z]{2,4}\d{3}[A-Za-z0-9\s\-:]+)/);
          if (assignmentMatch) {
            eventTitle = assignmentMatch[1].trim();
          }
        } else if (line.includes('due') || line.includes('deadline')) {
          // For due dates, extract what's due
          const dueMatch = line.match(/(.+?)\s+(?:is\s+)?due/i) ||
                          line.match(/due:?\s*(.+)/i);
          if (dueMatch) {
            eventTitle = dueMatch[1].trim();
          }
        } else {
          // For other events, use subject or extract from line
          eventTitle = subject || line.substring(0, 50).trim();
        }
        
        // If we found a date, create an event
        if (eventDate || eventTime) {
          events.push({
            title: eventTitle || subject || 'Event',
            date: eventDate || 'Date TBD',
            time: eventTime || 'Time TBD',
            description: line.trim(),
            source: 'basic_extraction',
            type: hasEventKeyword ? 'event' : 'deadline'
          });
        }
      }
    });
    
    // Also check for specific patterns in the full text
    // Pattern for "assignments are due on [date]"
    const dueDateMatch = fullText.match(/(?:assignments?|tasks?|homework|projects?)\s+(?:are\s+)?due\s+on\s+([^.]+)/i);
    if (dueDateMatch) {
      const dueDateText = dueDateMatch[1];
      let eventDate = null;
      let eventTime = null;
      
      // Extract date from the due date text
      for (const pattern of datePatterns) {
        const match = dueDateText.match(pattern);
        if (match) {
          eventDate = match[0];
          break;
        }
      }
      
      // Extract time
      for (const pattern of timePatterns) {
        const match = dueDateText.match(pattern);
        if (match) {
          eventTime = match[0];
          break;
        }
      }
      
      if (eventDate) {
        // Look for specific assignment details
        const assignmentMatches = text.match(/\*\s*\*\*(.+?)\*\*/g) || [];
        
        if (assignmentMatches.length > 0) {
          assignmentMatches.forEach(match => {
            const title = match.replace(/\*\s*\*\*(.+?)\*\*/, '$1').trim();
            events.push({
              title: title,
              date: eventDate,
              time: eventTime || 'Time TBD',
              description: `Assignment due: ${title}`,
              source: 'basic_extraction',
              type: 'deadline'
            });
          });
        } else {
          events.push({
            title: 'Assignment Due',
            date: eventDate,
            time: eventTime || 'Time TBD',
            description: dueDateMatch[0],
            source: 'basic_extraction',
            type: 'deadline'
          });
        }
      }
    }
    
    // Remove duplicates
    const uniqueEvents = events.filter((event, index, self) =>
      index === self.findIndex(e => 
        e.title === event.title && 
        e.date === event.date && 
        e.time === event.time
      )
    );
    
    return uniqueEvents;
  }

  try {
    // Find the currently open email
    const emailBody = document.querySelector('[role="main"] [dir="ltr"]') || 
                     document.querySelector('.ii.gt div') ||
                     document.querySelector('[data-message-id] [dir="ltr"]');
    
    if (!emailBody) {
      throw new Error('No email content found');
    }

    const emailText = emailBody.textContent || emailBody.innerText;
    const subject = document.querySelector('h2[data-legacy-thread-id]')?.textContent || 
                   document.querySelector('[role="main"] h2')?.textContent || 
                   document.querySelector('h2 span[data-hovercard-id]')?.textContent ||
                   'No Subject';

    // Basic event extraction (simplified)
    const events = extractEventsBasic(emailText, subject);
    return events;

  } catch (error) {
    console.error('Email scan error:', error);
    return [];
  }
}

// Basic event extraction without AI
function extractEventsBasic(text, subject) {
  const events = [];
  
  // Split text into lines for better parsing
  const lines = text.split(/[\n\r]+/);
  const fullText = text.toLowerCase();
  
  // Extended event keywords including academic terms
  const eventKeywords = [
    'meeting', 'meet', 'appointment', 'call', 'lunch', 'dinner', 'event', 
    'conference', 'workshop', 'webinar', 'due', 'deadline', 'assignment', 
    'exam', 'test', 'quiz', 'submission', 'submit', 'presentation', 'demo',
    'interview', 'class', 'lecture', 'seminar', 'tutorial', 'lab'
  ];
  
  // Date patterns
  const datePatterns = [
    // Day names
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?\b/i,
    // Month day, year
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?\b/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s*(\d{4})?\b/i,
    // Numeric dates
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
    // Relative dates
    /\b(today|tomorrow|yesterday)\b/i,
    /\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    // Due dates
    /\bdue:?\s*(.+?)(?:\.|,|$)/i,
    /\bdeadline:?\s*(.+?)(?:\.|,|$)/i
  ];
  
  // Time patterns
  const timePatterns = [
    /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/,
    /\b(\d{1,2})\s*(am|pm|AM|PM)\b/,
    /\b(\d{1,2}):(\d{2})\b/,
    /\b(noon|midnight)\b/i
  ];

  // Process each line
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    
    // Check if this line or nearby lines contain event keywords
    const hasEventKeyword = eventKeywords.some(keyword => lowerLine.includes(keyword));
    
    if (hasEventKeyword || lowerLine.includes('due') || lowerLine.includes('deadline')) {
      let eventDate = null;
      let eventTime = null;
      let eventTitle = null;
      
      // Look for dates in current line and next few lines
      const searchText = lines.slice(index, index + 3).join(' ');
      
      // Try each date pattern
      for (const pattern of datePatterns) {
        const match = searchText.match(pattern);
        if (match) {
          eventDate = match[0];
          break;
        }
      }
      
      // Try each time pattern
      for (const pattern of timePatterns) {
        const match = searchText.match(pattern);
        if (match) {
          eventTime = match[0];
          break;
        }
      }
      
      // Extract title based on context
      if (line.includes('assignment') || line.includes('Assignment')) {
        // For assignments, extract the course/assignment name
        const assignmentMatch = line.match(/\*\*(.+?)\*\*/) || 
                               line.match(/\b([A-Z]{2,4}\d{3}[A-Za-z0-9\s\-:]+)/);
        if (assignmentMatch) {
          eventTitle = assignmentMatch[1].trim();
        }
      } else if (line.includes('due') || line.includes('deadline')) {
        // For due dates, extract what's due
        const dueMatch = line.match(/(.+?)\s+(?:is\s+)?due/i) ||
                        line.match(/due:?\s*(.+)/i);
        if (dueMatch) {
          eventTitle = dueMatch[1].trim();
        }
      } else {
        // For other events, use subject or extract from line
        eventTitle = subject || line.substring(0, 50).trim();
      }
      
      // If we found a date, create an event
      if (eventDate || eventTime) {
        events.push({
          title: eventTitle || subject || 'Event',
          date: eventDate || 'Date TBD',
          time: eventTime || 'Time TBD',
          description: line.trim(),
          source: 'basic_extraction',
          type: hasEventKeyword ? 'event' : 'deadline'
        });
      }
    }
  });
  
  // Also check for specific patterns in the full text
  // Pattern for "assignments are due on [date]"
  const dueDateMatch = fullText.match(/(?:assignments?|tasks?|homework|projects?)\s+(?:are\s+)?due\s+on\s+([^.]+)/i);
  if (dueDateMatch) {
    const dueDateText = dueDateMatch[1];
    let eventDate = null;
    let eventTime = null;
    
    // Extract date from the due date text
    for (const pattern of datePatterns) {
      const match = dueDateText.match(pattern);
      if (match) {
        eventDate = match[0];
        break;
      }
    }
    
    // Extract time
    for (const pattern of timePatterns) {
      const match = dueDateText.match(pattern);
      if (match) {
        eventTime = match[0];
        break;
      }
    }
    
    if (eventDate) {
      // Look for specific assignment details
      const assignmentMatches = text.match(/\*\s*\*\*(.+?)\*\*/g) || [];
      
      if (assignmentMatches.length > 0) {
        assignmentMatches.forEach(match => {
          const title = match.replace(/\*\s*\*\*(.+?)\*\*/, '$1').trim();
          events.push({
            title: title,
            date: eventDate,
            time: eventTime || 'Time TBD',
            description: `Assignment due: ${title}`,
            source: 'basic_extraction',
            type: 'deadline'
          });
        });
      } else {
        events.push({
          title: 'Assignment Due',
          date: eventDate,
          time: eventTime || 'Time TBD',
          description: dueDateMatch[0],
          source: 'basic_extraction',
          type: 'deadline'
        });
      }
    }
  }
  
  // Remove duplicates
  const uniqueEvents = events.filter((event, index, self) =>
    index === self.findIndex(e => 
      e.title === event.title && 
      e.date === event.date && 
      e.time === event.time
    )
  );
  
  return uniqueEvents;
}

// Add this debug function to your popup.js for testing
async function debugCalendarIntegration() {
  console.log('🔍 Starting Calendar Integration Debug...');
  
  try {
    // Step 1: Test Extension Permissions
    console.log('📋 Checking permissions...');
    const permissions = await chrome.permissions.getAll();
    console.log('Available permissions:', permissions);
    
    // Step 2: Test OAuth Authentication
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
    
    // Step 3: Test Calendar API Access
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
    
    // Step 4: Test Event Creation
    console.log('📝 Testing event creation...');
    const testEvent = {
      summary: 'Test Event from Extension',
      description: 'This is a test event created by Email2Calendar extension',
      start: {
        dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
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
}

// Add this to test message passing
async function testMessagePassing() {
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
}

// Add debug buttons to popup
function addDebugButtons() {
  const debugSection = document.createElement('div');
  debugSection.innerHTML = `
    <div style="margin-top: 16px; padding: 16px; background: #fff3cd; border-radius: 8px;">
      <h4>Debug Tools</h4>
      <button id="debugAuth" style="margin: 4px; padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Auth</button>
      <button id="debugCalendar" style="margin: 4px; padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Calendar</button>
      <button id="debugMessage" style="margin: 4px; padding: 8px 12px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">Test Messages</button>
    </div>
  `;
  
  document.querySelector('.popup-content').appendChild(debugSection);
  
  document.getElementById('debugAuth').onclick = async () => {
    console.clear();
    console.log('🔍 Testing Authentication Only...');
    try {
      const result = await chrome.identity.getAuthToken({ interactive: true });
      console.log('Auth result:', result);
      alert('Check console for auth results');
    } catch (error) {
      console.error('Auth error:', error);
      alert('Auth failed: ' + error.message);
    }
  };
  
  document.getElementById('debugCalendar').onclick = async () => {
    console.clear();
    const success = await debugCalendarIntegration();
    alert(success ? 'Calendar test passed! Check console.' : 'Calendar test failed. Check console.');
  };
  
  document.getElementById('debugMessage').onclick = async () => {
    console.clear();
    const result = await testMessagePassing();
    alert(result ? 'Message test passed!' : 'Message test failed. Check console.');
  };
}

// Call this when popup loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addDebugButtons);
} else {
  addDebugButtons();
}