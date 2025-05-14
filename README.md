# WhatsApp Bulk Sender

A Node.js application to send WhatsApp messages with a PDF attachment to multiple recipients.

## Prerequisites

- Node.js (LTS version)
- A WhatsApp account
- CSV file with phone numbers
- PDF file to send as attachment

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/whatsapp-bulk-sender.git
   cd whatsapp-bulk-sender
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   # Path to the CSV file containing phone numbers
   PHONE_NUMBERS_CSV=./data/phone_numbers.csv

   # Path to the PDF file to be sent
   PDF_FILE_PATH=./data/attachment.pdf

   # Message to be sent
   MESSAGE_TEXT="Hello! Please find the attached document."

   # Delay between messages in milliseconds (to avoid spam detection)
   MESSAGE_DELAY=3000

   # Country code for the phone numbers (e.g., 91 for India)
   COUNTRY_CODE=91
   ```

## Preparing Your Data

1. Create a CSV file with phone numbers:

   - Place a CSV file at the location specified in your `.env` file (default: `./data/phone_numbers.csv`)
   - Format: A single column with header 'phone' containing phone numbers
   - Sample provided in `data/phone_numbers_sample.csv`

2. Add your PDF:
   - Place your PDF file at the location specified in your `.env` file (default: `./data/attachment.pdf`)

## Usage

1. Run the application:

   ```
   npm start
   ```

2. Scan the QR code that appears in the terminal with your WhatsApp mobile app:

   - Open WhatsApp on your phone
   - Tap Menu (or Settings) and select WhatsApp Web
   - Point your phone to the QR code in the terminal

3. The application will:
   - Load phone numbers from the CSV file
   - Send the PDF with your message to each number
   - Display progress in the console
   - Output success/failure information for each message
   - Exit after all messages are sent

## Important Notes

- Use this tool responsibly and ethically. Do not use it for spam.
- WhatsApp may ban your account for sending too many messages in a short time. Use appropriate delay between messages.
- The tool formats Indian phone numbers by default (removes leading 0, adds country code 91 if not present).
- This tool uses WhatsApp Web, so your phone needs to be connected to the internet while the tool is running.

## Troubleshooting

- **QR Code Scan Issues**: Make sure your phone has a working internet connection.
- **Missing PDF File**: Verify the path to your PDF file in the `.env` file.
- **CSV Format Issues**: Ensure your CSV has a header row with 'phone' or similar as the column name.
- **Connection Problems**: Keep your phone connected to the internet during the entire process.
- **Messages Not Appearing**:
  - Try authenticating separately first: `npm run auth`
  - Clear cache if you're having issues: `npm run clear-cache`
  - Make sure the phone numbers are valid and registered on WhatsApp
  - Check that your WhatsApp account is not restricted or banned
  - Verify that your PDF file is valid and not too large
  - Try with a small delay between messages (10000ms or more)
  - Do not run too many messages at once when testing (start with 5-10)

## Advanced Troubleshooting

If messages appear as sent in the console but don't show up in WhatsApp:

1. **Authentication Issues**: The WhatsApp session might be invalid

   ```
   npm run clear-cache
   npm run auth
   ```

2. **Phone Number Format Issues**: Ensure numbers have the correct format

   - Use the check utility: `npm run check 9876543210`
   - For Indian numbers, ensure they're 10 digits without the country code

3. **WhatsApp Restrictions**: WhatsApp limits bulk messaging to prevent spam

   - Increase the `MESSAGE_DELAY` to 10000ms or higher
   - Limit your initial tests to 5-10 recipients
   - Ensure your account is in good standing

4. **System Requirements**: WhatsApp Web automation needs specific dependencies
   - Install Google Chrome if not already installed
   - Ensure your system has enough memory (at least 4GB RAM)
   - Check your internet connection is stable
