# AWS Deployment Guide for WhatsApp Bulk Sender Backend

This guide will walk you through deploying the WhatsApp Bulk Sender backend on an AWS EC2 instance.

## Prerequisites

- An AWS account
- Basic knowledge of AWS services
- SSH client for connecting to your EC2 instance

## Step 1: Launch an EC2 Instance

1. Log in to your AWS Management Console
2. Navigate to EC2 Dashboard
3. Click "Launch Instance"
4. Choose an Amazon Machine Image (AMI)
   - Recommended: Ubuntu Server 22.04 LTS
   - Type: t2.micro (or larger depending on your needs)
5. Configure Instance Details
   - Leave default settings or adjust based on your needs
6. Add Storage
   - Recommended: At least 20GB of storage
7. Add Tags (optional)
   - Key: Name, Value: WhatsAppSender
8. Configure Security Group
   - Allow SSH (Port 22) from your IP
   - Allow HTTP (Port 80) from anywhere
   - Allow HTTPS (Port 443) from anywhere
   - Allow Custom TCP (Port 3001) from anywhere (or restrict to your dashboard IP)
9. Review and Launch
10. Create or select an existing key pair for SSH access

## Step 2: Connect to Your EC2 Instance

1. Open your terminal
2. Use SSH to connect to your instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-public-dns
   ```

## Step 3: Install Dependencies

1. Update package lists:

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Node.js and npm:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Verify installation:

   ```bash
   node -v
   npm -v
   ```

4. Install PM2 (for process management):

   ```bash
   sudo npm install -g pm2
   ```

5. Install Git:
   ```bash
   sudo apt install git -y
   ```

## Step 4: Deploy the Backend

### Option 1: Deploy from Git

1. Clone your repository:

   ```bash
   git clone https://github.com/yourusername/whatsapp-bulk-sender.git
   cd whatsapp-bulk-sender/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Option 2: Upload Files Directly

1. Use SCP to upload your backend files:

   ```bash
   # Run this on your local machine
   scp -i your-key.pem -r /path/to/local/backend ubuntu@your-instance-public-dns:~/whatsapp-sender
   ```

2. On your EC2 instance:
   ```bash
   cd ~/whatsapp-sender
   npm install
   ```

## Step 5: Configure Environment Variables

1. Create a .env file:

   ```bash
   nano .env
   ```

2. Add the following variables (adjust as needed):

   ```
   API_PORT=3001
   DASHBOARD_URL=https://yourdashboardURL.com
   HEADLESS=true
   COUNTRY_CODE=91
   DEFAULT_MESSAGE=Hello! Please find the attached document.
   DEFAULT_DELAY=3000
   DAILY_LIMIT=300
   BATCH_SIZE=50
   ```

3. Save and exit (Ctrl+X, then Y, then Enter)

## Step 6: Setup Process Management with PM2

1. Start the API server using PM2:

   ```bash
   pm2 start src/api/server.js --name whatsapp-sender
   ```

2. Configure PM2 to start on boot:

   ```bash
   pm2 startup
   ```

3. Run the command provided by the previous command, then:

   ```bash
   pm2 save
   ```

4. Monitor your application:
   ```bash
   pm2 logs whatsapp-sender
   ```

## Step 7: Setup Nginx (Optional, for domain name support)

1. Install Nginx:

   ```bash
   sudo apt install nginx -y
   ```

2. Create a new Nginx configuration:

   ```bash
   sudo nano /etc/nginx/sites-available/whatsapp-sender
   ```

3. Add the following configuration:

   ```nginx
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

4. Enable the site:

   ```bash
   sudo ln -s /etc/nginx/sites-available/whatsapp-sender /etc/nginx/sites-enabled/
   ```

5. Test the Nginx configuration:

   ```bash
   sudo nginx -t
   ```

6. Restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

## Step 8: Setup SSL with Let's Encrypt (Optional, for HTTPS)

1. Install Certbot:

   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. Obtain and install SSL certificate:

   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. Follow the prompts and select the option to redirect HTTP to HTTPS

## Step 9: First-time Authentication

The first time WhatsApp Web starts, you'll need to authenticate by scanning a QR code. Since the application is running in headless mode, you need to use the dashboard to scan the QR code:

1. Open your dashboard in a web browser
2. Navigate to the WhatsApp authentication page
3. Scan the QR code with your WhatsApp mobile app

## Step 10: Setup CloudWatch Monitoring (Optional)

1. Install CloudWatch agent:

   ```bash
   sudo apt install amazon-cloudwatch-agent -y
   ```

2. Configure CloudWatch agent:

   ```bash
   sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
   ```

3. Add your configuration and start the agent:
   ```bash
   sudo systemctl start amazon-cloudwatch-agent
   ```

## Troubleshooting

### Common Issues:

1. **Authentication fails repeatedly**:

   - Make sure you're using the correct phone number with WhatsApp installed
   - Try running the app without headless mode temporarily to see what's happening

2. **The API server crashes**:

   - Check PM2 logs: `pm2 logs whatsapp-sender`
   - Look for errors in the Node.js application

3. **Can't connect to the API from dashboard**:

   - Check security group settings to ensure port 3001 is open
   - Verify the CORS settings in the API server

4. **WhatsApp session gets disconnected**:
   - Consider implementing monitoring and automatic restart if the session drops

### Maintenance:

1. Update your application:

   ```bash
   cd ~/whatsapp-sender
   git pull  # If using Git
   npm install  # If dependencies changed
   pm2 restart whatsapp-sender
   ```

2. View PM2 status:

   ```bash
   pm2 status
   ```

3. View logs:
   ```bash
   pm2 logs whatsapp-sender
   ```

## Security Considerations

- Consider setting up a firewall with UFW
- Restrict SSH access to your IP only
- Use strong passwords and regularly rotate them
- Keep your system updated with security patches
