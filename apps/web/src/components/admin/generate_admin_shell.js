const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, content.trim() + '\n', 'utf8');
};

const srcDir = 'd:/WRECTIFIAI/wrectifai/apps/web/src';

// 1. Admin Config
write(`${srcDir}/lib/admin-config.ts`, `
import { LayoutDashboard, Users, Wrench, FileText, FileSpreadsheet, Settings, UserRound, Shield, Bell, HelpCircle, Activity } from 'lucide-react';

export type AdminNavItem = {
  label: string;
  icon?: any;
  href?: string;
  slug?: string;
  children?: AdminNavItem[];
};

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', slug: 'dashboard' },
  { 
    label: 'Garage Management', 
    icon: Wrench,
    slug: 'garages',
    children: [
      { label: 'All Garages', href: '/admin/garages', slug: 'all-garages' },
      { label: 'Pending Approvals', href: '/admin/garages/pending-approvals', slug: 'pending-approvals' },
      { label: 'Register Garage', href: '/admin/garages/register', slug: 'register-garage' },
      { label: 'Suspended Garages', href: '/admin/garages/suspended', slug: 'suspended-garages' },
    ]
  },
  { label: 'Customer Management', icon: Users, href: '/admin/users', slug: 'users', children: [] },
  { label: 'Service Requests', icon: FileText, href: '/admin/service-requests', slug: 'service-requests' },
  { label: 'Bookings', icon: FileSpreadsheet, href: '/admin/bookings', slug: 'bookings' },
  { label: 'Quotes', icon: FileSpreadsheet, href: '/admin/quotes', slug: 'quotes' },
  { label: 'Reports & Analytics', icon: Shield, href: '/admin/reports', slug: 'reports', children: [] },

  { label: 'Notifications', icon: Bell, href: '/admin/notifications', slug: 'notifications' },
  { label: 'Audit Logs', icon: Activity, href: '/admin/audit', slug: 'audit' },
  { label: 'Profile', icon: UserRound, href: '/admin/profile', slug: 'profile' },
  { label: 'Settings', icon: Settings, href: '/admin/settings', slug: 'settings' },
];
`);

// 2. Admin Sidebar
write(`${srcDir}/components/admin/admin-sidebar.tsx`, `
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/common/button';
import { adminNavItems, AdminNavItem } from '@/lib/admin-config';
import { cn } from '@/utils/cn';

export function AdminSidebar({
  collapsed,
  onToggle,
  onMobileClose,
  hideBottomWidget,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
  hideBottomWidget?: boolean;
}) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'garages': true // Default open
  });

  const toggleMenu = (slug: string) => {
    setExpandedMenus(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-[#e4ecff] bg-white p-2 pb-1.5 transition-[width,padding] duration-300',
        collapsed ? 'px-2' : 'px-2.5'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-24 hidden h-8 w-8 items-center justify-center rounded-full border border-[#dbe6ff] bg-white text-[#1a56db] shadow-[0_10px_22px_rgba(19,42,93,0.14)] transition-colors hover:bg-[#f5f8ff] lg:flex"
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn(
          'flex items-center justify-between',
          collapsed ? 'mb-3.5 pt-1' : 'mb-1.5'
        )}
      >
        <Link
          href="/"
          className={cn(
            'transition-all',
            collapsed
              ? 'flex justify-center px-0'
              : 'flex flex-1 items-center justify-center px-0'
          )}
        >
          {collapsed ? (
            <div className="relative h-[28px] w-[45px] overflow-hidden">
              <Image
                src="/fin_logo.png"
                alt="WrectifAI"
                width={1024}
                height={1024}
                priority
                className="absolute left-0 top-[2px] h-[45px] w-[45px] object-contain"
                style={{ width: '45px', height: '45px' }}
              />
            </div>
          ) : (
            <div className="relative h-[62px] w-full overflow-hidden">
              <Image
                src="/fin_logo.png"
                alt="WrectifAI"
                width={1024}
                height={1024}
                priority
                className="absolute left-0 top-[-38px] h-[150px] w-full object-contain object-center"
                style={{ width: '100%', height: '150px' }}
              />
            </div>
          )}
        </Link>
        <button
          className="absolute right-2 top-2 lg:hidden p-2 text-[#17307a] hover:bg-[#f5f8ff] rounded-full"
          onClick={onMobileClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-0.5 flex flex-col gap-[3px] overflow-x-hidden overflow-y-auto pr-0.5 pb-0.5 [scrollbar-width:thin] [scrollbar-color:#e4ecff_transparent] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#e4ecff] hover:[&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-track]:bg-transparent">
        {adminNavItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          
          // Check if parent or any child is active
          const isExactActive = pathname === item.href;
          const isChildActive = hasChildren ? item.children?.some(child => pathname === child.href) : false;
          const isAnyActive = isExactActive || isChildActive || (item.slug === 'garages' && pathname?.includes('/admin/garages'));
          
          // Garage management should look active if we are on any garage route
          const displayActive = isAnyActive && !hasChildren;
          const parentActiveState = isAnyActive && hasChildren;
          
          const isExpanded = expandedMenus[item.slug || ''] || parentActiveState;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(item.slug || '')}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex h-[32px] w-full shrink-0 items-center gap-2 rounded-[8px] px-2 text-left text-[12px] font-semibold transition-colors',
                    collapsed &&
                      'mx-auto h-[32px] w-[32px] min-w-[28px] justify-center px-0',
                    parentActiveState
                      ? 'bg-[#1a56db] text-white shadow-[0_6px_12px_rgba(26,86,219,0.2)]'
                      : 'text-[#17307a] hover:bg-[#f5f8ff]'
                  )}
                >
                  {item.icon && <item.icon
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={parentActiveState ? 2.2 : 1.7}
                  />}
                  <span
                    className={cn(
                      'whitespace-nowrap flex-1',
                      collapsed && 'hidden'
                    )}
                  >
                    {item.label}
                  </span>
                  {!collapsed && (
                    isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 opacity-70" /> : <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href || '#'}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex h-[32px] shrink-0 items-center gap-2 rounded-[8px] px-2 text-left text-[12px] font-semibold transition-colors',
                    collapsed &&
                      'mx-auto h-[32px] w-[32px] min-w-[28px] justify-center px-0',
                    displayActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-[#17307a] hover:bg-[#f5f8ff]'
                  )}
                >
                  {item.icon && <item.icon
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={displayActive ? 2.2 : 1.7}
                  />}
                  <span
                    className={cn(
                      'whitespace-nowrap flex-1',
                      collapsed && 'hidden'
                    )}
                  >
                    {item.label}
                  </span>
                  {item.children && !collapsed && <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />}
                </Link>
              )}

              {hasChildren && isExpanded && !collapsed && (
                <div className="mt-1 ml-6 space-y-1">
                  {item.children?.map(child => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.label}
                        href={child.href || '#'}
                        className={cn(
                          "flex h-[30px] items-center gap-2 rounded-[8px] px-3 text-[12px] font-semibold",
                          childActive ? "bg-[#f2f5ff] text-[#2451f6]" : "text-[#5f7099] hover:bg-[#f8faff]"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", childActive ? "bg-[#2451f6]" : "bg-slate-300")} />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!hideBottomWidget && (
        <div className="mt-2 shrink-0 border-t border-slate-100 pt-3">
          {!collapsed && (
            <div className="relative overflow-hidden rounded-[14px] bg-[#f3f7ff] p-4 shadow-none">
               <h2 className="text-[12.5px] font-bold text-[#17307a] tracking-tight mb-1">
                 Grow WrectifAI
               </h2>
               <p className="text-[10.5px] font-normal leading-snug text-slate-500 mb-3">
                 More garages, more services, happier customers.
               </p>
               <Button
                 asChild
                 className="h-[28px] w-fit rounded-[6px] bg-[#1a56db] font-semibold hover:bg-[#1a56db]/90 text-[11px] px-4 shadow-none"
                 size="sm"
               >
                 <Link href="/admin/reports">View Reports</Link>
               </Button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
`);

// 3. Admin Dashboard Shell
write(`${srcDir}/components/admin/admin-dashboard-shell.tsx`, `
'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { cn } from '@/utils/cn';

export function AdminDashboardShell({
  header,
  children,
  aside,
  hideBottomWidget,
}: {
  header?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  hideBottomWidget?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = () => {
    setCollapsed((current) => !current);
  };

  useEffect(() => {
    const handleToggleMobile = () => setMobileOpen((curr) => !curr);
    window.addEventListener('toggle-mobile-sidebar', handleToggleMobile);
    return () =>
      window.removeEventListener('toggle-mobile-sidebar', handleToggleMobile);
  }, []);

  return (
    <main id="top" className="min-h-screen bg-[#f6f8fe]">
      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4 lg:px-5 lg:h-screen lg:overflow-hidden lg:py-4">
        <div
          className={cn(
            'grid gap-4 lg:h-full lg:gap-0 lg:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]'
          )}
          style={
            {
              '--sidebar-width': collapsed ? '84px' : '248px',
            } as CSSProperties
          }
        >
          {mobileOpen ? (
            <div
              className="fixed inset-0 z-[60] bg-[#0a122d]/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          ) : null}

          <div
            className={cn(
              'fixed inset-y-0 left-0 z-[70] w-[280px] transform transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-auto lg:transform-none lg:sticky lg:top-0 lg:h-screen',
              mobileOpen
                ? 'translate-x-0'
                : '-translate-x-full lg:translate-x-0'
            )}
          >
            <AdminSidebar
              collapsed={collapsed}
              onToggle={handleToggle}
              onMobileClose={() => setMobileOpen(false)}
              hideBottomWidget={hideBottomWidget}
            />
          </div>

          <div className="flex min-h-0 flex-col gap-4 lg:h-full lg:overflow-y-auto lg:px-4 lg:pr-1">
            {header ? <div>{header}</div> : null}
            <div
              className={cn(
                'grid gap-4 lg:items-start lg:gap-4',
                aside ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-1'
              )}
            >
              <div className="min-w-0">{children}</div>
              {aside ? <div className="min-w-0">{aside}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
`);

// 4. Update admin/layout.tsx
write(`${srcDir}/app/admin/layout.tsx`, `
'use client';

import { RoleGuard } from '@/components/common/role-guard';
import { AdminDashboardShell } from '@/components/admin/admin-dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminDashboardShell hideBottomWidget={false} header={<DashboardHeader />}>
        {children}
      </AdminDashboardShell>
    </RoleGuard>
  );
}
`);
