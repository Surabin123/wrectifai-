'use client';

import { useState, useEffect } from 'react';
import { AdminDashboardShell } from '@/components/admin/admin-dashboard-shell';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { RefreshCcw, Save } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const data = await apiClient.get<ReferralConfig[]>('/admin/referrals/config');
      setConfigs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (index: number, field: keyof ReferralConfig, value: any) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/admin/referrals/config', { configs });
      alert('Configurations saved successfully');
      fetchConfigs();
    } catch (err) {
      console.error(err);
      alert('Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDashboardShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Refer & Earn Management</h1>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <RefreshCcw className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        {loading ? (
          <div>Loading configurations...</div>
        ) : (
          <div className="bg-white rounded-lg shadow border p-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Region</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reward Amount</th>
                  <th className="p-3">Currency</th>
                  <th className="p-3">Total Referrals</th>
                  <th className="p-3">Successful Referrals</th>
                  <th className="p-3">Promotional Liability</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config, index) => (
                  <tr key={config.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{config.region}</td>
                    <td className="p-3">
                      <select
                        className="border rounded p-1"
                        value={config.is_enabled ? 'true' : 'false'}
                        onChange={(e) => handleUpdate(index, 'is_enabled', e.target.value === 'true')}
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        className="border rounded p-1 w-24"
                        value={config.reward_amount}
                        onChange={(e) => handleUpdate(index, 'reward_amount', e.target.value)}
                      />
                    </td>
                    <td className="p-3">{config.currency}</td>
                    <td className="p-3 font-semibold">{config.total_referrals || '0'}</td>
                    <td className="p-3 font-semibold text-green-600">{config.successful_referrals || '0'}</td>
                    <td className="p-3 font-bold text-blue-600">{formatCurrency(parseFloat(config.total_promotional_liability || '0'), config.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminDashboardShell>
  );
}
