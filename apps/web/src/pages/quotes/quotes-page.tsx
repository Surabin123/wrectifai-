'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  FileText,
  Heart,
  HelpCircle,
  Info,
  Layers,
  LifeBuoy,
  MapPin,
  Shield,
  Star,
  X,
} from 'lucide-react';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Modal } from '@/components/common/modal';
import { BookingDialog } from '@/components/customer/booking-dialog';
import { GarageMoreMenu } from '@/components/quotes/garage-more-menu';
import { fetchQuotes } from '@/lib/quotes-api';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/utils/cn';

/* ──────────────────────────────────────
   Helpers
────────────────────────────────────── */

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function quoteTabStatus(q: QuoteItem, tab: string): boolean {
  if (tab === 'All Quotes') return true;
  if (tab === 'New') {
    const s = q.status?.toLowerCase();
    return s === 'quoted' || s === 'open' || s === 'pending';
  }
  if (tab === 'Viewed') return q.isBooked === true || q.status?.toLowerCase() === 'accepted';
  if (tab === 'Expired') return q.status?.toLowerCase() === 'expired' || q.status?.toLowerCase() === 'cancelled';
  return true;
}

function safePrice(q: QuoteItem): number {
  return parseFloat(q.price?.replace(/[^0-9.-]/g, '') || '0') || 0;
}

function sortQuotes(list: QuoteItem[], sortBy: string): QuoteItem[] {
  const arr = [...list];
  if (sortBy === 'Lowest Price') arr.sort((a, b) => safePrice(a) - safePrice(b));
  else if (sortBy === 'Highest Price') arr.sort((a, b) => safePrice(b) - safePrice(a));
  else if (sortBy === 'Newest') arr.sort((a, b) => new Date(b.requestCreatedAt || 0).getTime() - new Date(a.requestCreatedAt || 0).getTime());
  else if (sortBy === 'Highest Rated') arr.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
  return arr;
}

function tagColor(status?: string): { bg: string; text: string; label: string } {
  const s = (status || '').toLowerCase();
  if (s === 'open' || s === 'pending' || s === 'quoted') return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'New' };
  if (s === 'accepted' || s === 'selected') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accepted' };
  if (s === 'expired' || s === 'cancelled' || s === 'rejected') return { bg: 'bg-red-100', text: 'text-red-600', label: 'Expired' };
  return { bg: 'bg-slate-100', text: 'text-slate-600', label: status || 'Pending' };
}

/* ──────────────────────────────────────
   AI Estimate Banner
────────────────────────────────────── */

function AiEstimateBanner({ quotes }: { quotes: QuoteItem[] }) {
  const currency = quotes[0]?.currency;
  const prices = quotes.map(safePrice).filter(Boolean);
  if (prices.length === 0) return null;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const fmtLo = formatCurrency(lo, currency);
  const fmtHi = formatCurrency(hi, currency);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[#d9e5ff] bg-[#f4f8ff] px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2451f6] text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[14px] font-bold text-[#17307a]">WrectifAI Estimated Quote</div>
          <div className="mt-0.5 text-[12.5px] text-[#5f7099]">
            This is a WrectifAI generated estimate based on your selected issues and market data.
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5f7099]">Estimated Price Range</div>
        <div className="mt-0.5 text-[22px] font-bold text-[#2451f6]">
          {fmtLo} – {fmtHi}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Price Breakup Modal
────────────────────────────────────── */

function PriceBreakupModal({ quote, onClose }: { quote: QuoteItem; onClose: () => void }) {
  const currency = quote.currency;
  const d = quote.details || {};
  const labour = Number(d.labour || 0);
  const parts = Number(d.parts || 0);
  const other = Number(d.other || 0);
  const total = Number(d.total || safePrice(quote));

  return (
    <Modal isOpen onClose={onClose} title="Price Breakup" className="max-w-md">
      <div className="space-y-3 text-sm">
        <div className="text-[13px] font-bold text-[#17307a] mb-3">{quote.garage}</div>
        <div className="rounded-[12px] border border-[#e6ecfb] divide-y divide-[#edf1fb]">
          {[
            { label: 'Labour', value: labour },
            { label: 'Parts', value: parts },
            { label: 'Other Charges', value: other },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] text-[#5f7099]">{label}</span>
              <span className="text-[13px] font-semibold text-[#17307a]">{formatCurrency(value, currency)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-[#f4f7ff] rounded-b-[12px]">
            <span className="text-[14px] font-bold text-[#17307a]">Total</span>
            <span className="text-[16px] font-bold text-[#2451f6]">{formatCurrency(total, currency)}</span>
          </div>
        </div>
        {d.remarks && (
          <div className="mt-3 rounded-[10px] bg-slate-50 px-4 py-3 text-[12.5px] text-[#5f7099] border border-slate-200">
            <span className="font-semibold text-[#3d568f]">Garage Notes: </span>{d.remarks}
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-5 py-2 rounded-[10px] bg-[#2451f6] text-white text-[13px] font-bold hover:bg-[#1a3ecc] transition-colors">Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────
   Services Modal
────────────────────────────────────── */

function ServicesModal({ quote, onClose }: { quote: QuoteItem; onClose: () => void }) {
  const metaItems = (quote.meta || '').split('•').map(s => s.trim()).filter(Boolean);
  return (
    <Modal isOpen onClose={onClose} title="Garage Services" className="max-w-md">
      <div className="space-y-3 text-sm">
        <div className="text-[13px] font-bold text-[#17307a] mb-1">{quote.garage}</div>
        {metaItems.length > 0 ? (
          <ul className="space-y-2">
            {metaItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-[#17307a]">
                <CircleCheck className="h-4 w-4 text-[#1ea15f] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[#5f7099]">No service details available for this garage.</p>
        )}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-5 py-2 rounded-[10px] bg-[#2451f6] text-white text-[13px] font-bold hover:bg-[#1a3ecc] transition-colors">Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────
   Quote Details Modal
────────────────────────────────────── */

function QuoteDetailsModal({ quote, onClose, onBookNow }: { quote: QuoteItem; onClose: () => void; onBookNow?: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Quote Details" className="max-w-2xl">
      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-700">
        <div>
          <span className="block font-bold text-slate-500 mb-1">Garage</span>
          <p className="font-semibold">{quote.garage}</p>
          {quote.garageAddress && <p className="text-xs text-slate-500 mt-0.5">{quote.garageAddress}</p>}
        </div>
        <div>
          <span className="block font-bold text-slate-500 mb-1">Created</span>
          <p className="font-semibold">{quote.requestCreatedAt ? new Date(quote.requestCreatedAt).toLocaleString() : 'N/A'}</p>
        </div>
        <div>
          <span className="block font-bold text-slate-500 mb-1">Vehicle</span>
          <p className="font-semibold">
            {quote.vehicle ? `${quote.vehicle.make} ${quote.vehicle.model} ${quote.vehicle.year}` : 'N/A'}
          </p>
        </div>
        <div>
          <span className="block font-bold text-slate-500 mb-1">Estimated Time</span>
          <p className="font-semibold">{quote.time || 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <span className="block font-bold text-slate-500 mb-1">Issue Description</span>
          <p className="bg-slate-50 p-3 rounded border border-slate-200">{quote.requestIssueSummary || 'N/A'}</p>
        </div>
        <div>
          <span className="block font-bold text-slate-500 mb-1">Labour Cost</span>
          <p className="font-semibold">{formatCurrency(quote.details?.labour ?? 0, quote.currency)}</p>
        </div>
        <div>
          <span className="block font-bold text-slate-500 mb-1">Parts Cost</span>
          <p className="font-semibold">{formatCurrency(quote.details?.parts ?? 0, quote.currency)}</p>
        </div>
        {(quote.details?.other ?? 0) > 0 && (
          <div>
            <span className="block font-bold text-slate-500 mb-1">Other Charges</span>
            <p className="font-semibold">{formatCurrency(quote.details?.other ?? 0, quote.currency)}</p>
          </div>
        )}
        <div>
          <span className="block font-bold text-slate-500 mb-1">Total Amount</span>
          <p className="font-bold text-[#2451f6] text-base">{formatCurrency(safePrice(quote), quote.currency)}</p>
        </div>
        {quote.details?.remarks && (
          <div className="col-span-2">
            <span className="block font-bold text-slate-500 mb-1">Garage Notes</span>
            <p className="bg-slate-50 p-3 rounded border border-slate-200">{quote.details.remarks}</p>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200 transition-colors">
          Close
        </button>
        {!quote.isBooked && quote.status !== 'rejected' && quote.status !== 'cancelled' && onBookNow && (
          <button onClick={onBookNow} className="px-4 py-2 bg-[#2451f6] text-white rounded font-bold hover:bg-[#1a3ecc] transition-colors">
            Book Now
          </button>
        )}
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────
   Garage Quote Card
────────────────────────────────────── */

function GarageQuoteCard({
  quote,
  savedGarages,
  onSelectGarage,
  onViewQuotes,
  onSaveGarage,
  onViewGarageProfile,
  onViewReviews,
  onViewServices,
  onPriceBreakup,
  onShareGarage,
  isComparing,
  isSelected,
  onToggleCompare,
}: {
  quote: QuoteItem;
  savedGarages: string[];
  onSelectGarage: () => void;
  onViewQuotes: () => void;
  onSaveGarage: (garageId: string) => void;
  onViewGarageProfile: () => void;
  onViewReviews: () => void;
  onViewServices: () => void;
  onPriceBreakup: () => void;
  onShareGarage: () => void;
  isComparing?: boolean;
  isSelected?: boolean;
  onToggleCompare?: () => void;
}) {
  const tag = tagColor(quote.status);
  const isSaved = savedGarages.includes(quote.garageId || quote.id);
  const priceNum = safePrice(quote);
  const imgSrc = quote.garageImage || quote.image || '/assets/garage_1_1778071156220.png';
  const chips = (quote.meta || '').split('•').map(s => s.trim()).filter(Boolean);

  return (
    <div className="rounded-[18px] border border-[#e6ecfb] bg-white shadow-[0_4px_16px_rgba(37,73,153,0.06)] hover:shadow-[0_6px_22px_rgba(37,73,153,0.10)] transition-shadow overflow-hidden">

      {/* ── Row 1: Status bar (no absolute positioning) ── */}
      <div className="flex items-center justify-end gap-2 px-4 pt-3 pb-0">
        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold', tag.bg, tag.text)}>
          {tag.label}
        </span>
        <span className="text-[11px] text-[#8ea0c7] whitespace-nowrap">{timeAgo(quote.requestCreatedAt)}</span>
      </div>

      {/* ── Row 2: Main card body ── */}
      <div className="flex items-stretch gap-0 px-4 pb-4 pt-2">

        {/* LEFT — Garage image & Compare Checkbox */}
        <div className="relative h-[82px] w-[106px] shrink-0 self-start overflow-hidden rounded-[12px] bg-slate-100 mr-4">
          {isComparing && (
            <div className="absolute top-1 left-1 z-10 bg-white/80 rounded-sm p-0.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleCompare}
                className="w-4 h-4 cursor-pointer"
              />
            </div>
          )}
          <Image
            src={imgSrc}
            alt={quote.garage}
            fill
            className="object-cover"
            unoptimized
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/garage_1_1778071156220.png'; }}
          />
        </div>

        {/* MIDDLE — Garage info */}
        <div className="flex-1 min-w-0 self-start">
          <div className="text-[15px] font-bold text-[#17307a] leading-snug line-clamp-2">{quote.garage}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#5f7099]">
            <span className="flex items-center gap-1 shrink-0">
              <Star className="h-3 w-3 fill-[#f59a23] text-[#f59a23]" />
              <span className="font-semibold text-[#3d568f]">{quote.rating}</span>
              <span>({quote.reviews})</span>
            </span>
            <span className="text-[#c7d3e8]">•</span>
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="h-3 w-3 text-[#8ea0c7]" />
              {quote.distance}
            </span>
          </div>
          {chips.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
              {chips.map((chip, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11.5px] text-[#5f7099]">
                  {i > 0 && <span className="text-[#c7d3e8]">•</span>}
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Price block + action buttons in one horizontal row */}
        <div className="flex items-center gap-3 ml-4 shrink-0">

          {/* Price */}
          <div className="text-right shrink-0">
            <div className="text-[19px] font-bold text-[#17307a] leading-tight whitespace-nowrap">
              {formatCurrency(priceNum, quote.currency)}
            </div>
            <div className="text-[11px] text-[#8ea0c7] mt-0.5">Total Estimate</div>
            {quote.isBooked && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Booked
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-[#e6ecfb] shrink-0" />

          {/* Action buttons — horizontal, same row as price */}
          <div className="flex items-center gap-1">
            {!quote.isBooked && (
              <button
                type="button"
                onClick={onSelectGarage}
                className="flex flex-col items-center gap-1 text-center"
              >
                <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#dfe7fb] bg-white text-[#1a56db] hover:bg-[#f5f8ff] transition-colors">
                  <CircleCheck className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[10px] leading-tight text-[#5f7099] whitespace-nowrap">Select Garage</span>
              </button>
            )}
            <button
              type="button"
              onClick={onViewQuotes}
              className="flex flex-col items-center gap-1 text-center"
            >
              <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#dfe7fb] bg-white text-[#1a56db] hover:bg-[#f5f8ff] transition-colors">
                <FileText className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[10px] leading-tight text-[#5f7099] whitespace-nowrap">View Quotes</span>
            </button>
            <GarageMoreMenu
              smallTrigger
              triggerLabel="More Options"
              isSaved={isSaved}
              onViewGarageProfile={onViewGarageProfile}
              onViewReviews={onViewReviews}
              onViewServices={onViewServices}
              onPriceBreakup={onPriceBreakup}
              onSaveGarage={() => onSaveGarage(quote.garageId || quote.id)}
              onShareGarage={onShareGarage}
            />
          </div>
        </div>

      </div>
    </div>
  );
}



/* ──────────────────────────────────────
   Request Summary Panel
────────────────────────────────────── */

function RequestSummaryPanel({ quotes }: { quotes: QuoteItem[] }) {
  const first = quotes[0];
  if (!first) return null;
  const v = first.vehicle;
  const issues = first.requestIssueSummary ? first.requestIssueSummary.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : [];
  const requestDate = first.requestCreatedAt ? new Date(first.requestCreatedAt) : null;

  return (
    <div className="space-y-4">
      {/* Request summary */}
      <div className="rounded-[18px] border border-[#e6ecfb] bg-white p-5 shadow-[0_4px_16px_rgba(37,73,153,0.04)]">
        <div className="text-[14px] font-bold text-[#17307a] mb-3">Your Request Summary</div>
        {v && (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8ea0c7] mb-0.5">Vehicle</div>
            <div className="text-[14.5px] font-bold text-[#17307a]">
              {v.make} {v.model} {v.vin ? `(${v.vin.slice(-6)})` : ''}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#5f7099]">
              {v.fuelType && <span>{v.fuelType}</span>}
              {v.year && <><span className="text-[#c7d3e8]">•</span><span>{v.year}</span></>}
              {v.mileage && <><span className="text-[#c7d3e8]">•</span><span>{v.mileage.toLocaleString()} km</span></>}
            </div>
          </>
        )}
        {issues.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8ea0c7] mb-1">Issues Requested ({issues.length})</div>
            <ul className="space-y-0.5">
              {issues.map((iss, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-[#17307a]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2451f6]" />
                  {iss}
                </li>
              ))}
            </ul>
          </div>
        )}
        {requestDate && (
          <div className="mt-3 text-[11.5px] text-[#5f7099]">
            <span className="font-semibold text-[#3d568f]">Request sent on</span><br />
            {requestDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })},{' '}
            {requestDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </div>
        )}
      </div>

      {/* Need help */}
      <div className="rounded-[18px] border border-[#e6ecfb] bg-white p-5 shadow-[0_4px_16px_rgba(37,73,153,0.04)]">
        <div className="flex items-start gap-2.5 mb-3">
          <HelpCircle className="h-5 w-5 shrink-0 text-[#2451f6] mt-0.5" />
          <div className="text-[14px] font-bold text-[#17307a]">Need Help?</div>
        </div>
        <p className="text-[12.5px] text-[#5f7099] mb-3">Have questions about your quotes?</p>
        <a
          href="/help-support"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2451f6] hover:underline"
        >
          <LifeBuoy className="h-4 w-4" />
          View Help Center
        </a>
      </div>

      {/* Data safety */}
      <div className="rounded-[18px] border border-[#e0f0e8] bg-[#f3fbf6] p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1ea15f] text-white">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[13px] font-bold text-[#17507a]">Your data is safe with us.</div>
            <div className="mt-0.5 text-[11.5px] text-[#5f7099]">We only share your request with verified and trusted garages.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Main Page
────────────────────────────────────── */

const SORT_OPTIONS = ['Lowest Price', 'Highest Price', 'Newest', 'Highest Rated'];
const TABS = ['All Quotes', 'New', 'Viewed', 'Expired'];

export function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Quotes');
  const [sortBy, setSortBy] = useState('Lowest Price');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Compare quotes states
  const [isComparing, setIsComparing] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);

  // Modal states
  const [bookingQuote, setBookingQuote] = useState<QuoteItem | null>(null);
  const [viewQuote, setViewQuote] = useState<QuoteItem | null>(null);
  const [priceBreakupQuote, setPriceBreakupQuote] = useState<QuoteItem | null>(null);
  const [servicesQuote, setServicesQuote] = useState<QuoteItem | null>(null);

  // Saved garages — syncs with global shopWishlist used by header
  const [savedGarages, setSavedGarages] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const items = JSON.parse(localStorage.getItem('shopWishlist') || '[]');
      return items.filter((i: any) => i.type === 'garage').map((i: any) => i.id || i.name);
    } catch { return []; }
  });

  const toggleSave = useCallback((quote: QuoteItem) => {
    const garageId = quote.garageId || quote.id;
    const items = JSON.parse(localStorage.getItem('shopWishlist') || '[]');
    const exists = items.find((i: any) => i.id === garageId || i.name === garageId);
    
    let next;
    if (exists) {
      next = items.filter((i: any) => i.id !== garageId && i.name !== garageId);
      setSavedGarages(prev => prev.filter(id => id !== garageId));
    } else {
      next = [...items, {
        id: garageId,
        name: quote.garage,
        img: quote.garageImage || quote.image,
        category: quote.garageAddress || 'Garage',
        type: 'garage'
      }];
      setSavedGarages(prev => [...prev, garageId]);
    }
    
    localStorage.setItem('shopWishlist', JSON.stringify(next));
    window.dispatchEvent(new Event('wishlist-updated'));
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const data = await fetchQuotes();
      setQuotes(data);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
    const handleSync = () => loadQuotes();
    
    const handleWishlistSync = () => {
      try {
        const items = JSON.parse(localStorage.getItem('shopWishlist') || '[]');
        setSavedGarages(items.filter((i: any) => i.type === 'garage').map((i: any) => i.id || i.name));
      } catch {}
    };

    window.addEventListener('quote-updated', handleSync);
    window.addEventListener('wishlist-updated', handleWishlistSync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_sync_quotes') handleSync();
      if (e.key === 'shopWishlist') handleWishlistSync();
    });
    
    return () => {
      window.removeEventListener('quote-updated', handleSync);
      window.removeEventListener('wishlist-updated', handleWishlistSync);
    };
  }, [loadQuotes]);

  const filteredQuotes = sortQuotes(
    quotes.filter(q => quoteTabStatus(q, activeTab)),
    sortBy
  );

  const tabCounts = {
    'All Quotes': quotes.length,
    'New': quotes.filter(q => quoteTabStatus(q, 'New')).length,
    'Viewed': quotes.filter(q => quoteTabStatus(q, 'Viewed')).length,
    'Expired': quotes.filter(q => quoteTabStatus(q, 'Expired')).length,
  };

  const handleToggleCompare = (quoteId: string) => {
    setSelectedQuotes(prev => {
      if (prev.includes(quoteId)) return prev.filter(id => id !== quoteId);
      if (prev.length >= 3) {
        alert('You can only compare up to 3 quotes at a time.');
        return prev;
      }
      return [...prev, quoteId];
    });
  };

  const handleCompareNow = () => {
    if (selectedQuotes.length < 2) {
      alert('Please select at least 2 quotes to compare.');
      return;
    }
    router.push(`/compare-quotes?ids=${selectedQuotes.join(',')}`);
  };

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="space-y-5 pb-6 px-4 pt-2">
        {/* ── Nav bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors',
                  activeTab === tab
                    ? 'bg-[#17307a] text-white'
                    : 'bg-white text-[#5f7099] border border-[#dde6ff] hover:bg-[#f5f8ff]'
                )}
              >
                {tab}
                {tabCounts[tab as keyof typeof tabCounts] > 0 && (
                  <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold', activeTab === tab ? 'bg-white/20 text-white' : 'bg-[#e8ecff] text-[#2451f6]')}>
                    {tabCounts[tab as keyof typeof tabCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(o => !o)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#dde6ff] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#17307a] hover:bg-[#f5f8ff] transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-[#5f7099]" />
              Sort by: <span className="text-[#2451f6]">{sortBy}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#5f7099]" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[175px] rounded-[14px] border border-[#e4ecff] bg-white p-1.5 shadow-[0_10px_28px_rgba(23,48,122,0.12)]">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setSortOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[12.5px] font-semibold transition-colors',
                      sortBy === opt ? 'bg-[#f0f4ff] text-[#2451f6]' : 'text-[#17307a] hover:bg-[#f5f8ff]'
                    )}
                  >
                    {sortBy === opt && <CheckCircle2 className="h-3.5 w-3.5 text-[#2451f6]" />}
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                setIsComparing(!isComparing);
                if (isComparing) setSelectedQuotes([]);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[10px] px-4 py-1.5 text-[12.5px] font-bold transition-colors",
                isComparing ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#f5f8ff] text-[#2451f6] hover:bg-[#e6ebfa]"
              )}
            >
              {isComparing ? 'Cancel Compare' : 'Compare Quotes'}
            </button>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          {/* Left: quotes */}
          <div className="space-y-4">
            {/* AI estimate banner */}
            {!loading && quotes.length > 0 && <AiEstimateBanner quotes={quotes} />}

            {/* Cards */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#5f7099]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e6ecfb] border-t-[#2451f6]" />
                <p className="mt-3 text-[13px]">Loading quotes…</p>
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-[#c7d3ea] bg-[#f9faff] py-16">
                <ClipboardList className="h-12 w-12 text-[#c7d3ea] mb-3" />
                <div className="text-[14px] font-bold text-[#17307a]">No quotes yet</div>
                <p className="mt-1 text-[12.5px] text-[#5f7099]">
                  {activeTab === 'All Quotes'
                    ? 'Garages will send you quotes once they review your request.'
                    : `No quotes in the "${activeTab}" category.`}
                </p>
                <button
                  onClick={() => router.push('/garages')}
                  className="mt-4 rounded-[10px] bg-[#2451f6] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#1a3ecc] transition-colors"
                >
                  Browse Garages
                </button>
              </div>
            ) : (
              filteredQuotes.map(quote => (
                <GarageQuoteCard
                  key={quote.id}
                  quote={quote}
                  savedGarages={savedGarages}
                  onSelectGarage={() => setBookingQuote(quote)}
                  onViewQuotes={() => setViewQuote(quote)}
                  onSaveGarage={() => toggleSave(quote)}
                  onViewGarageProfile={() => {
                    const gName = quote.garage;
                    router.push(`/garages?garage=${encodeURIComponent(gName)}`);
                  }}
                  onViewReviews={() => {
                    const gName = quote.garage;
                    router.push(`/garages?garage=${encodeURIComponent(gName)}&tab=reviews`);
                  }}
                  onViewServices={() => {
                    const gName = quote.garage;
                    router.push(`/garages?garage=${encodeURIComponent(gName)}&tab=services`);
                  }}
                  onPriceBreakup={() => setPriceBreakupQuote(quote)}
                  onShareGarage={() => {
                    const gName = quote.garage;
                    const url = `${window.location.origin}/garages?garage=${encodeURIComponent(gName)}`;
                    if (navigator.share) {
                      navigator.share({ title: quote.garage, url }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(url).then(() => alert('Garage link copied to clipboard!'));
                    }
                  }}
                  isComparing={isComparing}
                  isSelected={selectedQuotes.includes(quote.id)}
                  onToggleCompare={() => handleToggleCompare(quote.id)}
                />
              ))
            )}
          </div>

          {/* Right: summary panel */}
          <div>
            <RequestSummaryPanel quotes={quotes} />
          </div>
        </div>
      </div>

      {isComparing && selectedQuotes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <button
            onClick={handleCompareNow}
            className="flex items-center gap-2 bg-[#2451f6] hover:bg-[#1a3ecc] text-white px-6 py-3 rounded-full shadow-lg font-bold transition-transform hover:scale-105"
          >
            <span>Compare Now</span>
            <span className="flex items-center justify-center bg-white/20 rounded-full w-6 h-6 text-sm">
              {selectedQuotes.length}
            </span>
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {bookingQuote && (
        <BookingDialog
          quote={bookingQuote}
          onClose={() => setBookingQuote(null)}
          onSuccess={() => {
            setBookingQuote(null);
            window.dispatchEvent(new Event('dashboard_refresh'));
            setLoading(true);
            loadQuotes();
          }}
        />
      )}

      {viewQuote && (
        <QuoteDetailsModal
          quote={viewQuote}
          onClose={() => setViewQuote(null)}
          onBookNow={() => {
            const q = viewQuote;
            setViewQuote(null);
            setBookingQuote(q);
          }}
        />
      )}

      {priceBreakupQuote && (
        <PriceBreakupModal
          quote={priceBreakupQuote}
          onClose={() => setPriceBreakupQuote(null)}
        />
      )}

      {servicesQuote && (
        <ServicesModal
          quote={servicesQuote}
          onClose={() => setServicesQuote(null)}
        />
      )}
    </DashboardShell>
  );
}

export default QuotesPage;
