// ============================================================================
// ENHANCED POPUP CONTROLLER - popup/popup-controller.js
// With Built-in Hybrid Support
// ============================================================================

/**
 * PopupController with enhanced debugging and hybrid extractor support
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
  }

  /**
   * Initialize with enhanced debugging
   */
  async init() {
    console.log('🚀 Initializing Popup Controller with Hybrid AI Support...');
    
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
        this.uiManager.showSuccess('Hybrid AI Extension ready!');
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
      'HybridEventExtractor': typeof HybridEventExtractor !== 'undefined',
      'EmailScanner': typeof EmailScanner !== 'undefined',
      'CalendarIntegrator': typeof CalendarIntegrator !== 'undefined',
      'EventStorageManager': typeof EventStorageManager !== 'undefined'
    };
    
    console.log('🔍 Checking required classes:', requiredClasses);
    
    const missingClasses = Object.entries(requiredClasses)
      .filter(([name, available]) => !available)
      .map(([name]) => name);
    
    if (missingClasses.length > 0) {
      console.warn(`⚠️ Missing classes: ${missingClasses.join(', ')}`);
      // Don't throw error, just warn - we'll handle graceful fallbacks
    } else {
      console.log('✅ All required classes are available');
    }
  }

  /**
   * Load settings with hybrid defaults
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'extractorType',
        'autoAddEvents',
        'autoDetection',
        'confidenceThreshold',
        'debugMode',
        'togetherApiKey',
        'hybridMode'
      ]);
      
      this.currentSettings = {
        extractorType: settings.extractorType || 'hybrid', // Default to hybrid
        autoAddEvents: settings.autoAddEvents === true,
        autoDetection: settings.autoDetection !== false,
        confidenceThreshold: settings.confidenceThreshold || 0.6, // Slightly higher for hybrid
        debugMode: settings.debugMode !== false,
        togetherApiKey: settings.togetherApiKey || '',
        hybridMode: settings.hybridMode || 'compromise_first'
      };
      
      console.log('⚙️ Settings loaded with hybrid support:', this.currentSettings);
      
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      // Fallback settings with hybrid as default
      this.currentSettings = {
        extractorType: 'hybrid',
        autoAddEvents: false,
        autoDetection: true,
        confidenceThreshold: 0.6,
        debugMode: true,
        togetherApiKey: '',
        hybridMode: 'compromise_first'
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
      
      // Initialize extractor with hybrid support
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
   * Create extractor with hybrid option - ENHANCED VERSION
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
          console.log('✅ Creating Hybrid (Compromise.js + Llama 3.1) extractor');
          return new HybridEventExtractor();
        
        case 'basic':
          if (typeof BasicEventExtractor === 'undefined') {
            throw new Error('BasicEventExtractor not available');
          }
          console.log('✅ Creating Basic pattern-matching extractor');
          return new BasicEventExtractor();
        
        case 'enhanced':
          if (typeof EnhancedNLPExtractor === 'undefined') {
            console.warn('EnhancedNLPExtractor not available, falling back to basic');
            return new BasicEventExtractor();
          }
          console.log('✅ Creating Enhanced NLP extractor');
          return new EnhancedNLPExtractor();
        
        default:
          console.warn(`Unknown extractor type: ${extractorType}, using hybrid as default`);
          return this.createExtractor('hybrid'); // Try hybrid first
      }
    } catch (error) {
      console.error('❌ Failed to create extractor:', error);
      console.log('🔄 Falling back to basic extractor');
      return this.createFallbackExtractor();
    }
  }

  /**
   * Enhanced fallback extractor with hybrid priority
   */
  createFallbackExtractor() {
    // Fallback chain: hybrid -> enhanced -> basic
    if (typeof HybridEventExtractor !== 'undefined') {
      console.log('🔄 Fallback: Using Hybrid extractor');
      return new HybridEventExtractor();
    }
    if (typeof EnhancedNLPExtractor !== 'undefined') {
      console.log('🔄 Fallback: Using Enhanced NLP extractor');
      return new EnhancedNLPExtractor();
    }
    if (typeof BasicEventExtractor !== 'undefined') {
      console.log('🔄 Fallback: Using Basic extractor');
      return new BasicEventExtractor();
    }
    throw new Error('No extractors available');
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
    
    // Settings button
    if (this.uiManager && this.uiManager.elements.openSettings) {
      this.uiManager.elements.openSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }

  /**
   * Enhanced email scanning with hybrid AI processing
   */
  async handleScanEmail() {
    console.log('📧 🧠 Starting hybrid AI email scan...');
    
    try {
      // Step 1: Verify we're on Gmail
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📍 Current tab:', tab.url);
      
      if (!tab.url.includes('mail.google.com')) {
        throw new Error('Not on Gmail - please navigate to Gmail first');
      }

      // Step 2: Update UI with hybrid processing indicator
      const isHybrid = this.currentSettings.extractorType === 'hybrid';
      this.uiManager.setScanButtonState(true, isHybrid ? `
        <span class="btn-icon">🧠</span>
        <span class="btn-label">Hybrid AI Processing</span>
      ` : null);

      // Step 3: Enhanced scanner with proper extractor integration
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          console.log('🔍 Enhanced scanner injected into Gmail page');
          
          try {
            // Extract email content using multiple selectors
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
            
            console.log(`📧 Email extracted: ${emailText.length} chars`);
            console.log(`📧 Subject: "${subject}"`);
            
            // Return data for processing with the selected extractor
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

      console.log('📊 Scanner execution results:', results);

      // Step 4: Process with the configured extractor (hybrid/enhanced/basic)
      if (results && results[0] && results[0].result && results[0].result.success) {
        const { emailText, subject, metadata } = results[0].result;
        console.log('📊 Email extracted, processing with extractor...');
        
        // Use the configured extractor (could be hybrid, enhanced, or basic)
        if (this.extractor && typeof this.extractor.extractEvents === 'function') {
          console.log(`🎯 Using ${this.currentSettings.extractorType} extractor`);
          const events = await this.extractor.extractEvents(emailText, subject);
          console.log(`🎯 ${this.currentSettings.extractorType} extractor found ${events.length} events:`, events);
          
          if (events.length > 0) {
            await this.processDetectedEvents(events);
          } else {
            this.uiManager.showInfo('No events detected in this email');
          }
        } else {
          throw new Error('Extractor not available');
        }
      } else {
        const error = results?.[0]?.result?.error || 'Failed to extract email content';
        throw new Error(error);
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
      
      // Show success message with extractor type
      const extractorName = this.currentSettings.extractorType === 'hybrid' ? 'Hybrid AI' : 
                           this.currentSettings.extractorType === 'enhanced' ? 'Enhanced NLP' : 'Basic';
      this.uiManager.showSuccess(`🎯 ${extractorName} detected ${events.length} event${events.length > 1 ? 's' : ''} - Click ➕ to add to calendar`);
      
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
   * Setup debug functions for testing
   */
  setupDebugFunctions() {
    window.popupController = this;
    
    window.debugFunctions = {
      testHybridExtraction: () => this.testHybridExtraction(),
      testSimpleExtraction: () => this.testSimpleExtraction(),
      scanCurrentEmail: () => this.handleScanEmail(),
      checkModules: () => this.checkModules(),
      getApplicationState: () => this.getApplicationState(),
      switchExtractor: (type) => this.switchExtractor(type)
    };
    
    console.log('🔧 Debug functions available:');
    console.log('  - debugFunctions.testHybridExtraction()');
    console.log('  - debugFunctions.testSimpleExtraction()');
    console.log('  - debugFunctions.scanCurrentEmail()');
    console.log('  - debugFunctions.checkModules()');
    console.log('  - debugFunctions.getApplicationState()');
    console.log('  - debugFunctions.switchExtractor("hybrid|enhanced|basic")');
  }

  /**
   * Test hybrid extraction specifically
   */
  async testHybridExtraction() {
    console.log('🧪 Testing hybrid extraction...');
    
    if (typeof HybridEventExtractor === 'undefined') {
      console.error('❌ HybridEventExtractor not available');
      return [];
    }

    const hybridExtractor = new HybridEventExtractor();
    const testEmail = `
      Subject: Team Meeting and Assignment Due
      
      Hi everyone,
      
      Let's have our weekly team meeting tomorrow at 2 PM in the conference room.
      
      Also, don't forget that the CS101 assignment is due on Monday, December 9th at 11:59 PM.
      
      After the meeting, would anyone like to grab coffee?
      
      Best regards,
      John
    `;
    
    try {
      const events = await hybridExtractor.extractEvents(testEmail, 'Team Meeting and Assignment Due');
      console.log('🎯 Hybrid test results:', events);
      return events;
    } catch (error) {
      console.error('❌ Hybrid test failed:', error);
      return [];
    }
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
   * Switch extractor type for testing
   */
  async switchExtractor(type) {
    console.log(`🔄 Switching to ${type} extractor...`);
    
    try {
      this.currentSettings.extractorType = type;
      this.extractor = this.createExtractor(type);
      
      // Save setting
      await chrome.storage.sync.set({ extractorType: type });
      
      console.log(`✅ Switched to ${type} extractor`);
      this.uiManager.showSuccess(`Switched to ${type} extractor`);
    } catch (error) {
      console.error('❌ Failed to switch extractor:', error);
      this.uiManager.showError('Failed to switch extractor');
    }
  }

  /**
   * Check module status
   */
  checkModules() {
    const moduleStatus = {
      uiManager: !!this.uiManager,
      extractor: !!this.extractor,
      extractorType: this.currentSettings.extractorType,
      scanner: !!this.scanner,
      calendarIntegrator: !!this.calendarIntegrator,
      storageManager: !!this.storageManager,
      isInitialized: this.isInitialized,
      hybridAvailable: typeof HybridEventExtractor !== 'undefined',
      enhancedAvailable: typeof EnhancedNLPExtractor !== 'undefined',
      basicAvailable: typeof BasicEventExtractor !== 'undefined'
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
      debugMode: this.debugMode,
      version: '1.0.0-hybrid'
    };
  }
}

// Initialize with the enhanced hybrid controller
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Starting Email2Calendar with Hybrid AI Support...');
  
  try {
    // Use the enhanced PopupController with built-in hybrid support
    const popupController = new PopupController();
    await popupController.init();
    
    console.log('✅ Email2Calendar with Hybrid AI ready!');
    
    // Optional: Run a quick test
    if (typeof HybridEventExtractor !== 'undefined') {
      console.log('🧠 Hybrid AI extractor available and ready');
    }
    
  } catch (error) {
    console.error('💥 Failed to initialize:', error);
  }
});