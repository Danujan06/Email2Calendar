// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanButton');
  const statusElement = document.getElementById('status');
  const eventsFoundElement = document.getElementById('eventsFound');
  const eventsAddedElement = document.getElementById('eventsAdded');

  // Load saved stats
  loadStats();

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
      } else {
        showError('No events found');
      }

    } catch (error) {
      console.error('Scan failed:', error);
      showError('Could not connect to Gmail. Please refresh the page.');
    } finally {
      scanButton.textContent = 'Scan Current Email';
      scanButton.disabled = false;
    }
  });

  function showError(message) {
    statusElement.textContent = message;
    statusElement.style.color = '#d93025';
  }

  function showSuccess(message) {
    statusElement.textContent = message;
    statusElement.style.color = '#137333';
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
    const subject = document.querySelector('h2')?.textContent || 
                   document.querySelector('[data-legacy-thread-id] h3')?.textContent || 
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
  
  const eventKeywords = ['meeting', 'meet', 'appointment', 'call', 'lunch', 'dinner', 'event'];
  const timeKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'am', 'pm'];
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    const hasEvent = eventKeywords.some(keyword => lowerSentence.includes(keyword));
    const hasTime = timeKeywords.some(keyword => lowerSentence.includes(keyword));
    
    if (hasEvent && hasTime) {
      // Extract basic date/time patterns
      const dateMatch = sentence.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i) ||
                       sentence.match(/\b(today|tomorrow)\b/i) ||
                       sentence.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/) ||
                       sentence.match(/\b(\d{1,2}-\d{1,2}-\d{4})\b/);
      
      const timeMatch = sentence.match(/\b(\d{1,2}:\d{2}\s*(am|pm))\b/i) ||
                       sentence.match(/\b(\d{1,2}\s*(am|pm))\b/i);
      
      if (dateMatch || timeMatch) {
        events.push({
          title: subject || 'Meeting',
          date: dateMatch ? dateMatch[1] : 'Date TBD',
          time: timeMatch ? timeMatch[1] : 'Time TBD',
          description: sentence.trim(),
          source: 'basic_extraction'
        });
      }
    }
  });
  
  return events;
}