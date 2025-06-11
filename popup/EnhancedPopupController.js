class EnhancedPopupController extends PopupController {
  constructor() {
    super();
    this.hybridExtractor = null;
  }

  /**
   * Create extractor with hybrid option
   */
  createExtractor(extractorType) {
    console.log(`🔧 Creating ${extractorType} extractor...`);
    
    try {
      switch (extractorType.toLowerCase()) {
        case 'hybrid':
          if (typeof HybridEventExtractor === 'undefined') {
            console.warn('HybridEventExtractor not available, falling back to enhanced');
            return this.createFallbackExtractor();
          }
          return new HybridEventExtractor();
        
        case 'basic':
          if (typeof BasicEventExtractor === 'undefined') {
            throw new Error('BasicEventExtractor not available');
          }
          return new BasicEventExtractor();
        
        case 'enhanced':
          if (typeof EnhancedNLPExtractor === 'undefined') {
            console.warn('EnhancedNLPExtractor not available, falling back to basic');
            return new BasicEventExtractor();
          }
          return new EnhancedNLPExtractor();
        
        default:
          console.warn(`Unknown extractor type: ${extractorType}, using hybrid`);
          return new HybridEventExtractor();
      }
    } catch (error) {
      console.error('❌ Failed to create extractor:', error);
      console.log('🔄 Falling back to basic extractor');
      return this.createFallbackExtractor();
    }
  }

  createFallbackExtractor() {
    if (typeof BasicEventExtractor !== 'undefined') {
      return new BasicEventExtractor();
    }
    throw new Error('No extractors available');
  }

  /**
   * Enhanced email scanning with hybrid extractor
   */
  async handleScanEmail() {
    console.log('📧 🔍 Starting enhanced hybrid email scan...');
    
    try {
      // Check if we're on Gmail
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📍 Current tab:', tab.url);
      
      if (!tab.url.includes('mail.google.com')) {
        throw new Error('Not on Gmail - please navigate to Gmail first');
      }

      // Update UI with hybrid processing indicator
      this.uiManager.setScanButtonState(true, `
        <span class="btn-icon">🧠</span>
        <span class="btn-label">Hybrid AI Processing</span>
      `);

      // Enhanced scanner with hybrid capabilities
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          console.log('🔍 Enhanced hybrid scanner injected into Gmail page');
          
          try {
            // Extract email content (reuse existing logic)
            const selectors = [
              '[role="main"] [dir="ltr"]',
              '.ii.gt div',
              '.a3s.aiL',
              '.ii.gt',
              '[data-message-id] [dir="ltr"]',
              '.a3s'
            ];
            
            let emailText = '';
            let foundSelector = '';
            
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              console.log(`📊 Found ${elements.length} elements with selector: ${selector}`);
              
              for (const element of elements) {
                const text = element.textContent || element.innerText || '';
                if (text.length > 50) {
                  emailText = text;
                  foundSelector = selector;
                  break;
                }
              }
              if (emailText) break;
            }
            
            // Extract subject
            const subjectSelectors = [
              'h2[data-legacy-thread-id]',
              '[role="main"] h2',
              'h2 span[data-hovercard-id]',
              'h2[data-thread-id]',
              '.hP'
            ];
            
            let subject = '';
            for (const selector of subjectSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent) {
                subject = element.textContent.trim();
                break;
              }
            }
            
            if (!emailText) {
              return { 
                success: false, 
                error: 'No email content found'
              };
            }
            
            // Return data for hybrid processing
            return {
              success: true,
              emailText: emailText,
              subject: subject,
              metadata: {
                emailLength: emailText.length,
                foundSelector: foundSelector,
                extractedAt: new Date().toISOString()
              }
            };
            
          } catch (error) {
            console.error('❌ Scanner error:', error);
            return {
              success: false,
              error: error.message
            };
          }
        }
      });

      // Process with hybrid extractor
      if (results && results[0] && results[0].result && results[0].result.success) {
        const { emailText, subject, metadata } = results[0].result;
        console.log('📊 Email extracted, processing with hybrid extractor...');
        
        // Use hybrid extractor
        if (this.extractor && typeof this.extractor.extractEvents === 'function') {
          const events = await this.extractor.extractEvents(emailText, subject);
          console.log(`🎯 Hybrid extractor found ${events.length} events:`, events);
          
          if (events.length > 0) {
            await this.processDetectedEvents(events);
          } else {
            this.uiManager.showInfo('No events detected by hybrid AI analysis');
          }
        } else {
          throw new Error('Hybrid extractor not available');
        }
      } else {
        throw new Error('Failed to extract email content');
      }

    } catch (error) {
      console.error('❌ Hybrid email scan failed:', error);
      this.uiManager.showError(`Hybrid scan failed: ${error.message}`);
    } finally {
      this.uiManager.setScanButtonState(false);
    }
  }
}