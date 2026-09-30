'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

const STATUS_LABELS: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Order Placed', ACCEPTED: 'Garage Received Order',
  READY_FOR_COLLECTION: 'Ready for Collection', COLLECTED: 'Collected', CANCELLED: 'Cancelled'
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<{ garages: Array<{ id: string; name: string }> }>({ garages: [] });
  const [filters, setFilters] = useState({ search: '', customer: '', garageId: '', status: 'All', dateFrom: '', dateTo: '', collectionStatus: 'All' });

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value && value !== 'All') params.set(key, value); });
      setOrders(await apiClient<any[]>(`/orders/admin/all?${params.toString()}`) || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [filters]);
  useEffect(() => {
    apiClient<{ garages: Array<{ id: string; name: string }> }>('/orders/admin/filter-options')
      .then(options => setFilterOptions(options || { garages: [] }))
      .catch(console.error);
  }, []);
  const setFilter = (key: keyof typeof filters, value: string) => setFilters(previous => ({ ...previous, [key]: value }));
  const clearFilters = () => setFilters({ search: '', customer: '', garageId: '', status: 'All', dateFrom: '', dateTo: '', collectionStatus: 'All' });

  return <div className="p-6 bg-slate-50 min-h-screen"><div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-4 border-b border-slate-200 space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-lg font-bold text-slate-800">All Platform Orders</h1><button onClick={loadData} className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded text-xs">Apply Filters</button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Search Order ID" className="border rounded-lg px-3 py-2 text-sm" />
        <input value={filters.customer} onChange={e => setFilter('customer', e.target.value)} placeholder="Search customer" className="border rounded-lg px-3 py-2 text-sm" />
        <select value={filters.garageId} onChange={e => setFilter('garageId', e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white"><option value="">All garages</option>{filterOptions.garages.map(garage => <option key={garage.id} value={garage.id}>{garage.name}</option>)}</select>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white"><option value="All">All statuses</option>{Object.entries(STATUS_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={filters.collectionStatus} onChange={e => setFilter('collectionStatus', e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white"><option value="All">All collection states</option><option value="Pending">Pending</option><option value="Ready">Ready</option><option value="Collected">Collected</option></select>
        <button onClick={clearFilters} className="text-sm font-semibold text-blue-600 text-left">Clear All</button>
      </div>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr>{['Order ID','Customer','Garage','Items','Order Amount','Order Date','Status','Actions'].map(label => <th key={label} className="p-4 text-xs font-bold text-slate-600">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">Loading orders...</td></tr> : orders.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">No orders found.</td></tr> : orders.map(order => <tr key={order.id} className="hover:bg-slate-50">
        <td className="p-4 font-mono text-xs font-bold">{order.order_number}</td><td className="p-4">{order.customer_name || 'N/A'}</td><td className="p-4">{order.garage_name || 'N/A'}</td>
        <td className="p-4 text-xs">{order.items?.map((item:any) => `${item.quantity}× ${item.name}`).join(', ') || '—'}</td><td className="p-4 font-bold text-green-700">{formatCurrency(order.total, order.currency)}</td>
        <td className="p-4 text-xs">{new Date(order.created_at).toLocaleString()}</td><td className="p-4 text-xs font-bold text-blue-700">{STATUS_LABELS[order.status] || order.status}</td>
        <td className="p-4"><a href={`/orders/${order.id}`} className="text-xs font-bold text-blue-600 hover:underline">View Details</a></td>
      </tr>)}</tbody></table></div>
  </div></div>;
}
