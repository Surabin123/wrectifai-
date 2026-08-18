'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
  Clock,
  Shield,
  Wrench,
  FileText,
  Share2,
  Heart,
  MessageSquare,
  AlertCircle,
  Gauge,
  Tag,
  CheckCircle2,
  Snowflake,
  ClipboardList,
  SlidersHorizontal,
  Check,
  Eye,
  Sparkles,
  ShieldCheck,
  BatteryCharging,
  Disc3,
} from 'lucide-react';
import { Card } from '@/components/common/card';
import { RequestQuoteModal } from './request-quote-modal';
import { BookingModal } from './booking-modal';
import { Button } from '@/components/common/button';
import { cn } from '@/utils/cn';
import Image from 'next/image';
import { PageLoader } from '@/components/common/page-loader';
import type { Garage } from '@/pages/garages/garages-page';
import { BookingConfirmed } from '@/components/garages/booking-confirmed';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import type { DiagnoseIssue } from '@/components/ai-diagnose/diagnose-flow-shared';
import { createBooking } from '@/lib/bookings-api';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/auth-context';
import { resolveImageUrl } from '@/lib/utils';

interface GarageDetailPageProps {
  garage: Garage;
  onBack: () => void;
  backLabel?: string;
  mode?: 'default' | 'quote-context';
  quoteContext?: {
    quote: QuoteItem;
    issues: DiagnoseIssue[];
    issueIds: string[];
    aiEstimateRange: string;
  };
}

const timeSlots = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

const servicesOffered = [
  { name: 'General Service', icon: Wrench },
  { name: 'Engine Repair', icon: Sparkles },
  { name: 'AC Service', icon: Snowflake },
  { name: 'Brakes & Suspension', icon: Gauge },
  { name: 'Battery Service', icon: BatteryCharging },
  { name: 'Tyres & Wheel Care', icon: Disc3 },
  { name: 'Diagnostics', icon: ClipboardList },
  { name: 'More Services', icon: SlidersHorizontal },
];

export function GarageDetailPage({
  garage: initialGarage,
  onBack,
  backLabel = 'Back to Garages',
  mode = 'default',
  quoteContext,
}: GarageDetailPageProps) {
  const router = useRouter();
  
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const savedWishlist = localStorage.getItem('shopWishlist');
    if (savedWishlist) {
      try {
        const parsed = JSON.parse(savedWishlist);
        setWishlistItems(parsed);
        const exists = parsed.find((i: any) => (i.id === initialGarage.id || i.name === initialGarage.name));
        setFavorite(!!exists);
      } catch (e) {}
    }

    const handleUpdate = () => {
      const updated = localStorage.getItem('shopWishlist');
      if (updated) {
        try {
          const parsed = JSON.parse(updated);
          setWishlistItems(parsed);
          const exists = parsed.find((i: any) => (i.id === initialGarage.id || i.name === initialGarage.name));
          setFavorite(!!exists);
        } catch (e) {}
      }
    };

    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, [initialGarage.id, initialGarage.name]);

  const toggleFavorite = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const id = initialGarage.id || initialGarage.name;
    const exists = wishlistItems.find(i => (i.id === id || i.name === id));
    let newItems;
    if (exists) {
      newItems = wishlistItems.filter(i => (i.id !== id && i.name !== id));
      setToastMessage('Garage removed from Wishlist');
    } else {
      newItems = [...wishlistItems, { 
        id, 
        name: initialGarage.facade || initialGarage.name, 
        img: initialGarage.image, 
        category: initialGarage.location,
        type: 'garage' 
      }];
      setToastMessage('Garage added to Wishlist');
    }
    
    setWishlistItems(newItems);
    setFavorite(!exists);
    localStorage.setItem('shopWishlist', JSON.stringify(newItems));
    window.dispatchEvent(new Event('wishlist-updated'));
    
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Track garage and services separately to prevent prop-reference cycles
  const [garage, setGarage] = useState<Garage>(initialGarage);
  const [services, setServices] = useState<any[]>(initialGarage.services || []);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'quote_success' | 'quote_error' | 'booking_success' | 'booking_error'>('idle');

  useEffect(() => {
    setGarage(initialGarage);
    
    if (initialGarage.services && initialGarage.services.length > 0) {
      setServices(initialGarage.services);
      return;
    }

    let active = true;
    if (initialGarage.id) {
      apiClient.get<Garage>(`/garages/${initialGarage.id}`)
        .then((data) => {
          if (active && data && data.services) {
            setServices(data.services);
          }
        })
        .catch(console.error);
    }
    
    return () => { 
      active = false; 
    };
  }, [initialGarage.id, initialGarage.services]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('quote') === 'true') {
        setIsQuoteModalOpen(true);
        // Optionally remove the query param so it doesn't re-trigger on reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const appointmentDates = useMemo(() => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const list = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push({
        day: daysOfWeek[d.getDay()],
        date: String(d.getDate()),
        month: months[d.getMonth()],
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
      });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(appointmentDates[0]?.date || '9');
  const [selectedSlot, setSelectedSlot] = useState('04:00 PM');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(0);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [moreServicesModalOpen, setMoreServicesModalOpen] = useState(false);

  const processedImage = resolveImageUrl(garage.image) || '';

  const detailImageSources = [processedImage].filter((src): src is string =>
    Boolean(src)
  );
  const isQuoteContext = mode === 'quote-context' && Boolean(quoteContext);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const { user } = useAuth();
  
  // New Review States
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // New Reply States
  const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchReviews = async () => {
    try {
      const url = user?.id ? `/garages/${initialGarage.id}/reviews?userId=${user.id}` : `/garages/${initialGarage.id}/reviews`;
      const res: any = await apiClient.get(url);
      if (res && res.reviews) setReviews(res.reviews);
      if (res && res.stats) setReviewStats(res.stats);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    }
  };

  useEffect(() => {
    if (!initialGarage.id) return;
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGarage.id, user?.id]);

  const handleSubmitReview = async () => {
    if (!newReviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      await apiClient.post('/reviews', {
        garageId: initialGarage.id,
        rating: newReviewRating,
        comment: newReviewText,
      });
      setNewReviewText('');
      setNewReviewRating(0);
      await fetchReviews();
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleVote = async (reviewId: string, currentVote: 'like' | 'unlike' | 'none') => {
    if (!user) return alert('Please login to vote');
    try {
      // Optimistic Update
      setReviews(prev => prev.map(r => {
        if (r.id !== reviewId) return r;
        let newLikes = r.likes !== undefined ? r.likes : (r.likesCount || 0);
        let newUnlikes = r.unlikes !== undefined ? r.unlikes : (r.unlikesCount || 0);
        
        if (r.isLikedByUser) newLikes = Math.max(0, newLikes - 1);
        if (r.isUnlikedByUser) newUnlikes = Math.max(0, newUnlikes - 1);
        
        if (currentVote === 'like') newLikes += 1;
        if (currentVote === 'unlike') newUnlikes += 1;
        
        return {
          ...r,
          likesCount: newLikes,
          likes: newLikes,
          unlikesCount: newUnlikes,
          unlikes: newUnlikes,
          isLikedByUser: currentVote === 'like',
          isUnlikedByUser: currentVote === 'unlike'
        };
      }));
      
      await apiClient.post(`/reviews/${reviewId}/vote`, { voteType: currentVote });
      // Fetch latest actual state
      await fetchReviews();
    } catch (err) {
      console.error('Failed to vote', err);
      await fetchReviews(); // Revert on failure
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await apiClient.post(`/reviews/${reviewId}/reply`, {
        text: replyText,
        garageId: initialGarage.id
      });
      setReplyText('');
      setReplyingToReviewId(null);
      await fetchReviews();
    } catch (err) {
      console.error('Failed to submit reply', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleBookAppointment = async () => {
    setIsBookingModalOpen(true);
  };

  const handleRequestQuote = async () => {
    setIsQuoteModalOpen(true);
  };

  // Removed bookingConfirmed full-page render to stay on page and show modal


  return (
    <>
      <RequestQuoteModal 
        isOpen={isQuoteModalOpen} 
        onClose={() => setIsQuoteModalOpen(false)} 
        garageId={garage.id || ''} 
        onSubmitSuccess={() => {
          setRequestStatus('quote_success');
        }} 
      />
      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
        garageId={garage.id || ''} 
        onSubmitSuccess={() => {
          setRequestStatus('booking_success');
        }} 
      />

      <Modal 
        isOpen={requestStatus === 'quote_success' || requestStatus === 'booking_success'} 
        onClose={() => setRequestStatus('idle')} 
        title={requestStatus === 'quote_success' ? 'Quote Request Sent' : 'Booking Request Sent'}
        className="max-w-md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <p className="text-slate-600 mb-6">
            {requestStatus === 'quote_success' 
              ? `Your quote request has been sent successfully to ${garage.name}. The garage will review your request and send you a quotation shortly.`
              : `Your booking request has been sent successfully to ${garage.name}. The garage will review your request and confirm your appointment shortly.`}
          </p>
          <Button onClick={() => setRequestStatus('idle')} className="w-full font-bold">
            <Check className="w-4 h-4 mr-2" /> OK
          </Button>
        </div>
      </Modal>

      <div className="space-y-6 pb-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1a56db] transition-colors hover:text-[#0b43c4]"
        >
          <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          {backLabel}
        </button>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_310px]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Banner Container */}
            <div className="relative h-[240px] w-full overflow-hidden rounded-[16px] border border-white/60 bg-gradient-to-r from-slate-900 to-slate-800 shadow-[0_16px_40px_rgba(22,48,112,0.08)] sm:h-[300px]">
              {processedImage && (
                <Image
                  src={processedImage}
                  alt={garage.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 70vw"
                  className="object-cover opacity-90"
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

              {/* Banner Overlay Info */}
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-white">
                <span className="text-[14.5px] font-bold tracking-[0.02em] text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                  {garage.facade}
                </span>
              </div>

              {/* Favorite Button */}
              <button
                onClick={toggleFavorite}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1a56db] shadow-[0_8px_20px_rgba(30,58,138,0.15)] transition-transform hover:scale-105 active:scale-95"
              >
                <Heart
                  fill={favorite ? "currentColor" : "none"}
                  className={cn(
                    'h-5 w-5 transition-colors',
                    favorite
                      ? 'text-[#e53e3e]'
                      : 'text-[#1a56db]'
                  )}
                />
              </button>
            </div>

            <div className="flex gap-3">
              {garage.approvalStatus === 'suspended' ? (
                <div className="w-full bg-red-500 text-white p-3 rounded-lg text-center font-bold text-sm shadow-md">
                  Temporarily unavailable: This garage is temporarily not providing services. Please choose another garage.
                </div>
              ) : (
                <button onClick={handleRequestQuote} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-purple-700">Request Quote</button>
              )}
            </div>
            
            {/* Garage Details Header Row */}
            <Card className="rounded-[22px] border-[#e7eefc] p-6 shadow-[0_12px_32px_rgba(21,48,122,0.05)] bg-white">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3.5 md:max-w-[65%]">
                  <div className="flex items-center gap-2">
                    <h1 className="text-[18px] font-extrabold tracking-[-0.03em] text-[#17307a] sm:text-[20px]">
                      {garage.name}
                    </h1>
                    {garage.verified && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a56db]">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-[11.5px] font-semibold text-[#536891]">
                    <div className="flex items-center gap-1">
                      <Star className="h-4.5 w-4.5 fill-[#ff9f1a] text-[#ff9f1a]" />
                      <span className="text-[#f28c28]">
                        {garage.rating.toFixed(1)}
                      </span>
                      <span className="text-[#92a1c2]">
                        ({garage.reviews} Reviews)
                      </span>
                    </div>
                    <span className="text-[#cbd4e6]">•</span>
                    <span>{garage.location}</span>
                  </div>

                  {/* Response / Time Pills */}
                  <div className="flex flex-wrap gap-2.5 pt-1.5">
                    <div className="flex items-center gap-2 rounded-full bg-[#eefbf3] px-3.5 py-1.5 text-[10px] font-bold text-[#228453]">
                      <Clock className="h-4 w-4" />
                      <span>
                        {(() => {
                          if (!garage.businessHours) return 'Schedule not provided';
                          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                          const today = days[new Date().getDay()];
                          const todaySchedule = garage.businessHours[today];
                          if (!todaySchedule || !todaySchedule.open) return 'Closed today';
                          return `Open today: ${todaySchedule.start} - ${todaySchedule.end}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Adaptive Description */}
                  <div className="space-y-2 pt-3">
                    <p className="text-[11.5px] font-medium leading-[1.6] text-[#42526e]">
                      {garage.description ? (
                        isExpanded ? garage.description : `${garage.description.slice(0, 150)}${garage.description.length > 150 ? '...' : ''}`
                      ) : (
                        'No description provided.'
                      )}
                    </p>
                    {garage.description && garage.description.length > 150 && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1a56db] hover:underline"
                      >
                        <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Highlights Subcard */}
                <div className="flex-1 rounded-[18px] border border-[#e2eefc] bg-[#f8fbff] p-5 md:max-w-[32%]">
                  <h3 className="text-[12.5px] font-bold text-[#17307a] mb-4">
                    Garage Highlights
                  </h3>
                  <ul className="space-y-3">
                    {garage.chips.map((chip, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-3 text-[11px] font-bold text-[#42548a]"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1a56db]" />
                        <span className="truncate">{chip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {isQuoteContext && quoteContext ? (
              <>
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <Card className="rounded-[20px] border-[#e6ecfb] bg-white p-5 shadow-[0_10px_28px_rgba(21,48,122,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-[15px] font-bold text-[#17307a]">
                          Quote Summary
                        </h2>
                        <p className="mt-1 text-[11px] text-[#62749f]">
                          Quote details for this garage based on your requested
                          repair.
                        </p>
                      </div>
                      {quoteContext.quote.tag ? (
                        <span className="rounded-full bg-[#e8f7ee] px-3 py-1 text-[10px] font-bold text-[#159a5d]">
                          {quoteContext.quote.tag}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-4">
                        <div className="text-[11px] font-medium text-[#62749f]">
                          Current Quote
                        </div>
                        <div className="mt-2 text-[16px] font-extrabold leading-none tracking-[-0.03em] text-[#17307a]">
                          {quoteContext.quote.price}
                        </div>
                      </div>
                      <div className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-4">
                        <div className="text-[11px] font-medium text-[#62749f]">
                          WrectifAI Estimate
                        </div>
                        <div className="mt-2 whitespace-nowrap text-[16px] font-extrabold leading-none tracking-[-0.03em] text-[#159a5d]">
                          {quoteContext.aiEstimateRange}
                        </div>
                      </div>
                      <div className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-4">
                        <div className="text-[11px] font-medium text-[#62749f]">
                          Estimated Savings
                        </div>
                        <div className="mt-2 text-[16px] font-extrabold leading-none tracking-[-0.03em] text-[#17307a]">
                          {quoteContext.quote.savings}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] border border-[#e2eefc] bg-[#f8fbff] p-4">
                        <div className="text-[12px] font-bold text-[#17307a]">
                          Included In This Quote
                        </div>
                        <div className="mt-3 space-y-2 text-[11px] text-[#536891]">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1a56db]" />
                            <span>{quoteContext.quote.meta}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1a56db]" />
                            <span>{quoteContext.quote.metaSecondary}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1a56db]" />
                            <span>
                              Final inspection-based confirmation before service
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[16px] border border-[#e2eefc] bg-[#f8fbff] p-4">
                        <div className="text-[12px] font-bold text-[#17307a]">
                          Price Notes
                        </div>
                        <div className="mt-3 space-y-2 text-[11px] text-[#536891]">
                          <div className="flex items-start gap-2">
                            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#1a56db]" />
                            <span>
                              No upfront payment. Final amount is confirmed
                              after inspection.
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            {garage.responseMins != null && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                Garage response time: {garage.responseMins} mins
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[#1a56db]" />
                            <span>
                              Warranty, pickup/drop, and service coverage depend
                              on final inspection.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-[20px] border-[#e6ecfb] bg-white p-5 shadow-[0_10px_28px_rgba(21,48,122,0.04)]">
                    <h2 className="text-[15px] font-bold text-[#17307a]">
                      Selected Issue Details
                    </h2>
                    <p className="mt-1 text-[11px] text-[#62749f]">
                      These issue details were used to create and compare the
                      quote.
                    </p>

                    <div className="mt-4 space-y-3">
                      {quoteContext.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[12.5px] font-bold text-[#17307a]">
                              {issue.title}
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[10px] font-bold',
                                issue.badgeClass
                              )}
                            >
                              {issue.badge}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] leading-5 text-[#536891]">
                            {issue.description}
                          </p>
                          <div className="mt-3 text-[11px] font-medium text-[#17307a]">
                            Estimated match: {issue.match}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              </>
            ) : (
              <>
                {/* Services Offered */}
                <section className="space-y-3.5">
                  <h2 className="text-[14.5px] font-bold text-[#17307a]">
                    Services Offered
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                    {servicesOffered.map((svc, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          if (svc.name === 'More Services') {
                            setMoreServicesModalOpen(true);
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-[16px] border border-[#e2eefc] bg-white p-2 py-2.5 text-center shadow-[0_8px_20px_rgba(22,48,112,0.03)] transition-all hover:border-[#1a56db]/30 hover:shadow-[0_12px_28px_rgba(26,86,219,0.06)]",
                          svc.name === 'More Services' ? 'cursor-pointer' : ''
                        )}
                      >
                        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f4ff] text-[#1a56db]">
                          <svc.icon className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-bold text-[#17307a] leading-tight">
                          {svc.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>



                {/* Why Choose Us */}
                {garage.chips && garage.chips.length > 0 && (
                  <section className="space-y-3.5">
                    <h2 className="text-[14.5px] font-bold text-[#17307a]">
                      Why Choose {garage.name}?
                    </h2>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                      {[
                        {
                          id: 'Warranty',
                          title: 'Warranty',
                          desc: 'On select repairs and services',
                          icon: Shield,
                        },
                        {
                          id: 'Inspection',
                          title: 'Inspection',
                          desc: 'Vehicle checkup',
                          icon: Eye,
                        },
                        {
                          id: 'Pickup',
                          title: 'Pickup & Drop',
                          desc: 'Available on request',
                          icon: MapPin,
                        },
                        {
                          id: 'Parts',
                          title: 'Genuine Parts',
                          desc: 'Original parts used',
                          icon: Sparkles,
                        },
                      ]
                        .filter(item => garage.chips.some(chip => chip.includes(item.id) || chip.includes(item.title)))
                        .map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2.5 rounded-[16px] border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-3 text-left overflow-hidden"
                        >
                          <div className="flex shrink-0 items-center justify-center text-[#21834c]">
                            <item.icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-bold text-[#17307a] whitespace-nowrap">
                              {item.title}
                            </h4>
                            <p className="mt-0.5 text-[9.5px] font-normal text-[#17307a]">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Customer Reviews */}
                <section className="space-y-4">
                  <h2 className="text-[14.5px] font-bold text-[#17307a]">
                    Customer Reviews ({reviewStats?.totalReviews ?? garage.reviews})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-[200px_1fr_1fr]">
                    <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#e2eefc] bg-white p-6 text-center">
                      <span className="text-[38px] font-extrabold tracking-tight text-[#17307a]">
                        {newReviewRating > 0 
                          ? newReviewRating 
                          : (reviewStats?.totalReviews > 0 ? Math.round(reviewStats.averageRating) : 0)}
                      </span>
                      <div className="my-1.5 flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const starValue = i + 1;
                          const isFilled = starValue <= newReviewRating;
                            
                          return (
                            <button 
                              key={i} 
                              onClick={() => setNewReviewRating(starValue)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={cn(
                                  'h-5 w-5',
                                  isFilled
                                    ? 'fill-[#ff9f1a] text-[#ff9f1a]'
                                    : 'text-[#dbe6ff]'
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[12px] font-bold text-[#228453]">
                        {newReviewRating > 0 
                          ? (newReviewRating >= 5 ? 'Excellent' : newReviewRating >= 4 ? 'Good' : newReviewRating >= 3 ? 'Moderate' : newReviewRating >= 2 ? 'Bad' : 'Very Bad')
                          : (reviewStats?.totalReviews > 0 ? 'Select to rate' : 'No Ratings')}
                      </span>
                      <span className="mt-1 text-[10px] font-semibold text-[#8a99ad]">
                        {newReviewRating > 0 ? 'Your Rating' : (reviewStats?.totalReviews > 0 ? 'Average Rating' : 'No reviews yet')}
                      </span>
                    </div>

                    <div className="rounded-[20px] border border-[#e2eefc] bg-white p-5 space-y-2.5 flex flex-col justify-center">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const rowData = reviewStats?.distribution?.[stars] || { count: 0, pct: '0%' };
                        return (
                          <div
                            key={stars}
                            className="flex items-center gap-3 text-[10px] font-bold text-[#536891]"
                          >
                            <span className="w-2.5 text-right">{stars}</span>
                            <Star className="h-3.5 w-3.5 fill-[#cbd4e6] text-[#cbd4e6]" />
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f4ff]">
                              <div
                                className="h-full rounded-full bg-[#1aa14a]"
                                style={{ width: rowData.pct }}
                              />
                            </div>
                            <span className="w-8 text-right">{rowData.pct}</span>
                            <span className="w-8 text-right text-[#8a99ad]">
                              ({rowData.count})
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Write Review Section (Moved to 3rd column) */}
                    <div className="flex flex-col justify-between rounded-[20px] border border-[#e2eefc] bg-white p-5 shadow-[0_4px_16px_rgba(22,48,112,0.02)]">
                      {user && reviews.some(r => r.customerId === user.id) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4ff] text-[#1a56db]">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <h4 className="text-[13px] font-bold text-[#17307a]">Review Submitted</h4>
                          <p className="text-[11px] text-[#536891]">
                            You have already shared your experience for this garage. Thank you!
                          </p>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-[13px] font-bold text-[#17307a] mb-3">Write a comment</h4>
                          <textarea
                            className="w-full rounded-xl border border-[#e2eefc] p-3 text-[12px] outline-none focus:border-[#1a56db] mb-3 flex-1 resize-none"
                            placeholder="Share your experience..."
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                          />
                          <Button 
                            className="w-full"
                            onClick={handleSubmitReview}
                            disabled={!newReviewText.trim() || isSubmittingReview || newReviewRating === 0}
                          >
                            Submit Review
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reviews List */}
                  {reviews.length > 0 && (
                    <div className="mt-6 flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {reviews.map((review) => (
                        <div key={review.id} className="relative flex flex-col justify-between rounded-[20px] border border-[#e2eefc] bg-white p-5 shadow-[0_4px_16px_rgba(22,48,112,0.02)] shrink-0">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4ff] text-[11px] font-bold text-[#1a56db]">
                              {(review.name || review.customerName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-[#17307a]">
                                {review.name || review.customerName || 'Anonymous'}
                              </div>
                              <div className="flex items-center gap-1 text-[9.5px] font-medium text-[#228453]">
                                <CheckCircle2 className="h-3 w-3 fill-[#228453] text-white" />
                                <span>Verified Customer</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[9.5px] font-bold text-[#8a99ad]">
                            {(review.date || review.createdAt) ? new Date(review.date || review.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-3.5 w-3.5',
                                i < Math.floor(review.rating || 0)
                                  ? 'fill-[#ff9f1a] text-[#ff9f1a]'
                                  : 'text-[#cbd4e6]'
                              )}
                            />
                          ))}
                        </div>

                        <p className="mt-2.5 text-[11px] font-medium leading-[1.5] text-[#536891]">
                          &quot;{review.text || review.comment}&quot;
                        </p>

                        <div className="mt-3 flex flex-col gap-3">
                          {/* Replies */}
                          {review.replies?.length > 0 && (
                            <div className="rounded-lg bg-[#f8fafc] p-3 border border-[#e2eefc]">
                              {review.replies.map((reply: any) => (
                                <div key={reply.id} className="mb-2 last:mb-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] font-bold text-[#17307a]">
                                      {reply.authorName}
                                    </span>
                                    {reply.isGarageOwner && (
                                      <span className="text-[9px] font-medium text-[#1a56db] bg-[#eef4ff] px-1.5 rounded-full">
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#536891]">{reply.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Interaction Buttons */}
                          <div className="flex items-center gap-4 text-[10px] font-semibold text-[#8a99ad]">
                            <button 
                              onClick={() => handleVote(review.id, review.isLikedByUser ? 'none' : 'like')}
                              className={cn(
                                "flex items-center gap-1 transition-colors",
                                review.isLikedByUser ? "text-[#1a56db]" : "hover:text-[#1a56db]"
                              )}
                            >
                              <Heart className={cn("h-3.5 w-3.5", review.isLikedByUser && "fill-[#1a56db]")} />
                              <span>{review.likes !== undefined ? review.likes : (review.likesCount || 0)}</span>
                            </button>
                            <button 
                              onClick={() => setReplyingToReviewId(replyingToReviewId === review.id ? null : review.id)}
                              className="flex items-center gap-1 hover:text-[#1a56db] transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Reply ({review.repliesCount || 0})</span>
                            </button>
                          </div>
                          
                          {/* Reply Input */}
                          {replyingToReviewId === review.id && (
                            <div className="mt-2 flex gap-2">
                              <input 
                                type="text" 
                                className="flex-1 text-[11px] rounded-lg border border-[#e2eefc] px-3 py-1.5 outline-none focus:border-[#1a56db]"
                                placeholder="Write a reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                              />
                              <Button size="sm" onClick={() => handleSubmitReply(review.id)} disabled={isSubmittingReply}>
                                Send
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
                </section>
                </>
            )}
          </div>

          {/* Right Column (Widgets) */}
          <div className="space-y-6">
            {/* Appointment Booking Widget */}
            {garage.approvalStatus !== 'suspended' && (
              <Card className="rounded-[24px] border-[#e7eefc] bg-white p-5 shadow-[0_16px_40px_rgba(21,48,122,0.06)] space-y-5">
                <div>
                <h3 className="text-[14.5px] font-bold text-[#17307a]">
                  Book Appointment
                </h3>
                <p className="text-[11px] font-semibold text-[#8a99ad] mt-1">
                  Choose a date and time that works for you
                </p>
              </div>

              {/* Appointment Dates Carousel */}
              <div className="flex items-center gap-1.5 justify-between">
                {appointmentDates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-[14px] border p-1.5 flex-1 h-[64px] transition-all',
                      selectedDate === d.date
                        ? 'border-[#1a56db] bg-[#1a56db] text-white shadow-[0_8px_18px_rgba(26,86,219,0.18)]'
                        : 'border-[#e2eefc] bg-white text-[#17307a] hover:bg-[#f8fbff]'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[9px] font-bold',
                        selectedDate === d.date
                          ? 'text-white/80'
                          : 'text-[#8a99ad]'
                      )}
                    >
                      {d.day}
                    </span>
                    <span className="text-[14.5px] font-extrabold tracking-tight mt-1 leading-[1]">
                      {d.date}
                    </span>
                    <span
                      className={cn(
                        'text-[8px] font-bold mt-1 uppercase tracking-wider',
                        selectedDate === d.date
                          ? 'text-white/80'
                          : 'text-[#8a99ad]'
                      )}
                    >
                      {d.month.slice(0, 3)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Available Slots */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-[#17307a]">
                  Available Slots
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'flex items-center justify-center h-10 rounded-[10px] border text-[10px] font-bold tracking-tight transition-all',
                        selectedSlot === slot
                          ? 'border-[#1a56db] bg-[#1a56db] text-white shadow-md'
                          : 'border-[#e2eefc] bg-white text-[#17307a] hover:bg-[#f8fbff]'
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleBookAppointment}
                  className="w-full h-12 rounded-[14px] text-[12px] font-bold bg-[#1a56db] text-white hover:bg-[#0b43c4] shadow-lg transition-transform hover:scale-[1.01]"
                >
                  Book Now
                </Button>
                <div className="flex flex-col gap-1.5 text-[10px] font-bold text-[#8a99ad] items-center justify-center pt-1 border-t border-[#eef3ff]">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#228453]" strokeWidth={3} />
                    <span>No upfront payment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#228453]" strokeWidth={3} />
                    <span>Final quote after inspection</span>
                  </div>
                </div>
              </div>
            </Card>
            )}

            {/* Trust & Safety */}
            <Card className="rounded-[24px] border-[#e7eefc] bg-white p-5 shadow-[0_16px_40px_rgba(21,48,122,0.06)] space-y-4">
              <h3 className="text-[12.5px] font-bold text-[#17307a]">
                Trust & Safety
              </h3>
              <ul className="space-y-3.5">
                {[
                  'Background Verified',
                  '100% Secure Transactions',
                  'Customer Data Protected',
                ].map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-[11px] font-semibold text-[#17307a]"
                  >
                    <ShieldCheck
                      className="h-4.5 w-4.5 shrink-0 text-[#228453]"
                      strokeWidth={2.5}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Booking Toast */}
        {bookingConfirmed && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-[#eefbf3] border border-[#a3e2bc] p-4 shadow-[0_10px_30px_rgba(35,132,83,0.15)] animate-in slide-in-from-bottom duration-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e2f7e9] text-[#228453]">
              <Check className="h-5 w-5" strokeWidth={3} />
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#17307a]">
                Appointment Confirmed!
              </div>
              <div className="text-[10px] font-semibold text-[#536891]">
                For {appointmentDates.find((d) => d.date === selectedDate)?.month} {selectedDate} at {selectedSlot} with {garage.name}
              </div>
            </div>
          </div>
        )}
        <PageLoader imageSources={detailImageSources} />

        {/* Status Modal */}
        <Modal 
          isOpen={requestStatus !== 'idle'} 
          onClose={() => setRequestStatus('idle')}
          title={
            requestStatus === 'quote_success' ? 'Quote Request Sent' :
            requestStatus === 'booking_success' ? 'Booking Request Sent' :
            requestStatus === 'booking_error' ? 'Booking Failed' : 'Unable to Send Request'
          }
        >
          <div className="py-4 flex flex-col items-center text-center">
            {requestStatus === 'quote_success' || requestStatus === 'booking_success' ? (
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
            
            <h3 className="text-xl font-bold text-[#17307a] mb-2">
              {requestStatus === 'quote_success' ? 'Quote Request Sent' : 
               requestStatus === 'booking_success' ? 'Booking Request Sent' :
               requestStatus === 'booking_error' ? 'Booking Failed' : 'Unable to Send Request'}
            </h3>
            
            <p className="text-slate-600 mb-8 max-w-sm">
              {requestStatus === 'quote_success' ? (
                <>Your quote request has been sent successfully to {garage.name}.<br/><br/>The garage will review your request and send you a quotation shortly.</>
              ) : requestStatus === 'booking_success' ? (
                <>Your booking request has been sent successfully to {garage.name}.<br/><br/>The garage will review your request and confirm your appointment shortly.</>
              ) : requestStatus === 'booking_error' ? (
                <>We couldn't confirm your booking at this time.<br/><br/>Please try again or contact support.</>
              ) : (
                <>We couldn't send your quote request right now.<br/><br/>Please try again in a few moments.</>
              )}
            </p>
            
            <Button 
              variant="default" 
              className="w-full sm:w-auto min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setRequestStatus('idle')}
            >
              ✓ OK
            </Button>
          </div>
        </Modal>

        {/* More Services Modal */}
        <Modal
          isOpen={moreServicesModalOpen}
          onClose={() => setMoreServicesModalOpen(false)}
          title="All Garage Services"
          className="max-w-xl"
        >
          <div className="py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {services && services.length > 0 ? (
                services.map((svc) => (
                  <div key={svc.id} className="rounded-[16px] border border-[#e2eefc] bg-white p-4 shadow-[0_4px_12px_rgba(22,48,112,0.02)] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-bold text-[#17307a]">
                          {svc.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-[#62749f]">
                          <span className="rounded-full bg-[#f0f4ff] px-2 py-0.5 text-[10px] text-[#1a56db]">
                            {svc.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-slate-500 text-sm">
                  No additional services listed.
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
      {/* Simple Toast for Wishlist */}
      {isToastVisible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}
    </>
  );
}

export default GarageDetailPage;
