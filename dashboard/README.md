# WhatsApp Bulk Sender Dashboard

The frontend component of WhatsApp Bulk Sender, providing a modern and responsive UI for controlling and monitoring the message sending process.

## Features

- Modern UI built with Next.js 15, React, and TypeScript
- Dark mode support using Next-themes
- Responsive design with Tailwind CSS
- Component library using Shadcn UI
- WhatsApp QR code authentication
- CSV file upload for phone numbers
- Real-time sending status monitoring
- Failed number management

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (based on Radix UI)
- **State Management**: React Hooks
- **API Client**: Axios
- **Theme Handling**: next-themes

## Installation

```bash
# Clone the repository (if not already done)
git clone https://github.com/yourusername/whatsapp-bulk-sender.git
cd whatsapp-bulk-sender/dashboard

# Install dependencies
npm install
```

## Configuration

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Replace the URL with your backend API server URL.

## Directory Structure

```
dashboard/
├── app/                # Next.js application
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page (dashboard)
│   └── sender/         # Sender page
│       └── page.tsx    # File upload and sending configuration
├── components/         # React components
│   ├── ui/             # Shadcn UI components
│   ├── dashboard-content.tsx # Dashboard content
│   ├── sender-form.tsx # Sender form for uploading files
│   └── whatsapp-auth.tsx # WhatsApp authentication
├── lib/                # Utility functions
│   ├── api.ts          # API client
│   └── utils.ts        # Helper functions
├── public/             # Static assets
├── .env.local          # Environment variables
└── package.json        # Dependencies and scripts
```

## Development

```bash
# Start the development server
npm run dev
```

This will start the Next.js development server on port 3000.

## Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Deployment

For detailed deployment instructions, see [Deployment Guide](./docs/deployment.md).

### Quick Deployment Options

- **Vercel**: Recommended for Next.js applications
- **Netlify**: Alternative deployment option
- **Docker**: For containerized deployments

## Usage

1. Ensure the backend API server is running
2. Open the dashboard in your browser (http://localhost:3000 in development)
3. Authenticate with WhatsApp by scanning the QR code
4. Navigate to the Sender page and upload a CSV file with phone numbers
5. Configure your message and attachment (optional)
6. Start sending!

## Customization

### Theme

The dashboard uses a dark theme by default. You can customize the theme in `app/globals.css` and `tailwind.config.js`.

### UI Components

The dashboard uses Shadcn UI components. You can add more components using:

```bash
npx shadcn-ui@latest add [component-name]
```

### API Integration

If you need to modify how the dashboard communicates with the backend, edit the API client in `lib/api.ts`.

## Troubleshooting

### Common Issues

1. **Cannot connect to backend**: Make sure the backend API server is running and the `NEXT_PUBLIC_API_URL` environment variable is set correctly.
2. **WhatsApp QR code not showing**: Check the browser console for errors and ensure the backend is correctly returning the QR code.
3. **Build errors**: Make sure all dependencies are installed and the project structure is intact.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.
