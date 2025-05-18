import { Suspense } from 'react';

import { Header } from '@/components/header';
import { SenderForm } from '@/components/sender-form';

export default function SenderPage() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-6'>
        <h1 className='text-3xl font-bold mb-6'>Message Sender</h1>
        <Suspense>
          <SenderForm />
        </Suspense>
      </main>
    </div>
  );
}
