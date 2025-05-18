#!/usr/bin/env node
/**
 * WhatsApp Bulk Sender CLI
 * A simple command line interface for sending WhatsApp messages in bulk
 */
require('dotenv').config();
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const BulkSender = require('./bulk-sender');

// Get package version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Configure CLI
program
  .name('whatsapp-bulk-sender')
  .description('Send WhatsApp messages to multiple contacts')
  .version(packageJson.version);

// Send command
program
  .command('send')
  .description('Send messages to contacts from a CSV file')
  .option(
    '-c, --csv <path>',
    'Path to CSV file with phone numbers',
    process.env.PHONE_NUMBERS_CSV || './data/phone_numbers.csv'
  )
  .option(
    '-a, --attachment <path>',
    'Path to attachment file',
    process.env.ATTACHMENT_PATH
  )
  .option(
    '-m, --message <text>',
    'Message text to send',
    process.env.MESSAGE_TEXT || 'Hello! Please find the attached document.'
  )
  .option(
    '-d, --delay <ms>',
    'Delay between messages in milliseconds',
    parseInt,
    process.env.MESSAGE_DELAY ? parseInt(process.env.MESSAGE_DELAY) : 3000
  )
  .option(
    '-cc, --country-code <code>',
    'Country code for phone numbers',
    process.env.COUNTRY_CODE || '91'
  )
  .option('-r, --resume', 'Resume from last position', false)
  .action(async (options) => {
    try {
      console.log('WhatsApp Bulk Sender');
      console.log('-------------------');
      console.log(`CSV File: ${options.csv}`);
      console.log(`Attachment: ${options.attachment || 'None'}`);
      console.log(`Message: ${options.message}`);
      console.log(`Delay: ${options.delay}ms`);
      console.log(`Country Code: ${options.countryCode}`);
      console.log(`Resume: ${options.resume ? 'Yes' : 'No'}`);
      console.log('-------------------');

      const sender = new BulkSender({
        csvPath: options.csv,
        attachmentPath: options.attachment,
        message: options.message,
        delay: options.delay,
        countryCode: options.countryCode,
      });

      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', async () => {
        console.log('\nReceived interrupt signal. Closing...');
        await sender.close();
        process.exit(0);
      });

      // Start sending
      await sender.processPhoneNumbers(options.resume);

      // Close when done
      await sender.close();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Resume command
program
  .command('resume')
  .description('Resume sending from last position')
  .action(async () => {
    try {
      console.log('Resuming WhatsApp Bulk Sender');

      const sender = new BulkSender();

      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', async () => {
        console.log('\nReceived interrupt signal. Closing...');
        await sender.close();
        process.exit(0);
      });

      // Resume sending
      await sender.processPhoneNumbers(true);

      // Close when done
      await sender.close();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current status')
  .action(() => {
    try {
      const sender = new BulkSender();
      const status = sender.getStatus();

      console.log('WhatsApp Bulk Sender Status');
      console.log('--------------------------');
      console.log(
        `Last Updated: ${new Date(status.lastUpdated).toLocaleString()}`
      );
      console.log(`Start Time: ${new Date(status.startTime).toLocaleString()}`);
      console.log(`Total Numbers: ${status.totalNumbers}`);
      console.log(`Processed: ${status.processedCount}`);
      console.log(`Success: ${status.successCount}`);
      console.log(`Failed: ${status.failedCount}`);
      console.log(
        `Progress: ${
          status.totalNumbers > 0
            ? ((status.processedCount / status.totalNumbers) * 100).toFixed(2)
            : 0
        }%`
      );
      console.log(`In Progress: ${status.inProgress ? 'Yes' : 'No'}`);
      console.log('--------------------------');
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Failed numbers command
program
  .command('failed')
  .description('Show failed numbers')
  .action(() => {
    try {
      const sender = new BulkSender();
      const failedNumbers = sender.getFailedNumbers();

      console.log('Failed Numbers');
      console.log('--------------');

      if (failedNumbers.length === 0) {
        console.log('No failed numbers');
      } else {
        console.log(`Total Failed: ${failedNumbers.length}`);
        console.log('--------------');

        failedNumbers.forEach((item, index) => {
          console.log(`${index + 1}. ${item.phoneNumber}`);
          console.log(`   Error: ${item.error}`);
          console.log(
            `   Timestamp: ${new Date(item.timestamp).toLocaleString()}`
          );
          console.log(`   Attempts: ${item.attempts}`);
          console.log('--------------');
        });
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Retry failed command
program
  .command('retry-failed')
  .description('Retry sending to failed numbers')
  .option(
    '-d, --delay <ms>',
    'Delay between messages in milliseconds',
    parseInt,
    process.env.MESSAGE_DELAY ? parseInt(process.env.MESSAGE_DELAY) : 3000
  )
  .option(
    '-m, --message <text>',
    'Message text to send',
    process.env.MESSAGE_TEXT || 'Hello! Please find the attached document.'
  )
  .option(
    '-a, --attachment <path>',
    'Path to attachment file',
    process.env.ATTACHMENT_PATH
  )
  .action(async (options) => {
    try {
      const sender = new BulkSender({
        delay: options.delay,
        message: options.message,
        attachmentPath: options.attachment,
      });

      const failedNumbers = sender.getFailedNumbers();

      if (failedNumbers.length === 0) {
        console.log('No failed numbers to retry');
        return;
      }

      console.log(`Retrying ${failedNumbers.length} failed numbers`);
      console.log('--------------------------');

      // Create temporary CSV file with failed numbers
      const tempCsvPath = path.join(process.cwd(), 'data', 'temp-failed.csv');
      const csvContent =
        'phone\n' + failedNumbers.map((item) => item.phoneNumber).join('\n');
      fs.writeFileSync(tempCsvPath, csvContent);

      // Configure sender to use this temporary file
      sender.config.csvPath = tempCsvPath;

      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', async () => {
        console.log('\nReceived interrupt signal. Closing...');
        await sender.close();
        try {
          fs.unlinkSync(tempCsvPath);
        } catch (e) {}
        process.exit(0);
      });

      // Start sending
      await sender.processPhoneNumbers(false);

      // Clean up
      try {
        fs.unlinkSync(tempCsvPath);
      } catch (e) {}

      // Close when done
      await sender.close();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
