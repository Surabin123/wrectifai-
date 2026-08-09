
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
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '', garageId: '', vehicleId: '', serviceType: '', priority: 'Medium', description: '', preferredDate: '', status: 'pending'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const filters = ['All', 'Pending', 'Quoted', 'In Progress', 'Completed', 'Cancelled'];

  useEffect(() => {
    if (filterParam) {
      const matchedFilter = filters.find(f => f.toLowerCase() === filterParam.toLowerCase());
      if (matchedFilter) setActiveFilter(matchedFilter);
    }
  }, [filterParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/service-requests', formData);
      setIsAddModalOpen(false);
      loadData();
      setFormData({customerId: '', garageId: '', vehicleId: '', serviceType: '', priority: 'Medium', description: '', preferredDate: '', status: 'pending'});
    } catch (err) {
      console.error('Error creating request', err);
    } finally {
      setIsSubmitting(false);
    }
  };



  const filtered = requests.filter(r => {
    if (activeFilter !== 'All') {
      const dbStatus = r.status?.toLowerCase() || '';
      const filterLower = activeFilter.toLowerCase();
      
      if (filterLower === 'payment pending') {
        if (dbStatus !== 'pendingpayment') return false;
      } else if (filterLower === 'in progress') {
        if (dbStatus !== 'inservice' && dbStatus !== 'inprogress') return false;
      } else if (filterLower === 'booked') {
        if (dbStatus !== 'confirmed' && dbStatus !== 'booked') return false;
      } else {
        if (dbStatus !== filterLower) return false;
      }
    }
    
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.customerName?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
         <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            New Service Request
         </button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
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
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-1/4">Request ID</th>
                <th className="p-4 font-semibold w-1/4">Customer</th>
                <th className="p-4 font-semibold w-1/4">Status</th>
                <th className="p-4 font-semibold w-1/4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">No Records Found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} onClick={() => { setSelectedRequest(r); setIsModalOpen(true); }} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900">{r.id.substring(0,8)}</td>
                    <td className="p-4 text-sm text-slate-700">{r.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700">{formatAdminStatus(r.status)}</td>
                    <td className="p-4 text-right">
                       <button className="text-slate-400 hover:text-blue-600 px-2"><Eye className="w-4 h-4 inline"/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* View Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Service Request Details">
         <div className="space-y-4">
            {selectedRequest ? (
               <div className="text-sm text-slate-600 space-y-2">
                 <p><strong>ID:</strong> {selectedRequest.id}</p>
                 <p><strong>Customer:</strong> {selectedRequest.customerName || 'N/A'}</p>
                 <p><strong>Status:</strong> {formatAdminStatus(selectedRequest.status)}</p>
                 <p><strong>Details:</strong> {selectedRequest.details || 'N/A'}</p>
               </div>
            ) : <p>Loading...</p>}
            <button onClick={() => setIsModalOpen(false)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Close</button>
         </div>
      </Modal>

      {/* Add Request Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Service Request">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
           <div className="grid grid-cols-1 gap-4">
             <div><label className="block text-xs font-semibold mb-1">Customer ID (Optional)</label><input className="w-full border rounded p-2 text-sm" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Garage ID (Optional)</label><input className="w-full border rounded p-2 text-sm" value={formData.garageId} onChange={e => setFormData({...formData, garageId: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Vehicle ID (Optional)</label><input className="w-full border rounded p-2 text-sm" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Service Type</label><input className="w-full border rounded p-2 text-sm" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Priority</label>
               <select className="w-full border rounded p-2 text-sm" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                 <option>Low</option>
                 <option>Medium</option>
                 <option>High</option>
               </select>
             </div>
             <div><label className="block text-xs font-semibold mb-1">Preferred Date</label><input type="date" className="w-full border rounded p-2 text-sm" value={formData.preferredDate} onChange={e => setFormData({...formData, preferredDate: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Description</label><textarea className="w-full border rounded p-2 text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
           </div>

           <div className="pt-4 flex gap-2">
             <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm font-bold">Cancel</button>
             <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{isSubmitting ? 'Saving...' : 'Create Request'}</button>
           </div>
        </form>
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
