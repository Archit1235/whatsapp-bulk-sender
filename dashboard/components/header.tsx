'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { MainNav } from './main-nav';

export function Header() {
  return (
    <header className='sticky top-0 z-40 border-b bg-background'>
      <div className='container flex h-16 items-center'>
        <Link href='/' className='flex items-center space-x-2'>
          <MessageSquare className='h-6 w-6' />
          <span className='font-bold'>WhatsApp Bulk Sender</span>
        </Link>
        <div className='ml-auto flex items-center space-x-4'>
          <MainNav />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
