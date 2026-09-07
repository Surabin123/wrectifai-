'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

export default function GarageOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const ordersData = await apiClient<any>('/orders/garage');
      setOrders(ordersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      await loadData();
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleConfirmCash = async (id: string) => {
    try {
      await apiClient(`/orders/${id}/confirm-cash`, {
        method: 'POST'
      });
      await loadData();
    } catch (err: any) {
      console.error('Failed to confirm cash', err);
      alert(err.message || 'Failed to confirm cash receipt');
    }
  };

  const renderFulfillmentBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING_ACCEPTANCE' || s === 'PENDINGPAYMENT' || s === 'PAID') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Pending Acceptance</span>;
    } else if (s === 'PACKING' || s === 'PROCESSING') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Packing</span>;
    } else if (s === 'SHIPPED') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Shipped</span>;
    } else if (s === 'OUT_FOR_DELIVERY') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">Out for Delivery</span>;
    } else if (s === 'DELIVERED') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Delivered</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
  };

  const renderPaymentBadge = (order: any) => {
    const isPaid = order.payment_status === 'PAID' || order.status === 'paid';
    const isCod = order.payment_method === 'cod';

    if (isPaid) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Paid</span>;
    }
    if (isCod) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Cash on Delivery — Pending</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Payment Pending</span>;
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
               <h1 className="text-lg font-bold text-slate-800">Customer Product Orders</h1>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-4 font-bold text-slate-600 border-b">Order ID</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Amount</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Payment Status</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Fulfillment Status</th>
                     <th className="p-4 font-bold text-slate-600 border-b text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading orders...</td></tr>
                   ) : orders.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">No product orders found.</td></tr>
                   ) : orders.map(order => {
                     const isPaid = order.payment_status === 'PAID';
                     const fulStatus = (order.status || '').toUpperCase();

                     return (
                       <tr key={order.id} className="hover:bg-slate-50">
                         <td className="p-4 text-slate-700 font-mono text-xs">{order.order_number}</td>
                         <td className="p-4 text-slate-700 font-medium">{formatCurrency(order.total, order.currency)}</td>
                         <td className="p-4">{renderPaymentBadge(order)}</td>
                         <td className="p-4">{renderFulfillmentBadge(order.status)}</td>
                         <td className="p-4 text-center">
                           <div className="flex flex-col gap-2 items-center justify-center">
                             {(fulStatus === 'PENDING_ACCEPTANCE' || fulStatus === 'PENDINGPAYMENT' || fulStatus === 'PAID') && (
                               <button 
                                 onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')} 
                                 className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs shadow-sm transition-colors"
                               >
                                 Accept Order
                               </button>
                             )}

                             {(fulStatus === 'PACKING' || fulStatus === 'PROCESSING') && (
                               <button 
                                 onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} 
                                 className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs shadow-sm transition-colors"
                               >
                                 Mark Shipped
                               </button>
                             )}

                             {fulStatus === 'SHIPPED' && (
                               <button 
                                 onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')} 
                                 className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded text-xs shadow-sm transition-colors"
                               >
                                 Out for Delivery
                               </button>
                             )}

                             {fulStatus === 'OUT_FOR_DELIVERY' && !isPaid && (
                               <button 
                                 onClick={() => handleConfirmCash(order.id)} 
                                 className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs shadow-sm transition-colors"
                               >
                                 Confirm Cash Received
                               </button>
                             )}

                             {fulStatus === 'OUT_FOR_DELIVERY' && isPaid && (
                               <button 
                                 onClick={() => handleUpdateStatus(order.id, 'DELIVERED')} 
                                 className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs shadow-sm transition-colors"
                               >
                                 Mark Delivered
                               </button>
                             )}

                             {fulStatus === 'DELIVERED' && (
                               <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                 ✓ Order Completed
                               </span>
                             )}
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
