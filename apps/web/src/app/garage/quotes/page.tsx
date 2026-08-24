'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { useState, useEffect } from 'react';
import { getGarageIncomingRequests, QuoteRequestResponse, submitGarageQuote, fetchGarageQuotes, GarageQuote } from '@/lib/quotes-api';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';

export default function QuotesPage() {
  const [requests, setRequests] = useState<QuoteRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequestResponse | null>(null);
  
  // View Quote state
  const [viewDetailsQuote, setViewDetailsQuote] = useState<{request: QuoteRequestResponse, quote: GarageQuote} | null>(null);
  // Create Quote form states
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [labourCost, setLabourCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [consumablesCost, setConsumablesCost] = useState('');
  const [gstCost, setGstCost] = useState('');
  const [validityDays, setValidityDays] = useState('1');
  const [availability, setAvailability] = useState('');
  const [warranty, setWarranty] = useState('No Warranty');
  const [pickupDrop, setPickupDrop] = useState('Available');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getGarageIncomingRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load quote requests', err);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleViewQuote = async (req: QuoteRequestResponse) => {
    try {
      const quotes = await fetchGarageQuotes();
      const quote = quotes.find(q => q.quoteRequestId === req.id);
      if (quote) {
        setViewDetailsQuote({ request: req, quote });
      } else {
        console.error("Quote details not found");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await submitGarageQuote(selectedRequest.id, {
        labourCost: Number(labourCost || 0),
        partsCost: Number(partsCost || 0),
        consumablesCost: Number(consumablesCost || 0),
        gstCost: Number(gstCost || 0),
        estimatedTime,
        validityDays: Number(validityDays || 1),
        remarks,
        availability,
        warranty,
        pickupDrop
      });
      setShowQuoteForm(false);
      setSelectedRequest(null);
      // Reset form
      setLabourCost('');
      setPartsCost('');
      setConsumablesCost('');
      setGstCost('');
      setValidityDays('1');
      setAvailability('');
      setWarranty('No Warranty');
      setPickupDrop('Available');
      setEstimatedTime('');
      setRemarks('');
      localStorage.setItem('wrectifai_sync_quotes', Date.now().toString());
      // Dispatch Notifications
      const notifs = JSON.parse(localStorage.getItem('wrectifai_notifications') || '[]');
      notifs.unshift({ id: Date.now(), type: 'Quote', title: 'Quote Received', desc: `A garage has sent you a quote for your request.`, time: 'Just now', read: false, icon: 'FileText', color: 'text-purple-500', bg: 'bg-purple-50', audience: 'Customer' });
      notifs.unshift({ id: Date.now() + 1, type: 'Quote', title: 'Quote Sent', desc: `A garage has responded to a quote request.`, time: 'Just now', read: false, icon: 'FileText', color: 'text-purple-500', bg: 'bg-purple-50', audience: 'Garage' });
      localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
      window.dispatchEvent(new Event('notifications-updated'));
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h1 className="text-lg font-bold text-slate-800">Quote Requests</h1>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-4 font-bold text-slate-600 border-b">Quote ID</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Customer</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Vehicle</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Created</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Status</th>
                     <th className="p-4 font-bold text-slate-600 border-b text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">Loading records...</td>
                       </tr>
                   ) : requests.length === 0 ? (
                       <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">No records found.</td>
                       </tr>
                   ) : requests.map(req => (
                     <tr key={req.id} className="hover:bg-slate-50">
                       <td className="p-4 text-slate-800 font-medium">REQ-{req.id.substring(0,8).toUpperCase()}</td>
                       <td className="p-4 text-slate-700">{req.customerName || 'Customer'}</td>
                       <td className="p-4 text-slate-700">{req.vehicle?.make} {req.vehicle?.model} {req.vehicle?.year}</td>
                       <td className="p-4 text-slate-600">{formatTime(req.createdAt)}</td>
                        <td className="p-4 text-slate-600 uppercase text-xs font-bold">
                           {req.status === 'open' ? 'Pending Quote' : req.status === 'quoted' ? 'Quote Sent' : req.status === 'selected' ? 'Booked' : req.status}
                        </td>
                        <td className="p-4 text-center">
                          {req.status === 'open' && (
                            <button onClick={() => setSelectedRequest(req)} className="text-blue-600 font-bold hover:underline">View Details</button>
                          )}
                          {req.status === 'quoted' && (
                            <button onClick={() => handleViewQuote(req)} className="text-blue-600 font-bold hover:underline">View Quote</button>
                          )}
                          {req.status === 'selected' && (
                            <Link href="/garage/bookings" className="text-indigo-600 font-bold hover:underline">View Booking</Link>
                          )}
                          {req.status === 'completed' && (
                            <Link href="/garage/service-history" className="text-green-600 font-bold hover:underline">View History</Link>
                          )}
                          {req.status === 'expired' || req.status === 'cancelled' ? (
                             <span className="text-slate-400 font-bold">Cancelled</span>
                          ) : null}
                        </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* View Details Modal */}
        {selectedRequest && !showQuoteForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Quote Request Details</h2>
                <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-sm">
                <div>
                  <span className="font-bold text-slate-600">Customer:</span>
                  <p className="text-slate-800">{selectedRequest.customerName || 'Customer'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Vehicle:</span>
                  <p className="text-slate-800">{selectedRequest.vehicle?.make} {selectedRequest.vehicle?.model} {selectedRequest.vehicle?.year}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">VIN:</span>
                  <p className="text-slate-800">{selectedRequest.vehicle?.vin || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Diagnosis / Issues:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{selectedRequest.issueSummary || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Notes / Preferred Date:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{selectedRequest.preferredDate ? new Date(selectedRequest.preferredDate).toLocaleDateString() : 'No preferred date specified'}</p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-300 rounded text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button 
                  onClick={() => setShowQuoteForm(true)}
                  className="px-4 py-2 bg-blue-600 rounded text-sm font-bold text-white hover:bg-blue-700"
                >
                  Create Quote
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Quote Modal */}
        {selectedRequest && showQuoteForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Create Quote</h2>
                <button onClick={() => setShowQuoteForm(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              
              <form onSubmit={handleSendQuote} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-4 text-sm">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 font-bold rounded border border-red-200">
                      {errorMsg}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Labour Cost</label>
                      <input
                        type="number"
                        required
                        value={labourCost}
                        onChange={(e) => setLabourCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Parts Cost</label>
                      <input
                        type="number"
                        required
                        value={partsCost}
                        onChange={(e) => setPartsCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Consumables Cost</label>
                      <input
                        type="number"
                        required
                        value={consumablesCost}
                        onChange={(e) => setConsumablesCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">GST / Taxes</label>
                      <input
                        type="number"
                        required
                        value={gstCost}
                        onChange={(e) => setGstCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total (Auto)</label>
                    <input
                      type="number"
                      disabled
                      value={Number(labourCost || 0) + Number(partsCost || 0) + Number(consumablesCost || 0) + Number(gstCost || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-100 text-slate-700 font-bold"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Availability</label>
                      <input
                        type="text"
                        required
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        placeholder="e.g. Today, 6:00 PM"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pickup & Drop</label>
                      <select
                        value={pickupDrop}
                        onChange={(e) => setPickupDrop(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      >
                        <option value="Available">Available</option>
                        <option value="Not Available">Not Available</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Warranty</label>
                      <select
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      >
                        <option value="No Warranty">No Warranty</option>
                        <option value="1 Month">1 Month</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="1 Year">1 Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Estimated Days</label>
                      <input
                        type="number"
                        required
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        placeholder="e.g. 2"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Quote Validity (Days)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Details, exclusions, warranty info..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button 
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowQuoteForm(false)}
                    className="px-4 py-2 border border-slate-300 rounded text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 rounded text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Quote'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Sent Quote Modal */}
        {viewDetailsQuote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Sent Quote Details</h2>
                <button onClick={() => setViewDetailsQuote(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-sm">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-600 block">Customer Name:</span>
                    <p className="text-slate-800">{viewDetailsQuote.request.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Garage Name:</span>
                    <p className="text-slate-800">{(viewDetailsQuote.quote as any).garageName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Customer Phone:</span>
                    <p className="text-slate-800">{(viewDetailsQuote.quote as any).customerPhone || (viewDetailsQuote.request as any).customerPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Customer Email:</span>
                    <p className="text-slate-800">{(viewDetailsQuote.quote as any).customerEmail || (viewDetailsQuote.request as any).customerEmail || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-600 block">Vehicle:</span>
                    <p className="text-slate-800">{viewDetailsQuote.request.vehicle?.make} {viewDetailsQuote.request.vehicle?.model} {viewDetailsQuote.request.vehicle?.year}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Vehicle Number / VIN:</span>
                    <p className="text-slate-800">{viewDetailsQuote.request.vehicle?.vin || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Issue Description:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{viewDetailsQuote.request.issueSummary || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Garage Notes:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{viewDetailsQuote.quote.details?.remarks || 'None'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-600 block">Labour Cost:</span>
                    <span className="text-slate-800">{formatCurrency(viewDetailsQuote.quote.laborCost || 0, (viewDetailsQuote.quote as any).customerPhone || (viewDetailsQuote.request as any).customerPhone)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Parts Cost:</span>
                    <span className="text-slate-800">{formatCurrency(viewDetailsQuote.quote.partsCost || 0, (viewDetailsQuote.quote as any).customerPhone || (viewDetailsQuote.request as any).customerPhone)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Other Charges:</span>
                    <span className="text-slate-800">{formatCurrency(0, (viewDetailsQuote.quote as any).customerPhone || (viewDetailsQuote.request as any).customerPhone)}</span>
                  </div>
                  <div className="col-span-2 bg-slate-50 p-3 rounded mt-2 border border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Total Amount:</span>
                    <span className="font-bold text-blue-700 text-lg">{formatCurrency(viewDetailsQuote.quote.totalCost || 0, (viewDetailsQuote.quote as any).customerPhone || (viewDetailsQuote.request as any).customerPhone)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <span className="font-bold text-slate-600 block">Estimated Days:</span>
                    <span className="text-slate-800">{viewDetailsQuote.quote.etaNote || (viewDetailsQuote.quote.etaDays ? `${viewDetailsQuote.quote.etaDays} days` : 'N/A')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-600 block">Quote Created Date:</span>
                    <span className="text-slate-800">{formatTime(viewDetailsQuote.quote.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setViewDetailsQuote(null)}
                  className="px-4 py-2 bg-slate-200 rounded text-sm font-bold text-slate-700 hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </DashboardShell>
    </RoleGuard>
  );
}
