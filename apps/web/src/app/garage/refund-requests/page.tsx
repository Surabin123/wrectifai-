'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { useEffect, useState } from 'react';
import { getGarageRefundRequests, approveRefundRequest, rejectRefundRequest, requestRefundInfo } from '@/lib/quotes-api';
import { formatCurrency } from '@/lib/currency';

export default function RefundRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [garageNotes, setGarageNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await getGarageRefundRequests();
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id: string) => {
    setIsUpdating(true);
    setErrorMsg('');
    try {
      await approveRefundRequest(id);
      setSuccessMsg('Refund approved successfully!');
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve refund.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      setErrorMsg('Rejection reason is required.');
      return;
    }
    setIsUpdating(true);
    setErrorMsg('');
    try {
      await rejectRefundRequest(id, rejectionReason);
      setSuccessMsg('Refund rejected.');
      setRejectionReason('');
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject refund.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequestInfo = async (id: string) => {
    if (!garageNotes.trim()) {
      setErrorMsg('Notes are required to request more info.');
      return;
    }
    setIsUpdating(true);
    setErrorMsg('');
    try {
      await requestRefundInfo(id, garageNotes);
      setSuccessMsg('Requested more info from customer.');
      setGarageNotes('');
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request info.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h1 className="text-lg font-bold text-slate-800">Refund Requests</h1>
             </div>
             
             {successMsg && (
               <div className="m-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded">
                 {successMsg}
               </div>
             )}

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-4 font-bold text-slate-600 border-b">Customer</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Vehicle</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Reason</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Status</th>
                     <th className="p-4 font-bold text-slate-600 border-b text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">Loading requests...</td>
                       </tr>
                   ) : requests.length === 0 ? (
                       <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">No refund requests found.</td>
                       </tr>
                   ) : requests.map(req => (
                     <tr key={req.id} className="hover:bg-slate-50">
                       <td className="p-4 text-slate-700">{req.customer_name || 'Customer'}</td>
                       <td className="p-4 text-slate-700">{req.vehicle_make} {req.vehicle_model}</td>
                       <td className="p-4 text-slate-700 font-medium">{req.reason}</td>
                       <td className="p-4 text-slate-600 uppercase text-xs font-bold text-orange-600">
                         {req.status.replace('_', ' ')}
                       </td>
                       <td className="p-4 text-center">
                         <button 
                           onClick={() => { setSelectedRequest(req); setErrorMsg(''); setRejectionReason(''); setGarageNotes(''); }}
                           className="text-blue-600 font-bold hover:underline"
                         >
                           View Details
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* View Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Refund Request Details</h2>
                <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-sm">
                {errorMsg && (
                   <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">
                     {errorMsg}
                   </div>
                )}
                <div>
                  <span className="font-bold text-slate-600">Customer:</span>
                  <p className="text-slate-800">{selectedRequest.customer_name || 'Customer'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Refund Amount:</span>
                  <p className="text-green-700 font-bold bg-slate-50 p-2 mt-1 rounded border border-slate-200">
                    {formatCurrency(selectedRequest.calculated_refund_amount || 0, 'INR')}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Reason:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">
                    {selectedRequest.reason}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Explanation:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">
                    {selectedRequest.explanation || 'N/A'}
                  </p>
                </div>
                
                {selectedRequest.status === 'pending' && (
                  <>
                    <div className="mt-4 pt-4 border-t">
                      <label className="block font-bold text-slate-600 mb-1">Rejection Reason (if rejecting)</label>
                      <input 
                        className="w-full p-2 border rounded" 
                        value={rejectionReason} 
                        onChange={e => setRejectionReason(e.target.value)} 
                        placeholder="Why are you rejecting this refund?" 
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block font-bold text-slate-600 mb-1">Notes (if requesting more info)</label>
                      <input 
                        className="w-full p-2 border rounded" 
                        value={garageNotes} 
                        onChange={e => setGarageNotes(e.target.value)} 
                        placeholder="What else do you need to know?" 
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 flex-wrap">
                {selectedRequest.status === 'pending' || selectedRequest.status === 'info_requested' ? (
                  <>
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleReject(selectedRequest.id)}
                      className="px-4 py-2 border border-red-200 bg-white rounded text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    {selectedRequest.status === 'pending' && (
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleRequestInfo(selectedRequest.id)}
                        className="px-4 py-2 border border-blue-200 bg-white rounded text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      >
                        Request Info
                      </button>
                    )}
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleApprove(selectedRequest.id)}
                      className="px-4 py-2 bg-green-600 rounded text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isUpdating ? 'Processing...' : 'Approve Refund'}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 bg-slate-200 rounded text-sm font-bold text-slate-700 hover:bg-slate-300"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
