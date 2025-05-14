require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const csv = require('csv-parser');

// Configuration from environment variables
const CSV_PATH = process.env.PHONE_NUMBERS_CSV || './data/phone_numbers.csv';
const PDF_PATH = process.env.PDF_FILE_PATH || './data/attachment.pdf';
const MESSAGE_TEXT =
  process.env.MESSAGE_TEXT || 'Hello! Please find the attached document.';
const MESSAGE_DELAY = parseInt(process.env.MESSAGE_DELAY || '3000');
const COUNTRY_CODE = process.env.COUNTRY_CODE || '91';

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

// Parse CSV file with phone numbers
function loadPhoneNumbers() {
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        // Assuming the CSV has a column named 'phone' or similar
        // Adjust this based on your actual CSV structure
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
        return true;
      } else {
        console.warn(
          `Message sent but delivery not confirmed for ${formattedNumber}`
        );
        return true; // Still return true as message was sent
      }
    } catch (ackError) {
      console.warn(
        `Could not confirm delivery to ${formattedNumber}: ${ackError}`
      );
      return true; // Still return true as message was sent
    }
  } catch (error) {
    console.error(`Failed to send message to ${phoneNumber}:`, error);
    return false;
  }
}

// Process all phone numbers with delay between messages
async function processPhoneNumbers() {
  console.log('Starting to send messages...');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < phoneNumbers.length; i++) {
    const phoneNumber = phoneNumbers[i];
    console.log(`Processing ${i + 1}/${phoneNumbers.length}: ${phoneNumber}`);

    const success = await sendMessage(phoneNumber);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Add delay between messages to avoid getting blocked
    if (i < phoneNumbers.length - 1) {
      console.log(
        `Waiting ${MESSAGE_DELAY / 1000} seconds before next message...`
      );
      await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY));
    }
  }

  console.log('\nBulk sending completed!');
  console.log(
    `Total: ${phoneNumbers.length}, Successful: ${successCount}, Failed: ${failCount}`
  );
}

// Main function
async function main() {
  try {
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
