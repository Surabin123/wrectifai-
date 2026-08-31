'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/utils/cn';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export function DashboardHeader({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const updateNotifications = async () => {
      try {
        const { apiClient } = await import('@/lib/api-client');
        let url = '/notifications';
        if (user.roles?.includes('garage') && (user as any).garageId) {
          url += `?garageId=${(user as any).garageId}`;
        }
        const res = await apiClient<any[]>(url);
        if (Array.isArray(res)) {
          setUnreadCount(res.filter((n: any) => !n.is_read).length);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    
    updateNotifications();
    const interval = setInterval(updateNotifications, 15000);
    window.addEventListener('notifications-updated', updateNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', updateNotifications);
    };
  }, [user]);

  const basePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/garage') ? '/garage' : '';

  return (
    <header className="flex w-full items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Optional Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#dbe6ff] bg-white text-[#1a56db] shadow-sm lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        {title && (
          <h1 className="hidden text-xl font-bold text-[#17307a] lg:block">{title}</h1>
        )}
      </div>

      {/* Right: Notifications & User Profile Dropdown */}
      <div className="flex items-center ml-auto gap-4">
        {/* Notification Bell */}
        {user && basePath && (
          <Link
            href={`${basePath}/notifications`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe6ff] bg-white text-[#17307a] hover:bg-[#f5f8ff] transition-colors shadow-sm"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* Profile Dropdown */}
        {user && (
          <div className="relative group ml-[5px]">
            <button className="flex h-9 lg:h-10 shrink-0 items-center gap-2 rounded-full border border-[#dbe6ff] bg-white p-0.5 lg:py-1 lg:pl-1.5 lg:pr-3 hover:bg-[#fcfdff] transition-all shadow-sm focus:outline-none">
              <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-[#1a56db] text-white font-bold text-sm">
                {(user.garageName || user.name) ? (user.garageName || user.name)!.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden text-[13px] font-semibold text-[#17307a] lg:block">Hi, {user.garageName || user.name}</span>
              <ChevronDown className="hidden h-4 w-4 text-[#17307a] lg:block group-hover:rotate-180 transition-transform duration-200" />
            </button>
            <div className="absolute right-0 top-full pt-2 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="bg-white border border-[#e4ecff] rounded-xl shadow-lg p-1.5">
                <button
                  onClick={() => {
                    const path = window.location.pathname;
                    const basePathLocal = path.startsWith('/admin') ? '/admin' : path.startsWith('/garage') ? '/garage' : '';
                    router.push(`${basePathLocal}/profile`);
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold text-[#1a56db] hover:bg-[#f2f6ff] rounded-lg transition-colors border-b border-[#f2f6ff] mb-1"
                >
                  View Profile
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
