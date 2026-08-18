'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { Card } from '@/components/common/card';
import { Modal } from '@/components/common/modal';
import { Users, Building2, ClipboardCheck, CalendarRange, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({ totalCustomers: 0, registeredGarages: 0, pendingApprovals: 0, activeBookings: 0, quotesCount: 0, serviceRequestsCount: 0, completedJobsCount: 0, recentlyRegisteredGarages: [] });
  const [actionModal, setActionModal] = useState<{isOpen: boolean, id: string, action: string, type: 'confirm' | 'error', message: string}>({isOpen: false, id: '', action: '', type: 'confirm', message: ''});

  const loadData = async () => {
    try {
      const statsData = await apiClient.get<any>('/admin/stats').catch(() => ({ totalCustomers: 0, registeredGarages: 0, pendingApprovals: 0, activeBookings: 0, quotesCount: 0, completedJobsCount: 0, recentlyRegisteredGarages: [] }));
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const recentGarages = stats.recentlyRegisteredGarages || [];

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const status = action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : action === 'delete' ? 'deleted' : action;
      await apiClient.put(`/admin/garages/${id}/status`, { status });
      await loadData();
      setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''});
    } catch (err) {
      setActionModal({isOpen: true, id: '', action: '', type: 'error', message: `Failed to ${action} garage.`});
    }
  };

  const confirmAction = () => {
    handleAction(actionModal.id, actionModal.action);
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div>
             <h1 className="text-2xl font-bold text-[#17307a] mb-1 flex items-center gap-2">Welcome back, Admin!</h1>
             <p className="text-sm text-slate-500">Here's what's happening on WrectifAI today.</p>
          </div>
          <div className="flex gap-4">
             <Link href="/admin/garages/register" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4"/> Register Garage</Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Link href="/admin/users" className="block">
            <Card className="p-5 flex items-center gap-4 h-full hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">Total Customers</p>
                <p className="text-2xl font-black text-[#17307a]">{stats.totalCustomers}</p>
                <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">↑ Active</p>
              </div>
            </Card>
          </Link>
          <Link href="/admin/garages" className="block">
            <Card className="p-5 flex items-center gap-4 h-full hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Building2 className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">Registered Garages</p>
                <p className="text-2xl font-black text-[#17307a]">{stats.registeredGarages}</p>
                <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">↑ Active</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/bookings" className="block">
            <Card className="p-5 flex items-center gap-4 h-full hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><CalendarRange className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">Active Bookings</p>
                <p className="text-2xl font-black text-[#17307a]">{stats.activeBookings}</p>
                <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">Live</p>
              </div>
            </Card>
          </Link>
          <Link href="/admin/quotes" className="block">
            <Card className="p-5 flex items-center gap-4 h-full hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">Quotes</p>
                <p className="text-2xl font-black text-[#17307a]">{stats.quotesCount}</p>
                <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">Submitted</p>
              </div>
            </Card>
          </Link>
          <Link href="/admin/service-requests?filter=completed" className="block">
            <Card className="p-5 flex items-center gap-4 h-full hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">Completed Jobs</p>
                <p className="text-2xl font-black text-[#17307a]">{stats.completedJobsCount}</p>
                <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">Finished</p>
              </div>
            </Card>
          </Link>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-[#17307a]">Recently Registered Garages</h3>
             <Link href="/admin/garages" className="text-xs text-blue-600 font-bold">View All</Link>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 text-[11px] font-bold text-slate-500">Garage Name</th>
                <th className="p-4 text-[11px] font-bold text-slate-500">Owner</th>
                <th className="p-4 text-[11px] font-bold text-slate-500">City</th>
                <th className="p-4 text-[11px] font-bold text-slate-500">Registration Date</th>
                <th className="p-4 text-[11px] font-bold text-slate-500">Status</th>
                <th className="p-4 text-[11px] font-bold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentGarages.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">No garages registered yet.</td>
                 </tr>
              ) : (
                 recentGarages.map((g: any) => (
                   <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-slate-100"></div>
                         <span className="font-bold text-sm text-[#17307a]">{g.name}</span>
                       </div>
                     </td>
                     <td className="p-4 text-sm text-slate-600">{g.ownerName || 'N/A'}</td>
                     <td className="p-4 text-sm text-slate-600">{g.city || 'N/A'}</td>
                     <td className="p-4 text-sm text-slate-500">{formatTime(g.createdAt)}</td>
                     <td className="p-4">
                       <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                         g.approvalStatus === 'active' ? 'bg-green-100 text-green-700' :
                         'bg-red-100 text-red-700'
                       }`}>
                         {g.approvalStatus}
                       </span>
                     </td>
                     <td className="p-4">
                       <div className="flex gap-2">
                         {(g.approvalStatus === 'active' || g.approvalStatus === 'approved') && (
                           <>
                             <button onClick={() => setActionModal({isOpen: true, id: g.id, action: 'suspend', type: 'confirm', message: `Are you sure you want to suspend ${g.name}?`})} className="text-[10px] bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 font-bold transition-colors">Suspend</button>
                             <button onClick={() => setActionModal({isOpen: true, id: g.id, action: 'delete', type: 'confirm', message: `Are you sure you want to delete ${g.name}?`})} className="text-[10px] bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold transition-colors">Delete</button>
                           </>
                         )}
                         {(g.approvalStatus === 'inactive' || g.approvalStatus === 'suspended') && (
                           <button onClick={() => setActionModal({isOpen: true, id: g.id, action: 'activate', type: 'confirm', message: `Are you sure you want to activate ${g.name}?`})} className="text-[10px] bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-bold transition-colors">Make Active</button>
                         )}
                       </div>
                     </td>
                   </tr>
                 ))
              )}
            </tbody>
          </table>
        </Card>

        <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title={actionModal.type === 'error' ? 'Error' : 'Confirm Action'}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{actionModal.message}</p>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} className="px-4 py-2 border rounded-lg text-sm font-bold hover:bg-slate-50">
                {actionModal.type === 'error' ? 'Close' : 'Cancel'}
              </button>
              {actionModal.type === 'confirm' && (
                <button onClick={confirmAction} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                  Confirm
                </button>
              )}
            </div>
          </div>
        </Modal>

      </div>
    </RoleGuard>
  );
}
