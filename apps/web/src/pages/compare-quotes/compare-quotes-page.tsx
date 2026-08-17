'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgePlus,
  BadgeCheck,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Info,
  MessageCircleMore,
  MoreHorizontal,
  Scale,
  ShieldCheck,
  Star,
  WalletCards,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import { GarageMoreMenu } from '@/components/quotes/garage-more-menu';
import {
  quoteContextDefaultIssueIds,
} from '@/components/quotes/quotes-shared';
import { fetchQuotes } from '@/lib/quotes-api';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import { resultIssues } from '@/components/ai-diagnose/diagnose-flow-shared';
import { cn } from '@/utils/cn';
import { getVehicleImage } from '@/lib/vehicle-image-catalog';

const DOLLAR = '$';
const BULLET = '\u2022';

const homeSectionHeadingClass = 'ui-page-title';
const homeCardHeadingClass = 'ui-card-title';
const homeBodyClass = 'ui-body';

const actionItems = [
  { label: 'Select', icon: CheckCircle2, tone: 'blue' as const },
  { label: 'View Quotes', icon: FileText, tone: 'blue' as const },
  { label: 'Message', icon: MessageCircleMore, tone: 'purple' as const },
  { label: 'More', icon: MoreHorizontal, tone: 'blue' as const },
];

type PriceRow = {
  label: string;
  aiValue: string;
  quoteValues: Record<string, string>;
  emphasize?: boolean;
  savings?: boolean;
};

type DetailCellState = 'positive' | 'negative' | 'neutral' | 'rating';

type DetailRow = {
  label: string;
  icon: typeof CalendarClock;
  aiValue: string;
  quoteValues: Record<string, { value: string; state: DetailCellState }>;
};

function garageTagTone(id: string) {
  if (id === 'quickpit' || id.endsWith('11')) return 'bg-[#f5eaff] text-[#b35ae8]';
  if (id === 'autoworks' || id.endsWith('13')) return 'bg-[#edf3ff] text-[#2a5bf5]';
  return 'bg-[#e6f8ee] text-[#1ea15f]';
}

function serviceIcon(state: DetailCellState) {
  if (state === 'positive') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-[#1e9b5f]" />;
  }
  if (state === 'negative') {
    return <XCircle className="h-3.5 w-3.5 text-[#ff5959]" />;
  }
  if (state === 'rating') {
    return <Star className="h-3.5 w-3.5 fill-[#ffb800] text-[#ffb800]" />;
  }
  return null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
}

export function CompareQuotesPage({ ids }: { ids?: string }) {
  const pageRootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const data = await fetchQuotes();
        setQuotes(data);
        if (ids) {
          setSelectedQuoteIds(ids.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3));
        } else if (data.length > 0) {
          setSelectedQuoteIds(data.slice(0, 3).map((q) => q.id));
        }
      } catch (err) {
        console.error('Failed to fetch quotes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadQuotes();
  }, [ids]);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wrectifai_selected_vehicle');
      if (stored) {
        try {
          return JSON.parse(stored) as Vehicle;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return null;
  });

  const searchParams = useSearchParams();
  const requestedIssues = useMemo(() => {
    const issuesFromQuery = searchParams?.get('issues');
    if (issuesFromQuery) {
      const ids = issuesFromQuery.split(',').map((item) => item.trim()).filter(Boolean);
      return resultIssues.filter((issue) => ids.includes(issue.id));
    }
    const dbSummary = quotes[0]?.requestIssueSummary;
    if (dbSummary) {
      return dbSummary.split(',').map((name, index) => {
        const found = resultIssues.find((r) => r.title.toLowerCase() === name.trim().toLowerCase());
        if (found) return found;
        return {
          id: `db_summary_${index}`,
          title: name.trim(),
          badge: 'Caution',
          badgeClass: 'text-[#e27622] bg-[#fdf5ed]',
          description: `Requested issue: ${name.trim()}`,
          match: 85,
          imageSrc: getVehicleImage(selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year),
        };
      });
    }
    return resultIssues.filter((issue) => quoteContextDefaultIssueIds.includes(issue.id));
  }, [searchParams, quotes]);

  const activeVehicle = selectedVehicle || quotes[0]?.vehicle;

  const priceRows = useMemo(() => {
    const quoteValuesParts: Record<string, string> = {};
    const quoteValuesLabour: Record<string, string> = {};
    const quoteValuesConsumables: Record<string, string> = {};
    const quoteValuesGst: Record<string, string> = {};
    const quoteValuesTotal: Record<string, string> = {};
    const quoteValuesSavings: Record<string, string> = {};

    quotes.forEach((q) => {
      const parts = q.details?.parts ?? 0;
      const labour = q.details?.labour ?? 0;
      const consumables = q.details?.consumables ?? 0;
      const gst = q.details?.gst ?? 0;
      const total = parts + labour + consumables + gst;
      const savings = q.details?.savings ?? 0;
      const savingsPercent = total > 0 ? Math.round((savings / 3600) * 100) : 0;

      quoteValuesParts[q.id] = `${DOLLAR}${parts.toLocaleString('en-US')}`;
      quoteValuesLabour[q.id] = `${DOLLAR}${labour.toLocaleString('en-US')}`;
      quoteValuesConsumables[q.id] = `${DOLLAR}${consumables.toLocaleString('en-US')}`;
      quoteValuesGst[q.id] = `${DOLLAR}${gst.toLocaleString('en-US')}`;
      quoteValuesTotal[q.id] = `${q.price}`;
      quoteValuesSavings[q.id] = `${q.savings} (${savingsPercent}%)`;
    });

    return [
      {
        label: 'Parts',
        aiValue: `${DOLLAR}1,600 \u2013 ${DOLLAR}2,100`,
        quoteValues: quoteValuesParts,
      },
      {
        label: 'Labour',
        aiValue: `${DOLLAR}1,000 \u2013 ${DOLLAR}1,300`,
        quoteValues: quoteValuesLabour,
      },
      {
        label: 'Consumables',
        aiValue: `${DOLLAR}200 \u2013 ${DOLLAR}300`,
        quoteValues: quoteValuesConsumables,
      },
      {
        label: 'GST',
        aiValue: `${DOLLAR}200 \u2013 ${DOLLAR}300`,
        quoteValues: quoteValuesGst,
      },
      {
        label: 'Total Estimate',
        aiValue: `${DOLLAR}2,800 \u2013 ${DOLLAR}3,600`,
        quoteValues: quoteValuesTotal,
        emphasize: true,
      },
      {
        label: `You Save (vs WrectifAI high)`,
        aiValue: '\u2013',
        quoteValues: quoteValuesSavings,
        savings: true,
      },
    ];
  }, [quotes]);

  const detailRows = useMemo(() => {
    const availabilityMap: Record<string, { value: string; state: DetailCellState }> = {};
    const pickupDropMap: Record<string, { value: string; state: DetailCellState }> = {};
    const warrantyMap: Record<string, { value: string; state: DetailCellState }> = {};
    const ratingMap: Record<string, { value: string; state: DetailCellState }> = {};
    const experienceMap: Record<string, { value: string; state: DetailCellState }> = {};

    quotes.forEach((q) => {
      availabilityMap[q.id] = { 
        value: q.details?.availability || 'Today, 6:00 PM', 
        state: 'positive' as const 
      };
      
      const hasPickup = q.details?.pickupDrop === 'Available' || q.details?.pickupDrop === true;
      pickupDropMap[q.id] = { 
        value: hasPickup ? 'Available' : 'Not Available', 
        state: hasPickup ? 'positive' : 'negative' as const 
      };
      
      warrantyMap[q.id] = { 
        value: q.details?.warranty || '6 Months warranty', 
        state: 'neutral' as const 
      };
      
      ratingMap[q.id] = { 
        value: `${q.rating} (${q.reviews})`, 
        state: 'rating' as const 
      };
      
      experienceMap[q.id] = { 
        value: q.details?.experience || '8+ Years', 
        state: 'neutral' as const 
      };
    });

    return [
      {
        label: 'Availability',
        icon: CalendarClock,
        aiValue: '\u2013',
        quoteValues: availabilityMap,
      },
      {
        label: 'Pickup & Drop',
        icon: CarFront,
        aiValue: '\u2013',
        quoteValues: pickupDropMap,
      },
      {
        label: 'Warranty',
        icon: ShieldCheck,
        aiValue: '\u2013',
        quoteValues: warrantyMap,
      },
      {
        label: 'Rating (Reviews)',
        icon: Star,
        aiValue: '\u2013',
        quoteValues: ratingMap,
      },
      {
        label: 'Experience',
        icon: Wrench,
        aiValue: '\u2013',
        quoteValues: experienceMap,
      },
    ];
  }, [quotes]);

  useEffect(() => {
    const pageScroller = (() => {
      let node = pageRootRef.current?.parentElement ?? null;
      while (node) {
        if (node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    })();

    window.scrollTo({ top: 0, behavior: 'auto' });
    pageScroller?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const selectedQuotes = useMemo(() => {
    const matches = quotes.filter((quote) =>
      selectedQuoteIds.includes(quote.id)
    );
    return selectedQuoteIds.length ? matches : [];
  }, [quotes, selectedQuoteIds]);

  const availableQuotes = useMemo(
    () => quotes.filter((quote) => !selectedQuoteIds.includes(quote.id)),
    [quotes, selectedQuoteIds]
  );

  const selectedCount = selectedQuotes.length;
  const showAddGarageCard = selectedCount < 3 && availableQuotes.length > 0;
  const topCardsGridStyle = {
    gridTemplateColumns: `174px repeat(${
      selectedCount + (showAddGarageCard ? 1 : 0)
    }, minmax(0, 1fr))`,
  };
  const tableGridStyle = {
    gridTemplateColumns: `198px 172px repeat(${selectedCount}, minmax(0, 1fr))`,
  };

  useEffect(() => {
    const nextIds = selectedQuoteIds.join(',');
    router.replace(
      nextIds ? `/compare-quotes?ids=${nextIds}` : '/compare-quotes',
      { scroll: false }
    );
  }, [router, selectedQuoteIds]);

  function toggleQuote(quoteId: string) {
    setSelectedQuoteIds((current) => {
      if (current.includes(quoteId)) {
        return current.filter((id) => id !== quoteId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, quoteId];
      return [...current, quoteId];
    });
  }

  const handleShareGarage = async (quote: any) => {
    try {
      const shareData = {
        title: 'Check out this quote on WrectifAI',
        text: `Here is a quote from ${quote.garageName || quote.garage} for ${quote.price}.`,
        url: `${window.location.origin}/compare-quotes?ids=${quote.id}`
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  function rowHasDifferences(values: string[]) {
    if (values.length < 2) return true;
    return new Set(values).size > 1;
  }

  const visiblePriceRows = useMemo(() => {
    if (!showOnlyDifferences || selectedCount < 2) return priceRows;
    return priceRows.filter((row) =>
      rowHasDifferences(
        selectedQuotes.map((quote) => row.quoteValues[quote.id] ?? '')
      )
    );
  }, [selectedCount, selectedQuotes, showOnlyDifferences]);

  const visibleDetailRows = useMemo(() => {
    if (!showOnlyDifferences || selectedCount < 2) return detailRows;
    return detailRows.filter((row) =>
      rowHasDifferences(
        selectedQuotes.map((quote) => row.quoteValues[quote.id]?.value ?? '')
      )
    );
  }, [selectedCount, selectedQuotes, showOnlyDifferences]);

  return (
    <DashboardShell header={<TopNavbar />}>
      <div ref={pageRootRef} className="space-y-4 pb-6">
        <Link
          href="/quotes"
          className="group inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1a56db] transition-colors hover:text-[#0b43c4]"
        >
          <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          Back to Quotes
        </Link>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[17.5px] font-bold tracking-[-0.03em] text-[#17307a]">
                    Compare Quotes
                  </h1>
                  <span className="rounded-full bg-[#dff5e7] px-3 py-1 text-[12px] font-semibold text-[#18965c]">
                    {selectedCount} {selectedCount === 1 ? 'Garage' : 'Garages'}{' '}
                    Selected
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-[#5f7099]">
                  Compare prices, services, ratings and more to choose the best
                  garage for your car.
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 lg:items-end">
                <div className="flex items-center gap-3 text-[12px] font-medium text-[#5f7099]">
                  <span className="inline-flex items-center gap-1.5">
                    Show only key differences
                    <Info className="h-3.5 w-3.5 text-[#7f92c7]" />
                  </span>
                  <button
                    type="button"
                    aria-label="Show only key differences"
                    onClick={() =>
                      setShowOnlyDifferences((current) => !current)
                    }
                    className={cn(
                      'flex h-5 w-9 items-center rounded-full px-[2px] transition-colors cursor-pointer',
                      showOnlyDifferences
                        ? 'justify-end bg-[#2451f6]'
                        : 'bg-[#d9deef]'
                    )}
                  >
                    <span className="h-4 w-4 rounded-full bg-white shadow-[0_2px_4px_rgba(35,61,128,0.18)]" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3" style={topCardsGridStyle}>
              <Card className="h-[364px] rounded-[16px] border-[#e3eafc] bg-white px-3.5 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#cdddff] bg-white text-[#1a56db]">
                    <Image
                      src="/assets/Robo_icon.png"
                      alt="WrectifAI"
                      width={29}
                      height={29}
                      className="h-[29px] w-[29px] object-contain"
                    />
                  </span>
                  <div className={cn(homeCardHeadingClass, 'leading-6')}>
                    WrectifAI Estimated
                    <br />
                    Price
                  </div>
                </div>

                <div className="mt-3 border-t border-[#edf2fb] pt-3 text-[12px] leading-6 text-[#5f7099]">
                  Based on your selected
                  <br />
                  issues and market data
                </div>

                <div className="mt-[54px] text-center text-[15.5px] font-semibold tracking-[-0.03em] text-[#17307a]">
                  {DOLLAR}2,800 - {DOLLAR}3,600
                </div>

                <button
                  type="button"
                  className="mt-5 inline-flex h-[36px] w-full items-center justify-center gap-1 rounded-[10px] border border-[#c7d6ff] px-2 text-[11px] font-semibold text-[#1a56db] whitespace-nowrap"
                >
                  <span>View Estimate Details</span>
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Card>

              {selectedQuotes.map((quote) => (
                <Card
                  key={quote.id}
                  className="flex h-[364px] flex-col rounded-[16px] border-[#e3eafc] bg-white px-3.5 py-3.5 shadow-[0_8px_24px_rgba(37,73,153,0.04)]"
                >
                  <div className="flex items-start justify-between">
                    <input
                      type="checkbox"
                      checked={selectedQuoteIds.includes(quote.id)}
                      onChange={() => toggleQuote(quote.id)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-[#c9d6ff] text-[#2451f6] focus:ring-0"
                    />
                    <button type="button" className="text-[#1a56db]">
                      <MoreHorizontal className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex min-h-[118px] items-start gap-2.5">
                    <Image
                      src={quote.image}
                      alt={quote.garage}
                      width={74}
                      height={62}
                      className="h-[62px] w-[74px] rounded-[10px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          homeCardHeadingClass,
                          'truncate whitespace-nowrap'
                        )}
                      >
                        {quote.garage}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[12px] text-[#5f7099]">
                        <span className="font-semibold text-[#17307a]">
                          {quote.rating}
                        </span>
                        <Star className="h-3.5 w-3.5 fill-[#ffb800] text-[#ffb800]" />
                        <span>({quote.reviews})</span>
                      </div>
                      <div className="mt-1.5 text-[12px] text-[#5f7099]">
                        {quote.distance}
                      </div>
                      <div className="mt-2 min-h-[24px]">
                        {quote.tag ? (
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold whitespace-nowrap',
                              garageTagTone(quote.id)
                            )}
                          >
                            {quote.tag}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 min-h-[76px] border-t border-[#edf2fb] pt-3 text-center">
                    <div className="ui-page-title">{quote.price}</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#e8f7ee] px-2.5 py-1 text-[10px] font-semibold text-[#18965c]">
                      <span>You save {quote.savings} (vs WrectifAI high)</span>
                      <Info className="h-3 w-3 text-[#7789b3]" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {actionItems.map(({ label, icon: Icon, tone }) => {
                      if (label === 'More') {
                        return (
                          <GarageMoreMenu
                            key={`${quote.id}-${label}`}
                            smallTrigger
                            onViewGarageProfile={() => router.push('/garages')}
                            onViewReviews={() => {
                              document
                                .getElementById('compare-details')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            onViewServices={() => {
                              document
                                .getElementById('compare-details')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            onPriceBreakup={() => {
                              document
                                .getElementById('price-breakup')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            onSaveGarage={() => {}}
                            onShareGarage={() => handleShareGarage(quote)}
                          />
                        );
                      }

                      return (
                        <button
                          key={`${quote.id}-${label}`}
                          type="button"
                          onClick={() => {
                            if (label === 'Select') {
                              router.push(
                                `/garages?source=quotes&quote=${
                                  quote.id
                                }&issues=${quoteContextDefaultIssueIds.join(
                                  ','
                                )}`
                              );
                            }
                          }}
                          className="flex min-h-[62px] flex-col items-center gap-2 text-center"
                        >
                          <span
                            className={cn(
                              'flex h-[32px] w-[32px] items-center justify-center rounded-full border bg-white',
                              tone === 'purple'
                                ? 'border-[#eedaff] text-[#d145ff]'
                                : 'border-[#dbe5ff] text-[#1a56db]'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-medium leading-4',
                              tone === 'purple'
                                ? 'text-[#8f53d8]'
                                : 'text-[#1a56db]'
                            )}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))}

              {showAddGarageCard ? (
                <Card className="flex h-[364px] min-h-0 flex-col rounded-[16px] border border-dashed border-[#cddafe] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] px-3.5 pt-3.5 pb-0 shadow-[0_8px_24px_rgba(37,73,153,0.03)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#edf3ff] text-[#1a56db]">
                      <BadgePlus className="h-5 w-5" />
                    </span>
                    <div>
                      <div className={homeCardHeadingClass}>
                        Add Another Garage
                      </div>
                      <div className="mt-1 text-[11px] text-[#5f7099]">
                        You can compare up to 3 garages.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#d9e4ff_transparent] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d9e4ff] [&::-webkit-scrollbar-track]:bg-transparent">
                    {availableQuotes.map((quote) => (
                      <div
                        key={`available-${quote.id}`}
                        className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 rounded-[12px] border border-[#e5ecff] bg-white px-2.5 py-2.5"
                      >
                        <Image
                          src={quote.image}
                          alt={quote.garage}
                          width={48}
                          height={40}
                          className="row-span-2 h-[40px] w-[48px] self-start rounded-[8px] object-cover"
                        />

                        <div className="min-w-0">
                          <div className="truncate whitespace-nowrap text-[12px] font-semibold leading-4 text-[#17307a]">
                            {quote.garage}
                          </div>
                          <div className="mt-1 text-[10px] leading-4 text-[#5f7099]">
                            <span className="font-semibold text-[#17307a]">
                              {quote.rating}
                            </span>{' '}
                            <span className="text-[#ffb800]">{'\u2605'}</span> (
                            {quote.reviews}) {BULLET} {quote.distance}
                          </div>
                        </div>

                        <div className="col-start-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => toggleQuote(quote.id)}
                            className="inline-flex h-[28px] items-center justify-center rounded-[9px] border border-[#c8d6ff] px-3 text-[11px] font-semibold text-[#1a56db] hover:bg-[#f5f8ff]"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>

            <Card
              id="price-breakup"
              className="overflow-hidden rounded-[16px] border-[#e3eafc] bg-white shadow-[0_8px_24px_rgba(37,73,153,0.04)]"
            >
              <div
                className="grid border-b border-[#e9eefb] bg-white"
                style={tableGridStyle}
              >
                <div className="px-4 py-3 ui-subheading">
                  Price Breakup{' '}
                  <span className="text-[11px] font-medium text-[#7c8bb5]">
                    (Incl. taxes)
                  </span>
                </div>
                <div className="px-3 py-3 text-center text-[12px] font-semibold leading-5 text-[#17307a]">
                  WrectifAI Estimated Price
                  <div className="text-[11px] font-medium text-[#7c8bb5]">
                    (For reference)
                  </div>
                </div>
                {selectedQuotes.map((quote) => (
                  <div
                    key={`header-${quote.id}`}
                    className="px-3 py-3 text-center text-[12px] font-semibold leading-5 text-[#17307a]"
                  >
                    {quote.garage}
                  </div>
                ))}
              </div>

              {visiblePriceRows.map((row, rowIndex) => (
                <div
                  key={row.label}
                  className={cn(
                    'grid border-b border-[#e9eefb]',
                    row.emphasize && 'bg-[#f3f7ff]',
                    row.savings && 'bg-[#f1fbf4]',
                    rowIndex === visiblePriceRows.length - 1 && 'border-b-0'
                  )}
                  style={tableGridStyle}
                >
                  <div
                    className={cn(
                      'px-4 py-2.5 text-[13px]',
                      row.emphasize
                        ? 'font-semibold text-[#1a56db]'
                        : 'text-[#5f7099]',
                      row.savings &&
                        'whitespace-nowrap font-semibold text-[#6277ab]'
                    )}
                  >
                    {row.label}
                  </div>
                  <div
                    className={cn(
                      'px-3 py-2.5 text-center text-[13px]',
                      row.emphasize
                        ? 'text-[15px] font-semibold text-[#159a5d]'
                        : 'text-[#5f7099]',
                      row.savings && 'font-medium text-[#6277ab]'
                    )}
                  >
                    {row.aiValue}
                    {row.emphasize ? (
                      <Info className="ml-1 inline h-3.5 w-3.5 text-[#8092bb]" />
                    ) : null}
                  </div>
                  {selectedQuotes.map((quote) => (
                    <div
                      key={`${row.label}-${quote.id}`}
                      className={cn(
                        'px-3 py-2.5 text-center text-[13px]',
                        row.emphasize
                          ? 'text-[15px] font-semibold text-[#159a5d]'
                          : 'text-[#5f7099]',
                        row.savings && 'font-semibold text-[#159a5d]'
                      )}
                    >
                      {row.quoteValues[quote.id]}
                    </div>
                  ))}
                </div>
              ))}
            </Card>

            <Card
              id="compare-details"
              className="overflow-hidden rounded-[16px] border-[#e3eafc] bg-white shadow-[0_8px_24px_rgba(37,73,153,0.04)]"
            >
              <div className="border-b border-[#e9eefb] px-4 py-3 ui-subheading">
                Service &amp; Other Details
              </div>

              {visibleDetailRows.map((row, rowIndex) => {
                const RowIcon = row.icon;

                return (
                  <div
                    key={row.label}
                    className={cn(
                      'grid border-b border-[#e9eefb]',
                      rowIndex === visibleDetailRows.length - 1 && 'border-b-0'
                    )}
                    style={tableGridStyle}
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#5f7099]">
                      <RowIcon
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          row.label === 'Rating (Reviews)'
                            ? 'fill-[#ffb800] text-[#ffb800]'
                            : 'text-[#7a8bb8]'
                        )}
                      />
                      <span>{row.label}</span>
                    </div>
                    <div className="px-3 py-2.5 text-center text-[13px] text-[#5f7099]">
                      {row.aiValue}
                    </div>

                    {selectedQuotes.map((quote) => {
                      const item = row.quoteValues[quote.id];
                      return (
                        <div
                          key={`${row.label}-${quote.id}`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[13px] text-[#17307a]"
                        >
                          {item ? serviceIcon(item.state) : null}
                          <span>{item?.value ?? '\u2013'}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </Card>

            <div className="flex items-center justify-center gap-3">
              {['\u2039', '1', '\u203A'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    'flex h-[26px] min-w-[26px] items-center justify-center rounded-[6px] border text-[13px] font-semibold',
                    item === '1'
                      ? 'border-[#1a56db] bg-[#1a56db] px-2.5 text-white'
                      : 'border-[#dbe5ff] bg-white px-2 text-[#5f7099]'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-center text-[12px] text-[#5f7099]">
              <WalletCards className="h-4 w-4 text-[#7183b0]" />
              <span>
                We do not charge any platform fee. You pay the garage directly.
              </span>
            </div>
          </div>

          <div className="space-y-4 xl:pt-[92px]">
            <Card className="rounded-[16px] border-[#e3eafc] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex items-center gap-3">
                <h3
                  className={cn(homeSectionHeadingClass, 'whitespace-nowrap')}
                >
                  Your Request Summary
                </h3>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <div className={homeBodyClass}>Vehicle</div>
                  <div className="mt-2.5 ui-card-title">
                    {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model} ${activeVehicle.vin ? `(${activeVehicle.vin.slice(-6)})` : ''}` : 'Honda City (TS07 AB 1234)'}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[12px] text-[#5f7099]">
                    <span>{activeVehicle ? (activeVehicle.vin ? 'VIN Verified' : 'Petrol') : 'Petrol'}</span>
                    <span>{BULLET}</span>
                    <span>{activeVehicle ? activeVehicle.year : '2018'}</span>
                    <span>{BULLET}</span>
                    <span>
                      {activeVehicle && activeVehicle.mileage !== undefined && activeVehicle.mileage !== null
                        ? `${activeVehicle.mileage.toLocaleString()} mi`
                        : '58,320 km'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className={homeBodyClass}>Issues Requested ({requestedIssues.length})</div>
                  <div className="mt-3 space-y-2.5 text-[12px] text-[#17307a]">
                    {requestedIssues.map((issue) => (
                      <div key={issue.id}>
                        {BULLET} &nbsp;{issue.title}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#ebf0fb] pt-4">
                  <div className={homeBodyClass}>Request sent on</div>
                  <div className="mt-2.5 text-[12px] text-[#17307a]">
                    {quotes[0]?.requestCreatedAt
                      ? new Date(quotes[0].requestCreatedAt).toLocaleString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '20 May 2024, 10:30 AM'}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[16px] border-[#e3eafc] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex items-start gap-3">
                <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#f4f7ff] text-[#1a56db]">
                  <Scale className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h3
                    className={cn(homeSectionHeadingClass, 'whitespace-nowrap')}
                  >
                    Why compare quotes?
                  </h3>
                  <div className="mt-3 space-y-3 text-[12px] text-[#5f7099]">
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-[#18a15e]" />
                      <span>Ensure you get the best price</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-[#18a15e]" />
                      <span>Compare services &amp; inclusions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-[#18a15e]" />
                      <span>Check ratings &amp; garage reliability</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-[#18a15e]" />
                      <span>Choose with confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[16px] border-[#dceee5] bg-[linear-gradient(180deg,#fbfffd_0%,#f8fffb_100%)] px-5 py-5 shadow-[0_8px_24px_rgba(37,73,153,0.04)]">
              <div className="flex items-start gap-4">
                <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[#e9f7ef] text-[#16975b]">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="ui-page-title ui-success-text">
                    Your data is safe with us
                  </h3>
                  <p className="mt-2 text-[12px] leading-6 text-[#5f7099]">
                    We only share your request
                    <br />
                    with verified and trusted garages.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default CompareQuotesPage;
