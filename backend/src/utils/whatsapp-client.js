/**
 * WhatsApp client utility for connecting to WhatsApp Web and sending messages
 */
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

class WhatsAppClient {
  constructor(options = {}) {
    this.options = {
      sessionId: 'whatsapp-bulk-sender',
      headless: true,
      ...options,
    };
    this.isReady = false;
    this.client = null;
    this.onQrGenerated = null; // Callback for QR code generation
    this.currentQrCode = null; // Store current QR code
  }

  /**
   * Initialize the WhatsApp client
   * @returns {Promise} - Resolves when client is ready
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // Reset QR code
        this.currentQrCode = null;

        // Create WhatsApp client
        this.client = new Client({
          puppeteer: {
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu',
            ],
            headless: this.options.headless,
          },
          authStrategy: new (require('whatsapp-web.js').LocalAuth)({
            clientId: this.options.sessionId,
          }),
          webVersionCache: {
            type: 'remote',
            remotePath:
              'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
          },
        });

        // Register event handlers
        this.client.on('qr', (qr) => {
          console.log('QR Code received. Scan with your phone:');
          qrcode.generate(qr, { small: true });
          this.currentQrCode = qr;

          // Trigger callback if defined
          if (typeof this.onQrGenerated === 'function') {
            this.onQrGenerated(qr);
          }
        });

        this.client.on('ready', () => {
          console.log('WhatsApp client is ready!');
          this.isReady = true;
          resolve(this.client);
        });

        this.client.on('authenticated', () => {
          console.log('Authentication successful!');
        });

        this.client.on('auth_failure', (error) => {
          console.error('Authentication failed:', error);
          reject(error);
        });

        // Initialize client
        this.client.initialize();
      } catch (error) {
        console.error('Error initializing WhatsApp client:', error);
        reject(error);
      }
    });
  }

  /**
   * Get the current QR code
   * @returns {string|null} - Current QR code or null if not available
   */
  getCurrentQrCode() {
    return this.currentQrCode;
  }

  /**
   * Check if the client is ready
   * @returns {boolean} - Whether the client is ready
   */
  isClientReady() {
    return this.isReady;
  }

  /**
   * Wait for the client to be ready
   * @returns {Promise} - Resolves when client is ready
   */
  async waitForReady() {
    if (this.isReady) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Format a phone number with country code
   * @param {string} number - Phone number to format
   * @param {string} countryCode - Country code
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(number, countryCode = '91') {
    // Remove any non-numeric characters
    let formattedNumber = number.toString().replace(/\D/g, '');

    // If number starts with 0, remove it
    if (formattedNumber.startsWith('0')) {
      formattedNumber = formattedNumber.substring(1);
    }

    // If number doesn't start with country code, add it
    if (formattedNumber.length === 10) {
      formattedNumber = countryCode + formattedNumber;
    }

    return formattedNumber;
  }

  /**
   * Send a message with optional attachment
   * @param {string} phoneNumber - Phone number to send to
   * @param {string} message - Message text
   * @param {string} attachmentPath - Path to attachment file (optional)
   * @param {string} originalFilename - Original filename for the attachment (optional)
   * @returns {Promise} - Resolves with message info when sent
   */
  async sendMessage(
    phoneNumber,
    message,
    attachmentPath = null,
    originalFilename = null
  ) {
    await this.waitForReady();

    try {
      // Format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;

      // Send attachment if provided
      if (attachmentPath && fs.existsSync(attachmentPath)) {
        const attachment = MessageMedia.fromFilePath(attachmentPath);

        // Set the filename property to the original filename if provided
        // Otherwise use the basename from the path
        if (originalFilename) {
          attachment.filename = originalFilename;
        } else {
          attachment.filename = path.basename(attachmentPath);
        }

        return await this.client.sendMessage(chatId, attachment, {
          caption: message,
        });
      }

      // Send text message
      return await this.client.sendMessage(chatId, message);
    } catch (error) {
      console.error(`Error sending message to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Check if a number exists on WhatsApp
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<boolean>} - Whether the number exists
   */
  async numberExists(phoneNumber) {
    await this.waitForReady();

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;
      const exists = await this.client.isRegisteredUser(chatId);
      return exists;
    } catch (error) {
      console.error(`Error checking if number exists: ${phoneNumber}`, error);
      return false;
    }
  }

  /**
   * Close the WhatsApp client
   */
  async close() {
    if (this.client) {
      try {
        await this.client.destroy();
        this.isReady = false;
        console.log('WhatsApp client closed');
      } catch (error) {
        console.error('Error closing WhatsApp client:', error);
      }
    }
  }
}

module.exports = WhatsAppClient;
