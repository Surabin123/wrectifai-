'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function dashboardForRole(roles: string[] = []): string {
  if (roles.includes('admin')) return '/admin/dashboard';
  if (roles.includes('garage')) return '/garage/dashboard';
  return '/dashboard';
}

export default function RootPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated && user ? dashboardForRole(user.roles) : '/login');
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fe]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#1a56db]" />
    </div>
  );
}
