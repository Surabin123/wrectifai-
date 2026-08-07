
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, CalendarDays, Package, FileText, Car } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/common/card';
import { emergencyItems } from '@/components/home/data';
import { cn } from '@/utils/cn';
import { apiClient } from '@/lib/api-client';
import { fetchBookings } from '@/lib/bookings-api';
import { fetchQuotes } from '@/lib/quotes-api';
import { getPromoTheme } from '@/utils/promo-theme';

function OverviewPanel() {
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [nextBooking, setNextBooking] = useState<string>('No upcoming bookings');
  const [quotesCount, setQuotesCount] = useState<number>(0);
  const [vehiclesCount, setVehiclesCount] = useState<number>(0);
  const [vehicleDesc, setVehicleDesc] = useState<string>('No vehicles added');
  const [ordersCount, setOrdersCount] = useState<number>(0);

  const [timeFilter, setTimeFilter] = useState('this_month');
  const router = useRouter();

  const loadStats = () => {
    let active = true;
    apiClient.get(`/users/customer/stats?filter=${timeFilter}`)
      .then((data: any) => {
        if (!active || !data) return;
        setBookingsCount(data.bookingsCount || 0);
        setQuotesCount(data.quotesCount || 0);
        setVehiclesCount(data.vehiclesCount || 0);
        setOrdersCount(data.ordersCount || 0);

        if (data.vehiclesCount === 0) setVehicleDesc('No vehicles added');
        else if (data.vehiclesCount === 1) setVehicleDesc('1 Vehicle registered');
        else setVehicleDesc(`${data.vehiclesCount} Vehicles registered`);

        if (data.nextBooking) {
          const nextDate = new Date(data.nextBooking);
          const formatted = nextDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + nextDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          setNextBooking(`Next: ${formatted}`);
        } else {
          setNextBooking('No upcoming bookings');
        }
      })
      .catch((err) => {
        console.error('Overview panel stats fetch failed:', err);
      });
    return () => { active = false; };
  };

  useEffect(() => {
    const cleanup = loadStats();
    window.addEventListener('dashboard_refresh', loadStats);
    return () => {
      cleanup();
      window.removeEventListener('dashboard_refresh', loadStats);
    };
  }, [timeFilter]);

  const items = [
    {
      title: 'Upcoming Bookings',
      value: String(bookingsCount),
      description: nextBooking,
      cta: 'View All',
      href: '/bookings',
      icon: CalendarDays,
      colors: 'from-[#7c3aed] to-[#9f67ff]',
    },
    {
      title: 'Part Orders',
      value: String(ordersCount),
      description: ordersCount === 0 ? 'No Part Orders' : (ordersCount === 1 ? '1 Order In Transit' : `${ordersCount} Orders`),
      cta: 'View All',
      href: '/offers',
      icon: Package,
      colors: 'from-[#f97316] to-[#f59e0b]',
    },
    {
      title: 'Pending Quotes',
      value: String(quotesCount),
      description: quotesCount > 0 ? 'Action Required' : 'No active quotes',
      cta: 'View All',
      href: '/quotes',
      icon: FileText,
      colors: 'from-[#3b82f6] to-[#2563eb]',
    },
    {
      title: 'Vehicles',
      value: String(vehiclesCount),
      description: vehicleDesc,
      cta: 'View All',
      href: '/vehicles',
      icon: Car,
      colors: 'from-[#10b981] to-[#059669]',
    },
  ];

  return (
    <Card id="overview" className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.03em] text-[#17307a]">
          My Overview
        </h2>
        <select 
          className="flex h-9 items-center gap-2 rounded-[10px] border border-[#dbe6ff] px-3 text-[11.5px] font-semibold text-[#17307a] bg-transparent outline-none cursor-pointer"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="all_time">All Time</option>
        </select>
      </div>

      <div className="space-y-2">
        {items.map(({ title, value, description, cta, href, icon: Icon, colors }) => (
          <div key={title} className="flex items-center gap-3 rounded-[14px] py-0">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-[0_10px_20px_rgba(20,44,112,0.18)]',
                colors
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#17307a]">{title}</p>
              <div className="mt-0.5 flex items-end gap-2">
                <span className="text-[14.5px] font-semibold text-[#17307a]">{value}</span>
              </div>
              <p className="mt-0.5 text-[11px] font-normal text-[#17307a]">{description}</p>
            </div>
            <button onClick={() => router.push(href)} className="self-center text-[11.5px] font-semibold text-[#1a56db] cursor-pointer hover:underline">{cta}</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmergencyHelp() {
  return (
    <Card id="emergency" className="p-4 border-[#fff0f0] bg-[#fffbfa]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-[-0.03em] text-[#ff3b30]">
            Emergency Help
          </h2>
          <p className="mt-1 text-[11px] font-normal text-[#17307a]">Quick assistance, anytime</p>
        </div>
        <div className="rounded-full bg-[#ffeeee] px-3 py-1 text-[11.5px] font-bold text-[#ff3b30]">
          24/7
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {emergencyItems.map(({ title, image, imageClass }) => {
          const isLarge = imageClass?.includes('h-10');
          const size = isLarge ? 40 : 32;
          return (
            <a
              key={title}
              href={href}
              className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[14px] border border-[#f0f4ff] bg-white px-1 py-1 text-center shadow-[0_4px_12px_rgba(20,44,112,0.03)] cursor-pointer hover:border-[#ffcccc] transition-all hover:bg-[#fffdfd]"
            >
              <div
                className={cn(
                  "flex items-center justify-center",
                  isLarge ? "h-10 w-10" : "h-8 w-8"
                )}
              >
                <Image
                  src={image}
                  alt={title}
                  width={size}
                  height={size}
                  className="object-contain"
                  style={{ width: `${size}px`, height: `${size}px` }}
                />
              </div>
              <span className="max-w-[72px] text-[10.5px] font-semibold leading-tight text-[#17307a]">
                {title}
              </span>
            </a>
          );
        })}
      </div>
    </Card>
  );
}

function OfferCard({
  eyebrow,
  title,
  price,
  strikePrice,
  discount,
  themePreset,
  icon: Icon,
  image,
}: {
  eyebrow: string;
  title: string;
  price: string;
  strikePrice?: string;
  discount: string;
  themePreset: string;
  icon: any;
  image?: string;
}) {
  const theme = getPromoTheme(themePreset);
  const isGreen = themePreset === 'green';
  const isRed = themePreset === 'red';
  const isPurple = themePreset === 'purple';
  const cardColor = theme.bgColor;

  return (
    <Card
      className="overflow-hidden border-0 p-0 shadow-none"
      style={{ backgroundColor: cardColor }}
    >
      <div className="grid min-h-[138px] grid-cols-[1.18fr_0.82fr] items-center">
        <div className="p-4 pr-0">
          <p className={cn('text-[11px] font-bold uppercase tracking-[0.02em]', theme.accentClass)}>{eyebrow}</p>
          <p className="mt-2 text-[12px] font-semibold leading-6 text-[#17307a]">{title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn('text-[11px] font-bold', theme.accentClass)}>Starting</span>
            <span className={cn('text-[14.5px] font-bold leading-none', theme.accentClass)}>{price}</span>
            <span className="text-[10.5px] font-medium text-[#8a96b8] line-through">{strikePrice}</span>
          </div>
        </div>
        <div
          className="relative h-full min-h-[138px] overflow-hidden flex items-center select-none"
          style={{ backgroundColor: cardColor }}
        >
          {image ? (
            <>
              <Image
                src={image}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 15vw"
                className="object-cover object-center mix-blend-multiply"
              />
              <div
                className="absolute inset-y-0 left-0 w-20 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, ${cardColor} 0%, ${cardColor}e0 25%, ${cardColor}00 100%)`
                }}
              />
            </>
          ) : (
            <div className="m-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/50 bg-white/55 text-[#17307a] shadow-[0_12px_24px_rgba(20,44,112,0.15)] backdrop-blur">
              <Icon className="h-8 w-8" />
            </div>
          )}

          <div
            className={cn(
              'absolute right-3 top-3 z-10 flex flex-col items-center justify-center rounded-[8px] px-2 py-1 text-[11px] font-bold leading-3 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
              isGreen ? 'bg-[#238453]' : isRed ? 'bg-[#ff3b30]' : isPurple ? 'bg-[#805ad5]' : 'bg-[#1a56db]'
            )}
          >
            <span>{discount.split(' ')[0]}</span>
            <span className="text-[9.5px] font-semibold">{discount.split(' ')[1]}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OffersPanel() {
  const [promos, setPromos] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    apiClient.get<any[]>('/promos')
      .then((data) => {
        if (active && data) {
          // Filter to only display non-combo/home promos (or just take the first 3)
          const homePromos = data
            .filter((p: any) => !p.isCombo)
            .map((p: any) => ({
              eyebrow: p.badge,
              title: p.title,
              price: `$${Number(p.numericPrice).toLocaleString('en-US')}`,
              strikePrice: p.strikePrice ? `$${Number(p.strikePrice).toLocaleString('en-US')}` : undefined,
              discount: p.discountPercent ? `${p.discountPercent}% OFF` : '',
              themePreset: p.themePreset,
              icon: p.icon,
              image: p.image,
            }));
          if (homePromos.length > 0) {
            setPromos(homePromos);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch promos:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card id="offers" className="p-4 border-[#f0f4ff] bg-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.03em] text-[#17307a]">
          Offers &amp; Promos
        </h2>
        <span className="cursor-pointer text-[11.5px] font-bold text-[#1a56db] hover:underline">
          View All Offers
        </span>
      </div>
      <div className="space-y-4">
        {promos.map((promo: any) => (
          <OfferCard key={promo.eyebrow} {...promo} />
        ))}
      </div>
    </Card>
  );
}

export function RightPanel() {
  return (
    <aside className="space-y-4">
      <OverviewPanel />
      <EmergencyHelp />
      <OffersPanel />
    </aside>
  );
}
