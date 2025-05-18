'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, Send, FileText, Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { WhatsAppAuth } from '@/components/whatsapp-auth';
import apiService from '@/lib/api';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export function SenderForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [messageText, setMessageText] = useState('');
  const [delay, setDelay] = useState(3000);
  const [failedNumbers, setFailedNumbers] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [whatsappAuthenticated, setWhatsappAuthenticated] = useState(false);
  const [checkingWhatsAppStatus, setCheckingWhatsAppStatus] = useState(true);

  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check WhatsApp client status on load
  useEffect(() => {
    checkWhatsAppStatus();
  }, []);

  // Check if coming from retry failed numbers action
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'retry') {
      setActiveTab('retry');
      loadFailedNumbers();
    }
  }, [searchParams]);

  const checkWhatsAppStatus = async () => {
    try {
      setCheckingWhatsAppStatus(true);
      const status = await apiService.getWhatsAppStatus();
      setWhatsappAuthenticated(status.isReady);
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error);
    } finally {
      setCheckingWhatsAppStatus(false);
    }
  };

  const loadFailedNumbers = async () => {
    try {
      setIsLoading(true);
      const numbers = await apiService.getFailedNumbers();
      setFailedNumbers(numbers);
    } catch (error) {
      console.error('Failed to load failed numbers:', error);
      toast.error('Failed to load failed numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleAttachmentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const handleCsvUploadClick = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };

  const handleAttachmentUploadClick = () => {
    if (attachmentFileInputRef.current) {
      attachmentFileInputRef.current.click();
    }
  };

  const handleStartSending = async () => {
    try {
      setIsLoading(true);
      console.log('Starting send process...');

      let csvPath: string | undefined;
      let attachmentPath: string | undefined;
      let originalFilename: string | undefined;

      // Upload CSV file if selected
      if (csvFile) {
        console.log('Uploading CSV file:', csvFile.name);
        const csvUploadResult = await apiService.uploadCsv(csvFile);
        console.log('CSV upload result:', csvUploadResult);

        if (!csvUploadResult.success) {
          throw new Error(csvUploadResult.message);
        }
        csvPath = csvUploadResult.path;
      } else {
        console.log('No CSV file selected');
        toast.error('Please select a CSV file with phone numbers');
        setIsLoading(false);
        setShowConfirmDialog(false);
        return;
      }

      // Upload attachment file if selected
      if (attachmentFile) {
        console.log('Uploading attachment:', attachmentFile.name);
        const attachmentUploadResult = await apiService.uploadAttachment(
          attachmentFile
        );
        console.log('Attachment upload result:', attachmentUploadResult);

        if (!attachmentUploadResult.success) {
          throw new Error(attachmentUploadResult.message);
        }
        attachmentPath = attachmentUploadResult.path;
        originalFilename = attachmentUploadResult.originalFilename;
      }

      // Prepare configuration for sending
      const sendConfig = {
        csvPath,
        message: messageText,
        attachmentPath,
        originalFilename,
        delay,
      };
      console.log('Send configuration:', sendConfig);

      // Start sending
      console.log('Calling API to start sending...');
      const result = await apiService.startSending(sendConfig);
      console.log('Start sending result:', result);

      if (result.success) {
        console.log('Sending process started successfully');
        toast.success('Sending process started successfully!', {
          description: 'Redirecting to dashboard...',
          duration: 3000,
        });

        // Small delay before redirecting to ensure toast is visible
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Failed to start sending:', error);
      toast.error(`Failed to start sending: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setIsLoading(true);

      let attachmentPath: string | undefined;
      let originalFilename: string | undefined;

      // Upload attachment file if selected
      if (attachmentFile) {
        const attachmentUploadResult = await apiService.uploadAttachment(
          attachmentFile
        );
        if (!attachmentUploadResult.success) {
          throw new Error(attachmentUploadResult.message);
        }
        attachmentPath = attachmentUploadResult.path;
        originalFilename = attachmentUploadResult.originalFilename;
      }

      // Retry failed numbers
      const result = await apiService.retryFailed({
        message: messageText || undefined,
        attachmentPath,
        originalFilename,
        delay,
      });

      if (result.success) {
        toast.success('Retrying failed numbers');
        router.push('/');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Failed to retry failed numbers:', error);
      toast.error(`Failed to retry: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // If checking WhatsApp status, show loading
  if (checkingWhatsAppStatus) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
        <p className='text-muted-foreground'>Checking WhatsApp connection...</p>
      </div>
    );
  }

  // If WhatsApp is not authenticated, show authentication UI
  if (!whatsappAuthenticated) {
    return (
      <div className='space-y-8 max-w-md'>
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Authentication Required</CardTitle>
            <CardDescription>
              You need to authenticate with WhatsApp before sending messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-muted-foreground'>
              Please scan the QR code below with your WhatsApp mobile app to
              enable sending messages.
            </p>
          </CardContent>
        </Card>

        <WhatsAppAuth
          onAuthenticated={() => {
            setWhatsappAuthenticated(true);
            toast.success('WhatsApp successfully connected');
          }}
        />
      </div>
    );
  }

  return (
    <>
      <Toaster position='top-center' />

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid grid-cols-2 w-full max-w-md mb-6'>
          <TabsTrigger value='upload'>Upload New CSV</TabsTrigger>
          <TabsTrigger value='retry'>Retry Failed Numbers</TabsTrigger>
        </TabsList>

        <TabsContent value='upload'>
          <Card>
            <CardHeader>
              <CardTitle>Upload Phone Numbers</CardTitle>
              <CardDescription>
                Upload a CSV file with phone numbers and configure message
                settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='csv-file'>Phone Numbers CSV</Label>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    onClick={handleCsvUploadClick}
                    className='w-full h-24 flex flex-col items-center justify-center border-dashed'
                  >
                    <Upload className='h-6 w-6 mb-2' />
                    <span>
                      {csvFile ? csvFile.name : 'Click to upload CSV'}
                    </span>
                    <span className='text-xs text-muted-foreground mt-1'>
                      CSV with a column named 'phone'
                    </span>
                  </Button>
                  <input
                    id='csv-file'
                    type='file'
                    accept='.csv'
                    onChange={handleCsvFileChange}
                    ref={csvFileInputRef}
                    className='hidden'
                  />
                </div>
              </div>

              <Separator />

              <div className='space-y-2'>
                <Label htmlFor='message'>Message Text</Label>
                <textarea
                  id='message'
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className='flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  placeholder='Enter your message here...'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='attachment'>Attachment (Optional)</Label>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    onClick={handleAttachmentUploadClick}
                    className='w-full h-16 flex items-center justify-center border-dashed'
                  >
                    <Paperclip className='h-4 w-4 mr-2' />
                    <span>
                      {attachmentFile
                        ? attachmentFile.name
                        : 'Click to upload attachment'}
                    </span>
                  </Button>
                  <input
                    id='attachment'
                    type='file'
                    onChange={handleAttachmentFileChange}
                    ref={attachmentFileInputRef}
                    className='hidden'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='delay'>Delay Between Messages (ms)</Label>
                <Input
                  id='delay'
                  type='number'
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  min={1000}
                  max={10000}
                  step={500}
                />
                <p className='text-xs text-muted-foreground'>
                  Recommended: 3000-5000ms to avoid being blocked
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!csvFile || !messageText || isLoading}
                className='w-full'
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <Send className='h-4 w-4 mr-2' />
                )}
                Start Sending
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value='retry'>
          <Card>
            <CardHeader>
              <CardTitle>Retry Failed Numbers</CardTitle>
              <CardDescription>
                Retry sending messages to numbers that failed in previous
                attempts
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {isLoading ? (
                <div className='py-8 flex justify-center'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : failedNumbers.length > 0 ? (
                <div className='space-y-4'>
                  <div className='border rounded-md overflow-hidden'>
                    <div className='bg-muted px-4 py-2 font-medium flex items-center text-sm'>
                      <FileText className='h-4 w-4 mr-2' />
                      <span>{failedNumbers.length} Failed Numbers</span>
                    </div>
                    <div className='max-h-48 overflow-y-auto p-4 space-y-2 text-sm'>
                      {failedNumbers.map((item, index) => (
                        <div key={index} className='flex justify-between'>
                          <span>{item.phoneNumber}</span>
                          <span className='text-muted-foreground'>
                            {item.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className='space-y-2'>
                    <Label htmlFor='retry-message'>
                      Message Text (Optional)
                    </Label>
                    <textarea
                      id='retry-message'
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className='flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                      placeholder='Leave empty to use previous message'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='retry-attachment'>
                      New Attachment (Optional)
                    </Label>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        onClick={handleAttachmentUploadClick}
                        className='w-full h-16 flex items-center justify-center border-dashed'
                      >
                        <Paperclip className='h-4 w-4 mr-2' />
                        <span>
                          {attachmentFile
                            ? attachmentFile.name
                            : 'Click to upload attachment'}
                        </span>
                      </Button>
                      <input
                        id='retry-attachment'
                        type='file'
                        onChange={handleAttachmentFileChange}
                        ref={attachmentFileInputRef}
                        className='hidden'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='retry-delay'>
                      Delay Between Messages (ms)
                    </Label>
                    <Input
                      id='retry-delay'
                      type='number'
                      value={delay}
                      onChange={(e) => setDelay(Number(e.target.value))}
                      min={1000}
                      max={10000}
                      step={500}
                    />
                  </div>
                </div>
              ) : (
                <div className='py-6 text-center text-muted-foreground'>
                  No failed numbers found. All messages were sent successfully.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleRetryFailed}
                disabled={failedNumbers.length === 0 || isLoading}
                className='w-full'
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <Send className='h-4 w-4 mr-2' />
                )}
                Retry Failed Numbers
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Sending</DialogTitle>
            <DialogDescription>
              You are about to start sending messages to all phone numbers in
              the CSV file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2'>
            <div className='flex justify-between'>
              <span className='font-medium'>CSV File:</span>
              <span>{csvFile?.name}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-medium'>Attachment:</span>
              <span>{attachmentFile?.name || 'None'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-medium'>Delay:</span>
              <span>{delay}ms</span>
            </div>
          </div>
          <DialogFooter className='flex space-x-2 sm:space-x-0'>
            <Button
              variant='outline'
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleStartSending} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : (
                'Confirm and Start'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
