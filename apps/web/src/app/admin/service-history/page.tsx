'use client';
import { Card } from '@/components/common/card';
import { Search, Eye } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { SharedBookingDetailsModal } from '@/components/bookings/SharedBookingDetailsModal';
import { formatCurrency } from '@/lib/currency';

function AdminServiceHistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);
      if (searchQuery) queryParams.append('search', searchQuery);

      const data = await apiClient.get<any[]>(`/admin/service-history?${queryParams.toString()}`).catch(() => []);
      
      const mappedBookings = data.map((b: any) => ({
        ...b,
        completedAt: b.completedAt || b.createdAt
      }));
      setHistory(mappedBookings);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFrom, dateTo]);

  const filtered = history.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (dateFrom && new Date(r.completedAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(r.completedAt) > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.customerName?.toLowerCase().includes(q) || r.customerPhone?.toLowerCase().includes(q) || r.garageName?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Service History</h1>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by customer or garage name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-slate-600">Date Range:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-1.5 text-xs border rounded-lg text-slate-700 outline-none focus:border-blue-500" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-1.5 text-xs border rounded-lg text-slate-700 outline-none focus:border-blue-500" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs font-semibold text-blue-600 hover:underline">Clear Dates</button>
            )}
            
            <div className="ml-4 flex gap-2 border-l pl-4">
               {['All', 'completed', 'readyForCollection', 'collected'].map(mode => (
                 <button 
                   key={mode}
                   onClick={() => setStatusFilter(mode)}
                   className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${statusFilter === mode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                 >
                   {mode === 'All' ? 'All Statuses' : mode.replace(/([A-Z])/g, ' $1').trim()}
                 </button>
               ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-[20%]">Customer</th>
                <th className="p-4 font-semibold w-[25%]">Service Details</th>
                <th className="p-4 font-semibold w-[20%]">Garage</th>
                <th className="p-4 font-semibold w-[15%]">Total Amount</th>
                <th className="p-4 font-semibold w-[20%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">No Records Found.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={i} onClick={() => { setSelectedJob(r); setIsModalOpen(true); }} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 truncate" title={r.customerName}>{r.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={r.details}>{r.details || 'General Service'}</td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={r.garageName}>{r.garageName || 'Not Assigned'}</td>
                    <td className="p-4 text-sm font-bold text-[#17307a]">
                      {formatCurrency(r.totalAmount || 0, r.currency)}
                    </td>
                    <td className="p-4 text-right">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedJob(r); setIsModalOpen(true); }} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">View Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && selectedJob && (
        <SharedBookingDetailsModal
          booking={{
            id: selectedJob.id,
            customerName: selectedJob.customerName,
            customerPhone: selectedJob.customerPhone,
            garageName: selectedJob.garageName,
            vehicleMake: selectedJob.vehicleMake,
            vehicleModel: selectedJob.vehicleModel,
            issueDescription: selectedJob.details,
            totalAmount: selectedJob.totalAmount,
            currency: selectedJob.currency,
            createdAt: selectedJob.completedAt,
            status: 'completed',
            paymentStatus: 'PAID'
          }}
          onClose={() => setIsModalOpen(false)}
          userRole="admin"
        />
      )}
    </div>
  );
}

export default function AdminServiceHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading...</div>}>
      <AdminServiceHistoryContent />
    </Suspense>
  );
}

