'use client';
import { Card } from '@/components/common/card';
import { Search, Eye } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { formatCurrency } from '@/lib/currency';

function AdminServiceHistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/service-history').catch(() => []);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = history.filter(r => {
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
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by customer or garage name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
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
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Service History Details">
         <div className="space-y-4">
            {selectedJob ? (
               <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Customer Name</p>
                   <p className="font-semibold text-slate-900">{selectedJob.customerName || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Phone</p>
                   <p className="font-semibold text-slate-900">{selectedJob.customerPhone || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle</p>
                   <p className="font-semibold text-slate-900">{selectedJob.vehicleMake} {selectedJob.vehicleModel}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Completed Date</p>
                   <p className="font-semibold text-slate-900">{selectedJob.completedAt ? new Date(selectedJob.completedAt).toLocaleDateString() : 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Total Amount</p>
                   <p className="font-semibold text-slate-900">{formatCurrency(selectedJob.totalAmount || 0, selectedJob.currency)}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Payment Status</p>
                   <p className="font-semibold text-green-600">Paid / Completed</p>
                 </div>
                 <div className="space-y-1 col-span-2">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Service Details</p>
                   <p className="font-semibold text-slate-900">{selectedJob.details || 'N/A'}</p>
                 </div>
                 <div className="space-y-1 col-span-2">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Garage Details</p>
                   <p className="font-semibold text-slate-900">{selectedJob.garageName || 'Not Assigned'}</p>
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

export default function AdminServiceHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading...</div>}>
      <AdminServiceHistoryContent />
    </Suspense>
  );
}

