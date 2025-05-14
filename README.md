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

## Important Notes for Bulk Messaging Safety

When sending bulk messages to a large number of recipients (1600+ numbers), it's critical to follow these best practices to avoid being flagged or banned by WhatsApp:

### Optimized Bulk Messaging Strategy

The application uses an optimized approach to send 1600 messages in about 4 days instead of 8 days, while still maintaining reasonable safety measures:

- **Larger Batches**: Messages are sent in batches of 100 numbers with carefully timed pauses
- **Higher Daily Limit**: Daily limit set to 400 messages to complete 1600 messages in 4 days
- **Smart Pacing**: Uses a multi-level pause strategy (2-3 seconds between messages, 10-15 second breaks every 25 messages, 1-2 minute pauses between batches, and 5-10 minute breaks every 3 batches)
- **Validation**: All phone numbers are validated to ensure they conform to Indian mobile number format
- **Delivery Confirmation**: The app checks if messages were actually delivered and tracks success/failure rates
- **Adaptive Throttling**: Automatically adjusts sending speed based on delivery success rates and WhatsApp's behavior (NEW)

### Adaptive Throttling System

The application now includes an intelligent throttling system that:

- Monitors message delivery success and automatically adjusts sending speed
- Increases delays when consecutive failures or high message volumes are detected
- Gradually returns to normal speed after consistent successful deliveries
- Operates at 4 throttle levels (normal, slight, moderate, and heavy) to balance speed and safety
- Tracks hourly message counts to avoid hitting WhatsApp's rate limits
- Maintains a sending log to persist throttle settings between sessions

### Tips for Safe Bulk Messaging

1. **Build up Gradually**: If this is a new WhatsApp number, consider starting with lower volumes (100-200/day) for the first day or two before increasing to 400/day
2. **Use an Aged Number**: Use a WhatsApp number that has been active for at least 3-6 months
3. **Maintain High Engagement**: Only message people who have opted in to receive messages from you
4. **Avoid Duplicate Messages**: Don't send identical messages to many recipients. Use personalization where possible
5. **Monitor Quality Metrics**: Watch for signs of decreased delivery rates or increased blocks
6. **Respect Opt-Outs**: Immediately honor any requests to stop messaging

### Time to Completion

With the optimized approach:

- **400 messages per day**: Complete all 1600 messages in 4 days
- **Batch size of 100**: Process larger groups in each batch while maintaining safety
- **Smart pauses**: Varied delays to appear more natural to WhatsApp's systems
- **Adaptive speed**: Adjusts automatically based on delivery success rates

## Using the Application

To send messages to all your contacts:

```
npm start
```

If you need to stop and resume later:

```
npm run resume [LAST_PROCESSED_INDEX]
```

Replace `[LAST_PROCESSED_INDEX]` with the number shown when the application was stopped.

## Troubleshooting

- **QR Code Scan Issues**: Make sure your phone has a working internet connection.
- **Missing PDF File**: Verify the path to your PDF file in the `.env` file.
- **CSV Format Issues**: Ensure your CSV has a header row with 'phone' or similar as the column name.
- **Connection Problems**: Keep your phone connected to the internet during the entire process.
- **Messages Not Appearing**:
  - Make sure the phone numbers are valid and registered on WhatsApp
  - Check that your WhatsApp account is not restricted or banned
  - Verify that your PDF file is valid and not too large
- **Messages Not Being Sent**: If the application gets stuck or messages aren't being sent, check your internet connection and try restarting the application.
- **High Throttle Level**: If the app is showing a high throttle level (2-3), it means it's detecting potential issues with message delivery. Let it continue with the slower speed to avoid getting blocked.

## What to Do If You're Blocked

If your WhatsApp account gets temporarily blocked:

1. Wait for the block to expire (usually 24 hours)
2. Reduce your messaging volume significantly (try 100-200 per day)
3. Increase delays between messages
4. Contact WhatsApp support if necessary

For permanent bans, you'll need to contact WhatsApp support directly.
