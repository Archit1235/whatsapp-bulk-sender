# Dashboard Deployment Guide

This guide will help you deploy the WhatsApp Bulk Sender dashboard to Vercel for production use.

## Prerequisites

- A [Vercel](https://vercel.com) account
- Your backend API server already deployed and accessible

## Option 1: Deploy with Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Configure Environment Variables

Create a `.env.production` file in your dashboard directory:

```
NEXT_PUBLIC_API_URL=https://your-backend-api-url.com/api
```

Replace `https://your-backend-api-url.com/api` with the actual URL of your deployed backend API.

### Step 4: Deploy to Vercel

```bash
cd /path/to/whatsapp-bulk-sender/dashboard
vercel --prod
```

Follow the prompts to configure your project. When asked about environment variables, make sure to set:

- `NEXT_PUBLIC_API_URL` to your backend API URL

## Option 2: Deploy via GitHub Integration

### Step 1: Push Your Code to GitHub

1. Create a new GitHub repository
2. Push your code to this repository

### Step 2: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `dashboard` (if your repo contains both backend and dashboard)
   - Build and Output Settings: use defaults

### Step 3: Configure Environment Variables

1. In your project settings on Vercel, go to "Environment Variables"
2. Add the following variables:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-api-url.com/api`

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build and deployment to complete

## Option 3: Deploy to Netlify

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Configure Environment Variables

Create a `.env.production` file in your dashboard directory:

```
NEXT_PUBLIC_API_URL=https://your-backend-api-url.com/api
```

### Step 4: Build Your Project

```bash
cd /path/to/whatsapp-bulk-sender/dashboard
npm run build
```

### Step 5: Deploy to Netlify

```bash
netlify deploy --prod
```

Follow the prompts to configure your project. When asked about the publish directory, specify `.next`.

## Post-Deployment

### Testing Your Deployment

After deployment, test your dashboard to ensure it can communicate with your backend API:

1. Open your deployed dashboard URL
2. Try to authenticate with WhatsApp
3. Test uploading a CSV file and sending messages

### Custom Domain (Optional)

Both Vercel and Netlify allow you to configure custom domains:

1. Purchase a domain from a domain registrar
2. Add the domain in your Vercel/Netlify project settings
3. Follow the instructions to configure DNS settings

### Continuous Deployment

If you've deployed via GitHub integration, any new commits to your main branch will automatically trigger a new deployment.

## Troubleshooting

### Cannot Connect to Backend API

1. Verify your backend API is running and accessible
2. Check CORS settings on your backend to ensure it allows requests from your dashboard domain
3. Verify the `NEXT_PUBLIC_API_URL` environment variable is correctly set

### Build Errors

1. Check the build logs for specific errors
2. Make sure all dependencies are correctly installed
3. Verify your Next.js configuration

### WhatsApp Authentication Issues

1. Ensure your backend API is correctly handling WhatsApp authentication
2. Check the WebSocket connection between your dashboard and backend

## Maintenance

1. Regularly update dependencies for security patches
2. Monitor your application for errors
3. Keep your backend and dashboard in sync with each other

## Security Considerations

1. Use HTTPS for both your dashboard and backend API
2. Be cautious with sensitive information in environment variables
3. Implement proper authentication if required
4. Regularly backup your configuration and data
