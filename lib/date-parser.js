class DateParser {
  constructor() {
    this.dateRegexes = [
      /(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
      /(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
      /(today|tomorrow|yesterday)/i,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i
    ];

    this.timeRegexes = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(\d{1,2}):(\d{2})/,
      /(noon|midnight)/i
    ];
  }

  parseDateTime(text) {
    const date = this.parseDate(text);
    const time = this.parseTime(text);
    
    if (!date) return null;

    return {
      date: date,
      startTime: time.start,
      endTime: time.end,
      display: this.formatDisplayDateTime(date, time)
    };
  }

  parseDate(text) {
    const today = new Date();
    
    // Check for relative dates
    if (/today/i.test(text)) {
      return this.formatDate(today);
    }
    
    if (/tomorrow/i.test(text)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return this.formatDate(tomorrow);
    }

    // Check for day names
    const dayMatch = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const targetDay = this.getDayNumber(dayMatch[1]);
      const nextDate = this.getNextWeekday(targetDay);
      return this.formatDate(nextDate);
    }

    // Check for explicit dates
    for (const regex of this.dateRegexes) {
      const match = text.match(regex);
      if (match) {
        const date = this.parseExplicitDate(match);
        if (date) return this.formatDate(date);
      }
    }

    return null;
  }

  parseTime(text) {
    const times = [];
    
    for (const regex of this.timeRegexes) {
      const matches = text.matchAll(new RegExp(regex, 'gi'));
      for (const match of matches) {
        const time = this.parseTimeMatch(match);
        if (time) times.push(time);
      }
    }

    if (times.length === 0) {
      return { start: null, end: null };
    }

    if (times.length === 1) {
      return { start: times[0], end: null };
    }

    // If multiple times, assume first is start, second is end
    times.sort();
    return { start: times[0], end: times[1] };
  }

  parseTimeMatch(match) {
    if (match[0].toLowerCase() === 'noon') return '12:00';
    if (match[0].toLowerCase() === 'midnight') return '00:00';

    let hours = parseInt(match[1]);
    let minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3] ? match[3].toLowerCase() : null;

    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getDayNumber(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days.indexOf(dayName.toLowerCase());
  }

  getNextWeekday(targetDay) {
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Next week
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }

  parseExplicitDate(match) {
    // Handle different date formats
    if (match[0].includes('/')) {
      const parts = match[1].split('/');
      return new Date(parts[2], parts[0] - 1, parts[1]);
    }
    
    // Handle month name formats
    if (match[1] && match[2] && match[3]) {
      const month = this.getMonthNumber(match[1]);
      return new Date(match[3], month, match[2]);
    }

    return null;
  }

  getMonthNumber(monthName) {
    const months = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };
    return months[monthName.toLowerCase()] || 0;
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  formatDisplayDateTime(date, time) {
    const dateStr = new Date(date).toLocaleDateString();
    if (time.start) {
      return `${dateStr} at ${time.start}${time.end ? ` - ${time.end}` : ''}`;
    }
    return dateStr;
  }
}