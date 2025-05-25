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
  const sentences = text.split(/[.!?]+/);
  
  const eventKeywords = ['meeting', 'meet', 'appointment', 'call', 'lunch', 'dinner', 'event', 'conference', 'workshop', 'webinar'];
  const timeKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'am', 'pm', 'o\'clock', ':'];
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    const hasEvent = eventKeywords.some(keyword => lowerSentence.includes(keyword));
    const hasTime = timeKeywords.some(keyword => lowerSentence.includes(keyword));
    
    if (hasEvent && hasTime) {
      // Extract basic date/time patterns
      const dateMatch = sentence.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i) ||
                       sentence.match(/\b(today|tomorrow)\b/i) ||
                       sentence.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/) ||
                       sentence.match(/\b(\d{1,2}-\d{1,2}-\d{4})\b/) ||
                       sentence.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i);
      
      const timeMatch = sentence.match(/\b(\d{1,2}:\d{2}\s*(am|pm))\b/i) ||
                       sentence.match(/\b(\d{1,2}\s*(am|pm))\b/i) ||
                       sentence.match(/\b(\d{1,2}:\d{2})\b/);
      
      if (dateMatch || timeMatch) {
        // Try to extract a better title
        let title = subject || 'Meeting';
        const meetingTypeMatch = sentence.match(/\b(meeting|call|appointment|lunch|dinner|conference|workshop)\b/i);
        if (meetingTypeMatch) {
          const withMatch = sentence.match(/(?:with|about|regarding|for)\s+([^,\.\!]+)/i);
          if (withMatch) {
            title = `${meetingTypeMatch[0]} ${withMatch[0]}`;
          } else {
            title = meetingTypeMatch[0].charAt(0).toUpperCase() + meetingTypeMatch[0].slice(1);
          }
        }

        events.push({
          title: title.trim(),
          date: dateMatch ? dateMatch[0] : 'Date TBD',
          time: timeMatch ? timeMatch[0] : 'Time TBD',
          description: sentence.trim(),
          source: 'basic_extraction'
        });
      }
    }
  });
  
  // Remove duplicates
  const uniqueEvents = events.filter((event, index, self) =>
    index === self.findIndex(e => e.title === event.title && e.date === event.date && e.time === event.time)
  );
  
  return uniqueEvents;
}