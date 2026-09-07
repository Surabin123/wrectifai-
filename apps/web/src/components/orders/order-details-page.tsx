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
import { ArrowLeft, Package, MapPin, CreditCard, Clock, Store } from 'lucide-react';
import Image from 'next/image';

interface OrderDetailsPageProps {
  orderId: string;
}

export function OrderDetailsPage({ orderId }: OrderDetailsPageProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && orderId) {
      fetchOrderDetails();
    }
  }, [isAuthenticated, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient<any>(`/orders/${orderId}`);
      setOrder(data);
    } catch (err: any) {
      console.error('Failed to load order details', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <RoleGuard allowedRoles={['customer', 'garage', 'admin']}>
        <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
          <div className="max-w-4xl mx-auto p-6 text-center text-slate-500 py-20">
            Loading order details...
          </div>
        </DashboardShell>
      </RoleGuard>
    );
  }

  if (error || !order) {
    return (
      <RoleGuard allowedRoles={['customer', 'garage', 'admin']}>
        <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
          <div className="max-w-4xl mx-auto p-6 text-center py-20 space-y-4">
            <h3 className="text-xl font-bold text-red-600">{error || 'Order Not Found'}</h3>
            <p className="text-slate-500 text-sm">We couldn't retrieve the details for this order.</p>
            <Button onClick={() => router.push('/orders')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Orders
            </Button>
          </div>
        </DashboardShell>
      </RoleGuard>
    );
  }

  const currency = order.currency || 'INR';
  const subtotal = Number(order.subtotal || 0);
  const tax = Number(order.tax || 0);
  const shipping = Number(order.shipping_cost || 0);
  const total = Number(order.total || 0);
  
  // Calculate discount if total < subtotal + tax + shipping
  const expectedWithoutDiscount = subtotal + tax + shipping;
  const calculatedDiscount = Math.max(0, expectedWithoutDiscount - total);

  const address = typeof order.shipping_address === 'string' 
    ? JSON.parse(order.shipping_address) 
    : order.shipping_address;

  return (
    <RoleGuard allowedRoles={['customer', 'garage', 'admin']}>
      <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/orders')}
              className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to My Orders
            </button>
          </div>

          {/* Order Title Card */}
          <Card className="p-6 bg-white border-slate-100 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900">Order #{order.order_number}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    order.status === 'paid' || order.status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Placed on {new Date(order.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {order.garage_name && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                  <Store className="w-4 h-4 text-blue-600" />
                  <span>Seller: <strong>{order.garage_name}</strong></span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Ordered Products
              </h3>
              <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="p-4 flex items-center gap-4 bg-white hover:bg-slate-50 transition-colors">
                    <div className="w-14 h-14 relative bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">Unit: {formatCurrency(Number(item.unit_price), currency)}</p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(Number(item.total_price || Number(item.unit_price) * item.quantity), currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Payment Grid */}
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              {/* Shipping Address */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> Delivery Address
                </h4>
                {address ? (
                  <div className="text-xs text-slate-700 space-y-1 font-medium">
                    <p className="font-bold text-slate-900">{address.name}</p>
                    <p>{address.street}</p>
                    <p>{address.city}, {address.state} - {address.zip || address.zipCode}</p>
                    {address.phone && <p className="text-slate-500">Phone: {address.phone}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No shipping address recorded</p>
                )}
              </div>

              {/* Payment Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Payment Summary
                </h4>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || 'Online Payment')}
                  </span>
                </div>
                {order.payment_transaction_id && order.payment_method !== 'cod' && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="font-mono text-slate-900 font-medium">{order.payment_transaction_id}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Payment Status</span>
                  <span className={`font-semibold uppercase ${
                    order.status === 'paid' || order.payment_status === 'succeeded' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {order.payment_status || (order.status === 'paid' ? 'succeeded' : 'pending')}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatCurrency(calculatedDiscount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Tax (18%)</span>
                  <span className="font-semibold">{formatCurrency(tax, currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Shipping</span>
                  <span className="font-semibold">{formatCurrency(shipping, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2.5 mt-2">
                  <span>Final Total</span>
                  <span className="text-base text-blue-600">{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
