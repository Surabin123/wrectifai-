import { LayoutDashboard, Inbox, CheckCircle, XCircle, FileText, Users, CheckSquare, UserRound, Settings, CalendarDays, History, Star, Package, HelpCircle, ClipboardList } from 'lucide-react';
import type { NavItem } from '@/components/home/data';

export const garageNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/garage/dashboard', slug: 'dashboard' },
  { label: 'Incoming Requests', icon: Inbox, href: '/garage/incoming-requests', slug: 'incoming-requests' },
  { label: 'Bookings', icon: CalendarDays, href: '/garage/bookings', slug: 'bookings' },
  { label: 'Quotes', icon: FileText, href: '/garage/quotes', slug: 'quotes' },
  { label: 'Orders', icon: Package, href: '/garage/orders', slug: 'orders' },
  { label: 'Catalog Requests', icon: ClipboardList, href: '/garage/requests', slug: 'requests' },
  { label: 'Refund Requests', icon: ClipboardList, href: '/garage/refund-requests', slug: 'refund-requests' },
  { label: 'Offers & Promos', icon: Star, href: '/garage/offers', slug: 'offers' },
  { label: 'Service History', icon: History, href: '/garage/service-history', slug: 'service-history' },
  { label: 'Customers', icon: Users, href: '/garage/customers', slug: 'customers' },
  { label: 'Reviews', icon: Star, href: '/garage/reviews', slug: 'reviews' },
  { label: 'Profile', icon: UserRound, href: '/garage/profile', slug: 'profile' },
  { label: 'Settings', icon: Settings, href: '/garage/settings', slug: 'settings' },
  { label: 'Help & Support', icon: HelpCircle, href: '/garage/help', slug: 'help' },
];
