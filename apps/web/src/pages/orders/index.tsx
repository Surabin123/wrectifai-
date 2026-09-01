import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { TopNavbar } from '@/components/home/top-navbar';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { RoleGuard } from '@/components/common/role-guard';

export default function CustomerOrdersPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const data = await apiClient<any>('/orders/customer/me');
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) return <div className="p-8">Loading...</div>;

  return (
    <RoleGuard allowedRoles={['customer']}>
      <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">My Orders</h1>
          
          {orders.length === 0 ? (
            <p>You have not placed any orders yet.</p>
          ) : (
            <div className="grid gap-6">
              {orders.map(o => (
                <div key={o.id} className="border p-4 rounded shadow-sm bg-white">
                  <div className="flex justify-between border-b pb-2 mb-2">
                    <h3 className="font-bold">Order #{o.order_number}</h3>
                    <span className="font-semibold text-slate-700">{formatCurrency(o.total, o.currency)}</span>
                  </div>
                  <div className="text-sm space-y-1 mb-4">
                    <p><strong>Order Status:</strong> {o.status}</p>
                    <p><strong>Fulfillment:</strong> {o.fulfillment_mode === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                    {o.fulfillment_mode === 'delivery' && (
                      <p><strong>Delivery Status:</strong> {o.delivery_status || 'Pending'}</p>
                    )}
                    {o.shipping_address && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Address:</strong><br />
                        {o.shipping_address.street}<br />
                        {o.shipping_address.city}, {o.shipping_address.state} {o.shipping_address.zipCode}
                      </div>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-sm mb-2">Items</h4>
                  <ul className="text-sm space-y-2">
                    {o.items?.map((item: any) => (
                      <li key={item.id} className="flex justify-between border-t pt-2 border-slate-100">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatCurrency(item.unit_price, o.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
