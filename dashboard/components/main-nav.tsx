'use client';

import Link from 'next/link';
import { MessageSquare, BarChartBig, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className='mr-4 flex items-center space-x-4 lg:space-x-6'>
      <div className='hidden items-center space-x-4 md:flex'>
        <Link
          href='/'
          className={cn(
            'flex items-center text-sm font-medium transition-colors hover:text-primary',
            pathname === '/' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <BarChartBig className='mr-2 h-4 w-4' />
          Dashboard
        </Link>
        <Link
          href='/sender'
          className={cn(
            'flex items-center text-sm font-medium transition-colors hover:text-primary',
            pathname === '/sender' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <MessageSquare className='mr-2 h-4 w-4' />
          Message Sender
        </Link>
        <Link
          href='/settings'
          className={cn(
            'flex items-center text-sm font-medium transition-colors hover:text-primary',
            pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Settings className='mr-2 h-4 w-4' />
          Settings
        </Link>
      </div>
    </div>
  );
}
