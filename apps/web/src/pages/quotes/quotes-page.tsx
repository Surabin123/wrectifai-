'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Modal } from '@/components/common/modal';
import { BookingDialog } from '@/components/customer/booking-dialog';
import { fetchQuotes } from '@/lib/quotes-api';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import { formatCurrency } from '@/lib/currency';
import { useUserPhone } from '@/lib/user-phone';

export function QuotesPage() {
  const router = useRouter();
  const userPhone = useUserPhone();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingQuote, setBookingQuote] = useState<QuoteItem | null>(null);
  const [viewQuote, setViewQuote] = useState<QuoteItem | null>(null);
  const [viewDetailsQuote, setViewDetailsQuote] = useState<QuoteItem | null>(null);

  const formatStatus = (status?: string) => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    switch (s) {
      case 'open':
      case 'pending':
      case 'pendingpayment':
        return 'Pending';
      case 'quoted':
        return 'Quoted';
      case 'selected':
        return 'Booked';
      case 'accepted':
        return 'Accepted';
      case 'in_progress':
      case 'repairing':
        return 'In Progress';
      case 'ready':
        return 'Ready';
      case 'completed':
        return 'Completed';
      case 'cancelled':
      case 'expired':
      case 'rejected':
        return 'Cancelled';
      case 'suspended':
        return 'Suspended';
      default:
        return 'Pending';
    }
  };

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const quotesData = await fetchQuotes();
        if (active) setQuotes(quotesData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();

    const handleSync = () => {
      if (active) loadData();
    };

    window.addEventListener('quote-updated', handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_sync_quotes') {
        handleSync();
      }
    });

    return () => {
      active = false;
      window.removeEventListener('quote-updated', handleSync);
    };
  }, []);

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="space-y-6 pb-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">My Quotes</h1>
          <p className="mt-2 text-sm text-slate-600">
             Compare quotes from trusted garages and book the best one for your car.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-600">Garage</th>
                  <th className="px-6 py-4 font-bold text-slate-600">Total</th>
                  <th className="px-6 py-4 font-bold text-slate-600">Days</th>
                  <th className="px-6 py-4 font-bold text-slate-600">Status</th>
                  <th className="px-6 py-4 font-bold text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading quotes...</td>
                  </tr>
                ) : quotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No quotes received yet.</td>
                  </tr>
                ) : quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {(quote as any).garageName || quote.garage}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {formatCurrency(quote.price || (quote as any).amount || (quote as any).totalCost || 0, quote.currency)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {quote.time || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {formatStatus(quote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!quote.isBooked && quote.status !== 'rejected' && quote.status !== 'cancelled' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewQuote(quote)}
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded font-bold text-sm hover:bg-slate-200 transition-colors"
                          >
                            View Quote
                          </button>
                        </div>
                      )}
                      {quote.isBooked && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-emerald-600 font-bold text-sm px-3 py-2 bg-emerald-50 rounded">Booked ✓</span>
                          <button
                            onClick={() => setViewDetailsQuote(quote)}
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded font-bold text-sm hover:bg-slate-200 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {bookingQuote && (
        <BookingDialog 
          quote={bookingQuote} 
          onClose={() => setBookingQuote(null)}
          onSuccess={() => {
            setBookingQuote(null);
            window.dispatchEvent(new Event('dashboard_refresh'));
            const loadData = async () => {
              setLoading(true);
              try {
                const quotesData = await fetchQuotes();
                setQuotes(quotesData);
              } catch (err) {
                console.error('Failed to fetch data:', err);
              } finally {
                setLoading(false);
              }
            };
            loadData();
          }}
        />
      )}
      {viewQuote && (
        <Modal isOpen={true} onClose={() => setViewQuote(null)} title="Quote Details" className="max-w-2xl">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-700">
            <div>
              <span className="block font-bold text-slate-500 mb-1">Created Date</span>
              <p className="font-semibold">{viewQuote.requestCreatedAt ? new Date(viewQuote.requestCreatedAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Garage Name</span>
              <p className="font-semibold">{(viewQuote as any).garageName || viewQuote.garage}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Garage Address</span>
              <p className="font-semibold">{(viewQuote as any).garageAddress || 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Customer Name</span>
              <p className="font-semibold">{viewQuote.customerName || 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Vehicle</span>
              <p className="font-semibold">
                {viewQuote.vehicle ? `${viewQuote.vehicle.make} ${viewQuote.vehicle.model} ${viewQuote.vehicle.year}` : 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="block font-bold text-slate-500 mb-1">Issue Description</span>
              <p className="bg-slate-50 p-3 rounded border border-slate-200">
                {viewQuote.requestIssueSummary || 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Labour Cost</span>
              <p className="font-semibold">{viewQuote.details?.labour ? formatCurrency(viewQuote.details.labour, viewQuote.currency) : 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Parts Cost</span>
              <p className="font-semibold">{viewQuote.details?.parts ? formatCurrency(viewQuote.details.parts, viewQuote.currency) : 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Other Charges</span>
              <p className="font-semibold">{viewQuote.details?.other ? formatCurrency(viewQuote.details.other, viewQuote.currency) : 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Total Amount</span>
              <p className="font-bold text-blue-700">{formatCurrency(viewQuote.price || (viewQuote as any).amount || (viewQuote as any).totalCost || 0, viewQuote.currency)}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Estimated Days</span>
              <p className="font-semibold">{viewQuote.time || 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Warranty</span>
              <p className="font-semibold">{viewQuote.metaSecondary || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <span className="block font-bold text-slate-500 mb-1">Garage Notes</span>
              <p className="bg-slate-50 p-3 rounded border border-slate-200">
                {viewQuote.details?.remarks || 'N/A'}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setViewQuote(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button 
              onClick={() => {
                const quoteToBook = viewQuote;
                setViewQuote(null);
                setBookingQuote(quoteToBook);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors"
            >
              Book Now
            </button>
          </div>
        </Modal>
      )}
      {viewDetailsQuote && (
        <Modal isOpen={true} onClose={() => setViewDetailsQuote(null)} title="Booking Details" className="max-w-2xl">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-700">
            <div>
              <span className="block font-bold text-slate-500 mb-1">Garage Name</span>
              <p className="font-semibold">{viewDetailsQuote.garage}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Customer Name</span>
              <p className="font-semibold">{viewDetailsQuote.customerName || 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Vehicle</span>
              <p className="font-semibold">
                {viewDetailsQuote.vehicle ? `${viewDetailsQuote.vehicle.make} ${viewDetailsQuote.vehicle.model} ${viewDetailsQuote.vehicle.year}` : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Vehicle Number / VIN</span>
              <p className="font-semibold">{viewDetailsQuote.vehicle?.vin || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <span className="block font-bold text-slate-500 mb-1">Issue Description</span>
              <p className="bg-slate-50 p-3 rounded border border-slate-200">
                {viewDetailsQuote.requestIssueSummary || 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Estimated Days</span>
              <p className="font-semibold">{viewDetailsQuote.time || 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Quote Amount</span>
              <p className="font-semibold text-blue-700">{viewDetailsQuote.price ? formatCurrency(viewDetailsQuote.price, viewDetailsQuote.currency) : 'N/A'}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Preferred Date</span>
              <p className="font-semibold">
                {viewDetailsQuote.bookingDetails?.scheduledAt ? new Date(viewDetailsQuote.bookingDetails.scheduledAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Preferred Time</span>
              <p className="font-semibold">
                {viewDetailsQuote.bookingDetails?.scheduledAt ? new Date(viewDetailsQuote.bookingDetails.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Booking Status</span>
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded uppercase">
                {viewDetailsQuote.bookingDetails?.status || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Booking Created Date</span>
              <p className="font-semibold">
                {viewDetailsQuote.bookingDetails?.createdAt ? new Date(viewDetailsQuote.bookingDetails.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setViewDetailsQuote(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}

export default QuotesPage;
