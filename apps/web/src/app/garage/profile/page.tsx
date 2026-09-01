'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { GarageProfileContent } from '@/pages/garage/garage-profile-content';

export default function ProfilePage() {
  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-900">Garage Profile</h1>
          </div>
          <GarageProfileContent />
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
