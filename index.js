require('dotenv').config();
const fs = require('fs');
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const csv = require('csv-parser');

// Configuration from environment variables
const CSV_PATH = process.env.PHONE_NUMBERS_CSV || './data/phone_numbers.csv';
const PDF_PATH = process.env.PDF_FILE_PATH || './data/attachment.pdf';
const MESSAGE_TEXT =
  process.env.MESSAGE_TEXT || 'Hello! Please find the attached document.';
const MESSAGE_DELAY = parseInt(process.env.MESSAGE_DELAY || '2000');
const COUNTRY_CODE = process.env.COUNTRY_CODE || '91';
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || '400');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');

// Initialize WhatsApp client
const client = new Client({
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't work in Windows
      '--disable-gpu',
    ],
    headless: true,
  },
  authStrategy: new (require('whatsapp-web.js').LocalAuth)({
    clientId: 'whatsapp-bulk-sender',
  }),
  webVersionCache: {
    type: 'remote',
    remotePath:
      'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
});

// Array to store the phone numbers
const phoneNumbers = [];

// Status tracking for adaptive throttling
const statusTracking = {
  successCount: 0,
  failCount: 0,
  deliveryFailCount: 0,
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  lastBatchSuccessRate: 1.0,
  messagingSince: null,
  currentThrottleLevel: 0, // 0=normal, 1=slight throttle, 2=moderate throttle, 3=heavy throttle
  // Track the time when each message was sent
  sentTimestamps: [],
  // Hourly message count for rate limiting
  hourlyCount: 0,
  hourlyResetTime: null,
};

// Log file for tracking progress
const LOG_FILE = './data/sending_log.json';

// Parse CSV file with phone numbers
function loadPhoneNumbers() {
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        // Assuming the CSV has a column named 'phone' or similar
        const phoneNumber =
          row.phone || row.phoneNumber || row.number || Object.values(row)[0];
        if (phoneNumber) {
          phoneNumbers.push(phoneNumber.toString().trim());
        }
      })
      .on('end', () => {
        console.log(`Loaded ${phoneNumbers.length} phone numbers from CSV`);
        resolve(phoneNumbers);
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Function to format phone number with country code
function formatPhoneNumber(number) {
  // Remove any non-numeric characters
  let formattedNumber = number.replace(/\D/g, '');

  // If number starts with 0, remove it
  if (formattedNumber.startsWith('0')) {
    formattedNumber = formattedNumber.substring(1);
  }

  // If number doesn't start with country code, add it
  if (!formattedNumber.startsWith(COUNTRY_CODE)) {
    formattedNumber = COUNTRY_CODE + formattedNumber;
  }

  return formattedNumber;
}

// Adaptive delay calculation based on current throttle level
function getAdaptiveDelay() {
  // Base delays for each throttle level (in milliseconds)
  const baseDelays = [
    2000 + Math.floor(Math.random() * 1000), // Normal: 2-3 seconds
    4000 + Math.floor(Math.random() * 2000), // Slight: 4-6 seconds
    6000 + Math.floor(Math.random() * 3000), // Moderate: 6-9 seconds
    10000 + Math.floor(Math.random() * 5000), // Heavy: 10-15 seconds
  ];

  return baseDelays[statusTracking.currentThrottleLevel];
}

// Function to update throttle level based on success rate
function updateThrottleLevel(success) {
  // Update consecutive counters
  if (success) {
    statusTracking.consecutiveSuccesses++;
    statusTracking.consecutiveFailures = 0;
  } else {
    statusTracking.consecutiveFailures++;
    statusTracking.consecutiveSuccesses = 0;
  }

  // Update hourly message tracking
  const now = new Date();
  if (!statusTracking.hourlyResetTime || now > statusTracking.hourlyResetTime) {
    statusTracking.hourlyCount = 1;
    // Set next hour reset time
    statusTracking.hourlyResetTime = new Date(now.getTime() + 60 * 60 * 1000);
  } else {
    statusTracking.hourlyCount++;
  }

  // Update throttle level based on consecutive failures or high hourly rate
  if (statusTracking.consecutiveFailures >= 3) {
    // Increase throttle level up to max 3 if we see consecutive failures
    statusTracking.currentThrottleLevel = Math.min(
      3,
      statusTracking.currentThrottleLevel + 1
    );
    console.log(
      `Warning: ${statusTracking.consecutiveFailures} consecutive failures. Increasing throttle to level ${statusTracking.currentThrottleLevel}`
    );
  } else if (
    statusTracking.hourlyCount > 100 &&
    statusTracking.currentThrottleLevel < 1
  ) {
    // Apply slight throttling if sending more than 100 messages per hour
    statusTracking.currentThrottleLevel = 1;
    console.log(
      `Info: High hourly message count (${statusTracking.hourlyCount}). Setting throttle to level 1`
    );
  } else if (
    statusTracking.consecutiveSuccesses >= 10 &&
    statusTracking.currentThrottleLevel > 0
  ) {
    // Decrease throttle level after 10 consecutive successes
    statusTracking.currentThrottleLevel = Math.max(
      0,
      statusTracking.currentThrottleLevel - 1
    );
    console.log(
      `Info: ${statusTracking.consecutiveSuccesses} consecutive successes. Decreasing throttle to level ${statusTracking.currentThrottleLevel}`
    );
  }

  // Clean up old timestamps (keep only the last hour)
  const oneHourAgo = now.getTime() - 60 * 60 * 1000;
  statusTracking.sentTimestamps = statusTracking.sentTimestamps.filter(
    (timestamp) => timestamp > oneHourAgo
  );

  // Save status to log file
  saveProgressToLog();
}

// Function to save progress to log file
function saveProgressToLog() {
  const logData = {
    lastUpdated: new Date().toISOString(),
    successCount: statusTracking.successCount,
    failCount: statusTracking.failCount,
    deliveryFailCount: statusTracking.deliveryFailCount,
    currentThrottleLevel: statusTracking.currentThrottleLevel,
    messagesRemaining: phoneNumbers.length,
    lastBatchSuccessRate: statusTracking.lastBatchSuccessRate,
  };

  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2));
  } catch (err) {
    console.warn(
      `Warning: Could not save progress to log file: ${err.message}`
    );
  }
}

// Function to load progress from log file
function loadProgressFromLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const logData = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      console.log(`Found previous sending log from ${logData.lastUpdated}`);

      // Only restore throttle level - other metrics will be recalculated
      statusTracking.currentThrottleLevel = logData.currentThrottleLevel || 0;

      return true;
    }
  } catch (err) {
    console.warn(
      `Warning: Could not load progress from log file: ${err.message}`
    );
  }
  return false;
}

// Function to send message with PDF to a phone number
async function sendMessage(phoneNumber) {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`Sending message to: ${formattedNumber}`);

    // Create chat with this phone number
    const chatId = `${formattedNumber}@c.us`;

    // Check if the contact exists on WhatsApp
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
      console.error(`Number ${formattedNumber} is not registered on WhatsApp`);
      return false;
    }

    // Load the PDF file as message media
    const media = MessageMedia.fromFilePath(PDF_PATH);

    // Record the timestamp when message is sent
    const sendTime = Date.now();
    statusTracking.sentTimestamps.push(sendTime);

    // Send the message with PDF
    const message = await client.sendMessage(chatId, media, {
      caption: MESSAGE_TEXT,
    });

    // Wait for message delivery confirmation
    console.log(`Waiting for delivery confirmation...`);
    try {
      // Wait up to 10 seconds for message to be delivered
      const delivered = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve(false), 10000); // 10-second timeout

        client.once('message_ack', (msg, ack) => {
          if (msg.id._serialized === message.id._serialized) {
            clearTimeout(timeout);
            // ACK values: 0=pending, 1=received by server, 2=delivered, 3=read, 4=played
            resolve(ack >= 2);
          }
        });
      });

      if (delivered) {
        console.log(`Message delivered successfully to ${formattedNumber}`);
        updateThrottleLevel(true);
        return true;
      } else {
        console.warn(
          `Message sent but delivery not confirmed for ${formattedNumber}`
        );
        statusTracking.deliveryFailCount++;
        updateThrottleLevel(false);
        return true; // Still return true as message was sent
      }
    } catch (ackError) {
      console.warn(
        `Could not confirm delivery to ${formattedNumber}: ${ackError}`
      );
      statusTracking.deliveryFailCount++;
      updateThrottleLevel(false);
      return true; // Still return true as message was sent
    }
  } catch (error) {
    console.error(`Failed to send message to ${phoneNumber}:`, error);
    updateThrottleLevel(false);
    return false;
  }
}

// Process all phone numbers with delay between messages
async function processPhoneNumbers() {
  console.log('Starting to send messages...');

  // Initialize status tracking if we're starting fresh
  if (!statusTracking.messagingSince) {
    statusTracking.messagingSince = new Date();
    statusTracking.hourlyResetTime = new Date(Date.now() + 60 * 60 * 1000);
  }

  // Break phone numbers into smaller batches for safer sending
  const batches = [];

  // Create batches
  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    batches.push(phoneNumbers.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Divided ${phoneNumbers.length} contacts into ${batches.length} batches of up to ${BATCH_SIZE} contacts each`
  );

  // Daily limit counter - higher limit for faster completion
  let dailyMessagesSent = 0;

  // Process each batch with delays between batches
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(
      `\nProcessing batch ${batchIndex + 1}/${batches.length} with ${
        batch.length
      } numbers`
    );

    // If we're approaching daily limit, stop for today
    if (dailyMessagesSent + batch.length > DAILY_LIMIT) {
      console.log(
        `\nApproaching daily sending limit (${DAILY_LIMIT}). Stopping for today.`
      );
      console.log(
        `Sent ${dailyMessagesSent} messages today. Will resume next time.`
      );
      break;
    }

    // Reset batch statistics
    let batchSuccess = 0;
    let batchFail = 0;

    // Process each number in the batch
    for (let i = 0; i < batch.length; i++) {
      const phoneNumber = batch[i];
      const overallIndex = batchIndex * BATCH_SIZE + i;
      console.log(
        `Processing ${overallIndex + 1}/${phoneNumbers.length}: ${phoneNumber}`
      );

      try {
        const success = await sendMessage(phoneNumber);
        if (success) {
          statusTracking.successCount++;
          batchSuccess++;
          dailyMessagesSent++;
        } else {
          statusTracking.failCount++;
          batchFail++;
        }

        // Add adaptive delay between messages based on current throttle level
        if (i < batch.length - 1) {
          const messageDelay = getAdaptiveDelay();
          console.log(
            `Waiting ${
              messageDelay / 1000
            } seconds before next message... (Throttle level: ${
              statusTracking.currentThrottleLevel
            })`
          );
          await new Promise((resolve) => setTimeout(resolve, messageDelay));
        }
      } catch (error) {
        console.error(`Error processing number ${phoneNumber}:`, error);
        statusTracking.failCount++;
        batchFail++;
      }

      // Add a short pause every 25 messages to avoid triggering spam detection
      if (i > 0 && i % 25 === 0) {
        // Adaptive pause duration based on throttle level
        const pauseDurations = [
          10000 + Math.floor(Math.random() * 5000), // Normal: 10-15 seconds
          15000 + Math.floor(Math.random() * 10000), // Slight: 15-25 seconds
          25000 + Math.floor(Math.random() * 15000), // Moderate: 25-40 seconds
          40000 + Math.floor(Math.random() * 20000), // Heavy: 40-60 seconds
        ];

        const quickBreak = pauseDurations[statusTracking.currentThrottleLevel];
        console.log(
          `\nQuick pause after ${i} messages in current batch (${
            quickBreak / 1000
          }s)...`
        );
        await new Promise((resolve) => setTimeout(resolve, quickBreak));
      }
    }

    // Update batch success rate
    if (batch.length > 0) {
      statusTracking.lastBatchSuccessRate = batchSuccess / batch.length;
    }

    console.log(
      `Batch ${
        batchIndex + 1
      } complete: ${batchSuccess} successful, ${batchFail} failed`
    );
    console.log(
      `Current success rate: ${(
        statusTracking.lastBatchSuccessRate * 100
      ).toFixed(1)}%`
    );

    // Add an adaptive delay between batches based on success rate and throttle level
    if (batchIndex < batches.length - 1) {
      // Base delay is affected by throttle level
      const baseBatchDelays = [
        60000 + Math.floor(Math.random() * 60000), // Normal: 1-2 minutes
        120000 + Math.floor(Math.random() * 60000), // Slight: 2-3 minutes
        180000 + Math.floor(Math.random() * 120000), // Moderate: 3-5 minutes
        300000 + Math.floor(Math.random() * 180000), // Heavy: 5-8 minutes
      ];

      const batchDelay = baseBatchDelays[statusTracking.currentThrottleLevel];

      console.log(
        `\nCompleted batch ${batchIndex + 1}. Waiting ${Math.round(
          batchDelay / 60000
        )} minutes before next batch... (Throttle level: ${
          statusTracking.currentThrottleLevel
        })`
      );
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }

    // Add a longer break after every 3 batches to reduce risk
    if (
      batchIndex > 0 &&
      (batchIndex + 1) % 3 === 0 &&
      batchIndex < batches.length - 1
    ) {
      // Adaptive long break duration
      const longBreakDurations = [
        300000 + Math.floor(Math.random() * 300000), // Normal: 5-10 minutes
        600000 + Math.floor(Math.random() * 300000), // Slight: 10-15 minutes
        900000 + Math.floor(Math.random() * 600000), // Moderate: 15-25 minutes
        1800000 + Math.floor(Math.random() * 900000), // Heavy: 30-45 minutes
      ];

      const longBreak = longBreakDurations[statusTracking.currentThrottleLevel];
      console.log(
        `\nTaking a longer break after ${batchIndex + 1} batches (${Math.round(
          longBreak / 60000
        )} minutes)...`
      );
      await new Promise((resolve) => setTimeout(resolve, longBreak));
    }
  }

  console.log('\nBulk sending completed!');
  console.log(
    `Total processed: ${
      statusTracking.successCount + statusTracking.failCount
    }/${phoneNumbers.length}, Successful: ${
      statusTracking.successCount
    }, Failed: ${statusTracking.failCount}`
  );

  // If we didn't process all numbers, log the remaining count
  if (
    statusTracking.successCount + statusTracking.failCount <
    phoneNumbers.length
  ) {
    const remaining =
      phoneNumbers.length -
      (statusTracking.successCount + statusTracking.failCount);
    console.log(`Remaining numbers to process: ${remaining}`);
    console.log(
      'Run the application again with the resume option to continue:'
    );
    console.log(
      `npm run resume ${statusTracking.successCount + statusTracking.failCount}`
    );
  }
}

// Main function
async function main() {
  try {
    // Parse command line arguments for resume functionality
    const args = process.argv.slice(2);
    let startIndex = 0;

    // Check if we're resuming from a specific position
    if (args.length > 0 && args[0] === '--resume' && args.length > 1) {
      startIndex = parseInt(args[1], 10);
      if (isNaN(startIndex) || startIndex < 0) {
        console.error('Invalid resume index. Must be a non-negative number.');
        process.exit(1);
      }
      console.log(`Resuming from index ${startIndex}`);
    }

    // Verify that PDF file exists
    if (!fs.existsSync(PDF_PATH)) {
      console.error(`PDF file not found at path: ${PDF_PATH}`);
      process.exit(1);
    }

    // Load phone numbers from CSV
    await loadPhoneNumbers();

    if (phoneNumbers.length === 0) {
      console.error('No phone numbers found in the CSV file.');
      process.exit(1);
    }

    // Load previous progress and throttle settings
    loadProgressFromLog();

    // If we're resuming, slice the phone numbers array to start from the specified index
    if (startIndex > 0) {
      if (startIndex >= phoneNumbers.length) {
        console.error(
          `Resume index (${startIndex}) is greater than or equal to the total number of phone numbers (${phoneNumbers.length}).`
        );
        process.exit(1);
      }

      const skippedNumbers = phoneNumbers.slice(0, startIndex);
      phoneNumbers.splice(0, startIndex);

      console.log(`Skipping the first ${startIndex} phone numbers.`);
      console.log(`Remaining numbers to process: ${phoneNumbers.length}`);
    }

    // Start WhatsApp client
    client.on('qr', (qr) => {
      // Generate and display QR code in terminal
      console.log('Scan the QR code with your WhatsApp to log in:');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', async () => {
      console.log('WhatsApp client is ready!');
      await processPhoneNumbers();
      // Exit after completion
      process.exit(0);
    });

    client.on('authenticated', () => {
      console.log('WhatsApp authentication successful!');
    });

    client.on('auth_failure', (error) => {
      console.error('WhatsApp authentication failed:', error);
      process.exit(1);
    });

    client.initialize();
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

// Run the application
main();
