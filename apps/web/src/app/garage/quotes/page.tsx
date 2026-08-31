'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { useState, useEffect } from 'react';
import { fetchGarageQuotes, GarageQuote } from '@/lib/quotes-api';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<GarageQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<GarageQuote | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchGarageQuotes();
      setQuotes(data || []);
    } catch (err) {
      console.error('Failed to load garage quotes', err);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h1 className="text-lg font-bold text-slate-800">Generated Quotes</h1>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-4 font-bold text-slate-600 border-b">Customer</th>
                      <th className="p-4 font-bold text-slate-600 border-b">Vehicle</th>
                      <th className="p-4 font-bold text-slate-600 border-b">Created</th>
                      <th className="p-4 font-bold text-slate-600 border-b">Quote Amount</th>
                      <th className="p-4 font-bold text-slate-600 border-b text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                           <td colSpan={5} className="p-8 text-center text-slate-500">Loading records...</td>
                        </tr>
                    ) : quotes.length === 0 ? (
                        <tr>
                           <td colSpan={5} className="p-8 text-center text-slate-500">No quotes generated yet.</td>
                        </tr>
                    ) : quotes.map(quote => (
                      <tr key={quote.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-700">{quote.customerName || 'Customer'}</td>
                        <td className="p-4 text-slate-700">{quote.vehicleMake} {quote.vehicleModel} {quote.vehicleYear}</td>
                       <td className="p-4 text-slate-600">{formatTime(quote.createdAt)}</td>
                       <td className="p-4 text-slate-700 font-bold text-blue-700">
                          {formatCurrency(quote.totalCost, undefined)}
                       </td>
                        <td className="p-4 text-center">
                          <button onClick={() => setSelectedQuote(quote)} className="text-blue-600 font-bold hover:underline">View Quote</button>
                        </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* View Sent Quote Modal */}
        {selectedQuote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Sent Quote Details</h2>
                <button onClick={() => setSelectedQuote(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-sm">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-600 block">Customer Name:</span>
                    <p className="text-slate-800">{selectedQuote.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Vehicle:</span>
                    <p className="text-slate-800">{selectedQuote.vehicleMake} {selectedQuote.vehicleModel} {selectedQuote.vehicleYear}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Issue Description:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{selectedQuote.issueSummary || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block">Garage Notes:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{selectedQuote.details?.remarks || 'None'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-600 block">Labour Cost:</span>
                    <span className="text-slate-800">{formatCurrency(selectedQuote.laborCost || 0, undefined)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Parts Cost:</span>
                    <span className="text-slate-800">{formatCurrency(selectedQuote.partsCost || 0, undefined)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block">Other Charges:</span>
                    <span className="text-slate-800">{formatCurrency((selectedQuote.details?.consumablesCost || 0) + (selectedQuote.details?.gstCost || 0) + (selectedQuote.details?.otherCost || 0), undefined)}</span>
                  </div>
                  <div className="col-span-2 bg-slate-50 p-3 rounded mt-2 border border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Total Amount:</span>
                    <span className="font-bold text-blue-700 text-lg">{formatCurrency(selectedQuote.totalCost || 0, undefined)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <span className="font-bold text-slate-600 block">Estimated Days:</span>
                    <span className="text-slate-800">{selectedQuote.etaNote || (selectedQuote.etaDays ? `${selectedQuote.etaDays} days` : 'N/A')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-600 block">Quote Created Date:</span>
                    <span className="text-slate-800">{formatTime(selectedQuote.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setSelectedQuote(null)}
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
