'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Car, Calendar, DollarSign, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicles: string[];
  joinDate: string;
  lastVisit: string | null;
  totalBookings: number;
  pendingBookings: number;
  totalOrders: number;
  pendingOrders: number;
  totalSpend: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await apiClient.get('/garages/my-customers');
        setCustomers((response as unknown as Customer[]) || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.vehicles && c.vehicles.some(v => v.toLowerCase().includes(q)))
    );
  });

  const totalCustomers = customers.length;
  const activeThisMonth = customers.filter(c => {
    if (!c.lastVisit) return false;
    const visitDate = new Date(c.lastVisit);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return visitDate >= thirtyDaysAgo;
  }).length;
  const totalLifetimeSpend = customers.reduce((acc, c) => acc + c.totalSpend, 0);

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6 flex-col lg:flex-row">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Customers</h1>
                 <p className="text-sm text-slate-500">View real customers who have booked services or ordered parts from your garage.</p>
               </div>
             </div>
             
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-full max-w-md">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Search by name, phone, email or vehicle..." 
                   className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" 
                 />
               </div>
             </div>

             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse min-w-[800px]">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Customer</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Vehicles</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Interactions</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Spend</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Last Visit</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading && (
                     <tr>
                       <td colSpan={5} className="p-12 text-center text-sm font-semibold text-slate-500">Loading customers...</td>
                     </tr>
                   )}
                   {!loading && error && (
                     <tr>
                       <td colSpan={5} className="p-12 text-center text-sm font-semibold text-red-500">{error}</td>
                     </tr>
                   )}
                   {!loading && !error && filteredCustomers.length === 0 && (
                     <tr>
                       <td colSpan={5} className="p-12 text-center text-sm font-semibold text-slate-500">
                         {searchQuery ? 'No customers found matching your search.' : 'No customers found. Customers will appear here once they book a service or order products from your garage.'}
                       </td>
                     </tr>
                   )}
                   {!loading && !error && filteredCustomers.map(c => (
                     <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4 align-top">
                         <div className="flex items-start gap-3">
                           <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                             {c.name.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-[#17307a]">{c.name}</p>
                             <p className="text-[11px] text-slate-600 font-medium">{c.phone || '—'}</p>
                             <p className="text-[10px] text-slate-400">{c.email || '—'}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-4 align-top">
                         {c.vehicles && c.vehicles.length > 0 ? (
                           <div className="space-y-2">
                             {c.vehicles.map((v, i) => (
                               <div key={i} className="flex items-start gap-2">
                                 <Car className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0"/>
                                 <p className="text-[11px] font-medium text-slate-700 leading-tight">{v}</p>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <span className="text-xs text-slate-400">—</span>
                         )}
                       </td>
                       <td className="p-4 align-top text-center">
                         <div className="inline-flex gap-4">
                           <div className="flex flex-col items-center">
                             <p className="text-sm font-black text-slate-800">{c.totalBookings}</p>
                             <p className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> Bookings</p>
                             {c.pendingBookings > 0 && <span className="text-[9px] font-bold text-orange-500 mt-1">{c.pendingBookings} active</span>}
                           </div>
                           <div className="flex flex-col items-center">
                             <p className="text-sm font-black text-slate-800">{c.totalOrders}</p>
                             <p className="text-[10px] text-slate-500 flex items-center gap-1"><Package className="w-3 h-3"/> Orders</p>
                             {c.pendingOrders > 0 && <span className="text-[9px] font-bold text-orange-500 mt-1">{c.pendingOrders} pending</span>}
                           </div>
                         </div>
                       </td>
                       <td className="p-4 align-top">
                         <p className="text-sm font-bold text-[#17307a]">USD {c.totalSpend > 0 ? c.totalSpend.toFixed(2) : '0.00'}</p>
                       </td>
                       <td className="p-4 align-top">
                         {c.lastVisit ? (
                           <>
                             <p className="text-[11px] font-bold text-slate-600">
                               {new Date(c.lastVisit).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                             </p>
                             <p className="text-[10px] text-slate-400">
                               {new Date(c.lastVisit).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                             </p>
                           </>
                         ) : (
                           <span className="text-xs text-slate-400">—</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
          
          <div className="w-full lg:w-72 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#17307a]">Customers Summary</h3>
               </div>
               <div className="space-y-4 text-sm font-bold text-slate-700">
                 <div className="flex justify-between items-center">
                   <span className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-blue-100 flex justify-center items-center text-blue-500 text-[10px]">👥</div> 
                     Total Customers
                   </span> 
                   <span className="text-lg font-black">{totalCustomers}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-green-100 flex justify-center items-center text-green-500 text-[10px]">⚡</div> 
                     Active (30d)
                   </span> 
                   <span className="font-bold">{activeThisMonth}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                   <span className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-purple-100 flex justify-center items-center text-purple-500 text-[10px]"><DollarSign className="w-3 h-3"/></div> 
                     Lifetime Value
                   </span> 
                   <span className="font-bold text-[#17307a]">USD {totalLifetimeSpend.toFixed(2)}</span>
                 </div>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
