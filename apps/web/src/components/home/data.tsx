import type { LucideIcon } from 'lucide-react';
import {
  BatteryCharging,
  Bell,
  CalendarCheck,
  CalendarDays,
  CarFront,
  CircleHelp,
  Disc3,
  FileText,
  Fuel,
  Heart,
  House,
  Gift,
  Lightbulb,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Tag,
  Truck,
  UserRound,
  Wallet,
  Wrench,
  ShoppingCart
} from 'lucide-react';


export type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  slug: string;
  chevron?: boolean;
};

export type IconLink = {
  icon: LucideIcon;
  href: string;
  label: string;
  badge?: string;
};

export const navItems: NavItem[] = [
  { label: 'Home', icon: House, href: '/', slug: 'home' },
  { label: 'WrectifAI Diagnose', icon: Sparkles, href: '/ai-diagnose', slug: 'ai-diagnose' },
  { label: 'Services', icon: Wrench, href: '/services', slug: 'services' },
  { label: 'Shop', icon: ShoppingBag, href: '/shop', slug: 'shop' },
  { label: 'Garages', icon: CalendarDays, href: '/garages', slug: 'garages' },
  { label: 'Bookings', icon: CalendarCheck, href: '/bookings', slug: 'bookings' },
  { label: 'Quotes', icon: FileText, href: '/quotes', slug: 'quotes' },
  { label: 'Vehicles', icon: CarFront, href: '/vehicles', slug: 'vehicles' },
  { label: 'Offers', icon: Tag, href: '/offers', slug: 'offers' },
  { label: 'Car Tips', icon: Lightbulb, href: '/car-tips', slug: 'car-tips' },
  { label: 'Wallet & Payments', icon: Wallet, href: '/wallet-payments', slug: 'wallet-payments' },
  { label: 'Profile', icon: UserRound, href: '/profile', slug: 'profile' },
  { label: 'Settings', icon: Settings, href: '/settings', slug: 'settings' },
  { label: 'Help & Support', icon: CircleHelp, href: '/help-support', slug: 'help-support' },
];

export const categoryItems = [
  { label: 'Repair Services', icon: Wrench, href: '/shop', image: '/assets/repair-services.png' },
  { label: 'Maintenance', icon: Fuel, href: '/shop', image: '/assets/maintenance.svg' },
  { label: 'Parts & Components', icon: Settings, href: '/shop', image: '/assets/Parts and components.png' },
  { label: 'Tyres & Wheels', icon: Disc3, href: '/shop', image: '/assets/tyres_and_wheels.png' },
  { label: 'Car Care & Detailing', icon: Sparkles, href: '/shop', image: '/assets/car-care.svg' },
  { label: 'Insurance', icon: ShieldCheck, href: '/shop', image: '/assets/isurance.svg' },
  { label: 'Accessories & Upgrades', icon: CarFront, href: '/shop', image: '/assets/Accessories.png' },
];

export const maintenanceItems = [
  { label: 'Engine Oil Change', due: 'Due in 1,500 KM', icon: Fuel, href: '#garages', image: '/assets/Engine_oil.png' },
  { label: 'AC Checkup', due: 'Due in 20 Days', icon: Snowflake, href: '#garages', image: '/assets/new_ac.png' },
  { label: 'Brake Inspection', due: 'Due in 15 Days', icon: Disc3, href: '#garages', image: '/assets/Brake_inspection.png' },
  { label: 'Tyre Rotation', due: 'Due in 3,000 KM', icon: Truck, href: '#garages', image: '/assets/Tyre_rotataion.png' },
  { label: 'Battery Check', due: 'Due in 30 Days', icon: BatteryCharging, href: '#garages', image: '/assets/Battery_Check.png' },
];



export const careTips = [
  {
    title: 'Check tyre pressure regularly for better mileage and safety.',
    icon: Disc3,
    href: '#maintenance',
    image: '/assets/tyre_gauge_1778070752781.png',
  },
  {
    title: 'Change engine oil every 5,000-7,000 km for optimal performance.',
    icon: Fuel,
    href: '#maintenance',
    image: '/assets/oil_pour_1778070767058.png',
  },
  {
    title: 'Use quality coolant to keep your engine from overheating.',
    icon: BatteryCharging,
    href: '#maintenance',
    image: '/assets/summer_combo_1778070704538.png',
  },
  {
    title: 'Replace wiper blades every 6-12 months for clear visibility.',
    icon: Sparkles,
    href: '#maintenance',
    image: '/assets/wiper_blade_1778070781712.png',
  },
  {
    title: 'Check battery health regularly, especially before long drives.',
    icon: BatteryCharging,
    href: '#maintenance',
    image: '/assets/winter_combo_1778070734722.png',
  },
  {
    title: 'Clean AC vents often to improve airflow and reduce cabin odor.',
    icon: Snowflake,
    href: '#maintenance',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=200&q=80',
  },
  {
    title: 'Inspect brake pads early if you hear squealing while driving.',
    icon: Disc3,
    href: '#maintenance',
    image: '/assets/brake_disc_1778070670609.png',
  },
];



export const emergencyItems = [
  { title: 'Roadside Assistance', image: '/assets/roadside_assistance.png', href: 'tel:+919999999999', imageClass: 'h-10 w-10' },
  { title: 'Tow Truck', image: '/assets/tow_truck.png', href: 'tel:+919999999999', imageClass: 'h-10 w-10' },
  { title: 'Battery Jump\u00A0Start', image: '/assets/battery_jump_start.png', href: 'tel:+919999999999', imageClass: 'h-8 w-8' },
  { title: 'Call Support', image: '/assets/call.jpg', href: 'tel:+919999999999', imageClass: 'h-8 w-8' },
];



export const topNavIcons: IconLink[] = [
  { icon: Bell, href: '/notifications', label: 'Notifications' },
  { icon: ShoppingBag, href: '/cart', label: 'Cart' },
  { icon: Heart, href: '/wishlist', label: 'Wishlist' },
];

export type Garage = {
  id?: string;
  badge?: string;
  name: string;
  rating: number;
  reviews: number;
  location: string;
  distance?: string;
  price?: string;
  image?: string;
  href: string;
};
