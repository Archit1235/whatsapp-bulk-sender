'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import apiService, { SendingStatus } from '@/lib/api';
import { formatDate, getTimeDifference } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DashboardContent() {
  const [status, setStatus] = useState<SendingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const data = await apiService.getStatus();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch status. API might be unavailable.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Refresh status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResumeClick = async () => {
    try {
      await apiService.resumeSending();
      // Refresh status
      const data = await apiService.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to resume sending:', error);
    }
  };

  const handleRetryFailedClick = () => {
    router.push('/sender?action=retry');
  };

  const handleNewSessionClick = () => {
    router.push('/sender');
  };

  const handleInitWhatsAppClick = async () => {
    try {
      await apiService.initializeWhatsApp();
      router.push('/sender');
    } catch (error) {
      console.error('Failed to initialize WhatsApp:', error);
    }
  };

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {loading && !status && (
        <Card className='col-span-full'>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Fetching latest status information...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className='col-span-full border-destructive'>
          <CardHeader>
            <CardTitle className='flex items-center text-destructive'>
              <WifiOff className='mr-2 h-5 w-5' />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant='outline' onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </CardFooter>
        </Card>
      )}

      {status && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Current sending session status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-center space-x-2'>
                {status.inProgress ? (
                  <>
                    <Clock className='h-5 w-5 text-yellow-500' />
                    <span className='text-yellow-500 font-medium'>
                      In Progress
                    </span>
                  </>
                ) : status.processedCount > 0 ? (
                  <>
                    <CheckCircle className='h-5 w-5 text-green-500' />
                    <span className='text-green-500 font-medium'>
                      Completed
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className='h-5 w-5 text-muted-foreground' />
                    <span className='text-muted-foreground font-medium'>
                      Not Started
                    </span>
                  </>
                )}
              </div>
              <div className='mt-4 space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Start Time:</span>
                  <span>
                    {status.startTime ? formatDate(status.startTime) : 'N/A'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Last Updated:</span>
                  <span>
                    {status.lastUpdated
                      ? formatDate(status.lastUpdated)
                      : 'N/A'}
                  </span>
                </div>
                {status.startTime && status.lastUpdated && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Running Time:</span>
                    <span>
                      {getTimeDifference(status.startTime, status.lastUpdated)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className='flex justify-end space-x-2'>
              {status.isSending ? (
                <Button
                  variant='outline'
                  onClick={() => apiService.stopSending()}
                >
                  Stop Sending
                </Button>
              ) : status.processedCount > 0 &&
                status.processedCount < status.totalNumbers ? (
                <Button onClick={handleResumeClick}>Resume Sending</Button>
              ) : (
                <Button onClick={handleNewSessionClick}>
                  Start New Session
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* WhatsApp Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Connection</CardTitle>
              <CardDescription>WhatsApp client status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-center space-x-2 mb-4'>
                {status.whatsappStatus?.isReady ? (
                  <>
                    <CheckCircle className='h-5 w-5 text-green-500' />
                    <span className='text-green-500 font-medium'>
                      Connected
                    </span>
                  </>
                ) : status.whatsappStatus?.qrGenerated ? (
                  <>
                    <Smartphone className='h-5 w-5 text-yellow-500' />
                    <span className='text-yellow-500 font-medium'>
                      QR Code Ready - Waiting for Scan
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className='h-5 w-5 text-muted-foreground' />
                    <span className='text-muted-foreground font-medium'>
                      Not Connected
                    </span>
                  </>
                )}
              </div>

              {!status.whatsappStatus?.isReady && (
                <Alert
                  className={
                    status.whatsappStatus?.qrGenerated
                      ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                      : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  }
                >
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Please connect WhatsApp to start sending messages. Go to the{' '}
                    <Button
                      variant='link'
                      className='h-auto p-0 text-blue-500'
                      onClick={() => router.push('/sender')}
                    >
                      Sender page
                    </Button>{' '}
                    to authenticate.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant='outline'
                className='w-full'
                onClick={handleInitWhatsAppClick}
              >
                <Smartphone className='h-4 w-4 mr-2' />
                {status.whatsappStatus?.isReady
                  ? 'Reconnect WhatsApp'
                  : 'Connect WhatsApp'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Sending progress status</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Total Numbers:</span>
                  <span>{status.totalNumbers}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Processed:</span>
                  <span>{status.processedCount}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Successful:</span>
                  <span className='text-green-500'>{status.successCount}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Failed:</span>
                  <span className='text-destructive'>{status.failedCount}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Remaining:</span>
                  <span>{status.totalNumbers - status.processedCount}</span>
                </div>
              </div>

              <div className='space-y-1.5'>
                <div className='flex justify-between text-xs'>
                  <span>Progress</span>
                  <span>
                    {status.totalNumbers > 0
                      ? `${Math.round(
                          (status.processedCount / status.totalNumbers) * 100
                        )}%`
                      : '0%'}
                  </span>
                </div>
                <Progress
                  value={
                    status.totalNumbers > 0
                      ? (status.processedCount / status.totalNumbers) * 100
                      : 0
                  }
                />
              </div>
            </CardContent>
            <CardFooter>
              {status.failedCount > 0 && (
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={handleRetryFailedClick}
                >
                  Retry Failed Numbers ({status.failedCount})
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Message sending statistics</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-center h-32'>
                <div className='text-center'>
                  <BarChart className='h-10 w-10 mb-2 text-primary' />
                  <div className='space-y-1'>
                    <h3 className='text-xl font-bold'>
                      {status.processedCount > 0
                        ? `${Math.round(
                            (status.successCount / status.processedCount) * 100
                          )}%`
                        : '0%'}
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                      Success Rate
                    </p>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1 text-center'>
                  <h4 className='text-2xl font-bold'>{status.successCount}</h4>
                  <p className='text-xs text-muted-foreground'>Success</p>
                </div>
                <div className='space-y-1 text-center'>
                  <h4 className='text-2xl font-bold'>{status.failedCount}</h4>
                  <p className='text-xs text-muted-foreground'>Failed</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant='outline'
                className='w-full'
                onClick={() => router.push('/failed-numbers')}
              >
                View Failed Numbers
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
