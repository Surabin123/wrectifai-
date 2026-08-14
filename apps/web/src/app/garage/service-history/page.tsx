
'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Eye, Download } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { fetchGarageCompletedJobs, GarageCompletedJob } from '@/lib/quotes-api';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';

export default function ServiceHistoryPage() {
  const [history, setHistory] = useState<GarageCompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!selectedBookingId) {
      setBookingDetails(null);
      return;
    }
    let active = true;
    setDetailsLoading(true);
    apiClient.get(`/bookings/${selectedBookingId}`)
      .then(res => {
        if (active) setBookingDetails(res);
      })
      .catch(err => console.error('Failed to fetch booking details', err))
      .finally(() => {
        if (active) setDetailsLoading(false);
      });
    return () => { active = false; };
  }, [selectedBookingId]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchGarageCompletedJobs();
        setHistory(data || []);
      } catch (err) {
        console.error('Failed to load completed jobs', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredHistory = history.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (h.customerName || '').toLowerCase().includes(q) ||
      (h.vehicleMake || '').toLowerCase().includes(q) ||
      (h.vehicleModel || '').toLowerCase().includes(q) ||
      (h.id || '').toLowerCase().includes(q) ||
      (h.issueSummary || '').toLowerCase().includes(q)
    );
  });

  const totalServices = filteredHistory.length;
  const completedServices = filteredHistory.filter(h => h.bookingStatus === 'completed').length;
  
  const formatTime = (isoString: string) => {
    if (!isoString) return { date: '', time: '' };
    const date = new Date(isoString);
    return {
       date: date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
       time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Service History</h1>
                 <p className="text-sm text-slate-500">Complete history of services performed for your customers.</p>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search by customer, vehicle, invoice..." 
                   className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" 
                 />
               </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-[11px] font-bold text-slate-500 border-b">Job ID</th>
                     <th className="p-4 text-[11px] font-bold text-slate-500 border-b">Customer & Vehicle</th>
                     <th className="p-4 text-[11px] font-bold text-slate-500 border-b">Service Details</th>
                     <th className="p-4 text-[11px] font-bold text-slate-500 border-b">Amount</th>
                     <th className="p-4 text-[11px] font-bold text-slate-500 border-b">Date</th>
                     <th className="p-4 text-[11px] font-bold text-slate-500 border-b text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Loading service history...</td>
                       </tr>
                   ) : filteredHistory.length === 0 ? (
                       <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">No service history found.</td>
                       </tr>
                   ) : filteredHistory.map(h => (
                     <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4 align-top"><p className="text-xs font-bold text-blue-600">JOB-{h.id.substring(0,8).toUpperCase()}</p></td>
                       <td className="p-4 align-top">
                          <div className="flex items-start gap-2">
                             <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mt-1">{h.customerName ? h.customerName.substring(0,2).toUpperCase() : 'CU'}</div>
                             <div>
                               <p className="text-sm font-bold text-[#17307a]">{h.customerName}</p>
                               <p className="text-[11px] font-medium text-slate-700">{h.vehicleMake} {h.vehicleModel}</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-4 align-top"><p className="text-xs font-bold text-slate-700">{h.issueSummary}</p></td>
                       <td className="p-4 align-top text-xs font-bold text-[#17307a]">{(h as any).currency || 'USD'} {h.quoteAmount}</td>
                       <td className="p-4 align-top text-[10px] text-slate-500"><p>{formatTime(h.completionDate).date}</p><p>{formatTime(h.completionDate).time}</p></td>
                       <td className="p-4 align-top text-right">
                         <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600 mb-3 text-center">Completed</span>
                         <div className="flex justify-end gap-2"><button onClick={() => setSelectedBookingId(h.id)} className="text-blue-500 hover:text-blue-700 p-1 text-xs font-bold">View Details</button></div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
          
          <div className="w-72 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#17307a]">Service Summary</h3>
                 <span className="text-[10px] font-bold text-slate-500 border px-2 py-1 rounded bg-slate-50">All Time</span>
               </div>
               <div className="space-y-4 text-sm font-bold text-slate-700">
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-100 flex justify-center items-center text-slate-400 text-[10px]">#</div> Total Services</span> <span>{totalServices}</span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-100 flex justify-center items-center text-green-500 text-[10px]">✓</div> Completed</span> <span>{completedServices}</span></div>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>

      {selectedBookingId && (
        <Modal isOpen={true} onClose={() => setSelectedBookingId(null)} title="Booking Details" className="max-w-lg">
          {detailsLoading ? (
             <div className="p-8 text-center text-sm font-semibold text-slate-500">Loading details...</div>
          ) : bookingDetails ? (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-bold">Booking ID:</span> JOB-{bookingDetails.id.substring(0,8).toUpperCase()}</div>
                <div><span className="font-bold">Status:</span> {bookingDetails.status}</div>
                <div><span className="font-bold">Customer Name:</span> {bookingDetails.customerName || 'N/A'}</div>
                <div><span className="font-bold">Garage:</span> {bookingDetails.garageName}</div>
                <div><span className="font-bold">Vehicle:</span> {bookingDetails.vehicleMake} {bookingDetails.vehicleModel}</div>
                <div><span className="font-bold">Quote Amount:</span> {(bookingDetails as any).currency || 'USD'} {bookingDetails.totalAmount}</div>
                <div><span className="font-bold">Appointment:</span> {new Date(bookingDetails.scheduledAt).toLocaleString()}</div>
                <div><span className="font-bold">Completion Date:</span> {new Date(bookingDetails.updatedAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="font-bold block mb-1">Issue Description:</span>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                   {bookingDetails.bookingType === 'quoteBased' ? bookingDetails.issueDescription || bookingDetails.issueSummary || bookingDetails.serviceType || 'N/A' : bookingDetails.bookingType}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setSelectedBookingId(null)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm font-semibold text-red-500">Failed to load booking details</div>
          )}
        </Modal>
      )}
    </RoleGuard>
  );
}
