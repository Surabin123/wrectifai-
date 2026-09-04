'use client';

import { useState, useEffect } from 'react';
import { RoleGuard } from '@/components/common/role-guard';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { Plus, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/common/modal';

interface ReferralConfig {
  id: number;
  region: string;
  is_enabled: boolean;
  reward_amount: string;
  currency: string;
  total_referrals?: string;
  successful_referrals?: string;
  total_promotional_liability?: string;
}

export default function AdminReferralsPage() {
  const [configs, setConfigs] = useState<ReferralConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReferralConfig>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ region: '', is_enabled: true, reward_amount: '', currency: 'USD' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const data = await apiClient.get<ReferralConfig[]>('/admin/referrals/config');
      setConfigs(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (config: ReferralConfig) => {
    setEditingId(config.id);
    setEditForm({ ...config });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editForm.region || !editForm.reward_amount) {
      toast.error('Region and Reward Amount are required');
      return;
    }
    setSavingEdit(true);
    try {
      await apiClient.post('/admin/referrals/config', {
        action: 'update',
        config: editForm
      });
      toast.success('Configuration updated successfully');
      setEditingId(null);
      fetchConfigs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update configuration');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.region || !addForm.reward_amount || !addForm.currency) {
      toast.error('Please fill in all required fields');
      return;
    }
    setAdding(true);
    try {
      await apiClient.post('/admin/referrals/config', {
        action: 'create',
        config: addForm
      });
      toast.success('New referral configuration added');
      setAddModalOpen(false);
      setAddForm({ region: '', is_enabled: true, reward_amount: '', currency: 'USD' });
      fetchConfigs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add configuration');
    } finally {
      setAdding(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Refer & Earn Management</h1>
          <Button onClick={() => setAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add a Referral
          </Button>
        </div>

        {loading ? (
          <div>Loading configurations...</div>
        ) : (
          <div className="bg-white rounded-lg shadow border p-6 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-sm font-semibold text-slate-600">Region</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Reward Amount</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Currency</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Total Referrals</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Successful Referrals</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Promotional Liability</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => {
                  const isEditing = editingId === config.id;
                  return (
                    <tr key={config.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            className="border rounded p-1 w-full text-sm"
                            value={editForm.region}
                            onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                          />
                        ) : (
                          config.region
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            className="border rounded p-1 text-sm"
                            value={editForm.is_enabled ? 'true' : 'false'}
                            onChange={(e) => setEditForm({ ...editForm, is_enabled: e.target.value === 'true' })}
                          >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                          </select>
                        ) : (
                          <span className={\`px-2 py-1 text-xs font-bold rounded \${config.is_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}\`}>
                            {config.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            className="border rounded p-1 w-24 text-sm"
                            value={editForm.reward_amount}
                            onChange={(e) => setEditForm({ ...editForm, reward_amount: e.target.value })}
                          />
                        ) : (
                          config.reward_amount
                        )}
                      </td>
                      <td className="p-3 text-sm text-slate-600">{config.currency}</td>
                      <td className="p-3 font-semibold text-sm">{config.total_referrals || '0'}</td>
                      <td className="p-3 font-semibold text-green-600 text-sm">{config.successful_referrals || '0'}</td>
                      <td className="p-3 font-bold text-blue-600 text-sm">
                        {formatCurrency(parseFloat(config.total_promotional_liability || '0'), config.currency)}
                      </td>
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEditing} disabled={savingEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" className="bg-blue-600 text-white" onClick={handleSaveEdit} disabled={savingEdit}>
                              <Save className="w-4 h-4 mr-1" /> Save
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEditing(config)}>
                            <Edit2 className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {configs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No referral configurations found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={addModalOpen} onClose={() => !adding && setAddModalOpen(false)} title="Add New Referral Region">
        <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Region Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Europe"
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-600" 
              value={addForm.region}
              onChange={(e) => setAddForm({...addForm, region: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Currency</label>
            <input 
              type="text" 
              required
              placeholder="e.g. EUR"
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-600" 
              value={addForm.currency}
              onChange={(e) => setAddForm({...addForm, currency: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Reward Amount</label>
            <input 
              type="number" 
              required
              placeholder="e.g. 100"
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-600" 
              value={addForm.reward_amount}
              onChange={(e) => setAddForm({...addForm, reward_amount: e.target.value})}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
             <input 
                type="checkbox" 
                id="is-enabled-new"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={addForm.is_enabled}
                onChange={(e) => setAddForm({...addForm, is_enabled: e.target.checked})}
             />
             <label htmlFor="is-enabled-new" className="text-sm font-bold text-slate-700 cursor-pointer">
                Enable Immediately
             </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
             <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)} disabled={adding}>
               Cancel
             </Button>
             <Button type="submit" disabled={adding} className="bg-blue-600 text-white hover:bg-blue-700">
               {adding ? 'Saving...' : 'Add Configuration'}
             </Button>
          </div>
        </form>
      </Modal>
    </RoleGuard>
  );
}
