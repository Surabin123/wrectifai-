'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

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
  const [profileSetupRequired, setProfileSetupRequired] = useState(false);

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
      const onSharedPath = pathname?.startsWith('/shop') || pathname?.startsWith('/cart') || pathname?.startsWith('/orders');
      
      // If a path is not admin, garage, root, public, or shared, it's considered a customer path
      const onCustomerPath = !onAdminPath && !onGaragePath && !isRoot && !isPublicPath && !onSharedPath;

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

      // 2. Garage Security - Garage can only access garage paths and shared paths
      if (primaryRole === 'garage' && !onGaragePath && !onSharedPath && !isRoot) {
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

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.roles?.includes('customer') || pathname === '/profile') {
      setProfileSetupRequired(false);
      return;
    }
    setProfileSetupRequired(sessionStorage.getItem('wrectifai_profile_setup_required') === 'true');
  }, [pathname, user]);

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

  return (
    <>
      {children}
      {profileSetupRequired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#17307a]">Complete your profile</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add your city and contact details before booking services, requesting quotes, or placing product orders.
            </p>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="mt-5 w-full rounded-lg bg-[#1a56db] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1546b5]"
            >
              Complete Profile
            </button>
          </div>
        </div>
      )}
    </>
  );
}
