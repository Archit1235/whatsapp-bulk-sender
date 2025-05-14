require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Check if whatsapp authentication cache exists
const AUTH_DIR = path.join(process.cwd(), '.wwebjs_auth');

// Function to clear cache if requested
function clearCache() {
  if (fs.existsSync(AUTH_DIR)) {
    console.log('Clearing WhatsApp authentication cache...');
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log('Cache cleared. Please run the script again to authenticate.');
  }

  const CACHE_DIR = path.join(process.cwd(), '.wwebjs_cache');
  if (fs.existsSync(CACHE_DIR)) {
    console.log('Clearing WhatsApp cache...');
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  }
}

// Check for command line argument to clear cache
if (process.argv.includes('--clear-cache')) {
  clearCache();
  process.exit(0);
}

console.log('Checking WhatsApp authentication status...');

// Initialize WhatsApp client just to test authentication
const client = new Client({
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
    headless: true,
  },
  authStrategy: new (require('whatsapp-web.js').LocalAuth)({
    clientId: 'whatsapp-bulk-sender',
  }),
});

client.on('qr', (qr) => {
  console.log('Scan this QR code with your WhatsApp to authenticate:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Authentication successful! Client is ready.');
  console.log('You can now run the main application with: npm start');
  process.exit(0);
});

client.on('authenticated', () => {
  console.log('Authentication data saved!');
});

client.on('auth_failure', (error) => {
  console.error('Authentication failed:', error);
  console.log(
    'Try clearing the cache with: node checkAuthentication.js --clear-cache'
  );
  process.exit(1);
});

client.initialize();

// Exit if still running after 2 minutes
setTimeout(() => {
  console.log('Authentication timed out. Please try again.');
  console.log(
    'If you continue having issues, try clearing the cache with: node checkAuthentication.js --clear-cache'
  );
  process.exit(1);
}, 2 * 60 * 1000);
