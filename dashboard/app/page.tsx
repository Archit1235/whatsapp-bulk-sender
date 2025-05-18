import { Header } from '@/components/header';
import { DashboardContent } from '@/components/dashboard-content';

export default function DashboardPage() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-6'>
        <h1 className='text-3xl font-bold mb-6'>Dashboard</h1>
        <DashboardContent />
      </main>
    </div>
  );
}
