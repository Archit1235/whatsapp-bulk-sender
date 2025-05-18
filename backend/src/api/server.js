/**
 * API Server for WhatsApp Bulk Sender
 * Provides REST API endpoints for the dashboard to interact with the sender
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const BulkSender = require('../bulk-sender');
const logger = require('../utils/logger');

// Initialize the express app
const app = express();
const PORT = process.env.API_PORT || 3001;

// Configure CORS to allow requests from the dashboard
app.use(
  cors({
    origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON bodies
app.use(express.json());

// Configure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine the appropriate destination folder
    let destPath;
    if (file.fieldname === 'file') {
      // Determine if this is a CSV file or attachment by examining content type and extension
      const isCSV =
        file.mimetype === 'text/csv' ||
        file.originalname.toLowerCase().endsWith('.csv');

      if (isCSV) {
        destPath = path.join(__dirname, '..', '..', 'data');
      } else {
        destPath = path.join(__dirname, '..', '..', 'data', 'attachments');
      }
    } else {
      // Default destination for other fields
      destPath = path.join(__dirname, '..', '..', 'data');
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    console.log(`Storing file in: ${destPath}`);
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    let filename;

    // Determine if this is a CSV file
    const isCSV =
      file.mimetype === 'text/csv' ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (isCSV) {
      filename = `phone_numbers_${timestamp}${ext}`;
    } else {
      filename = `attachment_${timestamp}${ext}`;
    }

    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Initialize the bulk sender
const sender = new BulkSender();

// API Routes

// Get current status
app.get('/api/status', (req, res) => {
  try {
    const status = sender.getStatus();
    // Add WhatsApp client status
    status.whatsappStatus = {
      isReady: sender.isWhatsAppReady(),
      qrGenerated: sender.hasQrBeenGenerated(),
    };

    // Add daily sending statistics
    status.dailyStats = logger.getDailyStats();

    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get daily stats
app.get('/api/daily-stats', (req, res) => {
  try {
    const dailyStats = logger.getDailyStats();
    res.json(dailyStats);
  } catch (error) {
    console.error('Error getting daily statistics:', error);
    res.status(500).json({ error: 'Failed to get daily statistics' });
  }
});

// Get session history
app.get('/api/session-history', (req, res) => {
  try {
    const sessionsDir = path.join(
      __dirname,
      '..',
      '..',
      'data',
      'logs',
      'sessions'
    );
    const sessionFiles = fs
      .readdirSync(sessionsDir)
      .filter((file) => file.endsWith('.json'))
      .sort((a, b) => {
        // Sort in descending order (newest first)
        return (
          fs.statSync(path.join(sessionsDir, b)).mtime.getTime() -
          fs.statSync(path.join(sessionsDir, a)).mtime.getTime()
        );
      });

    const sessions = sessionFiles
      .map((file) => {
        try {
          const data = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
          return JSON.parse(data);
        } catch (err) {
          console.error(`Error reading session file ${file}:`, err);
          return null;
        }
      })
      .filter((session) => session !== null);

    res.json(sessions);
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

// Update configuration
app.post('/api/update-config', (req, res) => {
  try {
    const {
      delay,
      dailyLimit,
      batchSize,
      maxSessionSize,
      sessionBreakTime,
      randomizeDelay,
      delayVariance,
    } = req.body;

    // Update configuration with provided values
    if (delay !== undefined) sender.config.delay = Number(delay);
    if (dailyLimit !== undefined) sender.config.dailyLimit = Number(dailyLimit);
    if (batchSize !== undefined) sender.config.batchSize = Number(batchSize);
    if (maxSessionSize !== undefined)
      sender.config.maxSessionSize = Number(maxSessionSize);
    if (sessionBreakTime !== undefined)
      sender.config.sessionBreakTime = Number(sessionBreakTime);
    if (randomizeDelay !== undefined)
      sender.config.randomizeDelay = Boolean(randomizeDelay);
    if (delayVariance !== undefined)
      sender.config.delayVariance = Number(delayVariance);

    console.log('Updated sender configuration:', sender.config);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: sender.config,
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update configuration: ${error.message}`,
    });
  }
});

// Get WhatsApp connection status
app.get('/api/whatsapp-status', (req, res) => {
  try {
    res.json({
      isReady: sender.isWhatsAppReady(),
      qrGenerated: sender.hasQrBeenGenerated(),
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    res.status(500).json({ error: 'Failed to get WhatsApp status' });
  }
});

// Get failed numbers
app.get('/api/failed', (req, res) => {
  try {
    const failedNumbers = sender.getFailedNumbers();
    res.json(failedNumbers);
  } catch (error) {
    console.error('Error getting failed numbers:', error);
    res.status(500).json({ error: 'Failed to get failed numbers' });
  }
});

// Start sending
app.post('/api/send', async (req, res) => {
  try {
    console.log('Received send request with body:', req.body);
    const { csvPath, message, attachmentPath, originalFilename, delay } =
      req.body;

    // Validate we have a CSV path
    if (!csvPath) {
      console.error('Missing CSV path in send request');
      return res.status(400).json({
        success: false,
        message: 'Missing CSV path. Please upload a CSV file first.',
      });
    }

    // Resolve the paths to absolute paths if not already absolute
    const resolvedCsvPath = path.isAbsolute(csvPath)
      ? csvPath
      : path.resolve(path.join(__dirname, '..', '..'), csvPath);

    console.log('Resolved CSV path:', resolvedCsvPath);

    // Check if CSV exists
    if (!fs.existsSync(resolvedCsvPath)) {
      console.error('CSV file not found at path:', resolvedCsvPath);
      return res.status(400).json({
        success: false,
        message: `CSV file not found at ${csvPath}. Please upload a valid CSV file.`,
      });
    }

    let resolvedAttachmentPath = null;
    if (attachmentPath) {
      resolvedAttachmentPath = path.isAbsolute(attachmentPath)
        ? attachmentPath
        : path.resolve(path.join(__dirname, '..', '..'), attachmentPath);

      console.log('Resolved attachment path:', resolvedAttachmentPath);

      // Check if attachment exists
      if (!fs.existsSync(resolvedAttachmentPath)) {
        console.error(
          'Attachment file not found at path:',
          resolvedAttachmentPath
        );
        return res.status(400).json({
          success: false,
          message: `Attachment file not found at ${attachmentPath}.`,
        });
      }
    }

    // Configure sender
    sender.config.csvPath = resolvedCsvPath;
    sender.config.message = message || sender.config.message;
    sender.config.attachmentPath = resolvedAttachmentPath;
    sender.config.originalFilename = originalFilename;
    sender.config.delay = delay || sender.config.delay;

    console.log('Updated sender configuration:', sender.config);

    // Check if WhatsApp is ready
    if (!sender.isWhatsAppReady()) {
      console.error('WhatsApp client is not ready. Cannot start sending.');
      return res.status(400).json({
        success: false,
        message: 'WhatsApp client is not ready. Please authenticate first.',
      });
    }

    // Start sending in the background
    console.log('Starting background sending process...');
    sender.processPhoneNumbers(false).catch((err) => {
      console.error('Error in background sending process:', err);
    });

    console.log('Send request successful. Sending in background.');
    res.json({
      success: true,
      message: 'Sending process started',
      config: {
        csvPath: sender.config.csvPath,
        message: sender.config.message,
        attachmentPath: sender.config.attachmentPath,
        originalFilename: sender.config.originalFilename,
        delay: sender.config.delay,
      },
    });
  } catch (error) {
    console.error('Error starting sending process:', error);
    res.status(500).json({
      success: false,
      message: `Failed to start sending process: ${error.message}`,
    });
  }
});

// Resume sending
app.post('/api/resume', async (req, res) => {
  try {
    // Resume sending in the background
    sender.processPhoneNumbers(true).catch((err) => {
      console.error('Error in background resuming process:', err);
    });

    res.json({ success: true, message: 'Resumed sending process' });
  } catch (error) {
    console.error('Error resuming sending process:', error);
    res
      .status(500)
      .json({ success: false, message: `Failed to resume: ${error.message}` });
  }
});

// Retry failed numbers
app.post('/api/retry-failed', async (req, res) => {
  try {
    const { message, attachmentPath, originalFilename, delay } = req.body;

    // Get failed numbers
    const failedNumbers = sender.getFailedNumbers();

    if (failedNumbers.length === 0) {
      return res.json({ success: true, message: 'No failed numbers to retry' });
    }

    // Create a temporary CSV with failed numbers
    const tempCsvPath = path.join(
      __dirname,
      '..',
      '..',
      'data',
      'temp-failed.csv'
    );
    const csvContent =
      'phone\n' + failedNumbers.map((item) => item.phoneNumber).join('\n');
    fs.writeFileSync(tempCsvPath, csvContent);

    // Configure sender
    sender.config.csvPath = tempCsvPath;
    sender.config.message = message || sender.config.message;
    sender.config.attachmentPath =
      attachmentPath || sender.config.attachmentPath;
    sender.config.originalFilename = originalFilename;
    sender.config.delay = delay || sender.config.delay;

    // Start sending in the background
    sender.processPhoneNumbers(false).catch((err) => {
      console.error('Error in retry process:', err);
      // Clean up temp file
      try {
        fs.unlinkSync(tempCsvPath);
      } catch (e) {}
    });

    res.json({
      success: true,
      message: `Retrying ${failedNumbers.length} failed numbers`,
      count: failedNumbers.length,
    });
  } catch (error) {
    console.error('Error retrying failed numbers:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retry failed numbers: ${error.message}`,
    });
  }
});

// Stop sending
app.post('/api/stop', (req, res) => {
  try {
    sender.stop();
    res.json({ success: true, message: 'Stopped sending process' });
  } catch (error) {
    console.error('Error stopping sending process:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to stop sending process' });
  }
});

// Get WhatsApp QR code
app.get('/api/whatsapp-qr', (req, res) => {
  try {
    const qrCode = sender.whatsapp.getCurrentQrCode();
    if (qrCode) {
      res.json({ success: true, qrCode });
    } else {
      res.json({
        success: false,
        message:
          'QR code not available. Try initializing WhatsApp client first.',
      });
    }
  } catch (error) {
    console.error('Error getting WhatsApp QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp QR code',
    });
  }
});

// Initialize WhatsApp client
app.post('/api/initialize-whatsapp', async (req, res) => {
  try {
    const result = await sender.initializeWhatsApp();
    res.json(result);
  } catch (error) {
    console.error('Error initializing WhatsApp client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize WhatsApp client',
    });
  }
});

// Upload CSV file
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded in request');
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded' });
    }

    // Get the full path to the saved file
    const fullPath = req.file.path;
    const relativePath = path.relative(
      path.join(__dirname, '..', '..'),
      fullPath
    );

    console.log('CSV file uploaded:');
    console.log('- Original filename:', req.file.originalname);
    console.log('- Stored filename:', req.file.filename);
    console.log('- Full path:', fullPath);
    console.log('- Relative path for API response:', relativePath);

    res.json({
      success: true,
      message: 'CSV file uploaded successfully',
      path: relativePath,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Error uploading CSV file:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to upload CSV file' });
  }
});

// Upload attachment
app.post('/api/upload-attachment', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded in request');
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded' });
    }

    // Get the full path to the saved file
    const fullPath = req.file.path;
    const relativePath = path.relative(
      path.join(__dirname, '..', '..'),
      fullPath
    );

    console.log('Attachment file uploaded:');
    console.log('- Original filename:', req.file.originalname);
    console.log('- Stored filename:', req.file.filename);
    console.log('- Full path:', fullPath);
    console.log('- Relative path for API response:', relativePath);

    res.json({
      success: true,
      message: 'Attachment uploaded successfully',
      path: relativePath,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to upload attachment file' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

module.exports = app;
