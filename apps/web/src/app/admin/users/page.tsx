'use client';
import { Card } from '@/components/common/card';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const [actionModal, setActionModal] = useState<{isOpen: boolean, id: string, action: string, type: 'confirm' | 'error', message: string}>({isOpen: false, id: '', action: '', type: 'confirm', message: ''});

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/users');
      setCustomers(data);
    } catch (err) {
      console.warn('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleViewDetails = async (id: string) => {
    setSelectedUser({ id, loading: true });
    setDetailsLoading(true);
    try {
      const data = await apiClient.get<any>(`/admin/users/${id}`);
      setSelectedUser(data);
    } catch (err) {
      console.error('Failed to load user details', err);
      setSelectedUser(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const confirmAction = () => {
    handleAction(actionModal.id, actionModal.action);
  };

  const filtered = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
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
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-[15%]">Name</th>
                <th className="p-4 font-semibold w-[20%]">Email</th>
                <th className="p-4 font-semibold w-[15%]">Phone</th>
                <th className="p-4 font-semibold w-[12%]">Vehicle</th>
                <th className="p-4 font-semibold w-[12%]">Created Date</th>
                <th className="p-4 font-semibold w-[16%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-500">No Records Found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 truncate">
                      <div className="flex items-center gap-2">
                        {c.name}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          c.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {c.status || 'active'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={c.email}>{c.email}</td>
                    <td className="p-4 text-sm text-slate-700 truncate">{c.phone || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700">{c.vehicles > 0 ? `${c.vehicles} Vehicle(s)` : 'None'}</td>
                    <td className="p-4 text-sm text-slate-700">{new Date(c.joined || c.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                       {c.status === 'suspended' ? (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'activate', type: 'confirm', message: 'Are you sure you want to unsuspend this customer?'})} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">Unsuspend</button>
                       ) : (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'suspend', type: 'confirm', message: 'Are you sure you want to suspend this customer?'})} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">Suspend</button>
                       )}
                       <button onClick={() => handleViewDetails(c.id)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">View Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={actionModal.isOpen && actionModal.type === 'confirm'} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title="Confirm Action" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">{actionModal.message}</p>
        <div className="flex justify-end gap-3">
           <button onClick={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
           <button onClick={confirmAction} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Confirm</button>
        </div>
      </Modal>
      
      <Modal isOpen={actionModal.isOpen && actionModal.type === 'error'} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title="Error" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">{actionModal.message}</p>
      </Modal>

      {/* Customer Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="Customer Profile" className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {selectedUser?.loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex-1">Loading customer profile...</div>
        ) : selectedUser && (
          <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
            
            {/* Header Section */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedUser.name}</h2>
                <div className="text-sm text-slate-600 space-x-4">
                  <span>{selectedUser.email}</span>
                  <span>{selectedUser.phone || 'No Phone'}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                 selectedUser.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
              }`}>
                 {selectedUser.status}
              </span>
            </div>

            {/* Vehicles */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b pb-1">Registered Vehicles</h3>
              {selectedUser.vehicles && selectedUser.vehicles.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedUser.vehicles.map((v: any) => (
                    <div key={v.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-800 text-sm">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</p>
                      <p className="text-xs text-slate-500 mt-1">VIN: {v.vin || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Plate: {v.plateNumber || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">No vehicles registered.</p>}
            </div>

            {/* Quotes */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b pb-1">Quote History</h3>
              {selectedUser.quotes && selectedUser.quotes.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Garage</th>
                      <th className="py-2 px-3 font-semibold">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.quotes.map((q: any) => (
                      <tr key={q.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-slate-700">{new Date(q.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-slate-700">{q.garageName || 'Unknown'}</td>
                        <td className="py-2 px-3 font-medium">{q.amount ? `${q.currency} ${q.amount}` : '-'}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 uppercase text-slate-600">{q.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-500">No quotes requested.</p>}
            </div>

            {/* Bookings */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b pb-1">Booking History</h3>
              {selectedUser.bookings && selectedUser.bookings.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Garage</th>
                      <th className="py-2 px-3 font-semibold">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.bookings.map((b: any) => (
                      <tr key={b.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-slate-700">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-slate-700">{b.garageName || 'Unknown'}</td>
                        <td className="py-2 px-3 font-medium">{b.amount ? `${b.currency} ${b.amount}` : '-'}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 uppercase text-slate-600">{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-500">No bookings made.</p>}
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
