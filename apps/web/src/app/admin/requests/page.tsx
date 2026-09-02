'use client';
import { Card } from '@/components/common/card';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    id: string;
    type: 'service' | 'product';
    action: 'approve' | 'reject';
  }>({ isOpen: false, id: '', type: 'service', action: 'approve' });
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/requests');
      setRequests(data);
    } catch (err) {
      console.warn('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (actionModal.action === 'approve') {
        await apiClient.post(`/admin/requests/${actionModal.type}/${actionModal.id}/approve`, {});
      } else {
        if (!rejectReason.trim()) {
          setError('Rejection reason is required.');
          setSubmitting(false);
          return;
        }
        await apiClient.post(`/admin/requests/${actionModal.type}/${actionModal.id}/reject`, { reason: rejectReason });
      }
      setActionModal({ ...actionModal, isOpen: false });
      setRejectReason('');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.garageName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service & Product Requests</h1>
          <p className="text-slate-500">Review catalog additions requested by garages.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or garage..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm font-medium text-slate-500">
                <th className="p-4">Type</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Garage</th>
                <th className="p-4">Suggested Price</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading requests...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No requests found.</td></tr>
              ) : (
                filteredRequests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-700 capitalize">{r.type}</td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{r.description}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-900 font-medium">{r.garageName}</p>
                      <p className="text-xs text-slate-500">{r.garageCity}</p>
                    </td>
                    <td className="p-4 font-medium">{r.suggested_price}</td>
                    <td className="p-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                      {r.status === 'rejected' && r.admin_notes && (
                        <p className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate" title={r.admin_notes}>
                          {r.admin_notes}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActionModal({ isOpen: true, id: r.id, type: r.type, action: 'approve' })}
                            className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => setActionModal({ isOpen: true, id: r.id, type: r.type, action: 'reject' })}
                            className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={actionModal.isOpen} 
        onClose={() => !submitting && setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.action === 'approve' ? 'Approve Request' : 'Reject Request'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {actionModal.action === 'approve' 
              ? 'Are you sure you want to approve this request? It will be added to the platform catalog and assigned to the requesting garage.'
              : 'Are you sure you want to reject this request? Please provide a reason.'}
          </p>
          
          {actionModal.action === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <textarea 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                placeholder="Why is this being rejected?"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              onClick={() => setActionModal({ ...actionModal, isOpen: false })}
              disabled={submitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleAction}
              disabled={submitting || (actionModal.action === 'reject' && !rejectReason.trim())}
              className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                actionModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? 'Processing...' : actionModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
