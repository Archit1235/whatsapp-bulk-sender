#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const utils = require('./utils');
require('dotenv').config();

// Get country code from env or default to '91'
const COUNTRY_CODE = process.env.COUNTRY_CODE || '91';

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

program.parse(process.argv);

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
