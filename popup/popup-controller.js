// ============================================================================
// DEBUG-ENHANCED POPUP CONTROLLER - popup/popup-controller.js
// ============================================================================

/**
 * PopupController with enhanced debugging for troubleshooting
 */
class PopupController {
  constructor() {
    this.extractor = null;
    this.scanner = null;
    this.calendarIntegrator = null;
    this.storageManager = null;
    this.uiManager = null;
    
    this.isInitialized = false;
    this.currentSettings = {};
    this.debugMode = true; // Enable debug mode by default
    
    // Bind methods
    this.handleScanEmail = this.handleScanEmail.bind(this);
    this.handleAddEvent = this.handleAddEvent.bind(this);
    this.handleDeleteEvent = this.handleDeleteEvent.bind(this);
    // Removed handleEditEvent binding since edit functionality is not needed
  }

  /**
   * Initialize with enhanced debugging
   */
  async init() {
    console.log('🚀 Initializing Popup Controller with debug mode...');
    
    try {
      // Check if all required classes are available
      this.checkRequiredClasses();
      
      // Load settings
      await this.loadSettings();
      
      // Initialize modules
      await this.initializeModules();
      
      // Load initial data
      await this.loadInitialData();
      
      // Bind event handlers
      this.bindEventHandlers();
      
      // Setup debug functions
      this.setupDebugFunctions();
      
      this.isInitialized = true;
      console.log('✅ Popup Controller initialized successfully');
      
      if (this.uiManager) {
        this.uiManager.showSuccess('Extension ready!');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Popup Controller:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Check if all required classes are available
   */
  checkRequiredClasses() {
    const requiredClasses = {
      'UIManager': typeof UIManager !== 'undefined',
      'BasicEventExtractor': typeof BasicEventExtractor !== 'undefined',
      'EnhancedNLPExtractor': typeof EnhancedNLPExtractor !== 'undefined',
      'EmailScanner': typeof EmailScanner !== 'undefined',
      'CalendarIntegrator': typeof CalendarIntegrator !== 'undefined',
      'EventStorageManager': typeof EventStorageManager !== 'undefined'
    };
    
    console.log('🔍 Checking required classes:', requiredClasses);
    
    const missingClasses = Object.entries(requiredClasses)
      .filter(([name, available]) => !available)
      .map(([name]) => name);
    
    if (missingClasses.length > 0) {
      throw new Error(`Missing required classes: ${missingClasses.join(', ')}`);
    }
    
    console.log('✅ All required classes are available');
  }

  /**
   * Load settings with defaults
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'extractorType',
        'autoAddEvents',
        'autoDetection',
        'confidenceThreshold',
        'debugMode'
      ]);
      
      this.currentSettings = {
        extractorType: settings.extractorType || 'enhanced', // Use basic as default for debugging
        autoAddEvents: settings.autoAddEvents === true,
        autoDetection: settings.autoDetection !== false,
        confidenceThreshold: settings.confidenceThreshold || 0.5, // Lower threshold for debugging
        debugMode: settings.debugMode !== false // Enable debug mode by default
      };
      
      console.log('⚙️ Settings loaded:', this.currentSettings);
      
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      this.currentSettings = {
        extractorType: 'basic',
        autoAddEvents: false,
        autoDetection: true,
        confidenceThreshold: 0.5,
        debugMode: true
      };
    }
  }

  /**
   * Initialize modules with error checking
   */
  async initializeModules() {
    console.log('🔧 Initializing modules...');
    
    try {
      // Initialize UI Manager first
      this.uiManager = new UIManager();
      console.log('✅ UIManager initialized');
      
      // Initialize extractor
      this.extractor = this.createExtractor(this.currentSettings.extractorType);
      console.log(`✅ ${this.currentSettings.extractorType} extractor initialized`);
      
      // Initialize scanner with extractor
      this.scanner = new EmailScanner(this.extractor);
      console.log('✅ EmailScanner initialized');
      
      // Initialize calendar integrator
      this.calendarIntegrator = new CalendarIntegrator();
      console.log('✅ CalendarIntegrator initialized');
      
      // Initialize storage manager
      this.storageManager = new EventStorageManager();
      console.log('✅ EventStorageManager initialized');
      
    } catch (error) {
      console.error('❌ Module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create extractor with fallback
   */
  createExtractor(extractorType) {
    console.log(`🔧 Creating ${extractorType} extractor...`);
    
    try {
      switch (extractorType.toLowerCase()) {
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
          console.warn(`Unknown extractor type: ${extractorType}, using basic`);
          return new BasicEventExtractor();
      }
    } catch (error) {
      console.error('❌ Failed to create extractor:', error);
      console.log('🔄 Falling back to basic extractor');
      return new BasicEventExtractor();
    }
  }

  /**
   * Load initial data with error handling
   */
  async loadInitialData() {
    try {
      if (this.storageManager) {
        const stats = await this.storageManager.getStats();
        this.uiManager.updateStats(stats);
        
        const recentEvents = await this.storageManager.getRecentEvents();
        this.uiManager.displayEvents(
          recentEvents.slice(0, 5),
          this.handleAddEvent,
          this.handleDeleteEvent
        );
      }
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
    }
  }

  /**
   * Bind event handlers
   */
  bindEventHandlers() {
    console.log('🔗 Binding event handlers...');
    
    if (this.uiManager && this.uiManager.elements.scanButton) {
      this.uiManager.elements.scanButton.addEventListener('click', this.handleScanEmail);
      console.log('✅ Scan button handler bound');
    } else {
      console.error('❌ Scan button not found');
    }
    
    // Other handlers...
    if (this.uiManager && this.uiManager.elements.openSettings) {
      this.uiManager.elements.openSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }

  /**
   * Enhanced email scanning with detailed debugging
   */
  async handleScanEmail() {
    console.log('📧 🔍 Starting enhanced email scan with debugging...');
    
    try {
      // Step 1: Verify we're on Gmail
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📍 Current tab:', tab.url);
      
      if (!tab.url.includes('mail.google.com')) {
        throw new Error('Not on Gmail - please navigate to Gmail first');
      }

      // Step 2: Update UI
      this.uiManager.setScanButtonState(true);

      // Step 3: Create a simple, reliable scanner function
      console.log('🔧 Creating scanner function...');

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Simple scanner that logs everything
          console.log('🔍 Scanner injected into Gmail page');
          
          try {
            // Try multiple selectors for email content
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
              console.log(`🔍 Trying selector: ${selector}`);
              const elements = document.querySelectorAll(selector);
              console.log(`📊 Found ${elements.length} elements with selector: ${selector}`);
              
              for (const element of elements) {
                const text = element.textContent || element.innerText || '';
                console.log(`📝 Element text length: ${text.length}`);
                
                if (text.length > 50) { // Minimum meaningful content
                  emailText = text;
                  foundSelector = selector;
                  break;
                }
              }
              
              if (emailText) break;
            }
            
            console.log(`📧 Email text extracted: ${emailText.length} characters`);
            console.log(`🎯 Using selector: ${foundSelector}`);
            console.log(`📖 Preview: ${emailText.substring(0, 200)}...`);
            
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
                console.log(`📧 Subject found with ${selector}: ${subject}`);
                break;
              }
            }
            
            if (!emailText) {
              console.error('❌ No email content found');
              return { 
                success: false, 
                error: 'No email content found',
                debug: {
                  selectorsChecked: selectors.length,
                  elementsFound: selectors.map(sel => document.querySelectorAll(sel).length)
                }
              };
            }
            
            // Simple pattern-based event detection
            console.log('🔍 Starting simple event detection...');
            
            const events = [];
            const eventKeywords = ['meeting', 'lunch', 'dinner', 'call', 'appointment', 'conference'];
            const timeKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'am', 'pm', ':'];
            
            const sentences = emailText.split(/[.!?]+/).filter(s => s.length > 10);
            console.log(`📝 Processing ${sentences.length} sentences`);
            
            sentences.forEach((sentence, index) => {
              const lowerSentence = sentence.toLowerCase();
              console.log(`📝 Sentence ${index + 1}: ${sentence.substring(0, 100)}...`);
              
              const hasEventKeyword = eventKeywords.some(keyword => {
                const found = lowerSentence.includes(keyword);
                if (found) console.log(`🎯 Found event keyword: ${keyword}`);
                return found;
              });
              
              const hasTimeKeyword = timeKeywords.some(keyword => {
                const found = lowerSentence.includes(keyword);
                if (found) console.log(`⏰ Found time keyword: ${keyword}`);
                return found;
              });
              
              if (hasEventKeyword || hasTimeKeyword) {
                console.log(`✅ Potential event detected in sentence ${index + 1}`);
                
                // Extract basic details
                const timeMatch = sentence.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
                const dateMatch = sentence.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
                
                const event = {
                  id: Date.now() + Math.random(),
                  title: subject || `Event from email`,
                  date: dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0],
                  time: timeMatch ? timeMatch[0] : null,
                  description: sentence.trim(),
                  confidence: hasEventKeyword && hasTimeKeyword ? 0.8 : 0.5,
                  source: 'simple_scanner'
                };
                
                console.log(`📅 Created event:`, event);
                events.push(event);
              }
            });
            
            console.log(`🎯 Final result: ${events.length} events detected`);
            
            return {
              success: true,
              events: events,
              debug: {
                emailLength: emailText.length,
                subject: subject,
                sentenceCount: sentences.length,
                foundSelector: foundSelector
              }
            };
            
          } catch (error) {
            console.error('❌ Scanner error:', error);
            return {
              success: false,
              error: error.message,
              debug: {
                errorStack: error.stack
              }
            };
          }
        }
      });

      console.log('📊 Scanner execution results:', results);

      // Step 4: Process results
      if (results && results[0] && results[0].result) {
        const result = results[0].result;
        console.log('📊 Scanner result:', result);
        
        if (result.success && result.events && result.events.length > 0) {
          console.log(`✅ Found ${result.events.length} events:`, result.events);
          await this.processDetectedEvents(result.events);
        } else if (result.success && (!result.events || result.events.length === 0)) {
          console.log('ℹ️ No events detected in email');
          this.uiManager.showInfo('No events detected in this email');
        } else {
          console.error('❌ Scanner failed:', result.error);
          this.uiManager.showError(`Scanner failed: ${result.error}`);
        }
      } else {
        console.error('❌ No results from scanner');
        this.uiManager.showError('Scanner returned no results');
      }

    } catch (error) {
      console.error('❌ Email scan failed:', error);
      this.uiManager.showError(`Scan failed: ${error.message}`);
    } finally {
      this.uiManager.setScanButtonState(false);
    }
  }

  /**
   * Process detected events
   */
  async processDetectedEvents(events) {
    try {
      console.log(`🎯 Processing ${events.length} detected events...`);
      
      // Update stats
      if (this.storageManager) {
        const stats = await this.storageManager.updateStats(events.length, 0);
        this.uiManager.updateStats(stats);
      }
      
      // Store events
      await chrome.storage.local.set({ lastEvents: events });
      
      if (this.storageManager) {
        const filteredEvents = await this.storageManager.addRecentEvents(events);
        
        // Update UI
        this.uiManager.displayEvents(
          filteredEvents,
          this.handleAddEvent,
          this.handleDeleteEvent
        );
      }
      
      // Show success message
      this.uiManager.showSuccess(`🎯 Detected ${events.length} event${events.length > 1 ? 's' : ''} - Click ➕ to add to calendar`);
      
    } catch (error) {
      console.error('❌ Failed to process events:', error);
      this.uiManager.showError('Failed to process events');
    }
  }

  /**
   * Handle adding event
   */
  async handleAddEvent(event) {
    console.log('➕ Adding event:', event.title);
    
    try {
      if (this.calendarIntegrator) {
        const result = await this.calendarIntegrator.addEventToCalendar(event);
        
        if (this.storageManager) {
          const stats = await this.storageManager.updateStats(0, 1);
          this.uiManager.updateStats(stats);
        }
        
        event.status = 'added';
        console.log('✅ Event added successfully');
        return result;
      } else {
        throw new Error('Calendar integrator not available');
      }
    } catch (error) {
      console.error('❌ Failed to add event:', error);
      event.status = 'failed';
      throw error;
    }
  }

  /**
   * Handle deleting event
   */
  async handleDeleteEvent(eventId, eventElement) {
    console.log('🗑️ Deleting event:', eventId);
    
    try {
      if (this.storageManager) {
        const result = await this.storageManager.deleteEvent(eventId);
        
        if (eventElement && this.uiManager) {
          await this.uiManager.animateEventRemoval(eventElement);
        }
        
        this.uiManager.showSuccess('Event deleted');
        return result;
      } else {
        throw new Error('Storage manager not available');
      }
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      this.uiManager.showError('Failed to delete event');
    }
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    console.error('💥 Initialization failed:', error);
    
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h3 style="color: #d93025;">⚠️ Extension Error</h3>
        <p>Failed to initialize Email2Calendar</p>
        <p style="font-size: 12px; color: #666; margin: 10px 0;">${error.message}</p>
        <button onclick="location.reload()" style="padding: 8px 16px; margin: 5px;">Retry</button>
        <button onclick="chrome.runtime.openOptionsPage()" style="padding: 8px 16px; margin: 5px;">Settings</button>
      </div>
    `;
  }

  /**
   * Setup debug functions
   */
  setupDebugFunctions() {
    window.popupController = this;
    
    window.debugFunctions = {
      testSimpleExtraction: () => this.testSimpleExtraction(),
      scanCurrentEmail: () => this.handleScanEmail(),
      checkModules: () => this.checkModules(),
      getApplicationState: () => this.getApplicationState()
    };
    
    console.log('🔧 Debug functions available:');
    console.log('  - debugFunctions.testSimpleExtraction()');
    console.log('  - debugFunctions.scanCurrentEmail()');
    console.log('  - debugFunctions.checkModules()');
    console.log('  - debugFunctions.getApplicationState()');
  }

  /**
   * Test simple extraction
   */
  async testSimpleExtraction() {
    const testEmail = "Let's have lunch tomorrow at 1 PM at the downtown cafe.";
    console.log('🧪 Testing simple extraction with:', testEmail);
    
    if (this.extractor && typeof this.extractor.extractEvents === 'function') {
      try {
        const events = await this.extractor.extractEvents(testEmail, 'Lunch Meeting');
        console.log('🎯 Test results:', events);
        return events;
      } catch (error) {
        console.error('❌ Test failed:', error);
        return [];
      }
    } else {
      console.error('❌ Extractor not available or missing extractEvents method');
      return [];
    }
  }

  /**
   * Check module status
   */
  checkModules() {
    const moduleStatus = {
      uiManager: !!this.uiManager,
      extractor: !!this.extractor,
      scanner: !!this.scanner,
      calendarIntegrator: !!this.calendarIntegrator,
      storageManager: !!this.storageManager,
      isInitialized: this.isInitialized
    };
    
    console.log('📊 Module Status:', moduleStatus);
    return moduleStatus;
  }

  /**
   * Get application state
   */
  getApplicationState() {
    return {
      isInitialized: this.isInitialized,
      currentSettings: this.currentSettings,
      modules: this.checkModules(),
      debugMode: this.debugMode
    };
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Starting Email2Calendar with debug mode...');
  
  try {
    const popupController = new PopupController();
    await popupController.init();
    console.log('✅ Email2Calendar ready!');
  } catch (error) {
    console.error('💥 Failed to initialize:', error);
  }
});