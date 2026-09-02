'use client';
import { GarageOffersContent } from '@/pages/garage/garage-offers-content';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';

export default function GarageOffersPage() {
  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6">
          <GarageOffersContent />
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
