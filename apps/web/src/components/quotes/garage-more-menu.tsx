'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  FileText,
  MoreHorizontal,
  Scale,
  Share2,
  Star,
  Store,
  Trash2,
  Heart,
} from 'lucide-react';

type GarageMoreMenuProps = {
  triggerLabel?: string;
  compact?: boolean;
  smallTrigger?: boolean;
  onRemove?: () => void;
  onViewGarageProfile?: () => void;
  onViewReviews?: () => void;
  onViewServices?: () => void;
  onPriceBreakup?: () => void;
  onCompareDetails?: () => void;
  onSaveGarage?: () => void;
  onShareGarage?: () => void;
};

export function GarageMoreMenu({
  triggerLabel = 'More',
  compact = false,
  smallTrigger = false,
  onRemove,
  onViewGarageProfile,
  onViewReviews,
  onViewServices,
  onPriceBreakup,
  onCompareDetails,
  onSaveGarage,
  onShareGarage,
}: GarageMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runAndClose = (handler?: () => void) => {
    setOpen(false);
    handler?.();
  };

  return (
    <div ref={rootRef} className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? 'flex items-center justify-center text-[#2451f6]'
            : smallTrigger
            ? 'flex min-h-[62px] flex-col items-center gap-2 text-center'
            : 'flex w-[72px] flex-col items-center gap-2 text-center'
        }
      >
        <span
          className={
            compact
              ? 'flex h-[32px] w-[32px] items-center justify-center rounded-full border border-[#dbe5ff] bg-white text-[#2451f6] transition-colors hover:bg-[#f5f8ff]'
              : smallTrigger
              ? `flex h-[32px] w-[32px] items-center justify-center rounded-full border bg-white transition-colors ${
                  open
                    ? 'border-[#1a56db] bg-[#f5f8ff] text-[#1a56db]'
                    : 'border-[#dbe5ff] text-[#1a56db] hover:bg-[#f5f8ff]'
                }`
              : `flex h-[48px] w-[48px] items-center justify-center rounded-full border bg-white transition-colors ${
                  open
                    ? 'border-[#1a56db] bg-[#f5f8ff] text-[#1a56db]'
                    : 'border-[#dfe7fb] text-[#1a56db] hover:bg-[#f5f8ff]'
                }`
          }
        >
          <MoreHorizontal
            className={compact || smallTrigger ? 'h-4 w-4' : 'h-5 w-5'}
          />
        </span>
        {!compact ? (
          <span
            className={
              smallTrigger
                ? 'text-[10px] font-medium leading-4 text-[#1a56db]'
                : 'text-[10.5px] leading-4 text-[#5f7099]'
            }
          >
            {triggerLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-[205px] -translate-x-1/2 rounded-[16px] border border-[#e4ecff] bg-white p-1.5 shadow-[0_12px_30px_rgba(23,48,122,0.12)] text-left">
          <div className="absolute left-1/2 top-[-6px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-l border-t border-[#e4ecff] bg-white" />

          <div className="relative z-10 flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => runAndClose(onViewGarageProfile)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
            >
              <Store className="h-4 w-4 shrink-0 text-[#1ea15f]" />
              <span>View Garage Profile</span>
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onViewReviews)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
            >
              <Star className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
              <span>View Reviews</span>
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onViewServices)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
              <span>View Services</span>
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onPriceBreakup)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
            >
              <FileText className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
              <span>Price Breakup</span>
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onSaveGarage)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
            >
              <Heart className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
              <span>Save to Wishlist</span>
            </button>
            <button
              type="button"
              onClick={() => runAndClose(onShareGarage)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
            >
              <Share2 className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
              <span>Share Garage</span>
            </button>
            <div className="my-1 border-t border-[#edf2fb]" />
            <button
              type="button"
              onClick={() => runAndClose(onRemove)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/10"
            >
              <Trash2 className="h-4 w-4 shrink-0 text-[#ff3b30]" />
              <span>Remove from Compare</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
