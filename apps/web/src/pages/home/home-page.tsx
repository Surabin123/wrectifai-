'use client';


import { DashboardShell } from '@/components/home/dashboard-shell';
import { MainContent } from '@/components/home/main-content';
import { RightPanel } from '@/components/home/right-panel';
import { TopNavbar } from '@/components/home/top-navbar';

export function HomePage() {
  return (
    <DashboardShell header={<TopNavbar />} aside={<RightPanel />}>
      <MainContent />
    </DashboardShell>
  );
}

export default HomePage;
