/**
 * Bulk message sender with resumption capabilities
 */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const WhatsAppClient = require('./utils/whatsapp-client');
const logger = require('./utils/logger');

// Default configuration
const DEFAULT_CONFIG = {
  csvPath: './data/phone_numbers.csv',
  attachmentPath: null,
  originalFilename: null,
  message: 'Hello! Please find the attached document.',
  delay: 10000,
  countryCode: '91',
  dailyLimit: 800,
  batchSize: 100,
  maxSessionSize: 400,
  sessionBreakTime: 30 * 60 * 1000, // 30 minutes
  randomizeDelay: true,
  delayVariance: 500,
};

class BulkSender {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.phoneNumbers = [];
    this.whatsapp = new WhatsAppClient();
    this.isSending = false;
    this.isPaused = false;
    this.isResuming = false;
    this.qrGenerated = false;
    this.sessionStartTime = null;
    this.currentSessionCount = 0;
    this.sessionPaused = false;

    // Listen for QR code generation
    this.whatsapp.onQrGenerated = () => {
      this.qrGenerated = true;
    };
  }

  /**
   * Load phone numbers from CSV
   */
  async loadPhoneNumbers() {
    console.log('Loading phone numbers from CSV:', this.config.csvPath);

    return new Promise((resolve, reject) => {
      const numbers = [];

      if (!this.config.csvPath) {
        return reject(new Error('CSV path is not configured'));
      }

      if (!fs.existsSync(this.config.csvPath)) {
        return reject(new Error(`CSV file not found: ${this.config.csvPath}`));
      }

      try {
        fs.createReadStream(this.config.csvPath)
          .on('error', (error) => {
            console.error('Error creating read stream:', error);
            reject(error);
          })
          .pipe(csv())
          .on('data', (row) => {
            // Extract phone number from CSV row
            const phoneNumber =
              row.phone ||
              row.phoneNumber ||
              row.number ||
              Object.values(row)[0];
            if (phoneNumber) {
              numbers.push(phoneNumber.toString().trim());
            }
          })
          .on('end', () => {
            console.log(`Loaded ${numbers.length} phone numbers from CSV`);

            if (numbers.length === 0) {
              console.warn(
                'Warning: No phone numbers found in CSV file. Check CSV format.'
              );
            } else {
              console.log('First 5 numbers:', numbers.slice(0, 5));
            }

            this.phoneNumbers = numbers;
            resolve(numbers);
          })
          .on('error', (error) => {
            console.error('Error parsing CSV file:', error);
            reject(error);
          });
      } catch (error) {
        console.error('Unexpected error reading CSV:', error);
        reject(error);
      }
    });
  }

  /**
   * Wait for a specified time
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate adaptive delay based on sending patterns
   */
  getAdaptiveDelay() {
    const status = logger.getStatus();
    const baseDelay = this.config.delay;

    // Apply adaptive delay logic based on failure rate
    if (status.processedCount > 0) {
      const failureRate = status.failedCount / status.processedCount;

      if (failureRate > 0.5) {
        return baseDelay * 3; // High failure rate (>50%)
      } else if (failureRate > 0.2) {
        return baseDelay * 2; // Moderate failure rate (>20%)
      }
    }

    // Add random variance if configured
    if (this.config.randomizeDelay) {
      return baseDelay + Math.floor(Math.random() * this.config.delayVariance);
    }

    return baseDelay;
  }

  /**
   * Process phone numbers and send messages
   */
  async processPhoneNumbers(resume = false) {
    try {
      console.log('Process phone numbers called with resume =', resume);

      // Ensure WhatsApp client is ready
      if (!this.whatsapp.isClientReady()) {
        console.log('WhatsApp client not ready. Initializing...');
        try {
          await this.whatsapp.initialize();
        } catch (error) {
          throw new Error(`WhatsApp initialization failed: ${error.message}`);
        }
      }

      // Load phone numbers if needed
      if (this.phoneNumbers.length === 0) {
        try {
          await this.loadPhoneNumbers();
        } catch (error) {
          throw new Error(`Failed to load phone numbers: ${error.message}`);
        }
      }

      if (this.phoneNumbers.length === 0) {
        throw new Error('No phone numbers to process');
      }

      // Initialize or get current status
      let status;
      if (resume && logger.getStatus().inProgress) {
        status = logger.getStatus();
        this.isResuming = true;
        console.log(`Resuming from position ${status.lastProcessedIndex + 1}`);

        // Restore session data if resuming
        if (status.currentSessionCount !== undefined) {
          this.currentSessionCount = status.currentSessionCount;
        }

        if (status.sessionStartTime) {
          this.sessionStartTime = new Date(status.sessionStartTime);
        } else {
          this.sessionStartTime = new Date();
        }
      } else {
        status = logger.initSession(this.phoneNumbers);
        this.sessionStartTime = new Date();
        this.currentSessionCount = 0;
      }

      // Start sending process
      this.isSending = true;
      const startIndex = resume ? status.lastProcessedIndex + 1 : 0;

      for (let i = startIndex; i < this.phoneNumbers.length; i++) {
        // Check if sending was stopped
        if (!this.isSending) {
          console.log('Sending stopped');
          break;
        }

        // Handle pause state
        while (this.isPaused) {
          await this.delay(1000);
        }

        // Check if we need to take a session break
        if (this.currentSessionCount >= this.config.maxSessionSize) {
          this.sessionPaused = true;

          // Save the current state for resumption
          logger.saveStatus({
            currentSessionCount: this.currentSessionCount,
            sessionStartTime: this.sessionStartTime.toISOString(),
          });

          // Calculate break duration
          const currentTime = new Date();
          const sessionDuration = currentTime - this.sessionStartTime;
          const breakTimeNeeded = Math.max(
            this.config.sessionBreakTime - sessionDuration,
            10000
          );

          console.log(
            `Taking a break for ${
              breakTimeNeeded / 60000
            } minutes before resuming...`
          );

          // Update index and take break
          logger.updateLastProcessedIndex(i - 1);
          await this.delay(breakTimeNeeded);

          // Reset session counters
          this.sessionStartTime = new Date();
          this.currentSessionCount = 0;
          this.sessionPaused = false;
          console.log('Break completed, resuming sending...');
        }

        const phoneNumber = this.phoneNumbers[i];

        // Skip if already processed
        if (logger.isProcessed(phoneNumber)) {
          continue;
        }

        try {
          console.log(
            `Sending to ${phoneNumber} (${i + 1}/${this.phoneNumbers.length})`
          );

          // Check if number exists on WhatsApp
          const exists = await this.whatsapp.numberExists(phoneNumber);

          if (!exists) {
            console.log(`Number ${phoneNumber} is not registered on WhatsApp`);
            logger.logFailure(i, phoneNumber, 'Not registered on WhatsApp');
            continue;
          }

          // Send message
          await this.whatsapp.sendMessage(
            phoneNumber,
            this.config.message,
            this.config.attachmentPath,
            this.config.originalFilename
          );

          // Log success and increment session counter
          logger.logSuccess(i, phoneNumber);
          this.currentSessionCount++;
          console.log(`Message sent successfully to ${phoneNumber}`);

          // Apply delay before next message
          const adaptiveDelay = this.getAdaptiveDelay();
          console.log(`Waiting ${adaptiveDelay}ms before next message...`);
          await this.delay(adaptiveDelay);
        } catch (error) {
          console.error(
            `Failed to send message to ${phoneNumber}:`,
            error.message
          );
          logger.logFailure(i, phoneNumber, error.message);

          // Apply longer delay after error
          await this.delay(this.config.delay * 2);
        }
      }

      // Mark session as complete
      logger.completeSession();
      this.isSending = false;
      this.isResuming = false;
      this.sessionPaused = false;

      // Log final statistics
      const finalStatus = logger.getStatus();
      console.log('\nSending completed!');
      console.log(`Total numbers: ${finalStatus.totalNumbers}`);
      console.log(`Successfully sent: ${finalStatus.successCount}`);
      console.log(`Failed: ${finalStatus.failedCount}`);
      console.log(
        `Success rate: ${(
          (finalStatus.successCount / finalStatus.processedCount) *
          100
        ).toFixed(2)}%`
      );

      return finalStatus;
    } catch (error) {
      console.error('Error processing phone numbers:', error);
      this.isSending = false;
      throw error;
    }
  }

  // Control methods
  stop() {
    console.log('Stopping sending process...');
    this.isSending = false;
  }

  pause() {
    console.log('Pausing sending process...');
    this.isPaused = true;
  }

  resumeAfterPause() {
    console.log('Resuming sending process...');
    this.isPaused = false;
  }

  getFailedNumbers() {
    return logger.getFailedNumbers();
  }

  getStatus() {
    return {
      ...logger.getStatus(),
      isSending: this.isSending,
      isPaused: this.isPaused,
      isResuming: this.isResuming,
      sessionPaused: this.sessionPaused,
      currentSessionCount: this.currentSessionCount,
      sessionStartTime: this.sessionStartTime
        ? this.sessionStartTime.toISOString()
        : null,
    };
  }

  async close() {
    this.isSending = false;
    this.isPaused = false;
    if (this.whatsapp) {
      await this.whatsapp.close();
    }
  }

  isWhatsAppReady() {
    return this.whatsapp && this.whatsapp.isClientReady();
  }

  hasQrBeenGenerated() {
    return this.qrGenerated;
  }

  async initializeWhatsApp() {
    try {
      this.qrGenerated = false;
      await this.whatsapp.initialize();
      return { success: true };
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = BulkSender;
