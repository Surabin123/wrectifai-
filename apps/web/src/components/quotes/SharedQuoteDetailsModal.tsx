'use client';
import { Modal } from '@/components/common/modal';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/utils';

export interface SharedQuoteDetails {
  id?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCity?: string;
  garageName?: string;
  garageCity?: string;
  garagePhone?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  vin?: string;
  issueDescription?: string;
  remarks?: string; // Garage notes
  laborCost?: number;
  partsCost?: number;
  otherCost?: number;
  totalAmount?: number;
  currency?: string;
  estimatedDays?: number | string;
  preferredDate?: string;
  createdAt?: string;
  status?: string;
}

interface Props {
  quote: SharedQuoteDetails | null;
  onClose: () => void;
  actions?: React.ReactNode;
  userRole?: 'admin' | 'garage' | 'customer';
}

export function SharedQuoteDetailsModal({ quote, onClose, actions, userRole = 'admin' }: Props) {
  if (!quote) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Quote Details" className="max-w-2xl">
      <div className="space-y-6 text-sm text-slate-700">
        
        {/* Parties Section */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          {(userRole === 'admin' || userRole === 'garage') && (
            <>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Customer Name</p>
                <p className="font-semibold text-slate-900">{quote.customerName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Customer Phone / Email</p>
                <p className="font-semibold text-slate-900">{quote.customerPhone || quote.customerEmail || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Customer City</p>
                <p className="font-semibold text-slate-900">{quote.customerCity || 'N/A'}</p>
              </div>
            </>
          )}

          {(userRole === 'admin' || userRole === 'customer') && (
            <>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Garage Name</p>
                <p className="font-semibold text-slate-900">{quote.garageName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Garage City</p>
                <p className="font-semibold text-slate-900">{quote.garageCity || 'N/A'}</p>
              </div>
            </>
          )}

          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Created At</p>
            <p className="font-semibold text-slate-900">{quote.createdAt ? formatDate(quote.createdAt) : 'N/A'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Status</p>
            <p className="font-semibold text-slate-900 uppercase">{quote.status || 'N/A'}</p>
          </div>
        </div>

        {/* Vehicle & Request Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle (VIN)</p>
            <p className="font-semibold text-slate-900">
              {quote.vehicleMake || ''} {quote.vehicleModel || ''} {quote.vehicleYear || ''} 
              {quote.vin ? ` (${quote.vin})` : ''}
              {(!quote.vehicleMake && !quote.vehicleModel) ? 'N/A' : ''}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Preferred Date & Time</p>
            <p className="font-semibold text-slate-900">
              {quote.preferredDate ? formatDate(quote.preferredDate) : 'No preference'}
              {quote.preferredDate ? ' ' + new Date(quote.preferredDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
            </p>
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-[10px] uppercase font-bold text-slate-500">Issue Description / Request</p>
            <p className="font-semibold text-slate-900 bg-slate-50 p-3 rounded border border-slate-100 mt-1">
              {quote.issueDescription || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Cost & Quote Details */}
        <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Labour Cost</p>
            <p className="font-semibold text-slate-900">{formatCurrency(quote.laborCost || 0, quote.currency || 'USD')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Parts Cost</p>
            <p className="font-semibold text-slate-900">{formatCurrency(quote.partsCost || 0, quote.currency || 'USD')}</p>
          </div>
          {(quote.otherCost ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-500">Other Charges (Consumables/GST)</p>
              <p className="font-semibold text-slate-900">{formatCurrency(quote.otherCost || 0, quote.currency || 'USD')}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Estimated Time</p>
            <p className="font-semibold text-slate-900">{quote.estimatedDays ? `${quote.estimatedDays} days` : 'N/A'}</p>
          </div>

          <div className="space-y-1 col-span-2">
            <p className="text-[10px] uppercase font-bold text-slate-500">Garage Notes / Remarks</p>
            <p className="font-semibold text-slate-900 bg-slate-50 p-3 rounded border border-slate-100 mt-1">
              {quote.remarks || 'None'}
            </p>
          </div>

          <div className="space-y-1 col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center mt-2">
            <p className="font-bold text-[#17307a]">Total Amount</p>
            <p className="font-bold text-2xl text-[#2451f6]">
              {formatCurrency(quote.totalAmount || 0, quote.currency || 'USD')}
            </p>
          </div>
        </div>
        
        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-4">
          <button onClick={onClose} className="px-5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">
            Close
          </button>
          {actions}
        </div>
      </div>
    </Modal>
  );
}
