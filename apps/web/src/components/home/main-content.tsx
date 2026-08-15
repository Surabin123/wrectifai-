'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BadgeIndianRupee,
  BatteryCharging,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sticker,
  Zap,
  Snowflake,
  X,
  FileText,
  Gift,
  Sun,
  CloudRain,
  Settings as SettingsIcon,
} from 'lucide-react';

import { fetchGarages, fetchPromos } from '@/lib/garages-api';
import { Promo } from '@/lib/garages-api';
import { useFavorites } from '@/lib/favorites-context';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/common/button';
import { Card } from '@/components/common/card';
import { Input } from '@/components/common/input';
import {
  careTips,
  categoryItems,
  maintenanceItems,
  type Garage,
} from '@/components/home/data';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/lib/currency';

function SectionHeader({
  title,
  linkLabel,
  href,
}: {
  title: string;
  linkLabel: string;
  href?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15.5px] font-semibold tracking-[-0.03em] text-[#17307a]">{title}</h2>
      {href ? (
        <Link href={href} className="text-[12px] font-semibold text-[#1a56db] hover:underline">
          {linkLabel}
        </Link>
      ) : (
        <span className="text-[12px] font-semibold text-[#1a56db]">{linkLabel}</span>
      )}
    </div>
  );
}

function HoverComingSoon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

const moreCategoryItems = [
  { label: 'Loans', icon: BadgeIndianRupee, image: '/assets/loans.png', href: '/shop' },
  { label: 'Used Cars', icon: Sticker, image: '/assets/Used_cars.png', href: '/shop' },
  { label: 'Electrical & Battery Systems', icon: BatteryCharging, image: '/assets/Electrical.png', href: '/shop' },
  { label: 'AC & Cooling Systems', icon: Snowflake, image: '/assets/new_ac.png', href: '/shop' },
  { label: 'Vehicle Protection & Safety', icon: ShieldCheck, image: '/assets/isurance.svg', href: '/shop' },
  { label: 'Documentation & Compliance', icon: FileText, image: '/assets/Documentation.png', href: '/shop' },
  { label: 'EV Services', icon: Zap, image: '/assets/ev.png', href: '/shop' },
  { label: 'Subscription & Bundles', icon: Gift, image: '/assets/subscription.png', href: '/shop' },
];

function CategoriesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto md:overflow-y-hidden bg-[rgba(10,18,45,0.24)] px-4 py-5 backdrop-blur-[1px]">
      <div className="max-h-[calc(100vh-40px)] md:max-h-none w-full max-w-[740px] overflow-y-auto md:overflow-hidden rounded-[20px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(16,35,86,0.18)]">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15.5px] font-semibold tracking-[-0.03em] text-[#17307a]">
                All Categories
              </h2>
              <p className="mt-1 text-[11px] font-normal text-[#17307a]">
                Explore our wide range of services and products for your car
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close categories modal"
              className="mt-0.5 text-[#17307a] transition-all hover:text-black hover:scale-110 active:scale-90 duration-150"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-[13px] font-semibold tracking-[-0.03em] text-[#17307a]">
              Top Categories
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
              {categoryItems.map(({ label, icon: Icon, image, href }) => (
                <Link key={label} href={href}>
                  <Card
                    className="flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[12px] border-[#e8eefc] px-2 py-2.5 text-center shadow-none transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,86,219,0.12)] hover:border-[#c0d0f0] cursor-pointer"
                  >
                    {image ? (
                      <Image 
                        src={image} 
                        alt={label}
                        width={44}
                        height={44}
                        className="object-contain"
                        style={{ width: '44px', height: 'auto' }}
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f9ff] text-[#173fcf]">
                        <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
                      </div>
                    )}
                    <div className="max-w-[82px] text-[10.5px] font-semibold leading-[1.25] text-[#17307a]">
                      {label}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-[13px] font-semibold tracking-[-0.03em] text-[#17307a]">
              More Categories
            </h3>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {moreCategoryItems.map(({ label, icon: Icon, image, href }) => (
                <Link key={label} href={href}>
                  <Card
                    className="flex min-h-[54px] items-center gap-3 rounded-[12px] border-[#e8eefc] px-4 py-2 shadow-none transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,86,219,0.12)] hover:border-[#c0d0f0] cursor-pointer"
                  >
                    {image ? (
                      <Image 
                        src={image} 
                        alt={label}
                        width={36}
                        height={36}
                        className="object-contain"
                        style={{ width: '36px', height: 'auto' }}
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f9ff] text-[#1a56db]">
                        <Icon className="h-5 w-5 stroke-[1.8]" />
                      </div>
                    )}
                    <div className="max-w-[124px] text-[10.5px] font-semibold leading-[1.35] text-[#17307a]">
                      {label === 'Vehicle Protection & Safety' ? (
                        <>
                          <span className="block whitespace-nowrap">Vehicle Protection</span>
                          <span className="block">&amp; Safety</span>
                        </>
                      ) : (
                        label
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <Card className="mt-5 flex flex-col gap-3 rounded-[16px] border-[#e8eefc] bg-[linear-gradient(180deg,#f7faff_0%,#f2f6ff_100%)] px-4 py-3 shadow-none sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_6px_18px_rgba(26,86,219,0.08)]">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-[12.5px] font-semibold tracking-[-0.03em] text-[#17307a]">
                  Can&apos;t find what you&apos;re looking for?
                </h4>
                <p className="mt-0.5 text-[11px] font-normal text-[#17307a]">
                  Let us help you find the right service for your car.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[12px] px-4 text-[11.5px] font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Get Help
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HeroBanner() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [imageIndex, setImageIndex] = useState(0);

  const bannerImages = [
    {
      src: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
      name: 'Chevrolet Camaro',
      model: '2SS Coupe',
      year: '2024',
    },
    {
      src: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=600&q=80',
      name: 'Ford Mustang',
      model: 'GT Fastback',
      year: '2023',
    },
    {
      src: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
      name: 'BMW 3 Series',
      model: '330i M Sport',
      year: '2024',
    },
  ];

  const activeBanner = bannerImages[imageIndex] || bannerImages[0];

  const nextImage = () => setImageIndex((i) => Math.min(i + 1, bannerImages.length - 1));
  const prevImage = () => setImageIndex((i) => Math.max(i - 1, 0));
  const examples = [
    { label: 'Engine noise', value: 'Engine noise' },
    { label: 'AC cooling', value: 'AC not cooling' },
    { label: 'Brake vibe', value: 'Brake vibration' },
    { label: 'Low pickup', value: 'Low pickup' },
  ];

  const runDiagnoseSearch = () => {
    const nextIssue = query.trim();

    if (nextIssue) {
      router.push(`/ai-diagnose?issue=${encodeURIComponent(nextIssue)}`);
      return;
    }

    router.push('/ai-diagnose');
  };

  return (
    <Card
      id="ai-diagnose"
      className="relative overflow-hidden border-0 bg-[linear-gradient(109deg,#07163b_0%,#132c66_48%,#3d1565_100%)] px-5 py-3 text-white sm:px-6 sm:py-3.5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_25%,rgba(41,98,255,0.45),transparent_20%),radial-gradient(circle_at_84%_35%,rgba(84,225,255,0.18),transparent_15%),radial-gradient(circle_at_86%_72%,rgba(213,55,255,0.2),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(13,22,51,0.6))]" />
      
      <div className="absolute right-0 top-0 bottom-0 hidden lg:block w-[35%] xl:w-[42%] overflow-hidden rounded-r-[inherit] z-20">
        <div className="group relative h-full w-full">
          <Image
            src={activeBanner.src}
            alt="Diagnose Car"
            fill
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover"
          />

          {imageIndex > 0 && (
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white/85 backdrop-blur-md transition-colors hover:bg-black/52 hover:text-white"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          )}

          {imageIndex < bannerImages.length - 1 && (
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white/85 backdrop-blur-md transition-colors hover:bg-black/52 hover:text-white"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 border-t border-white/12 bg-[linear-gradient(180deg,rgba(9,16,38,0.08),rgba(9,16,38,0.46))] px-4 py-3 backdrop-blur-md">
            <div className="grid grid-cols-3 gap-3 text-white">
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-white/62">Name</div>
                <div className="mt-0.5 truncate text-[11px] font-semibold text-white">{activeBanner.name}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-white/62">Model</div>
                <div className="mt-0.5 truncate text-[11px] font-semibold text-white">{activeBanner.model}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-white/62">Year</div>
                <div className="mt-0.5 truncate text-[11px] font-semibold text-white">{activeBanner.year}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_330px] lg:items-center">
        <div className="space-y-3.5 z-10 relative">
          <div>
            <h1 className="text-[19.5px] font-bold tracking-[-0.03em]">Diagnose</h1>
            <p className="mt-1 max-w-[600px] text-[12.5px] leading-6 text-white/88">
              Describe your car issue and let WrectifAI find best solutions for you.
            </p>
          </div>

          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-max space-y-3.5">
              <div className="rounded-[12px] bg-white p-1.5 shadow-[0_10px_24px_rgba(4,13,38,0.25)] max-w-[480px]">
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="relative flex-1 min-w-[280px]">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526693]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="h-[38px] border-0 bg-transparent pl-9 shadow-none focus:ring-0 text-[12.5px]"
                      placeholder="Example: Car shaking at high speed"
                    />
                  </div>
                  <Button type="button" onClick={runDiagnoseSearch} className="h-[38px] rounded-[10px] px-4 text-[12.5px] shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                    Diagnose Now
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 min-w-max">
                <span className="mr-1 shrink-0 text-[11px] text-white/82">Try these examples:</span>
                {examples.map((example) => (
                  <button
                    key={example.value}
                    type="button"
                    onClick={() => setQuery(example.value)}
                    className={cn(
                      'shrink-0 rounded-[8px] border px-2.5 py-1 text-[11px] font-medium backdrop-blur transition-colors',
                      query === example.value
                        ? 'border-white/45 bg-white/20 text-white'
                        : 'border-white/20 bg-white/8 text-white/92 hover:bg-white/14'
                    )}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:block w-full h-full" />
      </div>
    </Card>
  );
}

function CategoryGrid({
  items,
  onViewAll,
}: {
  items: typeof categoryItems;
  onViewAll: () => void;
}) {
  return (
    <section id="categories">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15.5px] font-semibold tracking-[-0.03em] text-[#17307a]">
          Shop by Categories
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[12px] font-semibold text-[#1a56db]"
        >
          View All (8)
        </button>
      </div>
      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-7 gap-3 min-w-[840px]">
          {items.map(({ label, icon: Icon, image, href }) => (
            <HoverComingSoon key={label}>
              <Link href={href}>
                <Card className="flex h-[110px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] px-2 py-3 text-center shadow-[0_6px_16px_rgba(20,44,112,0.04)] border-[#edf2fd] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,86,219,0.12)] hover:border-[#c0d0f0]">
                  {image ? (
                    <Image 
                      src={image} 
                      alt={label}
                      width={64}
                      height={64}
                      className="object-contain"
                      style={{ width: '64px', height: 'auto' }}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f8ff] text-[#173fcf]">
                      <Icon className="h-6 w-6" strokeWidth={1.8} />
                    </div>
                  )}
                  <div className="max-w-full text-[11.5px] font-semibold leading-[1.3] text-[#17307a] px-1">
                    {label}
                  </div>
                </Card>
              </Link>
            </HoverComingSoon>
          ))}
        </div>
      </div>
    </section>
  );
}

function MaintenanceStrip({
  items,
}: {
  items: typeof maintenanceItems;
}) {
  return (
    <section id="maintenance">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[15.5px] font-semibold tracking-[-0.03em] text-[#17307a]">Recommended Preventive Maintenance Services</h2>
        <Link href="/services" className="text-[12px] font-semibold text-[#1a56db] hover:underline">
          View All
        </Link>
      </div>
      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-5 gap-2 min-w-[750px]">
          {items.map(({ label, due, icon: Icon, image }) => (
            <HoverComingSoon key={label}>
              <Card className="flex h-[60px] w-full cursor-default items-center gap-2 px-2 py-1.5 shadow-[0_8px_20px_rgba(20,44,112,0.05)]">
                {image ? (
                  <Image 
                    src={image} 
                    alt={label}
                    width={48}
                    height={48}
                    className="object-contain shrink-0"
                    style={{ width: '48px', height: 'auto' }}
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f8ff] text-[#1a56db]">
                    <Icon className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate whitespace-nowrap text-[9.5px] font-semibold leading-3 text-[#17307a]">
                    {label}
                  </h3>
                  <p className="mt-0.5 whitespace-nowrap text-[9px] font-normal leading-3 text-[#17307a]">{due}</p>
                </div>
              </Card>
            </HoverComingSoon>
          ))}
        </div>
      </div>
    </section>
  );
}

function GarageCard({
  badge,
  name,
  rating,
  reviews,
  location,
  distance,
  price,
  image,
}: Omit<Garage, 'href'>) {
  // Map semantic badge to styling colors and gradients in the frontend design system
  const getBadgeStyle = (badgeText: string) => {
    switch (badgeText) {
      case 'Top Rated':
        return {
          tone: 'green' as const,
          artwork: 'from-[#0b121d] via-[#2a241f] to-[#5b3823]',
        };
      case 'Most Trusted':
        return {
          tone: 'orange' as const,
          artwork: 'from-[#16181f] via-[#362219] to-[#5d2b20]',
        };
      case 'Best Value':
        return {
          tone: 'blue' as const,
          artwork: 'from-[#2f2419] via-[#3c3127] to-[#1a1d25]',
        };
      default:
        return {
          tone: 'blue' as const,
          artwork: 'from-[#151a22] via-[#324150] to-[#12161f]',
        };
    }
  };

  const { tone, artwork } = getBadgeStyle(badge || '');
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(name);

  return (
    <Card className="overflow-hidden rounded-[16px] shadow-[0_12px_26px_rgba(20,44,112,0.08)]">
      <div className={cn('relative h-[86px] bg-gradient-to-r', artwork)}>
        <Image src={image || '/assets/garage_1_1778071156220.png'} alt={name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(5,8,17,0.3))]" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          {badge ? <Badge tone={tone}>{badge}</Badge> : <div />}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(name);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-md transition-transform hover:scale-110 active:scale-95 z-20"
          >
            <Heart 
              fill={favorite ? "currentColor" : "none"} 
              className={cn("h-4 w-4", favorite ? "text-[#1a56db]" : "")} 
            />
          </button>
        </div>
        <div className="absolute bottom-3 left-4 right-4 flex gap-2 opacity-85">
          <div className="h-8 flex-1 rounded bg-white/10" />
          <div className="h-8 w-14 rounded bg-white/10" />
          <div className="h-8 w-10 rounded bg-white/10" />
        </div>
      </div>
      <div className="p-3 pb-2.5">
        <h3 className="text-[13.5px] font-bold tracking-[-0.03em] text-[#17307a]">{name}</h3>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-normal text-[#17307a]">
          <Star className="h-3.5 w-3.5 fill-[#ff9f1a] text-[#ff9f1a]" />
          {Number(rating) > 0 ? (
            <>
              <span className="font-semibold text-[#f28c28]">{Number(rating).toFixed(1)}</span>
              <span>({reviews})</span>
            </>
          ) : (
            <span className="text-gray-400">No reviews yet</span>
          )}
        </div>
        <div className="mt-1.5 space-y-1 text-[11px] font-normal text-[#17307a]">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#17307a]" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {distance && (
              <div className="flex items-center gap-1.5 shrink-0">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#17307a]" />
                <span>{distance}</span>
              </div>
            )}
            {price && <span className="font-bold text-[#16a34a]">{formatCurrency(price)}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function scrollRow(container: HTMLDivElement | null, amount: number) {
  if (!container) {
    return;
  }

  const nextLeft = container.scrollLeft + amount;
  const maxLeft = container.scrollWidth - container.clientWidth;

  if (amount > 0) {
    container.scrollTo({
      left: nextLeft >= maxLeft - 4 ? maxLeft : nextLeft,
      behavior: 'smooth',
    });
  } else {
    container.scrollTo({
      left: nextLeft <= 4 ? 0 : nextLeft,
      behavior: 'smooth',
    });
  }
}

function FeaturedGarages({
  garagesList,
}: {
  garagesList: Garage[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Monitor scroll actions to dynamically update the active page dot
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        setShowLeft(false);
        setShowRight(false);
        return;
      }
      
      setShowLeft(container.scrollLeft > 10);
      setShowRight(container.scrollLeft < maxScroll - 10);

      const progress = container.scrollLeft / maxScroll;
      const index = Math.min(2, Math.max(0, Math.round(progress * 2)));
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger initial execution

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToPage = (pageIndex: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const targetScrollLeft = (pageIndex / 2) * maxScroll;

    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <section id="garages">
      <SectionHeader title="Featured Garages" linkLabel="View All Garages" href="/garages" />
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {garagesList.map(({ href: _href, ...garage }) => (
            <Link key={garage.name} href={`/garages?garage=${encodeURIComponent(garage.name)}`} className="w-[270px] shrink-0 block hover:opacity-95 transition-opacity">
              <GarageCard {...garage} />
            </Link>
          ))}
        </div>
        {showLeft && (
          <button
            type="button"
            onClick={() => scrollRow(scrollRef.current, -286)}
            aria-label="Show previous garages"
            className="absolute left-[-14px] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_10px_25px_rgba(20,44,112,0.18)] xl:flex z-10 animate-in fade-in duration-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {showRight && (
          <button
            type="button"
            onClick={() => scrollRow(scrollRef.current, 286)}
            aria-label="Show more garages"
            className="absolute right-[-14px] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_10px_25px_rgba(20,44,112,0.18)] xl:flex z-10 animate-in fade-in duration-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <div className="mt-3 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              aria-label={`Go to garages page ${i + 1}`}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-300",
                activeIndex === i 
                  ? "bg-[#1a56db] w-5 shadow-sm" 
                  : "bg-[#c8d6f6] hover:bg-[#a5beee]"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface Deal {
  title: string;
  subtitle: string;
  price: string;
  strikePrice: string;
  discount: string;
  icon: React.ComponentType<{ className?: string }> | null;
  textColor: string;
  bgColor: string;
  fadeColor: string;
  image?: string;
}

interface PromoItem {
  isCombo: boolean;
  badge?: string;
  title: string;
  displayPrice: string;
  strikePrice: string;
  discountLabel: string;
  icon: string;
  accent?: string;
  bgColor?: string;
  cardTint?: string;
  image?: string;
}

function SeasonalDeals({
  deals,
}: {
  deals: Deal[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        setShowLeft(false);
        setShowRight(false);
        return;
      }
      setShowLeft(container.scrollLeft > 10);
      setShowRight(container.scrollLeft < maxScroll - 10);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="seasonal-deals">
      <SectionHeader title="Seasonal Care Combo Deals" linkLabel="View All Deals" href="/deals" />
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {deals.map((deal) => {
            const DealIcon = deal.icon;
            return (
              <Card
                key={deal.title}
                style={{ backgroundColor: deal.bgColor }}
                className="w-[270px] shrink-0 overflow-hidden border border-[#e5e9f2]/50 p-0 shadow-[0_3px_10px_-1px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_4px_12px_-1px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
              >
                <div className="grid min-h-[96px] grid-cols-[1.25fr_0.75fr]">
                  <div className="p-3 pb-2.5 relative z-10 flex flex-col justify-between">
                    <div>
                      <div className={cn('flex items-center gap-1 text-[11.5px] font-bold', deal.textColor)}>
                        {DealIcon ? <DealIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                        {deal.title}
                      </div>
                      <p className="mt-1 max-w-[175px] text-[10.5px] leading-[1.35] font-normal text-[#17307a] line-clamp-2">{deal.subtitle}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
                      <span className={cn('text-[17px] font-bold leading-none', deal.textColor)}>{deal.price}</span>
                      <span className="text-[10.5px] font-medium text-[#8a96b8] line-through">{deal.strikePrice}</span>
                      <Badge tone="lightGreen" className="px-1.5 py-0.5 text-[9px] font-bold leading-none">
                        {deal.discount}
                      </Badge>
                    </div>
                  </div>
                  <div 
                    className="relative h-full w-full overflow-hidden select-none"
                    style={{ backgroundColor: deal.bgColor }}
                  >
                    {deal.image ? (
                      <>
                        <Image
                           src={deal.image}
                           alt={deal.title}
                           fill
                           sizes="(max-width: 768px) 100vw, 15vw"
                           className="object-cover object-center"
                        />
                        <div 
                          className="absolute inset-y-0 left-0 w-10 pointer-events-none"
                          style={{
                            background: `linear-gradient(to right, ${deal.bgColor} 0%, ${deal.bgColor}a0 40%, ${deal.bgColor}00 100%)`
                          }}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {showLeft && (
          <button
            type="button"
            onClick={() => scrollRow(scrollRef.current, -286)}
            aria-label="Show previous seasonal deals"
            className="absolute left-[-14px] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_10px_25px_rgba(20,44,112,0.18)] xl:flex z-10 animate-in fade-in duration-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {showRight && (
          <button
            type="button"
            onClick={() => scrollRow(scrollRef.current, 286)}
            aria-label="Show more seasonal deals"
            className="absolute right-[-14px] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_10px_25px_rgba(20,44,112,0.18)] xl:flex z-10 animate-in fade-in duration-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
}

function CareTips({
  tips,
}: {
  tips: typeof careTips;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        setShowLeft(false);
        setShowRight(false);
        return;
      }
      setShowLeft(container.scrollLeft > 10);
      setShowRight(container.scrollLeft < maxScroll - 10);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="tips">
      <SectionHeader title="Car Care Tips" linkLabel="View All Tips" href="/car-tips" />
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tips.map(({ title, icon: Icon, image }, index) => (
            <Card key={title} className="grid min-h-[86px] w-[220px] shrink-0 grid-cols-[1fr_75px] items-center overflow-hidden p-0 border border-[#e5e9f2]/50 shadow-[0_3px_10px_-1px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_4px_12px_-1px_rgba(0,0,0,0.05)] hover:-translate-y-0.5">
              <div className="p-3 py-2.5">
                <p className="text-[11px] font-medium leading-[1.3] text-[#17307a] line-clamp-4">{title}</p>
              </div>
              <div className="relative h-full overflow-hidden">
                {image ? (
                  <>
                    <Image src={image} alt={title} fill sizes="(max-width: 768px) 100vw, 10vw" className="object-cover" />
                    <div
                      className="absolute inset-y-0 left-0 w-10 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to right, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 34%, rgba(255,255,255,0) 100%)',
                      }}
                    />
                  </>
                ) : (
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br flex items-center justify-center text-[#17307a]',
                      index === 0
                        ? 'from-[#f5f8ff] to-[#dfe9ff]'
                        : index === 1
                          ? 'from-[#fff6ea] to-[#ffe3a8]'
                          : index === 2
                            ? 'from-[#eef5ff] to-[#d9ecff]'
                            : index === 3
                              ? 'from-[#f2f6ff] to-[#edf1f6]'
                              : 'from-[#eef9f7] to-[#daf5ee]'
                    )}
                  >
                    <Icon className="h-9 w-9 opacity-85" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        {showLeft && (
          <button
            type="button"
            onClick={() => scrollRow(scrollRef.current, -220)}
            aria-label="Show previous care tips"
            className="absolute left-[-14px] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_10px_25px_rgba(20,44,112,0.18)] xl:flex z-10 animate-in fade-in duration-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {showRight && (
          <button
            type="button"
            onClick={() => scrollRow(scrollRef.current, 220)}
            aria-label="Show more care tips"
            className="absolute right-[-14px] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_10px_25px_rgba(20,44,112,0.18)] xl:flex z-10 animate-in fade-in duration-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
}

export function MainContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [userCity, setUserCity] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string | undefined>(undefined);
  const [garagesList, setGaragesList] = useState<Garage[]>([]);
  const [dealsList, setDealsList] = useState<Deal[]>([]);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

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
    const handleSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setSearchTerm(customEvent.detail ?? '');
    };
    
    const handleCityChange = () => {
      // Helper function to get cookie safely
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      const city = getCookie('wrectifai_city') || 'Location';
      setUserCity(decodeURIComponent(city));
    };
    
    handleCityChange();

    window.addEventListener('dashboard-search', handleSearch);
    window.addEventListener('city-changed', handleCityChange);
    return () => {
      window.removeEventListener('dashboard-search', handleSearch);
      window.removeEventListener('city-changed', handleCityChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    // Fetch ALL approved garages — city is display context only, not a DB filter.
    fetchGarages()
      .then((data) => {
        if (active && data && data.length > 0) {
          // Inject the selected city as the display location on every garage card.
          const mapped = data.map((g: any) => ({
            ...g,
            rating: g.rating_avg ? Number(g.rating_avg) : (g.rating ? Number(g.rating) : 0),
            reviews: g.rating_count ? Number(g.rating_count) : (g.reviews ? Number(g.reviews) : 0),
            distance: typeof g.distance_km !== 'undefined' ? `${g.distance_km} km` : g.distance,
            responseMins: typeof g.response_mins !== 'undefined' ? Number(g.response_mins) : g.responseMins,
            location: (userCity && userCity !== 'Location') ? userCity : (g.location || g.city || 'Not Specified'),
          }));
          setGaragesList(mapped as unknown as Garage[]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch garages:', err);
      });
    return () => {
      active = false;
    };
  }, [userCity]);



  useEffect(() => {
    let active = true;
    fetchPromos()
      .then((data) => {
        if (active && data && data.length > 0) {
          const getIconComponent = (iconName: string) => {
            switch (iconName) {
              case 'Sun': return Sun;
              case 'CloudRain': return CloudRain;
              case 'Snowflake': return Snowflake;
              case 'Sparkles': return Sparkles;
              case 'Settings': return SettingsIcon;
              default: return Snowflake;
            }
          };

          const comboDeals = data
            .filter((p) => p.isCombo)
            .map((p) => {
              const displayPrice = formatCurrency(Number(p.numericPrice), userPhone);
              const strikePriceStr = p.strikePrice ? formatCurrency(Number(p.strikePrice), userPhone) : '';
              const discountStr = p.discountPercent ? `${p.discountPercent}% OFF` : '';
              
              // We'll map theme colors explicitly based on the backend theme preset
              let textColor = 'text-[#1a56db]';
              let bgColor = '#eff6ff';
              let fadeColor = 'from-[#eff6ff]';
              
              if (p.themePreset === 'summer') {
                textColor = 'text-[#ea580c]';
                bgColor = '#fff7ed';
                fadeColor = 'from-[#fff7ed]';
              } else if (p.themePreset === 'monsoon') {
                textColor = 'text-[#0284c7]';
                bgColor = '#f0f9ff';
                fadeColor = 'from-[#f0f9ff]';
              } else if (p.themePreset === 'winter') {
                textColor = 'text-[#0d9488]';
                bgColor = '#f0fdfa';
                fadeColor = 'from-[#f0fdfa]';
              } else if (p.themePreset === 'festive') {
                textColor = 'text-[#e11d48]';
                bgColor = '#fff1f2';
                fadeColor = 'from-[#fff1f2]';
              }
              
              return {
                title: p.badge || p.title,
                subtitle: p.title,
                price: displayPrice,
                strikePrice: strikePriceStr,
                discount: discountStr,
                icon: getIconComponent(p.icon),
                textColor,
                bgColor,
                fadeColor,
                image: p.image,
              };
            });
          if (comboDeals.length > 0) {
            setDealsList(comboDeals);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch combo deals:', err);
      });
    return () => {
      active = false;
    };
  }, [userPhone]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCategories = useMemo(
    () =>
      normalizedSearch
        ? categoryItems.filter((item) => item.label.toLowerCase().includes(normalizedSearch))
        : categoryItems,
    [normalizedSearch]
  );

  const filteredMaintenance = useMemo(
    () =>
      normalizedSearch
        ? maintenanceItems.filter(
            (item) =>
              item.label.toLowerCase().includes(normalizedSearch) ||
              item.due.toLowerCase().includes(normalizedSearch)
          )
        : maintenanceItems,
    [normalizedSearch]
  );

  const filteredGarages = useMemo(
    () =>
      normalizedSearch
        ? garagesList.filter(
            (item) =>
              item.name.toLowerCase().includes(normalizedSearch) ||
              item.location.toLowerCase().includes(normalizedSearch)
          )
        : garagesList,
    [normalizedSearch, garagesList]
  );

  const filteredDeals = useMemo(
    () =>
      normalizedSearch
        ? dealsList.filter(
            (item) =>
              item.title.toLowerCase().includes(normalizedSearch) ||
              item.subtitle.toLowerCase().includes(normalizedSearch)
          )
        : dealsList,
    [normalizedSearch, dealsList]
  );

  const filteredTips = useMemo(
    () =>
      normalizedSearch
        ? careTips.filter((item) => item.title.toLowerCase().includes(normalizedSearch))
        : careTips,
    [normalizedSearch]
  );

  const hasResults =
    filteredCategories.length > 0 ||
    filteredMaintenance.length > 0 ||
    filteredGarages.length > 0 ||
    filteredDeals.length > 0 ||
    filteredTips.length > 0;

  return (
    <>
      <div className="space-y-7 pb-5">
        <HeroBanner />
        {normalizedSearch ? (
          <div className="rounded-[16px] border border-[#e4ecff] bg-white px-4 py-3 text-[12px] font-medium text-[#4f67a2] shadow-[0_8px_20px_rgba(20,44,112,0.04)]">
            Showing results for <span className="font-bold text-[#1a56db]">{searchTerm}</span>
          </div>
        ) : null}
        {filteredCategories.length > 0 ? (
          <CategoryGrid items={filteredCategories} onViewAll={() => setIsCategoriesModalOpen(true)} />
        ) : null}
        {filteredMaintenance.length > 0 ? <MaintenanceStrip items={filteredMaintenance} /> : null}
        {filteredGarages.length > 0 ? <FeaturedGarages garagesList={filteredGarages} /> : null}
        {filteredDeals.length > 0 ? <SeasonalDeals deals={filteredDeals} /> : null}
        {filteredTips.length > 0 ? <CareTips tips={filteredTips} /> : null}
        {!hasResults ? (
          <Card className="rounded-[18px] border-[#e4ecff] px-5 py-6 text-center shadow-[0_8px_20px_rgba(20,44,112,0.04)]">
            <div className="text-[14.5px] font-bold text-[#17307a]">No dashboard matches found</div>
            <div className="mt-2 text-[12px] text-[#66759e]">
              Try another search term for services, parts, garages, or tips.
            </div>
          </Card>
        ) : null}
      </div>
      <CategoriesModal
        open={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />
    </>
  );
}
