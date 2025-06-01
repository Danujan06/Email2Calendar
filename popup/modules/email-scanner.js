// ============================================================================
// EMAIL SCANNER MODULE - popup/modules/email-scanner.js
// ============================================================================

/**
 * EmailScanner handles Gmail email content extraction
 * Responsibilities:
 * - Gmail DOM navigation
 * - Email content extraction
 * - Subject line extraction
 * - Email structure parsing
 */
class EmailScanner {
  constructor(extractor) {
    this.extractor = extractor;
    this.selectors = {
      email: [
        '[role="main"] [dir="ltr"]',
        '.ii.gt div',
        '.a3s.aiL',
        '.ii.gt',
        '[data-message-id] [dir="ltr"]',
        '.a3s',
        '.ii.gt .a3s'
      ],
      subject: [
        'h2[data-legacy-thread-id]',
        '[role="main"] h2',
        'h2 span[data-hovercard-id]',
        'h2[data-thread-id]',
        '.hP'
      ]
    };
  }

  /**
   * Scan current email in Gmail
   */
  async scanCurrentEmail() {
    console.log('📧 Starting email scan...');
    
    try {
      // Extract email content
      const emailText = this.extractEmailContent();
      if (!emailText) {
        throw new Error('No email content found');
      }
      
      // Extract subject
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
   * Extract email content from Gmail DOM
   */
  extractEmailContent() {
    console.log('🔍 Extracting email content...');
    
    for (const selector of this.selectors.email) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText || '';
        if (text.length > 10) {
          console.log(`✅ Found content with selector: ${selector}`);
          return this.cleanEmailText(text);
        }
      }
    }
    
    console.error('❌ No email content found with any selector');
    return null;
  }

  /**
   * Extract subject line from Gmail DOM
   */
  extractSubject() {
    console.log('🔍 Extracting subject...');
    
    for (const selector of this.selectors.subject) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const subject = element.textContent.trim();
        if (subject.length > 0) {
          console.log(`✅ Found subject with selector: ${selector}`);
          return this.cleanSubject(subject);
        }
      }
    }
    
    console.log('⚠️ No subject found, using default');
    return 'No Subject';
  }

  /**
   * Clean and normalize email text
   */
  cleanEmailText(text) {
    return text
      .replace(/\s+/g, ' ')                    // Normalize whitespace
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width chars
      .replace(/\r\n/g, '\n')                 // Normalize line endings
      .replace(/--\s*Original Message\s*--[\s\S]*$/i, '') // Remove forwarded content
      .replace(/On .+ wrote:[\s\S]*$/i, '')   // Remove reply content
      .trim();
  }

  /**
   * Clean and normalize subject line
   */
  cleanSubject(subject) {
    return subject
      .replace(/^(re:|fwd:|fw:)\s*/i, '')     // Remove reply/forward prefixes
      .replace(/\[.*?\]/g, '')               // Remove brackets
      .replace(/\s+/g, ' ')                  // Normalize whitespace
      .trim();
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
      timestamp: new Date().toISOString()
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
   * Extract sender information
   */
  extractSenderInfo() {
    const senderSelectors = [
      '.go .gD',
      '.h2 .gD',
      '.gD[email]',
      '.yW span[email]'
    ];
    
    for (const selector of senderSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return {
          name: element.getAttribute('name') || element.textContent?.trim(),
          email: element.getAttribute('email'),
          element: element
        };
      }
    }
    
    return null;
  }

  /**
   * Get email statistics for debugging
   */
  getEmailStats() {
    const content = this.extractEmailContent();
    const subject = this.extractSubject();
    
    return {
      contentLength: content?.length || 0,
      subjectLength: subject?.length || 0,
      wordCount: content ? content.split(/\s+/).length : 0,
      lineCount: content ? content.split('\n').length : 0,
      hasContent: !!content,
      hasSubject: !!subject && subject !== 'No Subject'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailScanner;
}