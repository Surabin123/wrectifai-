'use client';

import { RoleGuard } from '@/components/common/role-guard';
import { AdminDashboardShell } from '@/components/admin/admin-dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminDashboardShell hideBottomWidget={true} header={<DashboardHeader />}>
        {children}
      </AdminDashboardShell>
    </RoleGuard>
  );
}
