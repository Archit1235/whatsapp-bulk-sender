#!/usr/bin/env node

const fs = require('fs');
const { program } = require('commander');
const utils = require('./utils');
const csv = require('csv');
require('dotenv').config();

// Get country code from env or default to '91'
const COUNTRY_CODE = process.env.COUNTRY_CODE || '91';
const LOG_FILE = process.env.LOG_FILE || './data/sending_log.json';

program.version('1.0.0').description('WhatsApp Bulk Sender Utilities');

// Validate a CSV file with phone numbers
program
  .command('validate <file>')
  .description('Validate phone numbers in a CSV file')
  .option(
    '-c, --country <code>',
    'Country code (default: from .env or 91)',
    COUNTRY_CODE
  )
  .action((file, options) => {
    console.log(`Validating phone numbers in ${file}...`);
    utils
      .validatePhoneNumberCSV(file, options.country)
      .then((results) => {
        // Results are logged in the function
        if (results.invalid.length === 0) {
          console.log('All phone numbers are valid!');
        }
      })
      .catch((error) => {
        console.error('Validation failed:', error.message);
        process.exit(1);
      });
  });

// Convert a file to CSV with valid phone numbers
program
  .command('convert <inputFile> <outputFile>')
  .description('Convert a text file with phone numbers to CSV')
  .option(
    '-c, --country <code>',
    'Country code (default: from .env or 91)',
    COUNTRY_CODE
  )
  .action((inputFile, outputFile, options) => {
    console.log(`Converting ${inputFile} to CSV format at ${outputFile}...`);
    try {
      const results = utils.convertToPhoneNumberCSV(
        inputFile,
        outputFile,
        options.country
      );
      console.log(`Conversion completed:`);
      console.log(`  Total lines processed: ${results.total}`);
      console.log(`  Valid numbers: ${results.valid}`);
      console.log(`  Invalid numbers: ${results.invalid}`);
    } catch (error) {
      console.error('Conversion failed:', error.message);
      process.exit(1);
    }
  });

// Check a single phone number
program
  .command('check <phoneNumber>')
  .description('Check if a phone number is valid')
  .option(
    '-c, --country <code>',
    'Country code (default: from .env or 91)',
    COUNTRY_CODE
  )
  .action((phoneNumber, options) => {
    const isValid = utils.validateIndianPhoneNumber(
      phoneNumber,
      options.country
    );
    if (isValid) {
      const formatted = utils.formatPhoneNumber(phoneNumber, options.country);
      console.log(`✅ Valid phone number!`);
      console.log(`Original: ${phoneNumber}`);
      console.log(`Formatted: ${formatted}`);
    } else {
      console.log(`❌ Invalid phone number: ${phoneNumber}`);
    }
  });

// Format a single phone number
program
  .command('format <phoneNumber>')
  .description('Format a phone number with country code')
  .option(
    '-c, --country <code>',
    'Country code (default: from .env or 91)',
    COUNTRY_CODE
  )
  .action((phoneNumber, options) => {
    const formatted = utils.formatPhoneNumber(phoneNumber, options.country);
    console.log(`Formatted number: ${formatted}`);
  });

// Status check command
program
  .command('status')
  .description('Check the status of bulk message sending')
  .option('-l, --log <file>', 'Path to log file', LOG_FILE)
  .action((options) => {
    try {
      if (!fs.existsSync(options.log)) {
        console.log(
          "No sending log found. Sending hasn't started yet or log file is missing."
        );
        process.exit(0);
      }

      const logData = JSON.parse(fs.readFileSync(options.log, 'utf8'));
      const lastUpdated = new Date(logData.lastUpdated);
      const now = new Date();
      const timeDiff = Math.floor((now - lastUpdated) / 1000 / 60); // Minutes

      console.log('\n📱 WhatsApp Bulk Sender Status 📱');
      console.log('----------------------------------');
      console.log(
        `Last activity: ${logData.lastUpdated} (${timeDiff} minutes ago)`
      );
      console.log(`Messages sent: ${logData.successCount}`);
      console.log(`Failed sends: ${logData.failCount}`);
      console.log(`Delivery failures: ${logData.deliveryFailCount}`);
      console.log(`Messages remaining: ${logData.messagesRemaining}`);
      console.log('\nThrottling Info:');
      console.log(
        `Current throttle level: ${getThrottleLevelDescription(
          logData.currentThrottleLevel
        )}`
      );
      console.log(
        `Last batch success rate: ${(
          logData.lastBatchSuccessRate * 100
        ).toFixed(1)}%`
      );

      // Calculate estimated completion time based on current progress
      const totalMessages =
        logData.messagesRemaining + logData.successCount + logData.failCount;
      const percentComplete = (
        ((logData.successCount + logData.failCount) / totalMessages) *
        100
      ).toFixed(1);
      console.log(`\nProgress: ${percentComplete}% complete`);

      // Estimate remaining time based on throttle level and messages remaining
      const messagesPerDay = estimateMessagesPerDay(
        logData.currentThrottleLevel
      );
      const daysRemaining = Math.ceil(
        logData.messagesRemaining / messagesPerDay
      );
      console.log(
        `Estimated completion: ~${daysRemaining} days remaining at current rate`
      );

      if (logData.currentThrottleLevel > 1) {
        console.log('\n⚠️ WARNING: High throttle level detected');
        console.log(
          'The application is experiencing delivery issues and has slowed down to avoid blocking.'
        );
        console.log(
          "This may indicate WhatsApp is limiting your account's sending rate."
        );
      }
    } catch (error) {
      console.error('Error reading log file:', error.message);
      process.exit(1);
    }
  });

// Add a new command for resuming sending after a break
program
  .command('resume-send <csvFile> <pdfFile> <lastProcessed>')
  .description(
    'Resume sending messages from a specific position in the CSV file'
  )
  .option(
    '-d, --delay <ms>',
    'Delay between messages in milliseconds (default: from .env or 3000)',
    process.env.MESSAGE_DELAY || '3000'
  )
  .option(
    '-c, --country <code>',
    'Country code (default: from .env or 91)',
    COUNTRY_CODE
  )
  .option(
    '-m, --message <text>',
    'Message text to send with PDF (default: from .env)',
    process.env.MESSAGE_TEXT || 'Hello! Please find the attached document.'
  )
  .option(
    '-b, --batch-size <size>',
    'Number of contacts to process in each batch',
    '50'
  )
  .option(
    '-l, --daily-limit <limit>',
    'Maximum messages to send per day',
    '200'
  )
  .action((csvFile, pdfFile, lastProcessed, options) => {
    const lastIndex = parseInt(lastProcessed, 10);

    if (isNaN(lastIndex) || lastIndex < 0) {
      console.error(
        'Error: Last processed index must be a non-negative number'
      );
      process.exit(1);
    }

    console.log(`Resuming message sending from CSV file ${csvFile}`);
    console.log(`Last processed index: ${lastIndex}`);
    console.log(`Using PDF file: ${pdfFile}`);
    console.log(`Batch size: ${options.batchSize}`);
    console.log(`Daily limit: ${options.dailyLimit}`);

    // Simulate the sending process for now - you would integrate this with your
    // main sending functionality in a production environment
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        // This is where you would collect the phone numbers to send to
      })
      .on('end', () => {
        console.log('To actually send messages, run:');
        console.log(
          `PHONE_NUMBERS_CSV=${csvFile} PDF_FILE_PATH=${pdfFile} MESSAGE_DELAY=${options.delay} MESSAGE_TEXT="${options.message}" node index.js`
        );
        console.log(
          '\nNote: You would need to modify index.js to support resuming from a specific position.'
        );
        console.log(
          'This would involve skipping the first N contacts where N is the lastProcessed parameter.'
        );
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error.message);
        process.exit(1);
      });
  });

// Helper function to get a description of throttle level
function getThrottleLevelDescription(level) {
  const descriptions = [
    '0 (Normal - 2-3s between messages)',
    '1 (Slight - 4-6s between messages)',
    '2 (Moderate - 6-9s between messages)',
    '3 (Heavy - 10-15s between messages)',
  ];
  return descriptions[level] || `Unknown (${level})`;
}

// Helper function to estimate messages per day based on throttle level
function estimateMessagesPerDay(level) {
  // These are approximate values based on throttle levels
  const estimates = [
    400, // Normal
    300, // Slight throttle
    200, // Moderate throttle
    100, // Heavy throttle
  ];
  return estimates[level] || 200; // Default to moderate throttle estimate
}

program.parse(process.argv);

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
