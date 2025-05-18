# WhatsApp Bulk Sender

A powerful, reliable tool for sending WhatsApp messages to multiple contacts. Features a Node.js backend for message handling and a responsive Next.js dashboard.

## Features

- **Efficient Messaging**: Send to multiple contacts with optimized delays
- **High Volume Support**: Up to 800 messages per day with smart session management
- **Safety First**: Adaptive rate limiting and session breaks to prevent blocks
- **Attachment Support**: Send PDFs, images, or other files with messages
- **Analytics**: Track delivery statistics and session performance
- **Resume Capability**: Pause/resume at any point, even after server restart
- **Modern Dashboard**: Real-time progress monitoring and control

## Components

- **Backend** (`/backend`): Node.js server with WhatsApp Web integration
- **Dashboard** (`/dashboard`): Next.js application with modern UI

## Quick Setup

### Backend (AWS)

1. Set up an EC2 instance with Ubuntu
2. Install Node.js and dependencies:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs chromium-browser
   ```
3. Clone and configure:
   ```bash
   git clone https://github.com/yourusername/whatsapp-bulk-sender.git
   cd whatsapp-bulk-sender/backend
   npm install
   ```
4. Set up with PM2:
   ```bash
   npm install -g pm2
   pm2 start src/api/server.js --name whatsapp-sender
   pm2 startup && pm2 save
   ```

**See detailed deployment instructions in [backend/README.md](backend/README.md)**

### Dashboard (Vercel)

1. Deploy to Vercel:
   ```bash
   cd dashboard
   vercel
   ```
2. Set environment variable:
   - `NEXT_PUBLIC_API_URL`: URL of your backend API

## Usage Guide

1. Access the dashboard from your browser
2. Authenticate with WhatsApp by scanning the QR code
3. Upload a CSV file with phone numbers (needs 'phone' column)
4. Configure your message and optional attachment
5. Adjust sending parameters
6. Start sending and monitor progress

## Optimized Sending Strategy

```
Delay: 10000ms (10 seconds between messages)
Daily Limit: 800 messages
Session Size: 400 messages per session
Session Break: 30 minutes between sessions
```

These settings balance throughput with safety, preventing WhatsApp blocking.

## Safety Tips

1. **Start small**: Begin with smaller batches to establish a good pattern
2. **Vary content**: Avoid identical messages to all recipients
3. **Monitor failures**: If error rates increase, adjust your settings
4. **Regular use**: Use the WhatsApp account for normal messaging too
5. **Respect limits**: Follow the built-in session breaks and daily limits

## Environment Configuration

### Backend

```
API_PORT=3001
DASHBOARD_URL=https://your-dashboard-domain.com
DEFAULT_DELAY=10000
DAILY_LIMIT=800
```

### Dashboard

```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

## License

ISC License
