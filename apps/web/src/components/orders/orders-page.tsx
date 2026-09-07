'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { TopNavbar } from '@/components/home/top-navbar';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { RoleGuard } from '@/components/common/role-guard';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Package, ChevronRight, Clock } from 'lucide-react';

export function OrdersPage() {
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
      setLoading(true);
      const data = await apiClient<any>('/orders/customer/me');
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
          <div className="max-w-4xl mx-auto p-6 text-center text-slate-500 py-20">
            Loading your orders...
          </div>
        </DashboardShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
              <p className="text-sm text-slate-500">Track and manage your parts & inventory purchases</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <Card className="p-12 text-center bg-white border-slate-100 rounded-2xl flex flex-col items-center">
              <Package className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Orders Yet</h3>
              <p className="text-sm text-slate-500 mb-6">You haven't placed any product orders yet.</p>
              <Button onClick={() => router.push('/shop')} className="bg-blue-600 hover:bg-blue-700">
                Browse Shop
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card 
                  key={order.id} 
                  className="p-5 bg-white border-slate-100 hover:border-slate-200 transition-all rounded-2xl cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-4 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">Order #{order.order_number}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          order.status === 'paid' || order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-400 font-medium">Total Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(Number(order.total), order.currency || 'INR')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items?.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs text-slate-700">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-semibold">{formatCurrency(Number(item.unit_price) * item.quantity, order.currency || 'INR')}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <p className="text-xs text-slate-400 font-medium">+ {order.items.length - 3} more item(s)</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
                    <span>View Order Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
