'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, RefreshCw, Check, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import apiService from '@/lib/api';

interface WhatsAppAuthProps {
  onAuthenticated?: () => void;
}

export function WhatsAppAuth({ onAuthenticated }: WhatsAppAuthProps) {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();

    // Check status every 3 seconds
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const status = await apiService.getWhatsAppStatus();

      setIsReady(status.isReady);

      // If whatsapp is ready, trigger the callback
      if (status.isReady && onAuthenticated) {
        onAuthenticated();
      }

      // If QR code was generated but we don't have it, fetch it
      if (status.qrGenerated && !qrCodeUrl && !isReady) {
        fetchQrCode();
      }

      setError(null);
    } catch (err) {
      setError('Failed to check WhatsApp status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQrCode = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWhatsAppQR();

      if (response.success && response.qrCode) {
        // Convert the QR code string to a data URL
        const dataUrl = await QRCode.toDataURL(response.qrCode);
        setQrCodeUrl(dataUrl);
      } else {
        console.log('QR code not available:', response.message);
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      setInitializing(true);
      setQrCodeUrl(null);

      const result = await apiService.initializeWhatsApp();

      if (result.success) {
        // Wait a moment for QR code to be generated
        setTimeout(() => {
          fetchQrCode();
        }, 2000);
      } else {
        setError(result.error || 'Failed to initialize WhatsApp');
      }
    } catch (err) {
      setError('Failed to initialize WhatsApp');
      console.error(err);
    } finally {
      setInitializing(false);
    }
  };

  if (isReady) {
    return (
      <Alert className='bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'>
        <Check className='h-4 w-4 text-green-600 dark:text-green-400' />
        <AlertTitle>WhatsApp Connected</AlertTitle>
        <AlertDescription>
          WhatsApp is successfully connected and ready to send messages.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>WhatsApp Authentication</CardTitle>
        <CardDescription>
          Scan the QR code with your WhatsApp app to enable message sending
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col items-center'>
        {error && (
          <Alert className='mb-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'>
            <WifiOff className='h-4 w-4 text-red-600 dark:text-red-400' />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {qrCodeUrl ? (
          <div className='relative bg-white p-4 rounded-lg mb-4'>
            <Image
              src={qrCodeUrl}
              alt='WhatsApp QR Code'
              width={256}
              height={256}
              priority
            />
            {loading && (
              <div className='absolute inset-0 bg-white/70 flex items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            )}
          </div>
        ) : (
          <div className='h-64 w-64 flex items-center justify-center border border-dashed rounded-lg mb-4'>
            {loading || initializing ? (
              <Loader2 className='h-10 w-10 animate-spin text-muted-foreground' />
            ) : (
              <div className='text-center p-4'>
                <p className='mb-2 text-muted-foreground'>
                  No QR code available
                </p>
                <Button variant='outline' size='sm' onClick={handleInitialize}>
                  Generate QR Code
                </Button>
              </div>
            )}
          </div>
        )}

        <p className='text-sm text-muted-foreground mb-4 text-center'>
          To use WhatsApp Web: Open WhatsApp on your phone &gt; Tap Menu or
          Settings &gt; Select WhatsApp Web &gt; Scan the QR code
        </p>
      </CardContent>
      <CardFooter>
        {qrCodeUrl && (
          <Button
            variant='outline'
            className='w-full'
            onClick={handleInitialize}
            disabled={initializing}
          >
            {initializing ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <RefreshCw className='h-4 w-4 mr-2' />
            )}
            Refresh QR Code
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
