import { LayoutDashboard, Users, Wrench, FileText, FileSpreadsheet, Settings, UserRound, Shield, Bell, HelpCircle, Activity, Package, Gift } from 'lucide-react';

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
      { label: 'Register Garage', href: '/admin/garages/register', slug: 'register-garage' },
      { label: 'Suspended Garages', href: '/admin/garages/suspended', slug: 'suspended-garages' },
    ]
  },
  { label: 'Orders', icon: Package, href: '/admin/orders', slug: 'orders' },
  { label: 'Customer Management', icon: Users, href: '/admin/users', slug: 'users' },
  { 
    label: 'Service History', 
    icon: FileText, 
    href: '/admin/service-history',
    slug: 'service-history'
  },
  { label: 'Bookings', icon: FileSpreadsheet, href: '/admin/bookings', slug: 'bookings' },
  { label: 'Requests', icon: FileSpreadsheet, href: '/admin/requests', slug: 'requests' },
  { label: 'Quotes', icon: FileSpreadsheet, href: '/admin/quotes', slug: 'quotes' },
  { label: 'Reviews', icon: FileSpreadsheet, href: '/admin/reviews', slug: 'reviews' },
  { label: 'Notifications', icon: Bell, href: '/admin/notifications', slug: 'notifications' },
  { label: 'Profile', icon: UserRound, href: '/admin/profile', slug: 'profile' },
  { label: 'Settings', icon: Settings, href: '/admin/settings', slug: 'settings' },
  { label: 'Referrals', icon: Gift, href: '/admin/referrals', slug: 'referrals' },
];
