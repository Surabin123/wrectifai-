import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { TopNavbar } from '@/components/home/top-navbar';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { RoleGuard } from '@/components/common/role-guard';

export default function DeliveryAgentDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveries();
    }
  }, [isAuthenticated]);

  const fetchDeliveries = async () => {
    try {
      const data = await apiClient<any>('/deliveries');
      setDeliveries(data || []);
    } catch (err) {
      console.error('Failed to fetch deliveries', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient(`/deliveries/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      await fetchDeliveries();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <RoleGuard allowedRoles={['delivery_agent']}>
      <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Delivery Assignments</h1>
          <div className="grid gap-4">
            {deliveries.length === 0 ? (
              <p>No active deliveries.</p>
            ) : (
              deliveries.map(delivery => (
                <div key={delivery.id} className="border p-4 rounded shadow-sm bg-white">
                  <h3 className="font-bold">Order #{delivery.order_number}</h3>
                  <p>Status: <strong className="text-blue-600">{delivery.status}</strong></p>
                  
                  {delivery.shipping_address && (
                    <div className="mt-2 text-sm">
                      <strong>Delivery Address:</strong><br />
                      {delivery.shipping_address.street}<br />
                      {delivery.shipping_address.city}, {delivery.shipping_address.state} {delivery.shipping_address.zipCode}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {delivery.status === 'ASSIGNED' && (
                      <button onClick={() => handleUpdateStatus(delivery.id, 'ACCEPTED')} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Accept</button>
                    )}
                    {delivery.status === 'ACCEPTED' && (
                      <button onClick={() => handleUpdateStatus(delivery.id, 'PICKED_UP')} className="bg-orange-600 text-white px-4 py-2 rounded text-sm">Mark Picked Up</button>
                    )}
                    {delivery.status === 'PICKED_UP' && (
                      <button onClick={() => handleUpdateStatus(delivery.id, 'OUT_FOR_DELIVERY')} className="bg-purple-600 text-white px-4 py-2 rounded text-sm">Out for Delivery</button>
                    )}
                    {delivery.status === 'OUT_FOR_DELIVERY' && (
                      <button onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')} className="bg-green-600 text-white px-4 py-2 rounded text-sm">Mark Delivered</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
