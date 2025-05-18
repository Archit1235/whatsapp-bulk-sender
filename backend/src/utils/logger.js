/**
 * Logging system for WhatsApp bulk sender
 * Tracks successful and failed messages and enables resumption
 */
const fs = require('fs');
const path = require('path');

// Constants
const LOG_DIR = path.join(process.cwd(), 'data', 'logs');
const CURRENT_LOG_FILE = path.join(LOG_DIR, 'current-status.json');
const FAILED_NUMBERS_FILE = path.join(LOG_DIR, 'failed-numbers.json');
const SESSION_STATS_DIR = path.join(LOG_DIR, 'sessions');

// Ensure log directories exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

if (!fs.existsSync(SESSION_STATS_DIR)) {
  fs.mkdirSync(SESSION_STATS_DIR, { recursive: true });
}

/**
 * Logger class for tracking message sending status
 */
class MessageLogger {
  constructor() {
    this.status = this.loadStatus();
  }

  /**
   * Load the current status from file
   */
  loadStatus() {
    try {
      if (fs.existsSync(CURRENT_LOG_FILE)) {
        const data = fs.readFileSync(CURRENT_LOG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading status:', error.message);
    }

    // Default status object
    return {
      lastUpdated: new Date().toISOString(),
      startTime: new Date().toISOString(),
      totalNumbers: 0,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      inProgress: false,
      lastProcessedIndex: -1,
      processedNumbers: {},
      currentSessionCount: 0,
      sessionStartTime: null,
      dailySendCount: 0,
      lastSendDay: null,
    };
  }

  /**
   * Save the current status to file
   */
  saveStatus(additionalData = {}) {
    try {
      const updatedStatus = {
        ...this.status,
        ...additionalData,
        lastUpdated: new Date().toISOString(),
      };

      this.status = updatedStatus;
      fs.writeFileSync(CURRENT_LOG_FILE, JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error('Error saving status:', error.message);
    }
  }

  /**
   * Initialize a new sending session
   */
  initSession(phoneNumbers) {
    // Check if we need to reset the daily count (new day)
    const today = new Date().toISOString().split('T')[0];
    const dailySendCount =
      today === this.status.lastSendDay ? this.status.dailySendCount : 0;

    this.status = {
      lastUpdated: new Date().toISOString(),
      startTime: new Date().toISOString(),
      totalNumbers: phoneNumbers.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      inProgress: true,
      lastProcessedIndex: -1,
      processedNumbers: {},
      currentSessionCount: 0,
      sessionStartTime: new Date().toISOString(),
      dailySendCount: dailySendCount,
      lastSendDay: today,
    };
    this.saveStatus();
    return this.status;
  }

  /**
   * Log a successful message send
   */
  logSuccess(index, phoneNumber) {
    // Update daily counter
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.status.lastSendDay) {
      this.status.dailySendCount = 1;
      this.status.lastSendDay = today;
    } else {
      this.status.dailySendCount += 1;
    }

    this.status.processedCount++;
    this.status.successCount++;
    this.status.lastProcessedIndex = index;
    this.status.processedNumbers[phoneNumber] = {
      status: 'success',
      timestamp: new Date().toISOString(),
    };
    this.saveStatus();
  }

  /**
   * Log a failed message send
   */
  logFailure(index, phoneNumber, error) {
    this.status.processedCount++;
    this.status.failedCount++;
    this.status.lastProcessedIndex = index;
    this.status.processedNumbers[phoneNumber] = {
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: error || 'Unknown error',
    };

    // Also add to the failed numbers file for easy retry
    this.addFailedNumber(phoneNumber, error);
    this.saveStatus();
  }

  /**
   * Update the last processed index
   */
  updateLastProcessedIndex(index) {
    this.status.lastProcessedIndex = index;
    this.saveStatus();
  }

  /**
   * Record session statistics
   */
  recordSessionStats(sessionData) {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const sessionFilename = path.join(
        SESSION_STATS_DIR,
        `session-${timestamp}.json`
      );

      fs.writeFileSync(sessionFilename, JSON.stringify(sessionData, null, 2));
      console.log(`Session stats recorded to ${sessionFilename}`);
    } catch (error) {
      console.error('Error recording session stats:', error.message);
    }
  }

  /**
   * Get daily send statistics
   */
  getDailyStats() {
    const today = new Date().toISOString().split('T')[0];

    return {
      date: today,
      count: today === this.status.lastSendDay ? this.status.dailySendCount : 0,
      lastSendDay: this.status.lastSendDay,
    };
  }

  /**
   * Add a failed number to the failed numbers file
   */
  addFailedNumber(phoneNumber, error) {
    try {
      let failedNumbers = [];

      if (fs.existsSync(FAILED_NUMBERS_FILE)) {
        const data = fs.readFileSync(FAILED_NUMBERS_FILE, 'utf8');
        failedNumbers = JSON.parse(data);
      }

      // Check if number already exists in list
      const existingIndex = failedNumbers.findIndex(
        (item) => item.phoneNumber === phoneNumber
      );

      if (existingIndex >= 0) {
        // Update existing entry
        failedNumbers[existingIndex] = {
          phoneNumber,
          error: error || 'Unknown error',
          timestamp: new Date().toISOString(),
          attempts: (failedNumbers[existingIndex].attempts || 0) + 1,
        };
      } else {
        // Add new entry
        failedNumbers.push({
          phoneNumber,
          error: error || 'Unknown error',
          timestamp: new Date().toISOString(),
          attempts: 1,
        });
      }

      fs.writeFileSync(
        FAILED_NUMBERS_FILE,
        JSON.stringify(failedNumbers, null, 2)
      );
    } catch (error) {
      console.error('Error saving failed number:', error.message);
    }
  }

  /**
   * Check if a number has already been processed
   */
  isProcessed(phoneNumber) {
    return !!this.status.processedNumbers[phoneNumber];
  }

  /**
   * Get the index to resume from
   */
  getResumeIndex() {
    return this.status.lastProcessedIndex;
  }

  /**
   * Mark the session as complete
   */
  completeSession() {
    this.status.inProgress = false;

    // Record session statistics for analysis
    this.recordSessionStats({
      endTime: new Date().toISOString(),
      startTime: this.status.startTime,
      totalProcessed: this.status.processedCount,
      successes: this.status.successCount,
      failures: this.status.failedCount,
      successRate:
        this.status.processedCount > 0
          ? (this.status.successCount / this.status.processedCount) * 100
          : 0,
    });

    this.saveStatus();
  }

  /**
   * Get all failed numbers
   */
  getFailedNumbers() {
    try {
      if (fs.existsSync(FAILED_NUMBERS_FILE)) {
        const data = fs.readFileSync(FAILED_NUMBERS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading failed numbers:', error.message);
    }
    return [];
  }

  /**
   * Get current sending status
   */
  getStatus() {
    return this.status;
  }
}

module.exports = new MessageLogger();
