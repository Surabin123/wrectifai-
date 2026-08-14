'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  List,
  Map,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Wrench,
  X,
  Search,
} from 'lucide-react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { cn } from '@/utils/cn';
import Image from 'next/image';
import { PageLoader } from '@/components/common/page-loader';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  aiEstimatedQuoteRange,
} from '@/components/quotes/quotes-shared';
import { resultIssues } from '@/components/ai-diagnose/diagnose-flow-shared';

import { GarageDetailPage } from '@/components/garages/garage-detail-page';
import { fetchGarages, type Garage as ApiGarage } from '@/lib/garages-api';
import { getLocationCookie, formatCurrency } from '@/utils/location';

type FilterKey =
  | 'rating'
  | 'distance'
  | 'serviceType'
  | 'responseTime'
  | 'offers'
  | 'moreFilters';
type ViewMode = 'list' | 'map';
type SortOption = 'best' | 'rating' | 'distance' | 'response';

export type Garage = {
  id?: string;
  badge: string;
  badgeTone: string;
  name: string;
  rating: number;
  reviews: number;
  location: string;
  distanceKm: number;
  responseMins: number;
  chips: string[];
  facade: string;
  tone: string;
  verified: boolean;
  image?: string;
  services?: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    duration_mins: number;
    category: string;
  }>;
};

const filterPills = [
  { key: 'rating', label: 'Rating', icon: Star },
  { key: 'distance', label: 'Distance', icon: MapPin },
  { key: 'serviceType', label: 'Service Type', icon: Wrench },
  { key: 'responseTime', label: 'Response Time', icon: Clock3 },
  { key: 'offers', label: 'Offers', icon: Tag },
  { key: 'moreFilters', label: 'More Filters', icon: SlidersHorizontal },
] as const satisfies { key: FilterKey; label: string; icon: typeof Star }[];

const filterOptions: Record<FilterKey, { value: string; label: string }[]> = {
  rating: [
    { value: 'all', label: 'Any Rating' },
    { value: '4.5', label: '4.5 & above' },
    { value: '4.3', label: '4.3 & above' },
    { value: '4.0', label: '4.0 & above' },
  ],
  distance: [
    { value: 'all', label: 'Any Distance' },
    { value: '3', label: 'Under 3 km' },
    { value: '5', label: 'Under 5 km' },
    { value: '6+', label: '6 km & above' },
  ],
  serviceType: [
    { value: 'all', label: 'All Services' },
    { value: 'Inspection', label: 'Inspection' },
    { value: 'Pickup', label: 'Pickup / Drop' },
    { value: 'Warranty', label: 'Warranty' },
    { value: 'Parts', label: 'Original / Genuine Parts' },
  ],
  responseTime: [
    { value: 'all', label: 'Any Response Time' },
    { value: '30', label: 'Within 30 mins' },
    { value: '45', label: 'Within 45 mins' },
    { value: '60', label: 'Within 60 mins' },
  ],
  offers: [
    { value: 'all', label: 'All Offers' },
    { value: 'Free Inspection', label: 'Free Inspection' },
    { value: 'Free Pickup', label: 'Free Pickup' },
    { value: 'Pay After Service', label: 'Pay After Service' },
    { value: 'Warranty Available', label: 'Warranty Available' },
  ],
  moreFilters: [
    { value: 'all', label: 'All Garages' },
    { value: 'verified', label: 'Verified Only' },
    { value: 'top-rated', label: 'Top Rated Badges' },
    { value: 'warranty', label: 'Has Warranty' },
    { value: 'pickup', label: 'Has Pickup / Drop' },
  ],
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'best', label: 'Best Match' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'distance', label: 'Nearest First' },
  { value: 'response', label: 'Fastest Response' },
];


function formatDistance(distanceKm: number) {
  return `${distanceKm.toFixed(1)} km away`;
}

function formatResponse(responseMins: number) {
  return `${responseMins} mins response`;
}

function FilterMenu({
  label,
  icon: Icon,
  options,
  value,
  open,
  onOpen,
  onClose,
  onSelect,
  align,
}: {
  label: string;
  icon: typeof Star;
  options: { value: string; label: string }[];
  value: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (value: string) => void;
  align?: 'left' | 'right';
}) {
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={open ? onClose : onOpen}
        className={cn(
          'flex h-[34px] w-full items-center justify-center sm:justify-start gap-1.5 sm:gap-2 rounded-[10px] border border-[#dbe6ff] bg-white px-2 sm:px-3 text-[10.5px] sm:text-[11.5px] font-semibold text-[#17307a] shadow-[0_6px_15px_rgba(30,58,138,0.03)] transition-colors',
          open && 'border-[#bfd1ff] bg-[#f8fbff]'
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-[#1a56db]" />
        <span className="truncate">
          {selected.value === 'all' ? label : selected.label}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#6173a1]" />
      </button>
      {open ? (
        <div
          className={cn(
            'absolute top-[39px] z-20 min-w-[200px] sm:min-w-[220px] rounded-[12px] border border-[#dbe6ff] bg-white p-2 shadow-[0_16px_36px_rgba(30,58,138,0.11)]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium transition-colors',
                option.value === value
                  ? 'bg-[#eef4ff] text-[#1a56db]'
                  : 'text-[#17307a] hover:bg-[#f8fbff]'
              )}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <BadgeCheck className="h-4 w-4 fill-[#1a56db] text-white" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GarageCard({
  badge,
  badgeTone,
  name,
  rating,
  reviews,
  location,
  distanceKm,
  responseMins,
  chips,
  facade,
  tone,
  verified,
  image,
  compact = false,
  isWishlisted,
  onClick,
}: Garage & { compact?: boolean; isWishlisted?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Card
      className="overflow-hidden rounded-[18px] border-[#e7eefc] shadow-[0_14px_34px_rgba(21,48,122,0.08)] cursor-pointer hover:border-[#1a56db]/20 transition-all duration-300 hover:scale-[1.01]"
    >
      <div
        className={cn(
          'relative bg-gradient-to-r',
          tone,
          compact ? 'h-[110px]' : 'h-[128px]'
        )}
      >
        {image && (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(5,8,17,0.4))]" />
        {badge ? (
          <div
            className={cn(
              'absolute left-4 top-3 rounded-[10px] px-3 py-1 text-[11px] font-bold text-white',
              badgeTone
            )}
          >
            {badge}
          </div>
        ) : null}
        <div 
          onClick={onClick}
          className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:scale-110 transition-transform cursor-pointer z-10">
          <Heart 
            className={cn("h-5 w-5", isWishlisted ? "text-[#e53e3e]" : "text-[#1a56db]")} 
            fill={isWishlisted ? "currentColor" : "none"} 
          />
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
          <div className="text-[11.5px] font-bold tracking-[0.01em] text-white/92">
            {facade}
          </div>
          <div className="flex gap-2 opacity-85">
            <div className="h-8 w-10 rounded bg-white/10" />
            <div className="h-8 w-12 rounded bg-white/10" />
            <div className="h-8 w-8 rounded bg-white/10" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[14.5px] font-bold tracking-[-0.03em] text-[#17307a]">
            {name}
          </h3>
          {verified ? (
            <BadgeCheck className="h-4 w-4 fill-[#1a56db] text-white" />
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#6173a1]">
          <div className="flex shrink-0 items-center gap-1.5">
            <Star className="h-4 w-4 fill-[#ff9f1a] text-[#ff9f1a]" />
            <span className="font-semibold text-[#f28c28]">
              {rating.toFixed(1)}
            </span>
            <span>({reviews})</span>
          </div>
          <span className="shrink-0 text-[#9aa8c6]">•</span>
          <span className="min-w-0 truncate">{location}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-5 text-[11.5px] font-semibold text-[#17307a]">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#1a56db]" />
            {formatDistance(distanceKm)}
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#1a56db]" />
            {formatResponse(responseMins)}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-[#e9f8ef] px-3 py-1.5 text-[10px] font-semibold text-[#238453]"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border-t border-[#eef3ff] pt-2">
          <div className="flex min-w-0 items-start gap-1 font-normal text-[#17307a]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1a56db]" />
            <div className="min-w-0 text-[8.5px] tracking-tight font-normal leading-[1.25]">
              <div>No upfront payment &#8226;</div>
              <div>Final quote after inspection</div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-8 shrink-0 rounded-[9px] px-2 text-[10.5px] font-semibold"
          >
            Book Appointment
          </Button>
        </div>
      </div>
    </Card>
  );
}

function getGarageTone(name: string) {
  const gradients = [
    'from-[#0d1118] via-[#43301c] to-[#0b0f16]',
    'from-[#1b2734] via-[#2a3e49] to-[#101721]',
    'from-[#151820] via-[#32271c] to-[#11141c]',
    'from-[#161616] via-[#353535] to-[#12151c]',
    'from-[#20222a] via-[#4a3026] to-[#1b1d24]',
    'from-[#11141d] via-[#2f3640] to-[#0d1118]',
    'from-[#1a2027] via-[#2d353d] to-[#0f131b]',
    'from-[#151922] via-[#25394a] to-[#10151d]',
    'from-[#17202e] via-[#22415e] to-[#0c1220]',
    'from-[#211d20] via-[#3e3840] to-[#17161a]',
    'from-[#20252a] via-[#3b3028] to-[#11161c]',
    'from-[#131922] via-[#253647] to-[#11161c]',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getGarageBadgeTone(badge: string) {
  if (badge === 'Best Value') return 'bg-[#1aa14a]';
  if (badge === 'Most Trusted') return 'bg-[#ff8a1f]';
  if (badge === 'Top Rated') return 'bg-[#1a56db]';
  return '';
}

function parseDistanceKm(distance: any): number {
  if (typeof distance === 'number') return distance;
  if (!distance) return 3.0;
  const num = parseFloat(String(distance).replace(/[^\d.]/g, ''));
  return isNaN(num) ? 3.0 : num;
}

function mapBackendGarageToFrontend(g: any, userCity: string): Garage {
  const name = g.name;
  const badge = g.badge || '';
  const chips = g.chips && g.chips.length > 0 ? g.chips : ['General Service'];
  const image = g.image || '/assets/garage_1_1778071156220.png';
  const distanceKm = parseDistanceKm(g.distance) || 3.0;
  const responseMins = Number(g.responseMins) || 30;

  return {
    id: g.id,
    badge,
    badgeTone: getGarageBadgeTone(badge),
    name,
    rating: Number(g.rating) || 4.5,
    reviews: Number(g.reviews) || 0,
    location: userCity,
    distanceKm,
    responseMins,
    chips,
    facade: name.split(' ').slice(0, 2).join(' '),
    tone: getGarageTone(name),
    verified: g.verified !== undefined ? g.verified : false,
    image,
  };
}

function GaragesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [page, setPage] = useState(1);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    rating: 'all',
    distance: 'all',
    serviceType: 'all',
    responseTime: 'all',
    offers: 'all',
    moreFilters: 'all',
  });

  const [userCity, setUserCity] = useState('');

  useEffect(() => {
    const handleCityChange = () => {
      const city = getLocationCookie('wrectifai_city') || '';
      setUserCity(city);
    };
    handleCityChange();
    window.addEventListener('city-changed', handleCityChange);
    return () => window.removeEventListener('city-changed', handleCityChange);
  }, []);

  const [garagesList, setGaragesList] = useState<Garage[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    fetchGarages()
      .then((data) => {
        if (active && data && data.length > 0) {
          const merged = data.map(g => mapBackendGarageToFrontend(g, userCity));
          setGaragesList(merged);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch garages:', err);
      });
    apiClient.get<any[]>('/quotes')
      .then((data) => {
        if (active && data) {
          setQuotes(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch quotes:', err);
      });
    return () => {
      active = false;
    };
  }, [userCity]);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const newQuery = customEvent.detail ?? '';
      setSearchQuery(newQuery);
      setPage(1);
    };

    window.addEventListener('dashboard-search', handleSearch);
    
    const initialSearch = searchParams?.get('search');
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }

    return () => window.removeEventListener('dashboard-search', handleSearch);
  }, [searchParams]);

  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);

  useEffect(() => {
    const savedWishlist = localStorage.getItem('shopWishlist');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedWishlist) setWishlistItems(JSON.parse(savedWishlist));
    
    const handleUpdate = () => {
      const updated = localStorage.getItem('shopWishlist');
      if (updated) setWishlistItems(JSON.parse(updated));
    };
    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  const toggleWishlist = (e: React.MouseEvent, garage: any) => {
    e.stopPropagation();
    const id = garage.id || garage.name;
    const exists = wishlistItems.find(i => (i.id === id || i.name === id));
    let newItems;
    if (exists) {
      newItems = wishlistItems.filter(i => (i.id !== id && i.name !== id));
      setToastMessage('Garage removed from Wishlist');
    } else {
      newItems = [...wishlistItems, { 
        id, 
        name: garage.facade || garage.name, 
        img: garage.image, 
        category: garage.location,
        type: 'garage' 
      }];
      setToastMessage('Garage added to Wishlist');
    }
    
    setWishlistItems(newItems);
    localStorage.setItem('shopWishlist', JSON.stringify(newItems));
    window.dispatchEvent(new Event('wishlist-updated'));
    
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  const filteredGarages = useMemo(() => {
    const filtered = garagesList.filter((garage) => {
      if (filters.rating !== 'all' && garage.rating < Number(filters.rating)) {
        return false;
      }
      if (filters.distance === '3' && garage.distanceKm >= 3) {
        return false;
      }
      if (filters.distance === '5' && garage.distanceKm >= 5) {
        return false;
      }
      if (filters.distance === '6+' && garage.distanceKm < 6) {
        return false;
      }
      if (
        filters.serviceType === 'Inspection' &&
        !garage.chips.some((chip) => chip.includes('Inspection'))
      ) {
        return false;
      }
      if (
        filters.serviceType === 'Pickup' &&
        !garage.chips.some(
          (chip) => chip.includes('Pickup') || chip.includes('Drop')
        )
      ) {
        return false;
      }
      if (
        filters.serviceType === 'Warranty' &&
        !garage.chips.some((chip) => chip.includes('Warranty'))
      ) {
        return false;
      }
      if (
        filters.serviceType === 'Parts' &&
        !garage.chips.some((chip) => chip.includes('Parts'))
      ) {
        return false;
      }
      if (
        filters.responseTime !== 'all' &&
        garage.responseMins > Number(filters.responseTime)
      ) {
        return false;
      }
      if (filters.offers !== 'all' && !garage.chips.includes(filters.offers)) {
        return false;
      }
      if (filters.moreFilters === 'verified' && !garage.verified) {
        return false;
      }
      if (filters.moreFilters === 'top-rated' && garage.badge !== 'Top Rated') {
        return false;
      }
      if (
        filters.moreFilters === 'warranty' &&
        !garage.chips.some((chip) => chip.includes('Warranty'))
      ) {
        return false;
      }
      if (
        filters.moreFilters === 'pickup' &&
        !garage.chips.some(
          (chip) => chip.includes('Pickup') || chip.includes('Drop')
        )
      ) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!garage.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'distance') {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'response') {
        return a.responseMins - b.responseMins;
      }
      return (
        b.rating * 10 + b.reviews / 100 - (a.rating * 10 + a.reviews / 100)
      );
    });
  }, [filters, sortBy, garagesList, searchQuery]);

  const itemsPerPage = viewMode === 'map' ? 6 : 8;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredGarages.length / itemsPerPage)
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedGarages = filteredGarages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pageButtons = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 'ellipsis', totalPages] as const;
    }
    if (currentPage >= totalPages - 2) {
      return [
        1,
        'ellipsis',
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ] as const;
    }
    return [1, 'ellipsis', currentPage, 'ellipsis-2', totalPages] as const;
  }, [currentPage, totalPages]);

  const startIndex =
    filteredGarages.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredGarages.length);

  const resetPageAndSetFilter = (key: FilterKey, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      rating: 'all',
      distance: 'all',
      serviceType: 'all',
      responseTime: 'all',
      offers: 'all',
      moreFilters: 'all',
    });
    setSearchQuery('');
    setPage(1);
    setOpenFilter(null);
    setSortOpen(false);
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== 'all'
  ).length;

  const [quoteContext, setQuoteContext] = useState<any | null>(null);
  const source = searchParams?.get('source');
  const quoteId = searchParams?.get('quote');

  useEffect(() => {
    if (source !== 'quotes' || !quoteId) {
      Promise.resolve().then(() => {
        setQuoteContext((prev: any) => (prev !== null ? null : prev));
      });
      return;
    }

    let active = true;
    apiClient.get<any>(`/quotes/${quoteId}`)
      .then((quote) => {
        if (!active || !quote) return;
        const garageFromQuote = garagesList.find((item) => item.name === quote.garage);
        const issueIds = (searchParams?.get('issues') || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const issues = resultIssues.filter((issue) => issueIds.includes(issue.id));

        if (garageFromQuote) {
          setQuoteContext({
            garage: garageFromQuote,
            quote,
            issues,
            issueIds,
            aiEstimateRange: aiEstimatedQuoteRange,
          });
        } else {
          const fallbackGarage: Garage = {
            id: quote.garageId || '',
            badge: 'Top Rated',
            badgeTone: 'bg-[#1a56db]',
            name: quote.garage,
            rating: Number(quote.rating) || 4.5,
            reviews: Number(quote.reviews) || 12,
            location: userCity,
            distanceKm: parseFloat(quote.distance) || 3.0,
            responseMins: 30,
            chips: ['General Service'],
            facade: quote.garage.split(' ').slice(0, 2).join(' '),
            tone: getGarageTone(quote.garage),
            verified: true,
            image: quote.image
          };
          setQuoteContext({
            garage: fallbackGarage,
            quote,
            issues,
            issueIds,
            aiEstimateRange: aiEstimatedQuoteRange,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch quote details dynamically:', err);
      });

    return () => {
      active = false;
    };
  }, [source, quoteId, garagesList, searchParams]);

  const garageFromQuery = useMemo(() => {
    const garageName = searchParams?.get('garage');

    if (!garageName) {
      return null;
    }

    return garagesList.find((garage) => garage.name === garageName) || null;
  }, [searchParams, garagesList]);
  const sourceFromQuery = searchParams?.get('source');

  if (quoteContext) {
    return (
      <GarageDetailPage
        garage={quoteContext.garage}
        backLabel="Back to Quotes"
        mode="quote-context"
        quoteContext={{
          quote: quoteContext.quote,
          issues: quoteContext.issues,
          issueIds: quoteContext.issueIds,
          aiEstimateRange: quoteContext.aiEstimateRange,
        }}
        onBack={() => router.push('/quotes')}
      />
    );
  }

  if (garageFromQuery) {
    return (
      <GarageDetailPage
        garage={garageFromQuery}
        backLabel={
          sourceFromQuery === 'quotes' || sourceFromQuery === 'request-aent'
            ? 'Back to Quotes'
            : 'Back to Garages'
        }
        onBack={() => router.push('/garages')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-[17.5px] font-bold tracking-[-0.03em] text-[#17307a]">
              View All Garages
            </h1>
            <p className="mt-1.5 text-[12.5px] font-medium text-[#4f67a2]">
              Showing {filteredGarages.length} garages near{' '}
              <span className="font-bold text-[#1a56db]">{userCity}</span>
            </p>
        </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          <div className="flex items-center rounded-[11px] border border-[#dbe6ff]/90 bg-white p-0.5 shadow-[0_6px_15px_rgba(30,58,138,0.03)]">
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setPage(1);
              }}
              className={cn(
                'flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-semibold transition-colors',
                viewMode === 'list'
                  ? 'bg-[#1a56db] text-white'
                  : 'text-[#17307a]'
              )}
            >
              <List className="h-4 w-4" />
              List View
            </button>
            <button
              type="button"
              disabled
              onClick={() => {
                setViewMode('map');
                setPage(1);
              }}
              className={cn(
                'flex h-[30px] items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                viewMode === 'map'
                  ? 'bg-[#1a56db] text-white'
                  : 'text-[#17307a]'
              )}
            >
              <Map className="h-4 w-4" />
              Map View
            </button>
          </div>

          <div className="relative flex items-center gap-1">
            <span className="text-[12px] font-semibold text-[#17307a]">
              Sort By:
            </span>
            <button
              type="button"
              onClick={() => {
                setSortOpen((current) => !current);
                setOpenFilter(null);
              }}
              className="flex h-[34px] items-center gap-2 rounded-[10px] border border-[#dbe6ff] bg-white px-3 text-[11.5px] font-semibold text-[#17307a] shadow-[0_6px_15px_rgba(30,58,138,0.03)]"
            >
              {sortOptions.find((option) => option.value === sortBy)?.label}
              <ChevronDown className="h-4 w-4 text-[#6173a1]" />
            </button>
            {sortOpen ? (
              <div className="absolute right-0 top-[39px] z-20 min-w-[190px] rounded-[12px] border border-[#dbe6ff] bg-white p-2 shadow-[0_16px_36px_rgba(30,58,138,0.11)]">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortBy(option.value);
                      setSortOpen(false);
                      setPage(1);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium transition-colors',
                      option.value === sortBy
                        ? 'bg-[#eef4ff] text-[#1a56db]'
                        : 'text-[#17307a] hover:bg-[#f8fbff]'
                    )}
                  >
                    <span>{option.label}</span>
                    {option.value === sortBy ? (
                      <BadgeCheck className="h-4 w-4 fill-[#1a56db] text-white" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        {filterPills.map(({ key, label, icon }, index) => (
          <FilterMenu
            key={key}
            label={label}
            icon={icon}
            options={filterOptions[key]}
            value={filters[key]}
            open={openFilter === key}
            align={index % 3 === 2 ? 'right' : 'left'}
            onOpen={() => {
              setOpenFilter(key);
              setSortOpen(false);
            }}
            onClose={() => setOpenFilter(null)}
            onSelect={(value) => resetPageAndSetFilter(key, value)}
          />
        ))}

        {activeFiltersCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-[34px] items-center gap-2 rounded-[10px] border border-[#ffd2d2] bg-white px-3 text-[11.5px] font-semibold text-[#d14343] shadow-[0_6px_15px_rgba(30,58,138,0.03)]"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        ) : null}
      </div>

      {viewMode === 'map' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
            {paginatedGarages.map((garage) => (
              <div key={garage.name} className="relative group">
                <div className="absolute inset-0 z-0" onClick={() => router.push(`/garages?garage=${encodeURIComponent(garage.name)}`)} />
                <GarageCard
                  {...garage}
                  compact
                  isWishlisted={wishlistItems.some((i: any) => i.id === garage.id || i.id === garage.name || i.name === garage.name)}
                  onClick={(e) => toggleWishlist(e, garage)}
                />
              </div>
            ))}
          </div>
          <Card className="sticky top-0 flex min-h-[720px] flex-col overflow-hidden rounded-[18px] border-[#e7eefc] bg-[linear-gradient(180deg,#edf5ff_0%,#dfefff_100%)] shadow-[0_14px_34px_rgba(21,48,122,0.08)]">
            <div className="border-b border-[#d9e6ff] px-5 py-4">
              <h3 className="text-[14.5px] font-bold text-[#17307a]">
                Map View
              </h3>
              <p className="mt-1 text-[11.5px] text-[#6173a1]">
                Garage markers update from current filters.
              </p>
            </div>
            <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_20%_25%,rgba(83,143,255,0.22),transparent_18%),radial-gradient(circle_at_72%_38%,rgba(26,86,219,0.18),transparent_20%),linear-gradient(180deg,#f4f8ff_0%,#e4efff_100%)]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(145,170,221,0.18)_1px,transparent_1px),linear-gradient(rgba(145,170,221,0.18)_1px,transparent_1px)] bg-[size:42px_42px]" />
              {paginatedGarages.map((garage, index) => (
                <div
                  key={garage.name}
                  className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-[#1a56db] text-white shadow-[0_10px_20px_rgba(26,86,219,0.24)] cursor-pointer transition-transform hover:scale-105"
                  style={{
                    left: `${
                      18 + (index % 2) * 38 + Math.floor(index / 2) * 6
                    }%`,
                    top: `${14 + (index % 3) * 22}%`,
                  }}
                  onClick={() => router.push(`/garages?garage=${encodeURIComponent(garage.name)}`)}
                >
                  <MapPin className="h-5 w-5 fill-white" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : filteredGarages.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-[#dbe6ff] bg-white text-center shadow-sm">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f7ff] text-[#6173a1]">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] font-bold text-[#17307a]">No garages found</h3>
          <p className="mt-1 text-[13px] text-[#6173a1]">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {paginatedGarages.map((garage) => (
            <div key={garage.name} className="relative group">
              <div className="absolute inset-0 z-0 cursor-pointer" onClick={() => router.push(`/garages?garage=${encodeURIComponent(garage.name)}`)} />
              <GarageCard
                {...garage}
                isWishlisted={wishlistItems.some((i: any) => i.id === garage.id || i.id === garage.name || i.name === garage.name)}
                onClick={(e) => toggleWishlist(e, garage)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="hidden lg:block" />
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#dbe6ff] bg-white text-[#17307a] shadow-[0_8px_20px_rgba(30,58,138,0.04)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageButtons.map((entry, index) =>
            entry === 'ellipsis' || entry === 'ellipsis-2' ? (
              <div
                key={`${entry}-${index}`}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#dbe6ff] bg-white text-[12px] font-semibold text-[#6173a1]"
              >
                ...
              </div>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => setPage(entry)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-[12px] border text-[12px] font-semibold',
                  entry === currentPage
                    ? 'border-[#1a56db] bg-[#1a56db] text-white shadow-[0_10px_20px_rgba(26,86,219,0.18)]'
                    : 'border-[#dbe6ff] bg-white text-[#6173a1]'
                )}
              >
                {entry}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={currentPage === totalPages}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#dbe6ff] bg-white text-[#17307a] shadow-[0_8px_20px_rgba(30,58,138,0.04)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center text-[12.5px] font-medium text-[#4f67a2] lg:text-right">
          Showing {startIndex} - {endIndex} of {filteredGarages.length} garages
        </div>
      </div>

      {isToastVisible && (
        <div className="fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 flex items-center gap-2 bg-slate-900">
          <BadgeCheck className="w-4 h-4 text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}

const garagesImageSources = [
  '/assets/garage_1_1778071156220.png',
  '/assets/garage_2_1778071173295.png',
  '/assets/garage_3_1778071191282.png',
  '/assets/garage_4_1778071611328.png',
  '/assets/garage_5_1778071628253.png',
];

export function GaragesPage() {
  return (
    <>
      <DashboardShell header={<TopNavbar />}>
        <GaragesContent />
      </DashboardShell>
      <PageLoader imageSources={garagesImageSources} />
    </>
  );
}

export default GaragesPage;
