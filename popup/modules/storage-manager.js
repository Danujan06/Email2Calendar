class EventStorageManager {
  constructor() {
    this.storageKeys = {
      recentEvents: 'recentEvents',
      deletedEvents: 'deletedEvents',
      eventsFound: 'eventsFound',
      eventsAdded: 'eventsAdded'
    };
  }

  async addRecentEvents(newEvents) {
    const result = await chrome.storage.local.get([this.storageKeys.recentEvents, this.storageKeys.deletedEvents]);
    let recentEvents = result.recentEvents || [];
    const deletedEvents = result.deletedEvents || [];
    
    // Create a Set of deleted event keys for fast lookup
    const deletedEventKeys = new Set(deletedEvents.map(deleted => deleted.key));
    
    // Filter out events that have been previously deleted
    const filteredNewEvents = newEvents.filter(event => {
      const eventKey = this.generateEventKey(event);
      const isDeleted = deletedEventKeys.has(eventKey);
      
      if (isDeleted) {
        console.log(`🚫 Skipping previously deleted event: ${event.title}`);
      }
      
      return !isDeleted;
    });
    
    // Add timestamps and status to new events
    filteredNewEvents.forEach(event => {
      event.timestamp = new Date().toISOString();
      event.status = event.status || 'detected';
    });
    
    // Merge with existing events, avoiding duplicates
    const existingEventKeys = new Set(recentEvents.map(event => this.generateEventKey(event)));
    
    const uniqueNewEvents = filteredNewEvents.filter(event => {
      const eventKey = this.generateEventKey(event);
      return !existingEventKeys.has(eventKey);
    });
    
    recentEvents = [...uniqueNewEvents, ...recentEvents].slice(0, 10);
    await chrome.storage.local.set({ [this.storageKeys.recentEvents]: recentEvents });
    
    console.log(`📝 Stored ${filteredNewEvents.length} events (${newEvents.length - filteredNewEvents.length} previously deleted)`);
    return filteredNewEvents;
  }

  async deleteEvent(eventId) {
    const result = await chrome.storage.local.get([this.storageKeys.recentEvents, this.storageKeys.deletedEvents]);
    let recentEvents = result.recentEvents || [];
    let deletedEvents = result.deletedEvents || [];
    
    // Find the event being deleted
    const deletedEvent = recentEvents.find(event => event.id === eventId);
    
    // Remove from recent events
    recentEvents = recentEvents.filter(event => event.id !== eventId);
    
    // Add to deleted events list to prevent showing again
    if (deletedEvent) {
      const deletedEventKey = this.generateEventKey(deletedEvent);
      deletedEvents.push({
        id: eventId,
        key: deletedEventKey,
        deletedAt: new Date().toISOString(),
        originalEvent: deletedEvent
      });
      
      // Keep only last 50 deleted events to prevent storage bloat
      if (deletedEvents.length > 50) {
        deletedEvents = deletedEvents.slice(-50);
      }
      
      console.log(`🗑️ Event marked as deleted: ${deletedEventKey}`);
    }
    
    // Save updated storage
    await chrome.storage.local.set({ 
      [this.storageKeys.recentEvents]: recentEvents,
      [this.storageKeys.deletedEvents]: deletedEvents
    });
    
    return { success: true, remainingEvents: recentEvents };
  }

  async getRecentEvents() {
    const result = await chrome.storage.local.get([this.storageKeys.recentEvents, this.storageKeys.deletedEvents]);
    const recentEvents = result.recentEvents || [];
    const deletedEvents = result.deletedEvents || [];
    
    // Create a Set of deleted event keys for fast lookup
    const deletedEventKeys = new Set(deletedEvents.map(deleted => deleted.key));
    
    // Filter out any events that have been deleted
    const activeEvents = recentEvents.filter(event => {
      const eventKey = this.generateEventKey(event);
      const isDeleted = deletedEventKeys.has(eventKey);
      
      if (isDeleted) {
        console.log(`🚫 Filtering out deleted event: ${event.title}`);
      }
      
      return !isDeleted;
    });
    
    // Update storage with filtered events if needed
    if (activeEvents.length !== recentEvents.length) {
      await chrome.storage.local.set({ [this.storageKeys.recentEvents]: activeEvents });
      console.log(`🧹 Cleaned up ${recentEvents.length - activeEvents.length} deleted events from storage`);
    }
    
    return activeEvents;
  }

  async updateStats(foundCount = 0, addedCount = 0) {
    const data = await chrome.storage.local.get([this.storageKeys.eventsFound, this.storageKeys.eventsAdded]);
    const newFound = (data.eventsFound || 0) + foundCount;
    const newAdded = (data.eventsAdded || 0) + addedCount;
    
    await chrome.storage.local.set({
      [this.storageKeys.eventsFound]: newFound,
      [this.storageKeys.eventsAdded]: newAdded
    });
    
    return { eventsFound: newFound, eventsAdded: newAdded };
  }

  async getStats() {
    const data = await chrome.storage.local.get([this.storageKeys.eventsFound, this.storageKeys.eventsAdded]);
    return {
      eventsFound: data.eventsFound || 0,
      eventsAdded: data.eventsAdded || 0
    };
  }

  async clearDeletedEventsHistory() {
    await chrome.storage.local.set({ [this.storageKeys.deletedEvents]: [] });
    console.log('🗑️ Deleted events history cleared');
  }

  generateEventKey(event) {
    return `${event.title}-${event.date}-${event.time}`.toLowerCase();
  }
}
