'use client';
import { Card } from '@/components/common/card';
import { Search, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { formatAdminStatus } from '@/utils/admin-status';
import { formatCurrency } from '@/lib/currency';

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [formData, setFormData] = useState({ customerId: '', garageId: '', amount: '', status: 'pending' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/quotes').catch(() => []);
      setQuotes(data);
    } catch (err) {
      console.error('Failed to load quotes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/quotes', formData);
      setIsAddModalOpen(false);
      loadData();
      setFormData({ customerId: '', garageId: '', amount: '', status: 'pending' });
    } catch (err) {
      setErrorModal({isOpen: true, message: 'Error creating quote'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const statuses = ['All', 'pending', 'accepted', 'rejected', 'expired'];

  const filteredQuotes = quotes.filter(q => {
    if (activeFilter !== 'All' && q.status?.toLowerCase() !== activeFilter.toLowerCase()) return false;
    
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return q.id?.toLowerCase().includes(s) || q.customerName?.toLowerCase().includes(s) || q.garageName?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage) || 1;
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          New Quote
        </button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search quotes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
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
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-1/4">Quote ID</th>
                <th className="p-4 font-semibold w-1/4">Customer</th>
                <th className="p-4 font-semibold w-1/4">Garage</th>
                <th className="p-4 font-semibold w-1/4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : paginatedQuotes.length === 0 ? (
                 <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">No Records Found</td></tr>
              ) : (
                paginatedQuotes.map((q) => (
                  <tr key={q.id} onClick={() => { setSelectedQuote(q); setIsModalOpen(true); }} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900">{q.id.substring(0,8)}</td>
                    <td className="p-4 text-sm text-slate-700">{q.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700">{q.garageName || 'N/A'}</td>
                    <td className="p-4 text-right">
                       <button className="text-slate-400 hover:text-blue-600 px-2"><Eye className="w-4 h-4 inline"/></button>
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
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Quote Details">
         <div className="space-y-4">
            {selectedQuote ? (
               <div className="text-sm text-slate-600 space-y-2">
                 <div className="grid grid-cols-2 gap-4">
                   <p><strong>Quote ID:</strong> {selectedQuote.id}</p>
                   <p><strong>Status:</strong> <span className="capitalize">{formatAdminStatus(selectedQuote.status)}</span></p>
                   <p><strong>Customer:</strong> {selectedQuote.customerName || 'N/A'}</p>
                   <p><strong>Garage:</strong> {selectedQuote.garageName || 'N/A'}</p>
                   <p><strong>Created At:</strong> {selectedQuote.createdAt ? new Date(selectedQuote.createdAt).toLocaleDateString() : 'N/A'}</p>
                   <p><strong>Estimated Days:</strong> {selectedQuote.estimatedDays || 'N/A'}</p>
                   
                   <p className="col-span-2 border-t pt-2 mt-2"></p>
                   
                   <p><strong>Vehicle:</strong> {selectedQuote.vehicleMake || 'N/A'} {selectedQuote.vehicleModel || ''}</p>
                   <p><strong>VIN / Plate:</strong> {selectedQuote.vin || 'N/A'}</p>
                   <p><strong>Preferred Date:</strong> {selectedQuote.preferredDate ? new Date(selectedQuote.preferredDate).toLocaleDateString() : 'N/A'}</p>
                   <p><strong>Preferred Time:</strong> {selectedQuote.preferredTime || 'N/A'}</p>
                   
                   <p className="col-span-2 mt-2"><strong>Issue Description:</strong> <br/><span className="text-sm text-slate-600">{selectedQuote.issueDescription || 'No description provided.'}</span></p>

                   <p className="col-span-2 text-lg border-t pt-3 mt-1 font-bold text-[#17307a]">
                     Total Amount: {formatCurrency(selectedQuote.totalAmount || 0, selectedQuote.customerPhone)}
                   </p>
                 </div>
               </div>
            ) : <p>Loading...</p>}
            <button onClick={() => setIsModalOpen(false)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Close</button>
         </div>
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Quote">
        <form onSubmit={handleSubmit} className="space-y-4 px-2">
           <div className="grid grid-cols-1 gap-4">
             <div><label className="block text-xs font-semibold mb-1">Customer ID (Optional)</label><input className="w-full border rounded p-2 text-sm" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Garage ID (Optional)</label><input className="w-full border rounded p-2 text-sm" value={formData.garageId} onChange={e => setFormData({...formData, garageId: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Amount</label><input type="number" className="w-full border rounded p-2 text-sm" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Status</label>
               <select className="w-full border rounded p-2 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                 <option>pending</option>
                 <option>accepted</option>
                 <option>rejected</option>
               </select>
             </div>
           </div>
           <div className="pt-4 flex gap-2">
             <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm font-bold">Cancel</button>
             <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{isSubmitting ? 'Saving...' : 'Create Quote'}</button>
           </div>
        </form>
      </Modal>

      <Modal isOpen={errorModal.isOpen} onClose={() => setErrorModal({isOpen: false, message: ''})} title="Error">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{errorModal.message}</p>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button onClick={() => setErrorModal({isOpen: false, message: ''})} className="px-4 py-2 text-sm font-medium text-white bg-[#1a56db] rounded-lg hover:bg-[#174ec5]">
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
