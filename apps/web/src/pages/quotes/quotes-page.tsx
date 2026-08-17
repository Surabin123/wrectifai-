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
  const [activeTab, setActiveTab] = useState('All Quotes');

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

        <div className="flex flex-wrap items-center gap-2 mt-4 mb-6">
          {['All Quotes', 'New', 'Viewed'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === tab ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-8 text-center text-slate-500">Loading quotes...</div>
          ) : quotes.filter(q => q.status !== 'expired' && q.status !== 'cancelled').filter(q => activeTab === 'All Quotes' || (activeTab === 'New' ? q.status === 'quoted' && !q.isBooked : q.status !== 'quoted')).length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500">No quotes found for this filter.</div>
          ) : quotes.filter(q => q.status !== 'expired' && q.status !== 'cancelled').filter(q => activeTab === 'All Quotes' || (activeTab === 'New' ? q.status === 'quoted' && !q.isBooked : q.status !== 'quoted')).map((quote) => (
            <div key={quote.id} className="bg-white rounded-[16px] shadow-sm border border-slate-200 p-5 flex flex-col hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{(quote as any).garageName || quote.garage}</h3>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Response Time: {quote.time || '30 mins'}</div>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {formatStatus(quote.status)}
                </span>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-semibold mb-0.5">Total Amount</div>
                  <div className="font-bold text-slate-800 text-xl">{formatCurrency(quote.price || (quote as any).amount || (quote as any).totalCost || 0, quote.currency)}</div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!quote.isBooked && quote.status !== 'rejected' && quote.status !== 'cancelled' && (
                    <button
                      onClick={() => setViewQuote(quote)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                    >
                      View
                    </button>
                  )}
                  {quote.isBooked && (
                    <>
                      <span className="text-emerald-600 font-bold text-sm px-3 py-2 bg-emerald-50 rounded-lg">Booked</span>
                      <button
                        onClick={() => setViewDetailsQuote(quote)}
                        className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
                      >
                        Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
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
