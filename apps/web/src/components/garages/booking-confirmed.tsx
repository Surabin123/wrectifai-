'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Wrench,
  Clock,
  CarFront,
  ShieldCheck,
  MessageSquare,
  Phone,
  Check,
  Copy,
  ThumbsUp,
  UserCheck,
  Store,
  Home,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/common/badge';
import { resolveImageUrl } from '@/lib/utils';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { cn } from '@/utils/cn';
import type { Garage } from '@/pages/garages/garages-page';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import type { DiagnoseIssue } from '@/components/ai-diagnose/diagnose-flow-shared';

interface BookingConfirmedProps {
  garage: Garage;
  selectedDate: string;
  selectedSlot: string;
  quoteContext?: {
    quote: QuoteItem;
    issues: DiagnoseIssue[];
    issueIds: string[];
    aiEstimateRange: string;
  };
  bookingId?: string;
  onViewBookings: () => void;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
  image?: string;
}

export function BookingConfirmed({
  garage,
  selectedDate,
  selectedSlot,
  quoteContext,
  bookingId: propBookingId,
  onViewBookings,
}: BookingConfirmedProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
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
      });
    }
    return list;
  }, []);

  const selectedDateObj = useMemo(() => {
    return appointmentDates.find((d) => d.date === selectedDate) || appointmentDates[0] || {
      day: 'Fri',
      date: '23',
      month: 'May',
      year: 2025,
    };
  }, [appointmentDates, selectedDate]);
  const formattedYear2Digit = String(selectedDateObj.year).slice(-2);
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = monthsList.indexOf(selectedDateObj.month);
  const formattedMonth = String(monthIdx >= 0 ? monthIdx + 1 : 7).padStart(2, '0');
  const formattedDate = String(selectedDateObj.date).padStart(2, '0');
  const bookingId = propBookingId || `WRCT-${formattedYear2Digit}${formattedMonth}${formattedDate}-0420`;


  const handleCopy = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      title: 'Booking Confirmed',
      desc: 'You will receive a confirmation shortly',
      active: true,
      icon: Store,
    },
    {
      title: 'Garage Assigned',
      desc: 'We will assign the best mechanic for you',
      active: false,
      icon: UserCheck,
    },
    {
      title: 'Service in Progress',
      desc: 'We will notify you when our team starts',
      active: false,
      icon: CarFront,
    },
    {
      title: 'Service Completed',
      desc: 'Pay after service & share your feedback',
      active: false,
      icon: ShieldCheck,
    },
  ];

  const bulletPoints = quoteContext
    ? [
        quoteContext.quote.meta,
        quoteContext.quote.metaSecondary,
        'Final inspection-based quote confirmation',
        `Current quote price: ${quoteContext.quote.price}`,
        `Estimated savings: ${quoteContext.quote.savings}`,
      ]
    : [
        'Complete vehicle inspection',
        'Engine oil change',
        'Filter replacement',
        'Performance check',
        'Basic adjustments',
      ];

  return (
    <div className="animate-in space-y-3 pb-10 fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6b7da5] pt-1">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-[#1a56db] transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Home</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[#a4b3d1]" />
        <button
          onClick={onViewBookings}
          className="hover:text-[#1a56db] transition-colors"
        >
          Garages
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#a4b3d1]" />
        <span className="text-[#17307a] font-bold">Booking Confirmed</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Confirmed Banner Card */}
          <div className="relative overflow-hidden rounded-[20px] border border-[#d5eedb] bg-[#f4fcf7] p-5 shadow-[0_10px_28px_rgba(15,164,87,0.03)]">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              {/* Elegant Check Indicator with Circular Confetti Particles matching reference */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#0fa457] text-white shadow-[0_6px_16px_rgba(15,164,87,0.25)]">
                  <Check className="h-6 w-6 stroke-[3.5]" />
                </div>

                {/* Reference-matching confetti dots strategically positioned */}
                <div className="absolute -top-1 -left-1 w-[4.5px] h-[4.5px] rounded-full bg-[#c084fc] opacity-75" />
                <div className="absolute top-2 -right-2.5 w-[5px] h-[5px] rounded-full bg-[#fb923c] opacity-80" />
                <div className="absolute -bottom-1.5 right-2 w-[4px] h-[4px] rounded-full bg-[#34d399] opacity-75" />
                <div className="absolute bottom-2.5 -left-2.5 w-[5px] h-[5px] rounded-full bg-[#60a5fa] opacity-75" />
                <div className="absolute -top-2.5 right-1.5 w-[3.5px] h-[3.5px] rounded-full bg-[#f43f5e] opacity-70" />
                <div className="absolute bottom-6 -right-1 w-[3px] h-[3px] rounded-full bg-[#facc15] opacity-80" />
                <div className="absolute -bottom-2 -left-0.5 w-[4px] h-[4px] rounded-full bg-[#a78bfa] opacity-70" />
              </div>

              {/* Banner details */}
              <div className="text-center sm:text-left space-y-1">
                <h1 className="text-[20px] font-extrabold tracking-tight text-[#0fa457] sm:text-[21px]">
                  Booking Confirmed!
                </h1>
                <p className="text-[13px] font-semibold text-[#1e293b]">
                  Your appointment has been successfully booked.
                </p>

                <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="text-[12px] font-bold text-[#475569]">
                    Booking ID:{' '}
                    <span className="text-[#0f172a] font-extrabold font-mono tracking-tight">
                      {bookingId}
                    </span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white border border-[#e2eefc] text-[#1a56db] hover:bg-[#f0f4ff] active:scale-95 transition-all shadow-sm"
                    title="Copy Booking ID"
                  >
                    {copied ? (
                      <Check
                        className="h-3 w-3 text-[#0fa457]"
                        strokeWidth={3}
                      />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] font-semibold text-[#64748b] pt-0.5">
                  We&apos;ve sent the booking details to your email and SMS.
                </p>
              </div>
            </div>
          </div>

          {/* Booking Details Grid Box */}
          <Card className="rounded-[22px] border-[#e7eefc] bg-white p-5 shadow-[0_12px_32px_rgba(21,48,122,0.05)] space-y-4">
            <h2 className="text-[14px] font-extrabold tracking-tight text-[#17307a]">
              Booking Details
            </h2>

            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {/* Date & Time */}
              <div className="flex items-start gap-3 py-0.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e2eefd] text-[#1a56db]">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Date &amp; Time
                  </div>
                  <div className="text-[13px] font-extrabold text-[#0f172a]">
                    {selectedDateObj.day}, {selectedDateObj.date} {selectedDateObj.month} {selectedDateObj.year} • {selectedSlot}
                  </div>
                </div>
              </div>

              {/* Garage Info */}
              <div className="flex items-start gap-3 border-t border-[#f1f5f9] pt-3 sm:border-t-0 sm:pt-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e2eefd] text-[#1a56db]">
                  <Store className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Garage
                  </div>
                  <div className="text-[13px] font-extrabold text-[#0f172a]">
                    {garage.name}
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748b]">
                    {garage.location}
                  </div>
                </div>
              </div>

              {/* Service details */}
              <div className="flex items-start gap-3 border-t border-[#f1f5f9] pt-3 sm:pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e2eefd] text-[#1a56db]">
                  <Wrench className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Service
                  </div>
                  <div className="text-[13px] font-extrabold text-[#0f172a]">
                    {quoteContext
                      ? `Quote-based repair booking`
                      : 'General Service (Standard Service)'}
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-block rounded-[6px] bg-[#eefbf3] px-2 py-0.5 text-[10px] font-bold text-[#228453]">
                      {quoteContext ? quoteContext.quote.meta : '60-90 mins'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Response Time details */}
              <div className="flex items-start gap-3 border-t border-[#f1f5f9] pt-3 sm:pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e2eefd] text-[#1a56db]">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Response Time
                  </div>
                  <div className="text-[13px] font-extrabold text-[#0f172a]">
                    {garage.responseMins} mins
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="flex items-start gap-3 border-t border-[#f1f5f9] pt-3 sm:pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e2eefd] text-[#1a56db]">
                  <CarFront className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Vehicle
                  </div>
                  <div className="text-[13px] font-extrabold text-[#0f172a]">
                    {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Honda City'}
                  </div>
                  <div className="text-[11px] font-semibold text-[#64748b]">
                    {selectedVehicle
                      ? `${selectedVehicle.vin ? `${selectedVehicle.vin} • ` : ''}${selectedVehicle.vin ? 'VIN Verified' : 'Petrol'} • ${selectedVehicle.year}`
                      : 'TS07 AB 1234 • Petrol • 2018'}
                  </div>
                </div>
              </div>

              {/* Payment Mode details */}
              <div className="flex items-start gap-3 border-t border-[#f1f5f9] pt-3 sm:pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e2eefd] text-[#1a56db]">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Payment Mode
                  </div>
                  <div className="text-[13px] font-extrabold text-[#0f172a]">
                    Pay after service
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-block rounded-[6px] bg-[#eefbf3] px-2 py-0.5 text-[10px] font-bold text-[#228453]">
                      No upfront payment
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {quoteContext ? (
            <Card className="rounded-[22px] border-[#e7eefc] bg-white p-5 shadow-[0_12px_32px_rgba(21,48,122,0.05)] space-y-4">
              <h2 className="text-[14px] font-extrabold tracking-tight text-[#17307a]">
                Quote Booking Summary
              </h2>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-3.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Current Quote
                  </div>
                  <div className="mt-2 text-[18px] font-extrabold text-[#0f172a]">
                    {quoteContext.quote.price}
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-3.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    WrectifAI Estimate
                  </div>
                  <div className="mt-2 text-[16px] font-extrabold text-[#159a5d]">
                    {quoteContext.aiEstimateRange}
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#e2eefc] bg-[#fbfdff] p-3.5">
                  <div className="text-[11.5px] font-semibold text-[#64748b]">
                    Savings
                  </div>
                  <div className="mt-2 text-[16px] font-extrabold text-[#0f172a]">
                    {quoteContext.quote.savings}
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e2eefc] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-bold text-[#17307a]">
                    Issues Booked
                  </div>
                  <span className="rounded-full bg-[#e8f0ff] px-2.5 py-0.5 text-[10px] font-bold text-[#1a56db]">
                    {quoteContext.issues.length} selected
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quoteContext.issues.map((issue) => (
                    <span
                      key={issue.id}
                      className="inline-flex items-center rounded-full border border-[#d8e5ff] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#17307a] shadow-[0_4px_10px_rgba(26,86,219,0.04)]"
                    >
                      {issue.title}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          {/* Process Steps Timeline ("What's Next") */}
          <Card className="rounded-[22px] border-[#e7eefc] p-6 shadow-[0_12px_32px_rgba(21,48,122,0.05)] bg-white space-y-6">
            <h2 className="text-[14.5px] font-extrabold tracking-tight text-[#17307a]">
              What&apos;s Next?
            </h2>

            <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-4 md:items-start">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isFirstStep = idx === 0;
                return (
                  <div
                    key={idx}
                    className="flex flex-row md:flex-col items-start md:items-center text-left md:text-center flex-1 min-w-0 gap-4 md:gap-3 relative"
                  >
                    {/* Decorative horizontal dashed link lines between steps */}
                    {idx < steps.length - 1 && (
                      <div className="hidden md:block absolute left-[calc(50%+24px)] top-[20px] right-[calc(-50%+24px)] h-0.5 border-t border-dashed border-[#e2eefc]" />
                    )}

                    {/* Icon Indicator bubble */}
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                        isFirstStep
                          ? 'border-[#d3eedc] bg-[#eefbf3] text-[#228453] shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                          : 'border-[#dbe6ff] bg-[#f0f4ff] text-[#1a56db]'
                      )}
                    >
                      <StepIcon className="h-4.5 w-4.5" />
                    </div>

                    <div className="space-y-0.5 max-w-[140px] md:mx-auto">
                      <h4
                        className={cn(
                          'text-[12px] font-bold',
                          isFirstStep ? 'text-[#228453]' : 'text-[#17307a]'
                        )}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[10px] font-semibold leading-normal text-[#6b7da5]">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* View My Bookings trigger */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => router.push('/bookings')}
              className="h-11 rounded-[12px] px-8 text-[12.5px] font-bold bg-[#1a56db] text-white shadow-md hover:bg-[#0b43c4]"
            >
              View My Bookings
            </Button>
          </div>
        </div>

        {/* Right Column: Summaries & widgets */}
        <div className="space-y-6">
          {/* Booking Summary sidebar widget */}
          <Card className="rounded-[24px] border-[#e7eefc] bg-white p-5 shadow-[0_16px_40px_rgba(21,48,122,0.06)] space-y-4">
            <h3 className="text-[14px] font-extrabold tracking-tight text-[#17307a]">
              Booking Summary
            </h3>

            {/* Mini Garage detail widget */}
            <div className="flex gap-3 items-center">
              {garage.image && (
                <Image
                  src={resolveImageUrl(garage.image) || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'}
                  alt={garage.name}
                  width={80}
                  height={56}
                  className="rounded-[10px] object-cover shrink-0 border border-[#e2eefc]"
                />
              )}
              <div className="min-w-0">
                <h4 className="text-[12.5px] font-bold text-[#17307a] truncate">
                  {garage.name}
                </h4>
                <p className="text-[10.5px] font-semibold text-[#8a99ad] truncate mt-0.5">
                  {garage.location}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-[#f28c28]">
                  <span className="flex items-center gap-0.5 text-[#ff9f1a]">
                    ★ {garage.rating.toFixed(1)}
                  </span>
                  <span className="text-[#8a99ad] font-semibold">
                    ({garage.reviews} Reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#eef3ff] pt-3.5 space-y-3">
              {[
                { label: 'Service', val: 'General Service' },
                { label: 'Service Type', val: 'Standard Service' },
                {
                  label: 'Date & Time',
                  val: `${selectedDateObj.day}, ${selectedDateObj.date} ${selectedDateObj.month} ${selectedDateObj.year} at ${selectedSlot}`,
                },
                { label: 'Estimated Duration', val: '60-90 mins' },
                { label: 'Response Time', val: `${garage.responseMins} mins` },
              ].map((row, idx) => (
                <div key={idx} className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a99ad] block">
                    {row.label}
                  </span>
                  <span className="text-[12px] font-extrabold text-[#17307a] block leading-tight">
                    {row.val}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#eef3ff] pt-3.5 space-y-2">
              <span className="text-[10.5px] font-bold tracking-tight text-[#17307a] block">
                What&apos;s Included
              </span>
              <ul className="space-y-1.5">
                {bulletPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2 text-[11px] font-semibold text-[#536891]"
                  >
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[#228453]"
                      strokeWidth={3}
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-[#f0f4ff] p-3 text-center border border-[#dbe6ff]">
              <span className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-[#1a56db]">
                <ShieldCheck
                  className="h-4 w-4 text-[#1a56db]"
                  strokeWidth={2.5}
                />
                No upfront payment • Pay after service
              </span>
            </div>
          </Card>

          {/* Change / cancellation widget */}
          <Card className="rounded-[24px] border-[#e7eefc] bg-white p-5 shadow-[0_16px_40px_rgba(21,48,122,0.06)] space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-[12.5px] font-bold tracking-tight text-[#17307a]">
                Need to make changes?
              </h3>
              <p className="text-[11px] font-semibold text-[#8a99ad] leading-normal">
                You can reschedule or cancel your booking before {selectedDateObj.date}{' '}
                {selectedDateObj.month} {selectedDateObj.year}, 02:00 PM.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled
                className="flex-1 h-10 rounded-[12px] text-[11px] font-bold border-[#cbd4e6] text-[#17307a] disabled:cursor-not-allowed disabled:opacity-100"
              >
                Reschedule
              </Button>
              <Button
                variant="outline"
                disabled
                className="flex-1 h-10 rounded-[12px] text-[11px] font-bold border-[#ffd2d2] text-[#d14343] disabled:cursor-not-allowed disabled:opacity-100"
              >
                Cancel Booking
              </Button>
            </div>
          </Card>

          <Card className="rounded-[24px] border-[#e7eefc] bg-white p-5 shadow-[0_16px_40px_rgba(21,48,122,0.06)] space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-[12.5px] font-bold tracking-tight text-[#17307a]">
                Need Help?
              </h3>
              <p className="text-[11px] font-semibold leading-normal text-[#8a99ad]">
                Our support team is here to help you
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled
                className="h-10 w-full rounded-[12px] border-[#cbd4e6] px-2 text-[10.5px] font-bold text-[#17307a] disabled:cursor-not-allowed disabled:opacity-100"
              >
                <MessageSquare className="h-4 w-4 text-[#1a56db]" />
                Chat with Us
              </Button>
              <Button
                variant="outline"
                disabled
                className="h-10 w-full rounded-[12px] border-[#cbd4e6] px-2 text-[10.5px] font-bold text-[#17307a] disabled:cursor-not-allowed disabled:opacity-100"
              >
                <Phone className="h-4 w-4 text-[#1a56db]" />
                Call Garage
              </Button>
            </div>
          </Card>

          {/* Hassle free service banner */}
          <Card className="rounded-[24px] border-[#d3eedc] bg-[#eefbf3] p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-[12px] font-bold text-[#228453]">
                Enjoy hassle-free service!
              </h4>
              <p className="text-[10px] font-semibold text-[#3a684f] leading-snug">
                Our team will take great care of your vehicle.
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#228453]">
              <ThumbsUp className="h-4.5 w-4.5" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmed;
