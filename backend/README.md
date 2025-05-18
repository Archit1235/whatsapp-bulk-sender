# WhatsApp Bulk Sender Backend

The backend component of WhatsApp Bulk Sender, responsible for WhatsApp connectivity and message sending.

## Features

- WhatsApp Web integration using `whatsapp-web.js`
- CSV file parsing for phone numbers
- Optimized message sending with adaptive delays
- Session-based sending to avoid account blocking
- File attachments support
- Detailed logging and analytics
- Resume capability for interrupted sending
- RESTful API for dashboard integration

## Quick Start

1. Clone repository and install dependencies:

   ```bash
   git clone https://github.com/yourusername/whatsapp-bulk-sender.git
   cd whatsapp-bulk-sender/backend
   npm install
   ```

2. Start the API server:
   ```bash
   npm run api
   ```

## Configuration

All settings can be configured via environment variables or the `.env` file:

```
# API Server
API_PORT=3001
DASHBOARD_URL=http://localhost:3000

# WhatsApp Client
HEADLESS=true
COUNTRY_CODE=91

# Message Settings
DEFAULT_MESSAGE=Hello! Please find the attached document.
DEFAULT_DELAY=10000

# Rate Limiting
DAILY_LIMIT=800
BATCH_SIZE=100
MAX_SESSION_SIZE=400
SESSION_BREAK_TIME=1800000
RANDOMIZE_DELAY=true
DELAY_VARIANCE=500
```

## AWS Deployment Guide

This guide will help you deploy the WhatsApp Bulk Sender backend on an AWS EC2 instance.

### Prerequisites

- An AWS account
- An EC2 instance running Ubuntu/Amazon Linux
- Basic familiarity with SSH and AWS Console

### Step 1: Connect to Your EC2 Instance

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-instance-public-dns.amazonaws.com
```

### Step 2: Install Node.js

```bash
# Update package lists
sudo apt update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

### Step 3: Install Required Packages

Some dependencies require additional packages:

```bash
# Install Chromium (required for WhatsApp Web)
sudo apt install -y chromium-browser

# Install additional dependencies
sudo apt install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

### Step 4: Clone and Configure the Application

```bash
# Clone the repository (or upload your files)
git clone https://github.com/yourusername/whatsapp-bulk-sender.git
cd whatsapp-bulk-sender/backend

# Create necessary directories
mkdir -p data/attachments data/logs data/logs/sessions

# Create .env file with your configuration
nano .env
```

Add the following to your `.env` file (modify as needed):

```
API_PORT=3001
DASHBOARD_URL=https://your-dashboard-domain.com
HEADLESS=true
COUNTRY_CODE=91
DEFAULT_MESSAGE=Hello! Please find the attached document.
DEFAULT_DELAY=10000
DAILY_LIMIT=800
BATCH_SIZE=100
MAX_SESSION_SIZE=400
SESSION_BREAK_TIME=1800000
RANDOMIZE_DELAY=true
DELAY_VARIANCE=500
```

### Step 5: Install Dependencies and Start with PM2

```bash
# Install dependencies
npm install

# Install PM2 globally
npm install -g pm2

# Start the API server with PM2
pm2 start src/api/server.js --name whatsapp-sender

# Configure PM2 to start on system boot
pm2 startup
# Run the command that PM2 gives you
pm2 save
```

### Step 6: Set Up Firewall Rules

Allow traffic on the API port:

```bash
# If using UFW (Ubuntu):
sudo ufw allow 3001/tcp

# Verify the port is open
sudo ufw status
```

In AWS console:

1. Go to EC2 > Security Groups
2. Select the security group attached to your instance
3. Add an inbound rule to allow TCP traffic on port 3001 from your IP or specific sources

### Step 7: Configure Nginx as a Reverse Proxy (Optional but Recommended)

Install and configure Nginx:

```bash
# Install Nginx
sudo apt install -y nginx

# Create a configuration file
sudo nano /etc/nginx/sites-available/whatsapp-sender
```

Add the following configuration:

```
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-sender /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Allow HTTP traffic (or use HTTPS with certbot)
sudo ufw allow 'Nginx HTTP'
```

### Step 8: Set Up SSL with Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 9: Connect Dashboard to Backend

In your Next.js dashboard project:

1. Set the environment variable `NEXT_PUBLIC_API_URL` to `https://your-domain.com/api`
2. Deploy your dashboard to Vercel

### Step 10: Initialize WhatsApp Session

1. Access your dashboard from your browser
2. Navigate to the WhatsApp authentication page
3. Scan the QR code with your phone to authenticate

### Troubleshooting

- **WhatsApp connection issues**: Check chromium installation and puppeteer dependencies
- **PM2 process crashes**: Check PM2 logs with `pm2 logs whatsapp-sender`
- **Permissions issues**: Ensure proper ownership of files with `sudo chown -R ubuntu:ubuntu whatsapp-bulk-sender`

## API Endpoints

### Status Endpoints

- `GET /api/status` - Current sending status and statistics
- `GET /api/daily-stats` - Daily sending statistics
- `GET /api/session-history` - Session history and metrics
- `GET /api/failed` - List of failed numbers
- `GET /api/whatsapp-status` - WhatsApp connection status
- `GET /api/whatsapp-qr` - WhatsApp QR code for authentication

### Action Endpoints

- `POST /api/send` - Start sending messages
- `POST /api/resume` - Resume sending process
- `POST /api/retry-failed` - Retry failed numbers
- `POST /api/stop` - Stop sending process
- `POST /api/initialize-whatsapp` - Initialize WhatsApp client
- `POST /api/update-config` - Update sender configuration

### File Upload Endpoints

- `POST /api/upload-csv` - Upload CSV file with phone numbers
- `POST /api/upload-attachment` - Upload attachment file

## Sending Strategy

The system uses an optimized sending strategy:

- **Session-Based Sending**: 400 messages per session with 30-minute breaks
- **Adaptive Delays**: Delay increases if error rates rise
- **Daily Limits**: Default limit of 800 messages per day
- **Randomized Timing**: Slight randomization for natural sending patterns

## Security Considerations

- Add authentication to the API endpoints if exposed to the internet
- Protect WhatsApp session data stored on the server
- Follow WhatsApp's terms of service
- Monitor failure rates and adjust settings if needed

## License

This project is licensed under the ISC License.
