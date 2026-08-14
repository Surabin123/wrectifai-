'use client';
import { Card } from '@/components/common/card';
import { Search, Eye } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { formatAdminStatus } from '@/utils/admin-status';
import { useSearchParams } from 'next/navigation';

function AdminServiceRequestsContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams?.get('filter');
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/service-requests').catch(() => []);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filters = ['All', 'Completed', 'Cancelled'];

  useEffect(() => {
    if (filterParam) {
      const matchedFilter = filters.find(f => f.toLowerCase() === filterParam.toLowerCase());
      if (matchedFilter) setActiveFilter(matchedFilter);
    }
  }, [filterParam]);

  const filtered = requests.filter(r => {
    if (activeFilter !== 'All') {
      const statusMatch = (r.status || '').toLowerCase() === activeFilter.toLowerCase();
      if (!statusMatch) return false;
    }
    
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.customerName?.toLowerCase().includes(q) || r.customerPhone?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by customer name or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeFilter === f ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-[20%]">Customer</th>
                <th className="p-4 font-semibold w-[30%]">Customer Quote</th>
                <th className="p-4 font-semibold w-[20%]">Garage</th>
                <th className="p-4 font-semibold w-[15%]">Payment Status</th>
                <th className="p-4 font-semibold w-[15%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">No Records Found.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={i} onClick={() => { setSelectedRequest(r); setIsModalOpen(true); }} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 truncate" title={r.customerName}>{r.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={r.details}>{r.details || 'General Service'}</td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={r.garageName}>{r.garageName || 'Not Assigned'}</td>
                    <td className="p-4 text-sm text-slate-700">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border bg-orange-50 text-orange-700 border-orange-100`}>
                        UNPAID
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
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Service Request Details">
         <div className="space-y-4">
            {selectedRequest ? (
               <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Customer Name</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.customerName || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Phone</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.customerPhone || 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Address / City</p>
                   <p className="font-semibold text-slate-900">N/A</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Created Date</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Preferred Time / Date</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.preferredDate ? new Date(selectedRequest.preferredDate).toLocaleDateString() : 'N/A'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Payment Status</p>
                   <p className="font-semibold text-slate-900">Unpaid</p>
                 </div>
                 <div className="space-y-1 col-span-2">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Customer Quote / Issue Details</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.details || 'N/A'}</p>
                 </div>
                 <div className="space-y-1 col-span-2">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Garage Details</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.garageName || 'Not Assigned'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Booking Time</p>
                   <p className="font-semibold text-slate-900">{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
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

export default function AdminServiceRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading...</div>}>
      <AdminServiceRequestsContent />
    </Suspense>
  );
}
