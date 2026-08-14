'use client';
import { Card } from '@/components/common/card';
import { Search, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { formatAdminStatus } from '@/utils/admin-status';
import { formatCurrency } from '@/lib/currency';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/bookings').catch(() => []);
      setBookings(data);
    } catch (err) {
      console.warn('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statuses = ['All', 'pending', 'confirmed', 'completed', 'cancelled', 'in-progress'];

  const filteredBookings = bookings.filter(b => {
    if (activeFilter !== 'All') {
      const f = activeFilter.toLowerCase();
      const s = (b.status || '').toLowerCase();
      let match = false;
      if (f === 'pending' && (s === 'pending' || s === 'pendingpayment')) match = true;
      else if (f === 'confirmed' && (s === 'confirmed' || s === 'accepted')) match = true;
      else if (f === 'in-progress' && s === 'in_progress') match = true;
      else if (f === s) match = true;
      if (!match) return false;
    }
    
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.customerName?.toLowerCase().includes(q) || b.garageName?.toLowerCase().includes(q) || b.customerPhone?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by customer or garage..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            {statuses.map(s => (
              <button 
                key={s}
                onClick={() => { setActiveFilter(s); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${activeFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-[20%]">Customer</th>
                <th className="p-4 font-semibold w-[20%]">Garage</th>
                <th className="p-4 font-semibold w-[30%]">Issue Description</th>
                <th className="p-4 font-semibold w-[15%]">Status</th>
                <th className="p-4 font-semibold w-[15%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : paginatedBookings.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">No Records Found</td></tr>
              ) : (
                paginatedBookings.map((b, i) => (
                  <tr key={i} onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 truncate" title={b.customerName}>{b.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={b.garageName}>{b.garageName || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={b.issueDescription}>{b.issueDescription || 'No description provided.'}</td>
                    <td className="p-4 text-sm text-slate-700">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        b.status === 'confirmed' || b.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        b.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                        b.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {formatAdminStatus(b.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-slate-100 rounded text-sm disabled:opacity-50">Prev</button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-slate-100 rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Booking Details" className="max-w-2xl">
         <div className="space-y-4">
             {selectedBooking ? (
               <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">

                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Payment Status</p>
                   <p className="font-semibold text-slate-900 uppercase">{selectedBooking.paymentStatus || 'UNPAID'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Customer Name</p>
                   <p className="font-semibold text-slate-900">{selectedBooking.customerName || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Customer Email / Phone</p>
                   <p className="font-semibold text-slate-900">{selectedBooking.customerEmail || selectedBooking.customerPhone || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">City / Address</p>
                   <p className="font-semibold text-slate-900">N/A</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Garage Details</p>
                   <p className="font-semibold text-slate-900">{selectedBooking.garageName || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle (VIN / Plate)</p>
                   <p className="font-semibold text-slate-900">{selectedBooking.vehicleMake || 'N/A'} {selectedBooking.vehicleModel || ''} ({selectedBooking.vin || 'N/A'})</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Scheduled Date & Time</p>
                   <p className="font-semibold text-slate-900">
                     {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : 'N/A'}
                     {' '}
                     {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}) : ''}
                   </p>
                 </div>
                 <div className="space-y-1 col-span-2">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Estimated Days</p>
                   <p className="font-semibold text-slate-900">{selectedBooking.estimatedDays || 'N/A'}</p>
                 </div>
                 <div className="space-y-1 col-span-2">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Issue Description</p>
                   <p className="font-semibold text-slate-900">{selectedBooking.issueDescription || 'No description provided.'}</p>
                 </div>

                 <div className="space-y-1 col-span-2 text-lg border-t pt-3 mt-1 font-bold text-[#17307a]">
                   Total Amount: {formatCurrency(selectedBooking.totalAmount || 0, selectedBooking.currency || 'USD')}
                 </div>
               </div>
            ) : <p>Loading...</p>}
            <div className="pt-2">
               <button onClick={() => setIsModalOpen(false)} className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Close Details</button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
