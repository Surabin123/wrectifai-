'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await apiClient<any>('/orders/admin/all');
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
               <h1 className="text-lg font-bold text-slate-800">All Platform Orders</h1>
               <button onClick={loadData} className="px-3 py-1 bg-white border rounded shadow-sm text-sm hover:bg-gray-50">Refresh</button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-4 font-bold text-slate-600 border-b">Order Info</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Customer / Garage</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Items</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Fulfillment</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading orders...</td></tr>
                   ) : orders.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">No orders found.</td></tr>
                   ) : orders.map(order => (
                     <tr key={order.id} className="hover:bg-slate-50 align-top">
                       <td className="p-4">
                         <div className="font-mono text-xs font-bold">{order.order_number}</div>
                         <div className="text-slate-500 text-xs mt-1">{new Date(order.created_at).toLocaleString()}</div>
                         <div className="font-bold text-green-700 mt-2">{formatCurrency(order.total, order.currency)}</div>
                         {order.status === 'paid' && <div className="text-xs text-white bg-green-500 px-1 rounded inline-block mt-1">PAID</div>}
                       </td>
                       <td className="p-4">
                         <div className="text-slate-800"><span className="text-xs text-slate-500 uppercase">Customer:</span><br/>{order.customer_name || 'N/A'}</div>
                         <div className="text-slate-800 mt-2"><span className="text-xs text-slate-500 uppercase">Garage:</span><br/>{order.garage_name || 'N/A'}</div>
                       </td>
                       <td className="p-4">
                         <ul className="text-xs space-y-1">
                           {order.items?.map((item: any) => (
                             <li key={item.id}>{item.quantity}x {item.name}</li>
                           ))}
                         </ul>
                       </td>
                       <td className="p-4">
                         <div className="uppercase text-xs font-bold text-slate-700">{order.fulfillment_mode}</div>
                         {order.shipping_address && (
                           <div className="text-xs text-slate-500 mt-1 max-w-[150px]">
                             {order.shipping_address.street}, {order.shipping_address.city}
                           </div>
                         )}
                       </td>
                       <td className="p-4">
                         <div className="uppercase text-xs font-bold text-orange-600 mb-1">
                           Order: {order.status}
                         </div>
                         {order.fulfillment_mode === 'delivery' && (
                           <div className="uppercase text-xs font-bold text-blue-600 mt-2 border-t pt-1 border-slate-200">
                             Delivery: {order.delivery_status || 'PENDING ASSIGNMENT'}
                             {order.delivery_agent_name && <div className="text-slate-500 font-normal capitalize mt-1">Agent: {order.delivery_agent_name}</div>}
                           </div>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
  );
}
