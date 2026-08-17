'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList,
  FileText,
  Heart,
  MoreHorizontal,
  Share2,
  Star,
  Store,
} from 'lucide-react';

type GarageMoreMenuProps = {
  triggerLabel?: string;
  compact?: boolean;
  smallTrigger?: boolean;
  isSaved?: boolean;
  onViewGarageProfile?: () => void;
  onViewReviews?: () => void;
  onViewServices?: () => void;
  onPriceBreakup?: () => void;
  onSaveGarage?: () => void;
  onShareGarage?: () => void;
};

interface DropdownPos {
  top: number;
  left: number;
  openUp: boolean;
}

export function GarageMoreMenu({
  triggerLabel = 'More Options',
  compact = false,
  smallTrigger = false,
  isSaved = false,
  onViewGarageProfile,
  onViewReviews,
  onViewServices,
  onPriceBreakup,
  onSaveGarage,
  onShareGarage,
}: GarageMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate fixed position from button rect whenever we open
  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = 290; // conservative estimate for 6 items
    const menuWidth = 214;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 16;

    setPos({
      top: openUp ? rect.top - menuHeight - 8 : rect.bottom + 8,
      left: Math.min(
        Math.max(rect.right - menuWidth, 8),           // don't go past left edge
        window.innerWidth - menuWidth - 8              // don't go past right edge
      ),
      openUp,
    });
  }, []);

  const handleToggle = () => {
    if (!open) {
      calcPos();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Close on outside click — covers both trigger and menu
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Close on scroll / resize so the menu doesn't drift
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close, { passive: true });
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const runAndClose = (handler?: () => void) => {
    setOpen(false);
    handler?.();
  };

  const triggerSpanClass = compact
    ? 'flex h-[32px] w-[32px] items-center justify-center rounded-full border border-[#dbe5ff] bg-white text-[#2451f6] transition-colors hover:bg-[#f5f8ff]'
    : smallTrigger
    ? `flex h-[40px] w-[40px] items-center justify-center rounded-full border bg-white transition-colors ${
        open
          ? 'border-[#1a56db] bg-[#f5f8ff] text-[#1a56db]'
          : 'border-[#dfe7fb] text-[#1a56db] hover:bg-[#f5f8ff]'
      }`
    : `flex h-[48px] w-[48px] items-center justify-center rounded-full border bg-white transition-colors ${
        open
          ? 'border-[#1a56db] bg-[#f5f8ff] text-[#1a56db]'
          : 'border-[#dfe7fb] text-[#1a56db] hover:bg-[#f5f8ff]'
      }`;

  const triggerBtnClass = compact
    ? 'flex items-center justify-center text-[#2451f6]'
    : smallTrigger
    ? 'flex flex-col items-center gap-1 text-center'
    : 'flex w-[72px] flex-col items-center gap-2 text-center';

  const dropdown =
    open && pos
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 99999,
            }}
            className="w-[214px] rounded-[16px] border border-[#e4ecff] bg-white p-1.5 shadow-[0_12px_30px_rgba(23,48,122,0.18)] text-left"
          >
            {/* Caret arrow */}
            {!pos.openUp && (
              <div
                style={{ position: 'absolute', right: 16, top: -6 }}
                className="h-2.5 w-2.5 rotate-45 border-l border-t border-[#e4ecff] bg-white"
              />
            )}
            {pos.openUp && (
              <div
                style={{ position: 'absolute', right: 16, bottom: -6 }}
                className="h-2.5 w-2.5 rotate-45 border-r border-b border-[#e4ecff] bg-white"
              />
            )}

            <div className="relative z-10 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => runAndClose(onViewGarageProfile)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
              >
                <Store className="h-4 w-4 shrink-0 text-[#1ea15f]" />
                <span>View Garage Profile</span>
              </button>
              <button
                type="button"
                onClick={() => runAndClose(onViewReviews)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
              >
                <Star className="h-4 w-4 shrink-0 text-[#f59a23]" />
                <span>View Reviews</span>
              </button>
              <button
                type="button"
                onClick={() => runAndClose(onViewServices)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
                <span>View Services</span>
              </button>
              <button
                type="button"
                onClick={() => runAndClose(onPriceBreakup)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
              >
                <FileText className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
                <span>Price Breakup</span>
              </button>
              <button
                type="button"
                onClick={() => runAndClose(onSaveGarage)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
              >
                <Heart
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isSaved ? 'fill-[#ff3b30] text-[#ff3b30]' : 'text-[#7a8bb8]'
                  }`}
                />
                <span>{isSaved ? 'Unsave Garage' : 'Save Garage'}</span>
              </button>
              <button
                type="button"
                onClick={() => runAndClose(onShareGarage)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#17307a] transition-colors hover:bg-[#f5f8ff]"
              >
                <Share2 className="h-4 w-4 shrink-0 text-[#7a8bb8]" />
                <span>Share Garage</span>
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative flex flex-col items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={triggerBtnClass}
      >
        <span className={triggerSpanClass}>
          <MoreHorizontal
            className={
              compact ? 'h-4 w-4' : smallTrigger ? 'h-[18px] w-[18px]' : 'h-5 w-5'
            }
          />
        </span>
        {!compact ? (
          <span
            className={
              smallTrigger
                ? 'text-[10px] leading-tight text-[#5f7099] whitespace-nowrap'
                : 'text-[10.5px] leading-4 text-[#5f7099]'
            }
          >
            {triggerLabel}
          </span>
        ) : null}
      </button>

      {dropdown}
    </div>
  );
}
