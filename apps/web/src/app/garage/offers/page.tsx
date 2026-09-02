import { GarageOffersContent } from '@/pages/garage/garage-offers-content';
import { AuthGuard } from '@/components/common/auth-guard';
import { RoleGuard } from '@/components/common/role-guard';
import { GarageLayout } from '@/components/layout/garage-layout';

export default function GarageOffersPage() {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['garage', 'admin']}>
        <GarageLayout>
          <GarageOffersContent />
        </GarageLayout>
      </RoleGuard>
    </AuthGuard>
  );
}
