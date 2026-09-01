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
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersData, agentsData] = await Promise.all([
        apiClient<any>('/orders/garage'),
        apiClient<any>('/users/delivery-agents')
      ]);
      setOrders(ordersData || []);
      setAgents(agentsData || []);
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
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAssignAgent = async (orderId: string, agentId: string) => {
    try {
      await apiClient(`/orders/${orderId}/assign-delivery`, {
        method: 'POST',
        body: JSON.stringify({ deliveryAgentId: agentId })
      });
      await loadData();
    } catch (err) {
      console.error('Failed to assign agent', err);
    }
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h1 className="text-lg font-bold text-slate-800">Customer Orders</h1>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-4 font-bold text-slate-600 border-b">Order ID</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Amount</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Fulfillment</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Status</th>
                     <th className="p-4 font-bold text-slate-600 border-b text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading orders...</td></tr>
                   ) : orders.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-500">No orders found.</td></tr>
                   ) : orders.map(order => (
                     <tr key={order.id} className="hover:bg-slate-50">
                       <td className="p-4 text-slate-700 font-mono text-xs">{order.order_number}</td>
                       <td className="p-4 text-slate-700 font-medium">{formatCurrency(order.total, order.currency)}</td>
                       <td className="p-4 text-slate-700 uppercase text-xs font-bold">{order.fulfillment_mode}</td>
                       <td className="p-4 text-slate-600 uppercase text-xs font-bold">
                         {order.status}
                         {order.delivery_status && <div className="text-blue-600 mt-1">Delivery: {order.delivery_status}</div>}
                       </td>
                       <td className="p-4 text-center">
                         <div className="flex flex-col gap-2">
                           {order.status === 'paid' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Accept</button>
                           )}
                           {order.status === 'ACCEPTED' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'PACKING')} className="px-2 py-1 bg-yellow-600 text-white rounded text-xs">Start Packing</button>
                           )}
                           {order.status === 'PACKING' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'PACKED')} className="px-2 py-1 bg-orange-600 text-white rounded text-xs">Mark Packed</button>
                           )}
                           {order.status === 'PACKED' && order.fulfillment_mode !== 'delivery' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')} className="px-2 py-1 bg-purple-600 text-white rounded text-xs">Ready for Pickup</button>
                           )}
                           {order.status === 'READY_FOR_PICKUP' && order.fulfillment_mode !== 'delivery' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'COLLECTED')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Collected</button>
                           )}
                           {order.status === 'PACKED' && order.fulfillment_mode === 'delivery' && !order.delivery_agent_id && (
                             <select className="border text-xs rounded p-1" onChange={(e) => handleAssignAgent(order.id, e.target.value)} defaultValue="">
                               <option value="" disabled>Assign Agent</option>
                               {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                             </select>
                           )}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
