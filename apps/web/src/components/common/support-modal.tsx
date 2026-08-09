'use client';
import { Modal } from '@/components/common/modal';
import { PhoneCall } from 'lucide-react';
import { useState } from 'react';

export function SupportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('+1 (800) 555-0199');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Call Support" className="max-w-sm">
      <div className="text-center p-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
          <PhoneCall className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-[#17307a] mb-2">Call Support</h3>
        <p className="text-xs text-[#5f7099] leading-relaxed mb-6">
          Our support helpline is available 24/7. Call us for any assistance with your vehicle or quotes.
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="w-full bg-[#f4f7ff] p-3 rounded-[12px] text-[#1a56db] font-bold text-lg tracking-wide hover:bg-[#e6ecfb] transition-colors mb-3 relative group"
        >
          +1 (800) 555-0199
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Click to Copy
          </span>
        </button>
        <div className="h-6 mb-3 flex items-center justify-center">
          {copied && (
            <p className="text-[11px] text-green-600 font-semibold animate-in fade-in duration-200">
              ✓ Number copied to clipboard!
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-[12px] bg-slate-100 text-[12px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

export default SupportModal;
