'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { SettingsContent } from '@/pages/settings/settings-content';

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6">
          <div className="mb-6">
             <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
             <p className="text-sm text-slate-500">Manage your garage, application preferences and system settings.</p>
          </div>
          <SettingsContent />
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
