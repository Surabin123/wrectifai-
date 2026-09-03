'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Battery,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Disc3,
  Gauge,
  Home,
  Percent,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Sun,
  CloudRain,
  Tag,
  Wrench,
  X,
  Sparkles,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Modal } from '@/components/common/modal';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { apiClient } from '@/lib/api-client';
import { fetchPromos } from '@/lib/garages-api';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/utils/cn';
import { getPromoTheme } from '@/utils/promo-theme';

type DealCategory =
  | 'All Deals'
  | 'Car Care'
  | 'Service'
  | 'Parts & Accessories'
  | 'Tyres'
  | 'Batteries'
  | 'Combo Deals';

type SortOption =
  | 'Most Relevant'
  | 'Price: Low to High'
  | 'Price: High to Low'
  | 'Highest Discount'
  | 'Most Used';

type DealItem = {
  id: string;
  badge: string;
  badgeColor: string;
  icon: LucideIcon;
  title: string;
  bullets: string[];
  pricePrefix?: string;
  displayPrice: string;
  numericPrice: number;
  strikePrice?: string;
  strikePriceLineThrough?: boolean;
  discountLabel?: string;
  discountPercent: number;
  validTill: string;
  usedCount: string;
  usedCountValue: number;
  image: string;
  imageClassName: string;
  cardTint: string;
  bgColor: string;
  imageGlow: string;
  accent: string;
  categories: Exclude<DealCategory, 'All Deals'>[];
  isCombo: boolean;
  relevance: number;
};

const dealFilters: { label: DealCategory | 'More Filters'; displayLabel: string; icon?: LucideIcon }[] = [
  { label: 'All Deals', displayLabel: 'All Deals' },
  { label: 'Car Care', displayLabel: 'Car Care', icon: CarFront },
  { label: 'Service', displayLabel: 'Service', icon: Wrench },
  { label: 'Parts & Accessories', displayLabel: 'Parts & Accessories', icon: ShieldCheck },
  { label: 'Tyres', displayLabel: 'Tyres', icon: Gauge },
  { label: 'Batteries', displayLabel: 'Batteries', icon: Battery },
  { label: 'Combo Deals', displayLabel: 'Combo Deals', icon: Percent },
  { label: 'More Filters', displayLabel: 'More Filters', icon: SlidersHorizontal },
];

const baseDeals: DealItem[] = [
  {
    id: 'summer-care-combo',
    badge: 'SUMMER CARE COMBO',
    badgeColor: 'text-[#ff7a00]',
    icon: Sun,
    title: 'Coolant + AC + Engine Oil Combo',
    bullets: ['Improves engine cooling', 'Enhances AC performance', 'Extends engine life'],
    displayPrice: '$2,999',
    numericPrice: 2999,
    strikePrice: '$4,500',
    strikePriceLineThrough: true,
    discountLabel: '33% OFF',
    discountPercent: 33,
    validTill: '30 Apr 2025',
    usedCount: '1.2K times',
    usedCountValue: 1200,
    image: '/assets/summner_car.png',
    imageClassName: 'h-[148px] w-[178px] object-contain',
    cardTint: 'from-[#fffaf0] via-[#fffaf5] to-[#fff4e7]',
    bgColor: '#fff7ed',
    imageGlow: 'bg-[radial-gradient(circle_at_75%_45%,rgba(255,160,64,0.28),transparent_36%)]',
    accent: 'text-[#f04f23]',
    categories: ['Car Care', 'Service', 'Combo Deals'],
    isCombo: true,
    relevance: 99,
  },
  {
    id: 'monsoon-care-combo',
    badge: 'MONSOON CARE COMBO',
    badgeColor: 'text-[#1c9b6e]',
    icon: CloudRain,
    title: 'Wiper Blades + Tyres + Checkup Combo',
    bullets: ['Clear visibility in rain', 'Better grip on wet roads', 'Comprehensive vehicle check'],
    displayPrice: '$1,999',
    numericPrice: 1999,
    strikePrice: '$3,000',
    strikePriceLineThrough: true,
    discountLabel: '33% OFF',
    discountPercent: 33,
    validTill: '15 May 2025',
    usedCount: '986 times',
    usedCountValue: 986,
    image: '/assets/monsooncare.png',
    imageClassName: 'h-[150px] w-[182px] object-cover rounded-[20px]',
    cardTint: 'from-[#f3fffb] via-[#f7fffd] to-[#eef8ff]',
    bgColor: '#f0fdf4',
    imageGlow: 'bg-[radial-gradient(circle_at_72%_42%,rgba(80,178,202,0.26),transparent_38%)]',
    accent: 'text-[#178e56]',
    categories: ['Service', 'Tyres', 'Combo Deals'],
    isCombo: true,
    relevance: 97,
  },
  {
    id: 'winter-care-combo',
    badge: 'WINTER CARE COMBO',
    badgeColor: 'text-[#2454f6]',
    icon: Snowflake,
    title: 'Battery + Engine Oil + Coolant Combo',
    bullets: ['Reliable cold starts', 'Smooth engine performance', 'Prevents overheating'],
    displayPrice: '$2,499',
    numericPrice: 2499,
    strikePrice: '$3,800',
    strikePriceLineThrough: true,
    discountLabel: '34% OFF',
    discountPercent: 34,
    validTill: '31 May 2025',
    usedCount: '754 times',
    usedCountValue: 754,
    image: '/assets/wintercombo.png',
    imageClassName: 'h-[146px] w-[180px] object-contain',
    cardTint: 'from-[#f7fbff] via-[#fbfdff] to-[#eef4ff]',
    bgColor: '#eff6ff',
    imageGlow: 'bg-[radial-gradient(circle_at_76%_48%,rgba(112,147,255,0.22),transparent_36%)]',
    accent: 'text-[#2050ff]',
    categories: ['Batteries', 'Service', 'Combo Deals'],
    isCombo: true,
    relevance: 96,
  },
  {
    id: 'brake-care-special',
    badge: 'BRAKE CARE SPECIAL',
    badgeColor: 'text-[#ff453a]',
    icon: ShieldCheck,
    title: 'Brake Pads + Disc Inspection',
    bullets: ['Enhanced braking safety', 'Smoother performance', 'Expert inspection included'],
    displayPrice: '28% OFF',
    numericPrice: 1299,
    strikePriceLineThrough: false,
    discountPercent: 28,
    validTill: '20 Apr 2025',
    usedCount: '1.1K times',
    usedCountValue: 1100,
    image: '/assets/Brake care.png',
    imageClassName: 'h-[146px] w-[176px] object-contain',
    cardTint: 'from-[#fff6f6] via-[#fffaf9] to-[#fff5f4]',
    bgColor: '#fff5f5',
    imageGlow: 'bg-[radial-gradient(circle_at_76%_42%,rgba(255,96,96,0.16),transparent_34%)]',
    accent: 'text-[#ff2f1d]',
    categories: ['Service', 'Parts & Accessories'],
    isCombo: false,
    relevance: 95,
  },
  {
    id: 'ac-service-offer',
    badge: 'AC SERVICE OFFER',
    badgeColor: 'text-[#2d5bff]',
    icon: Snowflake,
    title: 'AC Checkup + Gas Top-up',
    bullets: ['Better cooling efficiency', 'Gas top-up for optimal performance', 'Expert AC checkup'],
    pricePrefix: 'Starting',
    displayPrice: '$1,199',
    numericPrice: 1199,
    strikePrice: '$1,599',
    strikePriceLineThrough: true,
    discountLabel: '26% OFF',
    discountPercent: 26,
    validTill: '25 Apr 2025',
    usedCount: '893 times',
    usedCountValue: 893,
    image: '/assets/Ac service.png',
    imageClassName: 'h-[148px] w-[176px] object-contain',
    cardTint: 'from-[#f4f8ff] via-[#f8fbff] to-[#eff4ff]',
    bgColor: '#f0f7ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_45%,rgba(105,139,255,0.18),transparent_36%)]',
    accent: 'text-[#2250df]',
    categories: ['Car Care', 'Service'],
    isCombo: false,
    relevance: 94,
  },
  {
    id: 'tyre-special-offer',
    badge: 'TYRE SPECIAL OFFER',
    badgeColor: 'text-[#ff9a00]',
    icon: Gauge,
    title: 'Buy 3 Tyres, Get 1 Free',
    bullets: ['Premium tyre brands', 'Better road grip & safety', 'Long lasting performance'],
    displayPrice: '3+1 FREE',
    numericPrice: 3,
    strikePriceLineThrough: false,
    discountPercent: 25,
    validTill: '10 May 2025',
    usedCount: '642 times',
    usedCountValue: 642,
    image: '/assets/Tyre_special offer.png',
    imageClassName: 'h-[150px] w-[178px] object-contain',
    cardTint: 'from-[#fff8ed] via-[#fffdf8] to-[#fff6e7]',
    bgColor: '#fff8eb',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_42%,rgba(255,190,62,0.18),transparent_36%)]',
    accent: 'text-[#ff7b00]',
    categories: ['Tyres', 'Combo Deals'],
    isCombo: true,
    relevance: 93,
  },
  {
    id: 'battery-special',
    badge: 'BATTERY SPECIAL',
    badgeColor: 'text-[#7a3df3]',
    icon: Battery,
    title: 'Amaron 60Ah Battery',
    bullets: ['36 Months Warranty', 'High Cranking Power', 'Maintenance Free'],
    displayPrice: '$4,999',
    numericPrice: 4999,
    strikePrice: '$6,200',
    strikePriceLineThrough: true,
    discountLabel: '33% OFF',
    discountPercent: 33,
    validTill: '18 Apr 2025',
    usedCount: '512 times',
    usedCountValue: 512,
    image: '/assets/Battery.png',
    imageClassName: 'h-[146px] w-[170px] object-contain',
    cardTint: 'from-[#faf5ff] via-[#fdfbff] to-[#f7f0ff]',
    bgColor: '#faf5ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_42%,rgba(165,108,255,0.18),transparent_36%)]',
    accent: 'text-[#7d2ee6]',
    categories: ['Batteries', 'Parts & Accessories'],
    isCombo: false,
    relevance: 92,
  },
  {
    id: 'detailing-deal',
    badge: 'DETAILING DEAL',
    badgeColor: 'text-[#23a85f]',
    icon: ClipboardList,
    title: 'Premium Car Detailing',
    bullets: ['Interior Deep Cleaning', 'Exterior Polish & Wax', 'Dashboard & Glass Cleaning'],
    displayPrice: '$1,799',
    numericPrice: 1799,
    strikePrice: '$2,499',
    strikePriceLineThrough: true,
    discountLabel: '28% OFF',
    discountPercent: 28,
    validTill: '22 Apr 2025',
    usedCount: '721 times',
    usedCountValue: 721,
    image: '/assets/Detailing deal.png',
    imageClassName: 'h-[150px] w-[182px] object-contain',
    cardTint: 'from-[#f3fff7] via-[#f9fff9] to-[#eefcf3]',
    bgColor: '#f0fdf4',
    imageGlow: 'bg-[radial-gradient(circle_at_76%_46%,rgba(105,205,145,0.18),transparent_36%)]',
    accent: 'text-[#179556]',
    categories: ['Car Care', 'Service'],
    isCombo: false,
    relevance: 91,
  },
  {
    id: 'accessories-deal',
    badge: 'ACCESSORIES DEAL',
    badgeColor: 'text-[#a14cf5]',
    icon: ShieldCheck,
    title: 'Dashcam + Installation',
    bullets: ['Full HD Recording', 'Night Vision Support', 'Professional Installation'],
    displayPrice: '$3,499',
    numericPrice: 3499,
    strikePrice: '$4,999',
    strikePriceLineThrough: true,
    discountLabel: '30% OFF',
    discountPercent: 30,
    validTill: '30 Apr 2025',
    usedCount: '430 times',
    usedCountValue: 430,
    image: '/assets/Accessories (2).png',
    imageClassName: 'h-[140px] w-[176px] object-contain',
    cardTint: 'from-[#fbf6ff] via-[#fefcff] to-[#f8f0ff]',
    bgColor: '#fbf6ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_42%,rgba(177,118,255,0.18),transparent_36%)]',
    accent: 'text-[#933ce6]',
    categories: ['Parts & Accessories'],
    isCombo: false,
    relevance: 90,
  },
  {
    id: 'engine-oil-filter-pack',
    badge: 'SERVICE VALUE PACK',
    badgeColor: 'text-[#2162f2]',
    icon: Wrench,
    title: 'Engine Oil + Oil Filter Replacement',
    bullets: ['Synthetic oil options', 'OEM compatible filter', 'Quick 45 min service'],
    pricePrefix: 'Starting',
    displayPrice: '$1,599',
    numericPrice: 1599,
    strikePrice: '$2,050',
    strikePriceLineThrough: true,
    discountLabel: '22% OFF',
    discountPercent: 22,
    validTill: '14 May 2025',
    usedCount: '688 times',
    usedCountValue: 688,
    image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[142px] w-[170px] object-cover rounded-[20px]',
    cardTint: 'from-[#f2f7ff] via-[#fbfdff] to-[#eef5ff]',
    bgColor: '#f2f7ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_45%,rgba(78,126,255,0.16),transparent_36%)]',
    accent: 'text-[#1e55df]',
    categories: ['Service', 'Car Care'],
    isCombo: false,
    relevance: 89,
  },
  {
    id: 'wheel-alignment-balancing',
    badge: 'TYRE CARE DEAL',
    badgeColor: 'text-[#f59b14]',
    icon: Gauge,
    title: 'Wheel Alignment + Balancing',
    bullets: ['Improved straight-line stability', 'Reduced tyre wear', 'Computerized balancing'],
    displayPrice: '$999',
    numericPrice: 999,
    strikePrice: '$1,399',
    strikePriceLineThrough: true,
    discountLabel: '29% OFF',
    discountPercent: 29,
    validTill: '11 May 2025',
    usedCount: '574 times',
    usedCountValue: 574,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[146px] w-[168px] object-cover rounded-[20px]',
    cardTint: 'from-[#fff8ef] via-[#fffdf8] to-[#fff7ea]',
    bgColor: '#fff8ef',
    imageGlow: 'bg-[radial-gradient(circle_at_72%_44%,rgba(255,178,76,0.16),transparent_36%)]',
    accent: 'text-[#ff8c00]',
    categories: ['Tyres', 'Service'],
    isCombo: false,
    relevance: 88,
  },
  {
    id: 'battery-health-check',
    badge: 'BATTERY CHECK OFFER',
    badgeColor: 'text-[#6d3ef4]',
    icon: Battery,
    title: 'Battery Health Check + Terminal Cleaning',
    bullets: ['Voltage and cranking test', 'Corrosion cleaning', 'Charging system inspection'],
    displayPrice: '$399',
    numericPrice: 399,
    strikePrice: '$699',
    strikePriceLineThrough: true,
    discountLabel: '43% OFF',
    discountPercent: 43,
    validTill: '08 May 2025',
    usedCount: '389 times',
    usedCountValue: 389,
    image: 'https://images.unsplash.com/photo-1635437536607-b8572f443763?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[134px] w-[166px] object-cover rounded-[20px]',
    cardTint: 'from-[#faf5ff] via-[#fffaff] to-[#f6efff]',
    bgColor: '#faf5ff',
    imageGlow: 'bg-[radial-gradient(circle_at_72%_44%,rgba(166,103,255,0.16),transparent_36%)]',
    accent: 'text-[#7b2fe6]',
    categories: ['Batteries', 'Service'],
    isCombo: false,
    relevance: 87,
  },
  {
    id: 'ceramic-coating-lite',
    badge: 'CAR CARE PREMIUM',
    badgeColor: 'text-[#17a46f]',
    icon: CarFront,
    title: 'Ceramic Coating Lite Package',
    bullets: ['Gloss protection layer', 'Hydrophobic finish', 'Two-month paint protection'],
    displayPrice: '$5,999',
    numericPrice: 5999,
    strikePrice: '$7,999',
    strikePriceLineThrough: true,
    discountLabel: '25% OFF',
    discountPercent: 25,
    validTill: '28 May 2025',
    usedCount: '268 times',
    usedCountValue: 268,
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[148px] w-[180px] object-cover rounded-[20px]',
    cardTint: 'from-[#f2fff8] via-[#fcfffd] to-[#eefcf6]',
    bgColor: '#f2fff8',
    imageGlow: 'bg-[radial-gradient(circle_at_76%_42%,rgba(88,198,145,0.18),transparent_36%)]',
    accent: 'text-[#179556]',
    categories: ['Car Care', 'Service'],
    isCombo: false,
    relevance: 86,
  },
  {
    id: 'wiper-visibility-pack',
    badge: 'MONSOON PREP',
    badgeColor: 'text-[#14997e]',
    icon: Snowflake,
    title: 'Wiper Replacement + Washer Fluid Top-up',
    bullets: ['Streak-free windshield clearing', 'Premium washer fluid', 'Quick installation'],
    displayPrice: '$799',
    numericPrice: 799,
    strikePrice: '$1,099',
    strikePriceLineThrough: true,
    discountLabel: '27% OFF',
    discountPercent: 27,
    validTill: '17 May 2025',
    usedCount: '447 times',
    usedCountValue: 447,
    image: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[144px] w-[176px] object-cover rounded-[20px]',
    cardTint: 'from-[#f2fffb] via-[#fcfffe] to-[#effaf8]',
    bgColor: '#f2fffb',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_44%,rgba(83,189,176,0.16),transparent_36%)]',
    accent: 'text-[#178e56]',
    categories: ['Service', 'Parts & Accessories', 'Combo Deals'],
    isCombo: true,
    relevance: 85,
  },
  {
    id: 'seat-cover-combo',
    badge: 'INTERIOR ACCESSORIES',
    badgeColor: 'text-[#9749f1]',
    icon: ShieldCheck,
    title: 'Seat Covers + Steering Cover Combo',
    bullets: ['Custom fit options', 'Premium stitch finish', 'Installation included'],
    displayPrice: '$2,799',
    numericPrice: 2799,
    strikePrice: '$3,999',
    strikePriceLineThrough: true,
    discountLabel: '30% OFF',
    discountPercent: 30,
    validTill: '24 May 2025',
    usedCount: '341 times',
    usedCountValue: 341,
    image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[146px] w-[180px] object-cover rounded-[20px]',
    cardTint: 'from-[#fcf6ff] via-[#fffdfd] to-[#f8f0ff]',
    bgColor: '#fcf6ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_44%,rgba(173,109,255,0.16),transparent_36%)]',
    accent: 'text-[#933ce6]',
    categories: ['Parts & Accessories', 'Combo Deals'],
    isCombo: true,
    relevance: 84,
  },
  {
    id: 'road-trip-inspection',
    badge: 'TRAVEL READY CHECK',
    badgeColor: 'text-[#1d5ef0]',
    icon: ClipboardList,
    title: '25-Point Road Trip Inspection',
    bullets: ['Fluids, brakes and tyres', 'Battery and AC check', 'Travel readiness report'],
    displayPrice: '$699',
    numericPrice: 699,
    strikePrice: '$999',
    strikePriceLineThrough: true,
    discountLabel: '30% OFF',
    discountPercent: 30,
    validTill: '21 May 2025',
    usedCount: '612 times',
    usedCountValue: 612,
    image: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[142px] w-[176px] object-cover rounded-[20px]',
    cardTint: 'from-[#f4f8ff] via-[#fbfdff] to-[#eef4ff]',
    bgColor: '#f4f8ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_44%,rgba(93,133,255,0.16),transparent_36%)]',
    accent: 'text-[#2250df]',
    categories: ['Service', 'Car Care'],
    isCombo: false,
    relevance: 83,
  },
  {
    id: 'alloy-wheel-protect',
    badge: 'WHEEL ACCESSORY DEAL',
    badgeColor: 'text-[#ee8b08]',
    icon: Gauge,
    title: 'Alloy Wheel Protectant + Polish',
    bullets: ['Protects from brake dust', 'Restores wheel shine', 'Quick same-day service'],
    displayPrice: '$899',
    numericPrice: 899,
    strikePrice: '$1,299',
    strikePriceLineThrough: true,
    discountLabel: '31% OFF',
    discountPercent: 31,
    validTill: '19 May 2025',
    usedCount: '278 times',
    usedCountValue: 278,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[146px] w-[170px] object-cover rounded-[20px]',
    cardTint: 'from-[#fff9ef] via-[#fffdf8] to-[#fff7ea]',
    bgColor: '#fff9ef',
    imageGlow: 'bg-[radial-gradient(circle_at_72%_44%,rgba(255,182,79,0.16),transparent_36%)]',
    accent: 'text-[#ff8c00]',
    categories: ['Tyres', 'Car Care'],
    isCombo: false,
    relevance: 82,
  },
  {
    id: 'dual-dashcam-pro',
    badge: 'SAFETY UPGRADE',
    badgeColor: 'text-[#9440f1]',
    icon: ShieldCheck,
    title: 'Dual Channel Dashcam Pro Pack',
    bullets: ['Front and rear recording', 'Parking surveillance mode', 'Hardwiring included'],
    displayPrice: '$6,999',
    numericPrice: 6999,
    strikePrice: '$8,499',
    strikePriceLineThrough: true,
    discountLabel: '18% OFF',
    discountPercent: 18,
    validTill: '26 May 2025',
    usedCount: '193 times',
    usedCountValue: 193,
    image: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[140px] w-[176px] object-cover rounded-[20px]',
    cardTint: 'from-[#fbf6ff] via-[#fefcff] to-[#f7efff]',
    bgColor: '#fbf6ff',
    imageGlow: 'bg-[radial-gradient(circle_at_74%_42%,rgba(173,109,255,0.16),transparent_36%)]',
    accent: 'text-[#933ce6]',
    categories: ['Parts & Accessories'],
    isCombo: false,
    relevance: 81,
  },
  {
    id: 'starter-battery-exchange',
    badge: 'BATTERY EXCHANGE',
    badgeColor: 'text-[#6f38f2]',
    icon: Battery,
    title: 'Old Battery Exchange Bonus Offer',
    bullets: ['Exchange your old unit', 'Instant installation', 'Pickup of old battery included'],
    displayPrice: '$4,299',
    numericPrice: 4299,
    strikePrice: '$5,399',
    strikePriceLineThrough: true,
    discountLabel: '20% OFF',
    discountPercent: 20,
    validTill: '16 May 2025',
    usedCount: '254 times',
    usedCountValue: 254,
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[142px] w-[166px] object-cover rounded-[20px]',
    cardTint: 'from-[#faf5ff] via-[#fffcff] to-[#f7f0ff]',
    bgColor: '#faf5ff',
    imageGlow: 'bg-[radial-gradient(circle_at_72%_44%,rgba(166,103,255,0.16),transparent_36%)]',
    accent: 'text-[#7b2fe6]',
    categories: ['Batteries', 'Parts & Accessories'],
    isCombo: false,
    relevance: 80,
  },
  {
    id: 'full-service-combo',
    badge: 'ANNUAL SERVICE COMBO',
    badgeColor: 'text-[#1a9c61]',
    icon: Wrench,
    title: 'Periodic Service + Wheel Care Combo',
    bullets: ['Oil, filter and inspection', 'Alignment and balancing', 'Priority garage slot'],
    displayPrice: '$3,999',
    numericPrice: 3999,
    strikePrice: '$5,799',
    strikePriceLineThrough: true,
    discountLabel: '31% OFF',
    discountPercent: 31,
    validTill: '29 May 2025',
    usedCount: '467 times',
    usedCountValue: 467,
    image: 'https://images.unsplash.com/photo-1632823462950-ceb28ce26b6e?auto=format&fit=crop&w=600&q=80',
    imageClassName: 'h-[146px] w-[176px] object-cover rounded-[20px]',
    cardTint: 'from-[#f3fff8] via-[#fafffd] to-[#eefcf4]',
    bgColor: '#f3fff8',
    imageGlow: 'bg-[radial-gradient(circle_at_76%_44%,rgba(88,198,145,0.18),transparent_36%)]',
    accent: 'text-[#179556]',
    categories: ['Service', 'Tyres', 'Combo Deals'],
    isCombo: true,
    relevance: 79,
  },
];

const deals: DealItem[] = [
  ...baseDeals,
  ...baseDeals.map((d, i) => ({
    ...d,
    id: `${d.id}-page2-${i}`,
    relevance: d.relevance - 20,
  })),
  ...baseDeals.map((d, i) => ({
    ...d,
    id: `${d.id}-page3-${i}`,
    relevance: d.relevance - 40,
  })),
];

function FilterChip({
  label,
  displayLabel,
  icon: Icon,
  active,
  onClick,
}: {
  label: DealCategory | 'More Filters';
  displayLabel: string;
  icon?: LucideIcon;
  active: boolean;
  onClick: (label: DealCategory | 'More Filters') => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className={cn(
        'inline-flex h-[34px] items-center gap-1.5 rounded-[11px] border px-2.5 xl:px-3 text-[11.5px] xl:text-[12px] font-semibold transition-colors shadow-sm whitespace-nowrap',
        active
          ? 'border-[#1f5cff] bg-[#1f5cff] text-white shadow-[0_10px_22px_rgba(31,92,255,0.22)]'
          : 'border-[#dbe6ff] bg-white text-[#17307a] hover:bg-[#f7faff] hover:border-[#bfd1ff]'
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} /> : null}
      <span>{displayLabel}</span>
    </button>
  );
}

function DealCard({ deal, onSelect, userPhone }: { deal: DealItem; onSelect?: (deal: DealItem) => void; userPhone?: string }) {
  const DealIcon = deal.icon;

  return (
    <Card
      style={{ backgroundColor: deal.bgColor }}
      className="overflow-hidden rounded-[16px] border-[#ebeff8] p-0 shadow-[0_10px_26px_rgba(21,47,112,0.06)] transition-all duration-300 hover:shadow-[0_14px_32px_rgba(21,47,112,0.09)] hover:-translate-y-0.5"
    >
      <div className="grid min-h-[115px] grid-cols-[1.35fr_0.65fr]">
        <div className="p-3 relative z-10 flex flex-col justify-between">
          <div>
            <div
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.02em]',
                deal.badgeColor
              )}
            >
              <DealIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span>{deal.badge}</span>
            </div>
            <h3 className="mt-1 text-[13.5px] font-bold leading-[1.25] tracking-[-0.02em] text-[#17307a]">
              {deal.title}
            </h3>
            <ul className="mt-1.5 space-y-0.5">
              {deal.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-1.5 text-[11px] leading-[1.3] text-[#46608f]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f5cff]" strokeWidth={2.6} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div 
          className="relative h-full w-full overflow-hidden select-none flex items-center justify-center"
          style={{ backgroundColor: deal.bgColor }}
        >
          {deal.image ? (
            <>
              <Image
                src={deal.image}
                alt={deal.title}
                fill
                sizes="(max-width: 768px) 100vw, 30vw"
                className={cn(
                  "transition-transform duration-300 hover:scale-105",
                  deal.imageClassName.includes('object-contain') ? 'object-contain p-1.5' : 'object-cover'
                )}
              />
              <div 
                className="absolute inset-y-0 left-0 w-12 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, ${deal.bgColor} 0%, ${deal.bgColor}a0 40%, ${deal.bgColor}00 100%)`
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[#edf2fb] bg-white/78 px-3 py-2 backdrop-blur-sm relative z-10">
        <div className="flex flex-wrap items-end gap-1.5">
          {deal.pricePrefix ? (
            <span className="pb-0.5 text-[11px] font-semibold text-[#35539c]">{deal.pricePrefix}</span>
          ) : null}
          <span className={cn('text-[15px] font-extrabold tracking-[-0.02em]', deal.accent)}>
            {formatCurrency(deal.numericPrice, userPhone)}
          </span>
          {deal.strikePrice ? (
            <span
              className={cn(
                'pb-0.5 text-[11px] font-semibold',
                deal.strikePriceLineThrough ? 'text-[#8998b8] line-through' : 'text-[#35539c]'
              )}
            >
              {formatCurrency(parseFloat(deal.strikePrice.replace('$', '').replace(/,/g, '')), userPhone)}
            </span>
          ) : null}
          {deal.discountLabel ? (
            <span className="rounded-full bg-[#e8f8ec] px-2 py-0.5 text-[9.5px] font-bold text-[#259450]">
              {deal.discountLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-medium text-[#6b7da5]">
            <span>Valid till {deal.validTill}</span>
            <span>Used {deal.usedCount}</span>
          </div>
          <Button onClick={() => onSelect?.(deal)} variant="outline" size="sm" className="h-6 rounded-[8px] border-[#1f5cff] px-2.5 text-[10.5px] font-bold text-[#1f5cff] hover:bg-[#1f5cff]/5">
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}

type FilterKey = 'category' | 'offerType' | 'price' | 'discount';

const filterPills = [
  { key: 'category', label: 'Category', icon: Tag },
  { key: 'offerType', label: 'Offer Type', icon: Snowflake },
  { key: 'price', label: 'Price Range', icon: ClipboardList },
  { key: 'discount', label: 'Discount', icon: Percent },
] as const;

const filterOptions: Record<FilterKey, { label: string; value: string }[]> = {
  category: [
    { label: 'All Categories', value: 'all' },
    { label: 'Car Care', value: 'Car Care' },
    { label: 'Service', value: 'Service' },
    { label: 'Parts & Accessories', value: 'Parts & Accessories' },
    { label: 'Tyres', value: 'Tyres' },
    { label: 'Batteries', value: 'Batteries' },
    { label: 'Combo Deals', value: 'Combo Deals' },
  ],
  offerType: [
    { label: 'All Offers', value: 'all' },
    { label: 'Combo Offers Only', value: 'combo' },
  ],
  price: [
    { label: 'Any Price', value: 'all' },
    { label: 'Under $2,000', value: 'under2000' },
  ],
  discount: [
    { label: 'Any Discount', value: 'all' },
    { label: '30%+ Discount', value: 'highDiscount' },
  ],
};

function DealsPageContent() {
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    category: 'all',
    offerType: 'all',
    price: 'all',
    discount: 'all',
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('Most Relevant');
  const [sortOpen, setSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [userPhone, setUserPhone] = useState<string | undefined>(undefined);
  const pageSize = 9;
  const sortRef = useRef<HTMLDivElement>(null);
  const moreFiltersRef = useRef<HTMLDivElement>(null);

  // Start with empty list — real data loads from API below
  const [dealsList, setDealsList] = useState<DealItem[]>([]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('wrectifai-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.mobile_number) setUserPhone(user.mobile_number);
        else if (user && user.phone) setUserPhone(user.phone);
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    let active = true;
    // Read canonical city from cookie (same source used everywhere in the app)
    const city = typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|; )wrectifai_city=([^;]*)/) || [])[1] || ''
      : '';
    const decodedCity = decodeURIComponent(city);

    import('@/utils/location').then(({ getCountryForCity, getCurrencyCodeForCity }) => {
      const country = decodedCity ? getCountryForCity(decodedCity).name : undefined;
      const currencyCodeForCity = decodedCity ? getCurrencyCodeForCity(decodedCity) : 'INR';

      fetchPromos(decodedCity || undefined, country)
        .then((data) => {
          if (active && data && data.length > 0) {
            const mapped: DealItem[] = data.map((p: any) => {
              const theme = getPromoTheme(p.themePreset);
              // Use formatCurrency with the city-derived currency — never hardcode $
              const displayPrice = formatCurrency(Number(p.numericPrice), currencyCodeForCity);
              const strikePrice = p.strikePrice ? formatCurrency(Number(p.strikePrice), currencyCodeForCity) : undefined;
              const discountLabel = p.discountPercent ? `${p.discountPercent}% OFF` : undefined;
              const usedCount = p.usedCountValue >= 1000 ? `${(p.usedCountValue / 1000).toFixed(1)}K times` : `${p.usedCountValue || 0} times`;
              const imageClassName = p.isCombo ? 'h-[148px] w-[178px] object-contain' : 'h-12 w-12';

              return {
                id: p.id,
                badge: p.badge,
                badgeColor: theme.badgeColorClass,
                icon: p.icon === 'Sun' ? Sun : p.icon === 'CloudRain' ? CloudRain : p.icon === 'Snowflake' ? Snowflake : p.icon === 'Sparkles' ? Sparkles : p.icon === 'Settings' ? Settings : p.icon === 'CarFront' ? CarFront : p.icon === 'Disc3' ? Disc3 : Tag,
                title: p.title,
                bullets: p.bullets || [],
                displayPrice,
                numericPrice: Number(p.numericPrice),
                strikePrice,
                strikePriceLineThrough: !!strikePrice,
                discountLabel,
                discountPercent: Number(p.discountPercent || 0),
                validTill: p.validTill ? new Date(p.validTill).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing',
                usedCount,
                usedCountValue: Number(p.usedCountValue || 0),
                image: p.image,
                imageClassName,
                cardTint: theme.cardTintClass,
                bgColor: theme.bgColor,
                imageGlow: theme.imageGlowClass,
                accent: theme.accentClass,
                categories: p.categories || [],
                isCombo: p.isCombo,
                relevance: Number(p.relevance || 0)
              };
            });
            if (active) setDealsList(mapped);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch promos:', err);
        });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setSearchTerm((customEvent.detail ?? '').trim().toLowerCase());
      setCurrentPage(1);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(event.target as Node)) {
        setShowMoreFilters(false);
      }
    };

    window.addEventListener('dashboard-search', handleSearch);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('dashboard-search', handleSearch);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredDeals = useMemo(() => {
    let nextDeals = dealsList.filter((deal) => {
      const matchesFilter =
        filters.category === 'all'
          ? true
          : deal.categories.includes(filters.category as Exclude<DealCategory, 'All Deals'>);
      const matchesCombo = filters.offerType === 'combo' ? deal.isCombo : true;
      const matchesBudget = filters.price === 'under2000' ? deal.numericPrice <= 2000 : true;
      const matchesDiscount = filters.discount === 'highDiscount' ? deal.discountPercent >= 30 : true;
      const matchesSearch = searchTerm
        ? [deal.title, deal.badge, ...deal.bullets].join(' ').toLowerCase().includes(searchTerm)
        : true;

      return (
        matchesFilter &&
        matchesCombo &&
        matchesBudget &&
        matchesDiscount &&
        matchesSearch
      );
    });

    nextDeals = [...nextDeals].sort((left, right) => {
      switch (sortBy) {
        case 'Price: Low to High':
          return left.numericPrice - right.numericPrice;
        case 'Price: High to Low':
          return right.numericPrice - left.numericPrice;
        case 'Highest Discount':
          return right.discountPercent - left.discountPercent;
        case 'Most Used':
          return right.usedCountValue - left.usedCountValue;
        case 'Most Relevant':
        default:
          return right.relevance - left.relevance;
      }
    });

    return nextDeals;
  }, [filters, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / pageSize));

  const activePage = Math.min(currentPage, totalPages);

  const paginatedDeals = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return filteredDeals.slice(startIndex, startIndex + pageSize);
  }, [activePage, filteredDeals]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (activePage <= 3) {
      return [1, 2, 3, totalPages];
    }

    if (activePage >= totalPages - 2) {
      return [1, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, activePage - 1, activePage, activePage + 1, totalPages];
  }, [activePage, totalPages]);

  const fromDeal = filteredDeals.length === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const toDeal = Math.min(activePage * pageSize, filteredDeals.length);

  const clearFilters = () => {
    setFilters({
      category: 'all',
      offerType: 'all',
      price: 'all',
      discount: 'all',
    });
    setCurrentPage(1);
    setSortOpen(false);
    setShowMoreFilters(false);
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== 'all').length;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-col gap-3 pt-1">
        <div>
          <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6b7da5] mb-1.5">
            <Link href="/" className="flex items-center gap-1 hover:text-[#1f5cff] transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#a4b3d1]" />
            <span className="text-[#17307a] font-bold">Deals &amp; Offers</span>
          </nav>
          <h1 className="text-[22px] font-bold tracking-[-0.04em] text-[#17307a] sm:text-[24px]">
            View All Deals
          </h1>
          <p className="mt-1 text-[14px] font-medium text-[#536891]">
            Great offers on car care, parts &amp; services
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:flex-nowrap pb-1">
          <div className="flex items-center gap-1.5 xl:gap-2 shrink-0 flex-wrap lg:flex-nowrap">
            {dealFilters.map(({ label, displayLabel, icon }) => {
              if (label === 'More Filters') {
                return (
                  <div key={label} className="relative" ref={moreFiltersRef}>
                    <FilterChip
                      label={label}
                      displayLabel={displayLabel}
                      icon={icon}
                      active={showMoreFilters}
                      onClick={() => setShowMoreFilters((curr) => !curr)}
                    />
                    {showMoreFilters ? (
                      <div className="absolute left-0 top-[42px] z-50 min-w-[260px] sm:min-w-[280px] rounded-[16px] border border-[#dbe6ff] bg-white p-3 shadow-[0_20px_50px_rgba(30,58,138,0.16)] animate-in fade-in-50 duration-200 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 rounded-[10px] border border-[#dbe6ff] bg-[#f8fbff] px-3 py-2 text-[12px] text-[#17307a]">
                          <Search className="h-4 w-4 text-[#6173a1] shrink-0" />
                          <input 
                            type="text" 
                            placeholder="Search filters..." 
                            className="w-full bg-transparent outline-none placeholder-[#8998b8]"
                          />
                        </div>
                        <div className="max-h-[310px] overflow-y-auto pr-1 flex flex-col gap-3.5 [scrollbar-width:thin]">
                          {filterPills.map(({ key, label: pillLabel }) => (
                            <div key={key} className="flex flex-col gap-1">
                              <div className="px-2 py-1 text-[11px] font-bold text-[#6b7da5] uppercase tracking-wider">
                                {pillLabel}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {filterOptions[key].map((option) => {
                                  const isSelected = filters[key] === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setFilters((prev) => ({ ...prev, [key]: option.value }));
                                        setCurrentPage(1);
                                      }}
                                      className={cn(
                                        'flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] font-medium transition-colors',
                                        isSelected
                                          ? 'bg-[#1f5cff] text-white font-bold shadow-sm'
                                          : 'text-[#17307a] hover:bg-[#f7faff]'
                                      )}
                                    >
                                      <span>{option.label}</span>
                                      {isSelected && <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={3} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <FilterChip
                  key={label}
                  label={label}
                  displayLabel={displayLabel}
                  icon={icon}
                  active={filters.category === (label === 'All Deals' ? 'all' : label)}
                  onClick={(clickedLabel) => {
                    setFilters((prev) => ({
                      ...prev,
                      category: clickedLabel === 'All Deals' ? 'all' : clickedLabel,
                    }));
                    setCurrentPage(1);
                  }}
                />
              );
            })}

            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-[34px] items-center justify-center gap-1.5 rounded-[11px] border border-[#ffd2d2] bg-white px-3 text-[11.5px] xl:text-[12px] font-semibold text-[#d14343] shadow-sm hover:bg-[#fff9f9] whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            ) : null}
          </div>

          <div className="relative flex items-center gap-2 xl:gap-2.5 shrink-0 lg:justify-end">
            <span className="text-[12px] xl:text-[13px] font-semibold text-[#17307a] whitespace-nowrap">Sort By:</span>
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen((curr) => !curr)}
                className={cn(
                  "flex h-[34px] min-w-[130px] xl:min-w-[145px] items-center justify-between rounded-[11px] border px-2.5 xl:px-3 text-[11px] xl:text-[12px] font-semibold transition-colors bg-white border-[#dbe6ff] text-[#17307a] shadow-sm hover:bg-[#f7faff]",
                  sortOpen && "border-[#bfd0ff] bg-[#f8fbff] text-[#1a56db]"
                )}
              >
                <span className="truncate">{sortBy}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", sortOpen ? "rotate-180 text-[#1a56db]" : "text-[#6f80a8]")} />
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-[42px] z-50 min-w-[190px] rounded-[14px] border border-[#dbe6ff] bg-white p-2 shadow-[0_18px_40px_rgba(30,58,138,0.14)]">
                  {[
                    'Most Relevant',
                    'Price: Low to High',
                    'Price: High to Low',
                    'Highest Discount',
                    'Most Used',
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option as SortOption);
                        setCurrentPage(1);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                        sortBy === option
                          ? "bg-[#1f5cff] text-white font-bold shadow-sm"
                          : "text-[#17307a] hover:bg-[#f8fbff]"
                      )}
                    >
                      <span className="truncate">{option}</span>
                      {sortBy === option && <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#deefe2] bg-[#f3fbf5] px-4 py-3 text-[13px] font-semibold text-[#21834c] shadow-sm">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#21834c]" strokeWidth={2.2} />
          <span>Save more on services, parts and combos from trusted garages and partners.</span>
        </div>
      </div>

      {searchTerm ? (
        <div className="rounded-[16px] border border-[#e4ecff] bg-white px-4 py-3 text-[13px] font-medium text-[#4f67a2] shadow-[0_8px_20px_rgba(20,44,112,0.04)]">
          Showing deals for <span className="font-bold text-[#1a56db]">{searchTerm}</span>
        </div>
      ) : null}

      {paginatedDeals.length > 0 ? (
        <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onSelect={setSelectedDeal} />
          ))}
        </section>
      ) : (
        <Card className="rounded-[20px] border-[#e3eaf9] px-6 py-10 text-center shadow-[0_12px_28px_rgba(22,48,112,0.05)]">
          <div className="text-[18.5px] font-bold text-[#17307a]">No deals match these filters</div>
          <p className="mt-2 text-[13px] text-[#6477a1]">
            Try another category, remove a filter, or reset the search.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Reset filters
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 px-2 py-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="hidden lg:block" />
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={activePage === 1}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#dbe6ff] bg-white text-[#3d5afe] disabled:cursor-not-allowed disabled:opacity-45 shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {visiblePages.map((page, index) => {
            const previous = visiblePages[index - 1];
            const showGap = previous && page - previous > 1;

            return (
              <div key={page} className="flex items-center gap-2">
                {showGap ? <span className="px-1 text-[12px] font-semibold text-[#7c8db2]">...</span> : null}
                <button
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-[10px] border text-[12px] font-semibold shadow-sm',
                    activePage === page
                      ? 'border-[#3d5afe] bg-[#eef3ff] font-bold text-[#3156f5]'
                      : 'border-[#dbe6ff] bg-white text-[#4d6295] hover:bg-[#f7faff]'
                  )}
                >
                  {page}
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={activePage === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#dbe6ff] bg-white text-[#3d5afe] disabled:cursor-not-allowed disabled:opacity-45 shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center text-[13px] font-medium text-[#6a7ca4] lg:text-right">
          Showing <span className="font-bold text-[#26408a]">{fromDeal} - {toDeal}</span> of{' '}
          <span className="font-bold text-[#26408a]">{filteredDeals.length} deals</span>
        </div>
      </div>

      <Modal isOpen={!!selectedDeal} onClose={() => setSelectedDeal(null)} title={selectedDeal?.title || "Deal Details"}>
        {selectedDeal && (
          <div className="flex flex-col gap-4 text-[#17307a]">
            {selectedDeal.image && (
              <div className="relative h-40 w-full overflow-hidden rounded-[14px]">
                <Image src={selectedDeal.image} alt={selectedDeal.title} fill className="object-cover" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('rounded-[6px] px-2 py-0.5 text-[10px] font-bold', selectedDeal.badgeColor)}>
                  {selectedDeal.badge}
                </span>
              </div>
              <h3 className="text-[18px] font-bold">{selectedDeal.title}</h3>
              <div className="mt-2 flex items-center gap-3">
                <span className={cn('text-[20px] font-bold', selectedDeal.accent)}>{selectedDeal.displayPrice}</span>
                {selectedDeal.strikePrice && <span className="text-[14px] text-[#8998b8] line-through">{selectedDeal.strikePrice}</span>}
              </div>
            </div>
            
            <div className="border-t border-[#e4ecff] pt-4">
              <h4 className="text-[14px] font-semibold mb-2">What's included:</h4>
              <ul className="flex flex-col gap-1.5">
                {selectedDeal.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[13px] text-[#4f67a2]">
                    <Check className="h-4 w-4 shrink-0 text-[#1a56db]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t border-[#e4ecff] pt-4 flex flex-col gap-2 text-[12px] text-[#6b7da5]">
              <p><strong>Valid till:</strong> {selectedDeal.validTill}</p>
              <p><strong>Purchased:</strong> {selectedDeal.usedCount}</p>
              <p><strong>Terms:</strong> Standard mock terms apply. Not clubbable with other offers.</p>
            </div>
            
            <Button className="w-full mt-2 font-bold bg-[#1a56db] hover:bg-[#1a56db]/90" onClick={() => setSelectedDeal(null)}>
              Claim Offer
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function DealsPage() {
  return (
    <DashboardShell header={<TopNavbar />}>
      <DealsPageContent />
    </DashboardShell>
  );
}

export default DealsPage;
