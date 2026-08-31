'use client';
import { Modal } from '@/components/common/modal';
import { formatCurrency } from '@/lib/currency';

interface QuoteDetailsModalProps {
  quote: any;
  onClose: () => void;
  onBookNow?: (quote: any) => void;
  showBookNow?: boolean;
}

export function QuoteDetailsModal({ quote, onClose, onBookNow, showBookNow = false }: QuoteDetailsModalProps) {
  if (!quote) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Quote Details" className="max-w-xl">
      <div className="space-y-4 text-sm">
        {/* Garage Info */}
        {(quote.garageName || quote.garageAddress) && (
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            {quote.garageName && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Garage Name</span>
                <p className="text-slate-800 font-semibold">{quote.garageName}</p>
              </div>
            )}
            {quote.garageAddress && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Address</span>
                <p className="text-slate-800">{quote.garageAddress}</p>
              </div>
            )}
          </div>
        )}

        {/* Customer & Vehicle */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          {quote.customerName && (
            <div>
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Customer Name</span>
              <p className="text-slate-800 font-semibold">{quote.customerName}</p>
            </div>
          )}
          {(quote.vehicleMake || quote.vehicleModel || quote.vehicleYear) && (
            <div>
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Vehicle</span>
              <p className="text-slate-800 font-medium">
                {quote.vehicleYear} {quote.vehicleMake} {quote.vehicleModel}
                {quote.vehicleVin && <span className="block text-xs text-slate-500 mt-0.5">VIN: {quote.vehicleVin}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Quote Meta */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          {quote.createdAt && (
            <div>
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Quote Created</span>
              <p className="text-slate-800">{new Date(quote.createdAt).toLocaleDateString()}</p>
            </div>
          )}
          {quote.status && (
            <div>
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Status</span>
              <p className="text-slate-800 uppercase font-semibold text-blue-600">{quote.status}</p>
            </div>
          )}
        </div>

        {/* Diagnosis */}
        {quote.issueSummary && (
          <div>
            <span className="font-bold text-slate-500 block mb-2 text-xs uppercase tracking-wider">Diagnosis / Issues</span>
            <p className="text-slate-800 bg-slate-50 p-3 rounded border border-slate-200">
              {quote.issueSummary}
            </p>
          </div>
        )}
        
        {/* Quote Summary */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 text-base">Quote Summary</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            {Number(quote?.details?.labour || quote?.laborCost || 0) > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Labour Cost</span>
                <p className="text-slate-800 font-medium">{formatCurrency(Number(quote?.details?.labour || quote?.laborCost || 0), quote.currency)}</p>
              </div>
            )}
            {Number(quote?.details?.parts || quote?.partsCost || 0) > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Parts Cost</span>
                <p className="text-slate-800 font-medium">{formatCurrency(Number(quote?.details?.parts || quote?.partsCost || 0), quote.currency)}</p>
              </div>
            )}
            {Number(quote?.details?.consumables || 0) > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Consumables</span>
                <p className="text-slate-800 font-medium">{formatCurrency(Number(quote.details.consumables), quote.currency)}</p>
              </div>
            )}
            {Number(quote?.details?.gst || 0) > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">GST / Tax</span>
                <p className="text-slate-800 font-medium">{formatCurrency(Number(quote.details.gst), quote.currency)}</p>
              </div>
            )}
            {Number(quote?.details?.other || 0) > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Other Charges</span>
                <p className="text-slate-800 font-medium">{formatCurrency(Number(quote.details.other), quote.currency)}</p>
              </div>
            )}
            {(quote.totalCost != null || quote?.details?.total != null || quote.price != null) && (
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Final Total</span>
                <p className="text-[#17307a] font-bold text-xl">{formatCurrency(Number(quote?.details?.total || quote?.totalCost || String(quote?.price || '0').replace(/[^0-9.-]/g, '')), quote.currency)}</p>
              </div>
            )}
            {quote.time != null && (
              <div>
                <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">Estimated Time</span>
                <p className="text-slate-800 font-medium">{quote.time}</p>
              </div>
            )}
          </div>
        </div>

        {/* Remarks / Warranty */}
        {(quote.remarks || quote.warranty) && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            {quote.warranty && (
              <div>
                <span className="font-bold text-slate-500 block mb-2 text-xs uppercase tracking-wider">Warranty</span>
                <p className="text-slate-800 bg-slate-50 p-3 rounded border border-slate-200">{quote.warranty}</p>
              </div>
            )}
            {quote.remarks && (
              <div>
                <span className="font-bold text-slate-500 block mb-2 text-xs uppercase tracking-wider">Remarks</span>
                <p className="text-slate-800 bg-slate-50 p-3 rounded border border-slate-200">{quote.remarks}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          {showBookNow && !quote.isBooked && quote.status !== 'rejected' && onBookNow && (
            <button
              onClick={() => onBookNow(quote)}
              className="px-4 py-2 bg-blue-600 rounded text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Book Now
            </button>
          )}
          {quote.isBooked && (
             <span className="text-slate-500 font-bold text-sm px-4 py-2 bg-slate-100 rounded cursor-not-allowed">
               Booked ✓
             </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
