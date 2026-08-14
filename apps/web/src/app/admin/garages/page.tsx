'use client';
import { Card } from '@/components/common/card';
import { Search, Plus, Eye, CheckCircle2, PauseCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

export default function AllGaragesPage() {
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [actionModal, setActionModal] = useState<{isOpen: boolean, id: string, action: string}>({isOpen: false, id: '', action: ''});

  const loadData = async () => {
    setLoading(true);
    try {
      const garagesData = await apiClient.get<any[]>('/admin/onboarding/garages');
      setGarages(garagesData);
    } catch (err) {
      console.error('Failed to load garages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (id: string, action: string) => {
    try {
      await apiClient.post(`/admin/onboarding/garages/${id}/${action}`, {});
      await loadData();
      if (selectedGarage && selectedGarage.id === id) {
        setSelectedGarage(null);
      }
      setActionModal({isOpen: false, id: '', action: ''});
    } catch (err) {
      console.error('Failed to update garage', err);
    }
  };

  const totalGarages = garages.length;
  const activeGarages = garages.filter(g => g.approvalStatus === 'active').length;
  const inactiveGarages = garages.filter(g => g.approvalStatus === 'inactive').length;

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#17307a] mb-1">All Garages</h1>
           <p className="text-sm text-slate-500">Dashboard &gt; Garage Management &gt; All Garages</p>
        </div>
        <Link href="/admin/garages/register" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4"/> Register Garage</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-white border border-blue-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><div className="text-xl font-bold">G</div></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Total Garages</p>
            <p className="text-2xl font-black text-[#17307a]">{loading ? '-' : totalGarages}</p>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-green-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6"/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Active Garages</p>
            <p className="text-2xl font-black text-[#17307a]">{loading ? '-' : activeGarages}</p>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-orange-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><PauseCircle className="w-6 h-6"/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Inactive Garages</p>
            <p className="text-2xl font-black text-[#17307a]">{loading ? '-' : inactiveGarages}</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
           <div className="relative w-80">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
             <input type="text" placeholder="Search by garage name, owner, email or phone..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500" />
           </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-4 text-xs font-bold text-slate-500">Garage Name</th>
              <th className="p-4 text-xs font-bold text-slate-500">Owner</th>
              <th className="p-4 text-xs font-bold text-slate-500">City</th>
              <th className="p-4 text-xs font-bold text-slate-500">Status</th>
              <th className="p-4 text-xs font-bold text-slate-500">Joined Date</th>
              <th className="p-4 text-xs font-bold text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Loading garages...</td>
                </tr>
            ) : garages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">No garages registered yet.</td>
                </tr>
            ) : (
                garages.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 bg-white transition-colors">
                    <td className="p-4">
                        <p className="text-sm font-bold text-[#17307a] leading-tight">{g.name}</p>
                    </td>
                    <td className="p-4">
                        <p className="text-xs font-bold text-[#17307a] leading-tight">{g.ownerName || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-xs text-slate-600">{g.city || 'N/A'}</td>
                    <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${g.approvalStatus === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {g.approvalStatus === 'inactive' ? 'INACTIVE' : (g.approvalStatus || 'Unknown')}
                    </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600">{formatTime(g.createdAt)}</td>
                    <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end items-center">
                        <button onClick={() => setSelectedGarage(g)} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-500 border border-slate-200 bg-white"><Eye className="w-3.5 h-3.5"/></button>
                        {g.approvalStatus === 'active' && (
                          <button onClick={() => setActionModal({isOpen: true, id: g.id, action: 'suspend'})} className="text-[10px] bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 font-bold transition-colors">Suspend</button>
                        )}
                        {g.approvalStatus === 'inactive' && (
                          <button onClick={() => setActionModal({isOpen: true, id: g.id, action: 'activate'})} className="text-[10px] bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 font-bold transition-colors">Make Active</button>
                        )}
                    </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={!!selectedGarage} onClose={() => setSelectedGarage(null)} title="Garage Details" className="max-w-2xl">
        {selectedGarage && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Garage Name</p>
                <p className="text-sm font-semibold text-slate-900">{selectedGarage.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Owner Name</p>
                <p className="text-sm font-semibold text-slate-900">{selectedGarage.ownerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Address</p>
                <p className="text-sm font-semibold text-slate-900">{selectedGarage.address || 'N/A'}, {selectedGarage.city || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Status</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${selectedGarage.approvalStatus === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                   {selectedGarage.approvalStatus || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({isOpen: false, id: '', action: ''})} title="Confirm Action" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">Are you sure you want to {actionModal.action === 'activate' ? 'activate' : 'suspend'} this garage?</p>
        <div className="flex justify-end gap-3">
           <button onClick={() => setActionModal({isOpen: false, id: '', action: ''})} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
           <button onClick={() => handleVerify(actionModal.id, actionModal.action)} className={`px-4 py-2 text-sm font-bold text-white rounded-lg ${actionModal.action === 'activate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm</button>
        </div>
      </Modal>
    </div>
  );
}
