'use client';

import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { ClipboardList, Edit3 } from 'lucide-react';

export default function GarageRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    request: any;
  }>({ isOpen: false, request: null });

  const [addToCatalogModal, setAddToCatalogModal] = useState<{
    isOpen: boolean;
    request: any;
  }>({ isOpen: false, request: null });

  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/garages/my-requests');
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

  const handleEditClick = (req: any) => {
    setEditModal({ isOpen: true, request: req });
    setFormData({
      name: req.name,
      category: req.category,
      description: req.description,
      suggestedPrice: req.suggested_price,
    });
    setError('');
  };

  const handleResubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await apiClient.put(`/garages/my-requests/${editModal.request.type}/${editModal.request.id}/resubmit`, formData);
      setEditModal({ isOpen: false, request: null });
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to resubmit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddClick = (req: any) => {
    setAddToCatalogModal({ isOpen: true, request: req });
    setFormData({
      price: req.suggested_price,
      durationMins: req.suggested_duration || 60,
      durationUnit: req.duration_unit || 'Minutes',
      qtyAvailable: 0,
      isActive: true,
    });
    setError('');
  };

  const handleAddToCatalog = async () => {
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post(`/garages/my-requests/${addToCatalogModal.request.type}/${addToCatalogModal.request.id}/add-to-catalog`, formData);
      setAddToCatalogModal({ isOpen: false, request: null });
      alert(`Successfully added to your ${addToCatalogModal.request.type === 'service' ? 'services' : 'inventory'}!`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to add item to catalog.');
    } finally {
      setSubmitting(false);
    }
  };

  const getLatestRejection = (req: any) => {
    if (req.rejection_history && Array.isArray(req.rejection_history) && req.rejection_history.length > 0) {
      return req.rejection_history[req.rejection_history.length - 1];
    }
    return null;
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems}>
        <div className="flex-1 overflow-y-auto">
          <DashboardHeader title="Catalog Requests" />
          
          <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <Card className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-sm font-medium text-slate-500">
                      <th className="p-4">Type</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Suggested Price</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y">
                    {loading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading requests...</td></tr>
                    ) : requests.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">No requests found.</td></tr>
                    ) : (
                      requests.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-700 capitalize">{r.type}</td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-900">{r.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-xs">{r.description}</p>
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
                            {r.status === 'rejected' && getLatestRejection(r) && (
                              <p className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate" title={getLatestRejection(r).reason}>
                                {getLatestRejection(r).reason}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            {r.status === 'rejected' && (
                              <button 
                                onClick={() => handleEditClick(r)}
                                className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit & Resubmit
                              </button>
                            )}
                            {r.status === 'approved' && (
                              <button 
                                onClick={() => handleAddClick(r)}
                                className="px-3 py-1 text-xs font-medium text-green-700 border border-green-600 hover:bg-green-50 rounded transition-colors flex items-center gap-1"
                              >
                                <ClipboardList className="w-3 h-3" /> 
                                {r.type === 'service' ? 'Add to My Services' : 'Add to My Inventory'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        <Modal 
          isOpen={editModal.isOpen} 
          onClose={() => !submitting && setEditModal({ isOpen: false, request: null })}
          title={`Edit & Resubmit ${editModal.request?.type === 'service' ? 'Service' : 'Product'}`}
        >
          {editModal.request && (
            <div className="space-y-4">
              {getLatestRejection(editModal.request) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-1">Admin Feedback:</p>
                  <p className="text-sm text-red-700">{getLatestRejection(editModal.request).reason}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Suggested Price</label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.suggestedPrice || ''}
                  onChange={(e) => setFormData({...formData, suggestedPrice: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  onClick={() => setEditModal({ isOpen: false, request: null })}
                  disabled={submitting}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResubmit}
                  disabled={submitting || !formData.name}
                  className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Resubmit Request'}
                </button>
              </div>
            </div>
          )}
        </Modal>

        <Modal 
          isOpen={addToCatalogModal.isOpen} 
          onClose={() => !submitting && setAddToCatalogModal({ isOpen: false, request: null })}
          title={`Configure & Add ${addToCatalogModal.request?.type === 'service' ? 'Service' : 'Product'}`}
        >
          {addToCatalogModal.request && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Configure your specific details below. This item will only be active and visible for your garage.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Price (₹)</label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>

              {addToCatalogModal.request.type === 'service' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration Unit</label>
                    <select
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.durationUnit || 'Minutes'}
                      onChange={(e) => setFormData({...formData, durationUnit: e.target.value})}
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration ({formData.durationUnit || 'Minutes'})</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.durationMins || ''}
                      onChange={(e) => setFormData({...formData, durationMins: e.target.value})}
                    />
                  </div>
                </>
              )}

              {addToCatalogModal.request.type === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock Available</label>
                  <input 
                    type="number"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.qtyAvailable || ''}
                    onChange={(e) => setFormData({...formData, qtyAvailable: e.target.value})}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-medium text-slate-700">Make it active immediately</label>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  onClick={() => setAddToCatalogModal({ isOpen: false, request: null })}
                  disabled={submitting}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddToCatalog}
                  disabled={submitting || !formData.price}
                  className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  {submitting ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </DashboardShell>
    </RoleGuard>
  );
}
