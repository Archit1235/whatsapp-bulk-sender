import axios from 'axios';

// Define base API URL with a fallback
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Define types for our data
export interface SendingStatus {
  lastUpdated: string;
  startTime: string;
  totalNumbers: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  inProgress: boolean;
  lastProcessedIndex: number;
  isSending: boolean;
  isPaused: boolean;
  isResuming: boolean;
  whatsappStatus?: {
    isReady: boolean;
    qrGenerated: boolean;
  };
  processedNumbers?: Record<
    string,
    { status: string; timestamp: string; error?: string }
  >;
}

export interface FailedNumber {
  phoneNumber: string;
  error: string;
  timestamp: string;
  attempts: number;
}

export interface WhatsAppStatus {
  isReady: boolean;
  qrGenerated: boolean;
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service with methods to interact with the WhatsApp sender
const apiService = {
  /**
   * Get the current sending status
   */
  async getStatus(): Promise<SendingStatus> {
    try {
      const response = await apiClient.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching status:', error);
      // Return a default status on error
      return {
        lastUpdated: new Date().toISOString(),
        startTime: new Date().toISOString(),
        totalNumbers: 0,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        inProgress: false,
        lastProcessedIndex: -1,
        isSending: false,
        isPaused: false,
        isResuming: false,
        whatsappStatus: {
          isReady: false,
          qrGenerated: false,
        },
      };
    }
  },

  /**
   * Get the list of failed numbers
   */
  async getFailedNumbers(): Promise<FailedNumber[]> {
    try {
      const response = await apiClient.get('/failed');
      return response.data;
    } catch (error) {
      console.error('Error fetching failed numbers:', error);
      return [];
    }
  },

  /**
   * Start sending messages
   */
  async startSending(options: {
    csvPath?: string;
    message?: string;
    attachmentPath?: string;
    originalFilename?: string;
    delay?: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/send', options);
      return response.data;
    } catch (error) {
      console.error('Error starting sending process:', error);
      return { success: false, message: 'Failed to start sending process' };
    }
  },

  /**
   * Resume sending messages
   */
  async resumeSending(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/resume');
      return response.data;
    } catch (error) {
      console.error('Error resuming sending process:', error);
      return { success: false, message: 'Failed to resume sending process' };
    }
  },

  /**
   * Retry failed numbers
   */
  async retryFailed(options: {
    message?: string;
    attachmentPath?: string;
    originalFilename?: string;
    delay?: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/retry-failed', options);
      return response.data;
    } catch (error) {
      console.error('Error retrying failed numbers:', error);
      return { success: false, message: 'Failed to retry failed numbers' };
    }
  },

  /**
   * Stop the sending process
   */
  async stopSending(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/stop');
      return response.data;
    } catch (error) {
      console.error('Error stopping sending process:', error);
      return { success: false, message: 'Failed to stop sending process' };
    }
  },

  /**
   * Upload a CSV file with phone numbers
   */
  async uploadCsv(
    file: File
  ): Promise<{ success: boolean; message: string; path?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading CSV file:', error);
      return { success: false, message: 'Failed to upload CSV file' };
    }
  },

  /**
   * Upload an attachment file
   */
  async uploadAttachment(file: File): Promise<{
    success: boolean;
    message: string;
    path?: string;
    originalFilename?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading attachment file:', error);
      return { success: false, message: 'Failed to upload attachment file' };
    }
  },

  /**
   * Get WhatsApp client status
   */
  async getWhatsAppStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await apiClient.get('/whatsapp-status');
      return response.data;
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      return { isReady: false, qrGenerated: false };
    }
  },

  /**
   * Get WhatsApp QR code
   */
  async getWhatsAppQR(): Promise<{
    success: boolean;
    qrCode?: string;
    message?: string;
  }> {
    try {
      const response = await apiClient.get('/whatsapp-qr');
      return response.data;
    } catch (error) {
      console.error('Error fetching WhatsApp QR code:', error);
      return { success: false, message: 'Failed to get QR code' };
    }
  },

  /**
   * Initialize WhatsApp client
   */
  async initializeWhatsApp(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post('/initialize-whatsapp');
      return response.data;
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      return { success: false, error: 'Failed to initialize WhatsApp client' };
    }
  },
};

export default apiService;
