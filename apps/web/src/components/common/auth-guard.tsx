'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

function noop() {
  return noop;
}

function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = pathname === '/login' || pathname === '/signup' || pathname === '/';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPath) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user) {
      const roles = user.roles || [];
      const isAdmin = roles.includes('admin');
      const isGarage = roles.includes('garage');
      const isCustomer = roles.includes('customer') || roles.includes('user');

      // Determine the primary role to enforce strict isolation
      // If a user has both 'garage' and 'customer' roles, they are fundamentally a garage owner in the context of this app.
      let primaryRole = 'customer';
      if (isAdmin) primaryRole = 'admin';
      else if (isGarage) primaryRole = 'garage';

      const onAdminPath = pathname?.startsWith('/admin');
      const onGaragePath = pathname?.startsWith('/garage/') || pathname === '/garage';
      const isRoot = pathname === '/';
      
      // If a path is not admin, garage, root, or public, it's considered a customer path
      const onCustomerPath = !onAdminPath && !onGaragePath && !isRoot && !isPublicPath;

      // 0. Public Path Redirects (Authenticated user lands on login/signup)
      if (isPublicPath) {
        if (primaryRole === 'admin') {
          router.replace('/admin/dashboard');
          return;
        }
        if (primaryRole === 'garage') {
          router.replace('/garage/dashboard');
          return;
        }
        router.replace('/');
        return;
      }

      // 1. Admin Security - Admin can only access admin paths
      if (primaryRole === 'admin' && !onAdminPath && !isRoot) {
         router.replace('/admin/dashboard');
         return;
      }
      if (onAdminPath && primaryRole !== 'admin') {
        if (primaryRole === 'garage') router.replace('/garage/dashboard');
        else router.replace('/');
        return;
      }

      // 2. Garage Security - Garage can only access garage paths
      if (primaryRole === 'garage' && !onGaragePath && !isRoot) {
         router.replace('/garage/dashboard');
         return;
      }
      if (onGaragePath && primaryRole !== 'garage') {
        if (primaryRole === 'admin') router.replace('/admin/dashboard');
        else router.replace('/');
        return;
      }

      // 3. Customer Security
      if (onCustomerPath && primaryRole !== 'customer') {
        if (primaryRole === 'admin') router.replace('/admin/dashboard');
        else router.replace('/garage/dashboard');
        return;
      }

      // 4. Root Route Redirects
      if (isRoot) {
        if (primaryRole === 'admin') {
          router.replace('/admin/dashboard');
          return;
        }
        if (primaryRole === 'garage') {
          router.replace('/garage/dashboard');
          return;
        }
        if (primaryRole === 'customer') {
          router.replace('/dashboard');
          return;
        }
      }
    }
  }, [isLoading, isAuthenticated, user, isPublicPath, router, pathname]);

  if (isLoading) {
    if (isPublicPath) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfe]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a56db]"></div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfe]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a56db]"></div>
      </div>
    );
  }

  return <>{children}</>;
}
