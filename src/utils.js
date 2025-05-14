const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

/**
 * Validate a phone number for Indian format
 * @param {string} phoneNumber - The phone number to validate
 * @param {string} countryCode - The country code (default: '91')
 * @returns {boolean} - Whether the number is valid
 */
function validateIndianPhoneNumber(phoneNumber, countryCode = '91') {
  // Remove non-numeric characters
  const cleanNumber = phoneNumber.toString().replace(/\D/g, '');

  // Check if it's a valid Indian mobile number
  // Indian mobile numbers are typically 10 digits
  // When adding country code, it becomes 12 or 13 digits
  if (cleanNumber.startsWith(countryCode)) {
    // If number includes country code, it should be 12 digits (91 + 10 digits)
    return cleanNumber.length === countryCode.length + 10;
  } else if (cleanNumber.startsWith('0')) {
    // If number starts with 0, it should be 11 digits (0 + 10 digits)
    return cleanNumber.length === 11;
  } else {
    // If number doesn't have country code or starting 0, it should be 10 digits
    return cleanNumber.length === 10;
  }
}

/**
 * Format a phone number with proper country code
 * @param {string} phoneNumber - The phone number to format
 * @param {string} countryCode - The country code (default: '91')
 * @returns {string} - The formatted phone number
 */
function formatPhoneNumber(phoneNumber, countryCode = '91') {
  // Remove any non-numeric characters
  let formattedNumber = phoneNumber.toString().replace(/\D/g, '');

  // If number starts with 0, remove it
  if (formattedNumber.startsWith('0')) {
    formattedNumber = formattedNumber.substring(1);
  }

  // If number doesn't start with country code, add it
  if (!formattedNumber.startsWith(countryCode)) {
    formattedNumber = countryCode + formattedNumber;
  }

  return formattedNumber;
}

/**
 * Convert a text or Excel file to CSV with phone numbers
 * This is a placeholder function - you would need to add proper Excel parsing
 * @param {string} inputFile - Path to the input file
 * @param {string} outputFile - Path to the output CSV file
 * @param {string} countryCode - The country code (default: '91')
 */
function convertToPhoneNumberCSV(inputFile, outputFile, countryCode = '91') {
  // This is a simplified implementation that assumes text file with one number per line
  try {
    // Read the input file
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');

    // Process each line as a phone number
    const phoneNumbers = [];
    const invalidNumbers = [];

    lines.forEach((line, index) => {
      // Skip empty lines
      const trimmedLine = line.trim();
      if (trimmedLine) {
        if (validateIndianPhoneNumber(trimmedLine, countryCode)) {
          phoneNumbers.push({
            phone: formatPhoneNumber(trimmedLine, countryCode),
          });
        } else {
          invalidNumbers.push({
            line: index + 1,
            number: trimmedLine,
          });
        }
      }
    });

    // Write to CSV
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: [{ id: 'phone', title: 'phone' }],
    });

    csvWriter.writeRecords(phoneNumbers).then(() => {
      console.log(
        `Successfully converted to CSV. Processed ${phoneNumbers.length} valid numbers.`
      );

      if (invalidNumbers.length > 0) {
        console.log(`Warning: Found ${invalidNumbers.length} invalid numbers:`);
        invalidNumbers.forEach((inv) => {
          console.log(`  Line ${inv.line}: ${inv.number}`);
        });
      }
    });

    return {
      valid: phoneNumbers.length,
      invalid: invalidNumbers.length,
      total: phoneNumbers.length + invalidNumbers.length,
    };
  } catch (error) {
    console.error('Error converting file to CSV:', error);
    throw error;
  }
}

/**
 * Validate a CSV file with phone numbers
 * @param {string} csvFile - Path to the CSV file
 * @param {string} countryCode - The country code (default: '91')
 */
function validatePhoneNumberCSV(csvFile, countryCode = '91') {
  return new Promise((resolve, reject) => {
    const results = {
      valid: [],
      invalid: [],
      total: 0,
    };

    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        results.total++;

        // Assuming the CSV has a column named 'phone' or similar
        const phoneNumber =
          row.phone || row.phoneNumber || row.number || Object.values(row)[0];

        if (
          phoneNumber &&
          validateIndianPhoneNumber(phoneNumber, countryCode)
        ) {
          results.valid.push({
            original: phoneNumber,
            formatted: formatPhoneNumber(phoneNumber, countryCode),
          });
        } else {
          results.invalid.push({
            line: results.total,
            number: phoneNumber,
          });
        }
      })
      .on('end', () => {
        console.log(`CSV Validation Results:`);
        console.log(`  Total numbers: ${results.total}`);
        console.log(`  Valid numbers: ${results.valid.length}`);
        console.log(`  Invalid numbers: ${results.invalid.length}`);

        if (results.invalid.length > 0) {
          console.log('Invalid numbers:');
          results.invalid.forEach((inv) => {
            console.log(`  Line ${inv.line}: ${inv.number}`);
          });
        }

        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error validating CSV file:', error);
        reject(error);
      });
  });
}

module.exports = {
  validateIndianPhoneNumber,
  formatPhoneNumber,
  convertToPhoneNumberCSV,
  validatePhoneNumberCSV,
};
