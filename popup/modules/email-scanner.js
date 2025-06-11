// ============================================================================
// EMAIL SCANNER MODULE - popup/modules/email-scanner.js (ENHANCED VERSION)
// ============================================================================

/**
 * EmailScanner handles Gmail email content extraction
 * Responsibilities:
 * - Gmail DOM navigation
 * - Email content extraction with enhanced selectors
 * - Subject line extraction with fallback generation
 * - Email structure parsing with proper cleaning
 */
class EmailScanner {
  constructor(extractor) {
    this.extractor = extractor;
    this.selectors = {
      // Enhanced email selectors based on testing - ordered by effectiveness
      email: [
        '.h7',                              // Best selector (270+ chars)
        '.ii.gt',                          // Good fallback (101 chars)
        '.a3s.aiL',                        // Alternative (101 chars)
        '.adn.ads .ii',                    // Gmail ads layout
        '.adn .ii',                        // Alternative layout
        '[role="main"] [dir="ltr"]',       // Original selector
        '.ii.gt div',
        '.a3s',
        '[data-message-id] [dir="ltr"]',
        '.ii.gt .a3s',
        '[role="listitem"] [dir="ltr"]',
        'div[data-message-id] div[dir="ltr"]',
        '[data-message-id]'                // Fallback with more content
      ],
      subject: [
        'h2[data-legacy-thread-id]',
        '[role="main"] h2',
        'h2 span[data-hovercard-id]',
        'h2[data-thread-id]',
        '.hP',
        'h2.hP',
        '.ha h2',
        '.ha .hP'
      ],
      sender: [
        '.go .gD',
        '.h2 .gD', 
        '.gD[email]',
        '.yW span[email]',
        '.gE .gD'
      ]
    };
  }

  /**
   * Scan current email in Gmail
   */
  async scanCurrentEmail() {
    console.log('📧 Starting enhanced email scan...');
    
    try {
      // Extract email content with enhanced method
      const emailText = this.extractEmailContent();
      if (!emailText) {
        throw new Error('No email content found');
      }
      
      // Extract subject with fallback generation
      const subject = this.extractSubject();
      
      console.log('📝 Email extracted:', {
        textLength: emailText.length,
        subject: subject,
        preview: emailText.substring(0, 100) + '...'
      });
      
      // Use the extractor to find events
      const events = await this.extractor.extractEvents(emailText, subject);
      
      console.log(`🎯 Scanner found ${events.length} events`);
      return events;
      
    } catch (error) {
      console.error('❌ Email scanning failed:', error);
      throw error;
    }
  }

  /**
   * Extract email content from Gmail DOM - ENHANCED VERSION
   */
  extractEmailContent() {
    console.log('🔍 Extracting email content with enhanced selectors...');
    
    let bestText = '';
    let foundSelector = '';
    
    for (const selector of this.selectors.email) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Trying selector "${selector}": ${elements.length} elements`);
        
        for (const element of elements) {
          const text = element.textContent || element.innerText || '';
          
          // Prefer longer content, but ensure it contains meaningful text
          if (text.length > bestText.length && text.length > 20) {
            // Quick check for meaningful content
            if (this.containsMeaningfulContent(text)) {
              bestText = text;
              foundSelector = selector;
              console.log(`✅ Better match found: ${text.length} chars with ${selector}`);
            }
          }
        }
        
        // If we found substantial content, stop searching
        if (bestText.length > 200) break;
        
      } catch (error) {
        console.warn(`⚠️ Error with selector ${selector}:`, error.message);
      }
    }
    
    if (!bestText) {
      console.error('❌ No email content found with any selector');
      return null;
    }
    
    console.log(`✅ Found content with selector: ${foundSelector} (${bestText.length} chars)`);
    return this.cleanEmailText(bestText);
  }

  /**
   * Check if text contains meaningful email content
   */
  containsMeaningfulContent(text) {
    const meaningfulIndicators = [
      // Common email content patterns
      /hello|hi|dear|greetings/i,
      /meet|meeting|appointment|call/i,
      /tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /thanks|regards|best|sincerely/i,
      /am|pm|time|date/i,
      /[a-zA-Z]{3,}/  // At least some words with 3+ characters
    ];
    
    return meaningfulIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Extract subject line from Gmail DOM - ENHANCED VERSION
   */
  extractSubject() {
    console.log('🔍 Extracting subject with enhanced method...');
    
    // Try standard subject extraction first
    for (const selector of this.selectors.subject) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const subject = element.textContent.trim();
        if (subject.length > 0 && !subject.includes('(no subject)')) {
          console.log(`✅ Found subject with selector: ${selector}`);
          return this.cleanSubject(subject);
        }
      }
    }
    
    // Fallback: Generate subject from sender
    console.log('🔍 No subject found, generating from sender...');
    const senderInfo = this.extractSenderInfo();
    
    if (senderInfo && senderInfo.name && senderInfo.name !== 'me') {
      const generatedSubject = `Message from ${senderInfo.name}`;
      console.log(`✅ Generated subject: ${generatedSubject}`);
      return generatedSubject;
    }
    
    // Ultimate fallback
    console.log('⚠️ Using default subject');
    return 'No Subject';
  }

  /**
   * Enhanced email text cleaning
   */
  cleanEmailText(text) {
    return text
      // Remove Gmail UI elements that we found in testing
      .replace(/Reply Reply all Forward/g, '')
      .replace(/Add reaction/g, '')
      .replace(/Ok, I will be there\.|Sure!|Thanks, I will be there\./g, '')
      
      // Remove timestamp patterns
      .replace(/\w+\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s+(AM|PM)\s+\(\d+\s+days?\s+ago\)/gi, '')
      
      // Remove email headers and "to me" patterns
      .replace(/to me,\s+\w+/g, '')
      .replace(/from:\s*[\w\s<>@.-]+/gi, '')
      .replace(/sent:\s*[\w\s,:-]+/gi, '')
      
      // Remove duplicate Reply/Forward buttons
      .replace(/Reply\s*Reply all\s*Forward/g, '')
      
      // Standard cleaning
      .replace(/\s+/g, ' ')                    // Normalize whitespace
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width chars
      .replace(/\r\n/g, '\n')                 // Normalize line endings
      .replace(/--\s*Original Message\s*--[\s\S]*$/i, '') // Remove forwarded content
      .replace(/On .+ wrote:[\s\S]*$/i, '')   // Remove reply content
      
      // Remove trailing UI elements
      .replace(/\s*(Reply|Forward|Add reaction)\s*$/i, '')
      
      .trim();
  }

  /**
   * Clean and normalize subject line
   */
  cleanSubject(subject) {
    return subject
      .replace(/^(re:|fwd:|fw:)\s*/i, '')     // Remove reply/forward prefixes
      .replace(/\[.*?\]/g, '')               // Remove brackets
      .replace(/\(no subject\)/i, '')        // Remove "(no subject)" text
      .replace(/\s+/g, ' ')                  // Normalize whitespace
      .trim();
  }

  /**
   * Extract sender information - ENHANCED VERSION
   */
  extractSenderInfo() {
    for (const selector of this.selectors.sender) {
      const element = document.querySelector(selector);
      if (element) {
        const name = element.getAttribute('name') || element.textContent?.trim();
        const email = element.getAttribute('email');
        
        if (name && name.length > 0 && name !== 'me') {
          console.log(`✅ Found sender: ${name} (${email || 'no email'})`);
          return {
            name: name,
            email: email,
            element: element
          };
        }
      }
    }
    
    console.log('⚠️ No sender information found');
    return null;
  }

  /**
   * Check if currently on Gmail
   */
  isOnGmail() {
    return window.location.hostname === 'mail.google.com';
  }

  /**
   * Get current email metadata
   */
  getEmailMetadata() {
    const metadata = {
      url: window.location.href,
      isCompose: window.location.href.includes('compose'),
      isThread: !!document.querySelector('[data-thread-id]'),
      hasAttachments: !!document.querySelector('.aZo'),
      timestamp: new Date().toISOString(),
      senderInfo: this.extractSenderInfo()
    };
    
    console.log('📊 Email metadata:', metadata);
    return metadata;
  }

  /**
   * Extract email thread information
   */
  extractThreadInfo() {
    const threadElement = document.querySelector('[data-thread-id]');
    const messageElements = document.querySelectorAll('[data-message-id]');
    
    return {
      threadId: threadElement?.getAttribute('data-thread-id'),
      messageCount: messageElements.length,
      isThread: messageElements.length > 1
    };
  }

  /**
   * Get email statistics for debugging - ENHANCED VERSION
   */
  getEmailStats() {
    const content = this.extractEmailContent();
    const subject = this.extractSubject();
    const senderInfo = this.extractSenderInfo();
    
    return {
      contentLength: content?.length || 0,
      subjectLength: subject?.length || 0,
      wordCount: content ? content.split(/\s+/).length : 0,
      lineCount: content ? content.split('\n').length : 0,
      hasContent: !!content,
      hasSubject: !!subject && subject !== 'No Subject',
      hasSender: !!senderInfo,
      senderName: senderInfo?.name || null,
      extractionMethod: content ? 'enhanced' : 'failed'
    };
  }

  /**
   * Debug method to test all selectors
   */
  debugAllSelectors() {
    console.log('🔧 DEBUG: Testing all email selectors...');
    
    this.selectors.email.forEach((selector, index) => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`${index + 1}. "${selector}": ${elements.length} elements`);
        
        elements.forEach((element, elemIndex) => {
          const text = element.textContent || element.innerText || '';
          console.log(`   Element ${elemIndex + 1}: ${text.length} chars - "${text.substring(0, 50)}..."`);
        });
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailScanner;
}