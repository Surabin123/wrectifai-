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

  const [searchQuery, setSearchQuery] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  async function loadData() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fulfillmentFilter !== 'All') queryParams.append('fulfillment_mode', fulfillmentFilter);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      const data = await apiClient<any>(`/orders/admin/all?${queryParams.toString()}`);
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [fulfillmentFilter, statusFilter]); 

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.garage_name?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.order_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-4">
               <div className="flex justify-between items-center">
                 <h1 className="text-lg font-bold text-slate-800">All Platform Orders</h1>
                 <button onClick={loadData} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-semibold rounded shadow-sm text-xs hover:bg-slate-200 transition-colors">Refresh</button>
               </div>
               <div className="relative w-full md:w-80">
                 <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by garage, customer, order number..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <div className="flex flex-col gap-3">
                 <div className="flex flex-wrap items-center gap-2">
                   <span className="text-xs font-bold text-slate-500 mr-2">Fulfillment:</span>
                   {['All', 'inHouse', 'thirdParty'].map(mode => (
                     <button 
                       key={mode}
                       onClick={() => setFulfillmentFilter(mode)}
                       className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${fulfillmentFilter === mode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                       {mode === 'All' ? 'All' : mode === 'inHouse' ? 'In-House' : 'Third-Party'}
                     </button>
                   ))}
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                   <span className="text-xs font-bold text-slate-500 mr-2">Status:</span>
                   {['All', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'PACKING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map(mode => (
                     <button 
                       key={mode}
                       onClick={() => setStatusFilter(mode)}
                       className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${statusFilter === mode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                       {mode === 'All' ? 'All' : mode.replace(/_/g, ' ')}
                     </button>
                   ))}
                 </div>
               </div>
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
                   ) : filteredOrders.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">No orders found.</td></tr>
                   ) : filteredOrders.map(order => (
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
