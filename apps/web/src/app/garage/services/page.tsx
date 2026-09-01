'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Plus, Filter, Edit2, MoreVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await apiClient.get<any>('/garages/my-services');
        if (response?.data) {
          setServices(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Services</h1>
                 <p className="text-sm text-slate-500">Manage your offered services and pricing.</p>
               </div>
               <div className="flex gap-3">
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Add Service</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</button>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
                <div className="flex-1 bg-white border border-blue-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Total Services</p>
                    <p className="text-2xl font-black text-[#17307a]">{services.length}</p>
                    <p className="text-[10px] text-slate-400">All available services</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">🔧</div>
                </div>
                <div className="flex-1 bg-white border border-green-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Active Services</p>
                    <p className="text-2xl font-black text-[#17307a]">{services.filter(s => s.is_active).length}</p>
                    <p className="text-[10px] text-slate-400">Currently bookable</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">✓</div>
                </div>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input type="text" placeholder="Search by service name..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Service Details</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Category</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Duration</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Your Price</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Base Price</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Status</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading services...</td></tr>
                   ) : services.length === 0 ? (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-500">No services found. Add some services.</td></tr>
                   ) : services.map((item) => {
                     const price = Number(item.price);
                     const basePrice = Number(item.basePrice);
                     const status = item.is_active ? 'Active' : 'Inactive';
                     return (
                     <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4"><div className="flex gap-3 items-center"><div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-lg">{item.icon || '🔧'}</div><div><p className="text-sm font-bold text-[#17307a]">{item.name}</p><p className="text-[10px] text-slate-500 truncate max-w-xs">{item.description}</p></div></div></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.category}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.duration_mins ? `${item.duration_mins} mins` : 'N/A'}</p></td>
                       <td className="p-4"><p className="text-xs font-bold text-[#17307a]">₹{price.toLocaleString()}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-400 line-through">₹{basePrice.toLocaleString()}</p></td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600'}`}>{status}</span>
                       </td>
                       <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                           <button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-500 bg-blue-50 border border-blue-100"><Edit2 className="w-3.5 h-3.5"/></button>
                           <button className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 bg-slate-50 border border-slate-100"><MoreVertical className="w-3.5 h-3.5"/></button>
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
