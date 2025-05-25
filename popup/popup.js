// popup.js
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

      // Inject content script and scan
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scanCurrentEmail
      });

      if (results && results[0] && results[0].result) {
        const events = results[0].result;
        updateStats(events.length, 0); // Found events, not yet added
        showSuccess(`Found ${events.length} events`);
        
        // Store events for later use
        await chrome.storage.local.set({ lastEvents: events });
        
        // Update recent events list
        await updateRecentEvents(events);
      } else {
        showError('No events found');
      }

    } catch (error) {
      console.error('Scan failed:', error);
      showError('Could not connect to Gmail. Please refresh the page.');
    } finally {
      scanButton.textContent = '📧 Scan Current Email';
      scanButton.disabled = false;
    }
  });

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
    // Remove any existing notification
    const existing = document.querySelector('.popup-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
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
      eventsList.innerHTML = recentEvents.slice(0, 5).map(event => `
        <div class="event-item">
          <div class="event-title">${event.title}</div>
          <div class="event-datetime">${event.date} ${event.time || ''}</div>
          <span class="event-status ${event.status || 'detected'}">${event.status || 'detected'}</span>
        </div>
      `).join('');
    }
  }

  async function updateRecentEvents(newEvents) {
    const result = await chrome.storage.local.get(['recentEvents']);
    let recentEvents = result.recentEvents || [];
    
    // Add new events to the beginning
    newEvents.forEach(event => {
      event.timestamp = new Date().toISOString();
      event.status = 'detected';
    });
    
    recentEvents = [...newEvents, ...recentEvents].slice(0, 10); // Keep last 10
    await chrome.storage.local.set({ recentEvents });
    
    // Reload the display
    loadRecentEvents();
  }

  // Add other button event listeners
  document.getElementById('toggleAutoDetection').addEventListener('click', async () => {
    const result = await chrome.storage.sync.get(['autoDetection']);
    const currentState = result.autoDetection !== false; // Default true
    const newState = !currentState;
    await chrome.storage.sync.set({ autoDetection: newState });
    showSuccess(`Auto-detection ${newState ? 'enabled' : 'disabled'}`);
  });

  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('viewHelp').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/email2calendar#readme' });
  });

  document.getElementById('reportIssue').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/email2calendar/issues' });
  });
});

// This function runs in the Gmail tab context
function scanCurrentEmail() {
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