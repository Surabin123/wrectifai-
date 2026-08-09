
'use client';
import { Card } from '@/components/common/card';
import { Search, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [errorModal, setErrorModal] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [actionModal, setActionModal] = useState<{isOpen: boolean, id: string, action: string, type: 'confirm' | 'error', message: string}>({isOpen: false, id: '', action: '', type: 'confirm', message: ''});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '',
    vehicleNumber: '', vehicleModel: '', vehicleBrand: '', vehicleType: '', status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/users');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
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
      await apiClient.post('/admin/users', formData);
      setIsAddModalOpen(false);
      loadData();
      setFormData({
        name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '',
        vehicleNumber: '', vehicleModel: '', vehicleBrand: '', vehicleType: '', status: 'active'
      });
    } catch (err) {
      setErrorModal({isOpen: true, message: 'Error creating customer'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await apiClient.post(`/admin/users/${id}/${action}`);
      setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''});
      loadData();
    } catch (err) {
      setActionModal({isOpen: true, id: '', action: '', type: 'error', message: `Failed to ${action} customer.`});
      console.error('Failed to update status', err);
    }
  };

  const confirmAction = () => {
    handleAction(actionModal.id, actionModal.action);
  };

  const filtered = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
         <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4"/> Add Customer
         </button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-1/5">Name</th>
                <th className="p-4 font-semibold w-1/5">Email</th>
                <th className="p-4 font-semibold w-1/5">Status</th>
                <th className="p-4 font-semibold w-1/5">Created Date</th>
                <th className="p-4 font-semibold w-1/5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">No Records Found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900">{c.name}</td>
                    <td className="p-4 text-sm text-slate-700">{c.email}</td>
                    <td className="p-4 text-sm text-slate-700">
                       <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                         c.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 
                         c.status === 'suspended' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                         'bg-red-50 text-red-700 border-red-100'
                       }`}>
                         {c.status}
                       </span>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{new Date(c.joined).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                       {c.status !== 'active' && (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'verify', type: 'confirm', message: 'Are you sure you want to verify this customer?'})} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Verify</button>
                       )}
                       {c.status !== 'rejected' && (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'reject', type: 'confirm', message: 'Are you sure you want to reject this customer?'})} className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">Reject</button>
                       )}
                       {c.status === 'suspended' && (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'activate', type: 'confirm', message: 'Are you sure you want to activate this customer?'})} className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Activate</button>
                       )}
                       {c.status === 'active' && (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'suspend', type: 'confirm', message: 'Are you sure you want to suspend this customer?'})} className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">Suspend</button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Customer">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
           <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-semibold mb-1">Name</label><input required className="w-full border rounded p-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Email</label><input required type="email" className="w-full border rounded p-2 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Phone</label><input className="w-full border rounded p-2 text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Status</label>
               <select className="w-full border rounded p-2 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                 <option value="active">Active</option>
                 <option value="suspended">Suspended</option>
               </select>
             </div>
           </div>
           
           <h3 className="text-sm font-bold border-b pb-1 mt-4">Address Details</h3>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2"><label className="block text-xs font-semibold mb-1">Address</label><input className="w-full border rounded p-2 text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">City</label><input className="w-full border rounded p-2 text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">State</label><input className="w-full border rounded p-2 text-sm" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Pincode</label><input className="w-full border rounded p-2 text-sm" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} /></div>
           </div>

           <h3 className="text-sm font-bold border-b pb-1 mt-4">Vehicle Details</h3>
           <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-semibold mb-1">Vehicle Number</label><input className="w-full border rounded p-2 text-sm" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Vehicle Brand</label><input className="w-full border rounded p-2 text-sm" value={formData.vehicleBrand} onChange={e => setFormData({...formData, vehicleBrand: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Vehicle Model</label><input className="w-full border rounded p-2 text-sm" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} /></div>
             <div><label className="block text-xs font-semibold mb-1">Vehicle Type</label><input className="w-full border rounded p-2 text-sm" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} /></div>
           </div>

           <div className="pt-4 flex gap-2">
             <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm font-bold">Cancel</button>
             <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-[#1a56db] rounded-lg hover:bg-[#174ec5]">
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </button>
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

      <Modal isOpen={actionModal.isOpen && actionModal.type === 'confirm'} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title="Confirm Action" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">{actionModal.message}</p>
        <div className="flex justify-end gap-3">
           <button onClick={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
           <button onClick={confirmAction} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Confirm</button>
        </div>
      </Modal>
      
      <Modal isOpen={actionModal.isOpen && actionModal.type === 'error'} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title="Error" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">{actionModal.message}</p>
        <div className="flex justify-end gap-3">
           <button onClick={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Close</button>
        </div>
      </Modal>
    </div>
  );
}
