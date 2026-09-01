'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Plus, Filter, MessageSquare, Eye, MoreVertical, Star, Download } from 'lucide-react';

export default function CustomersPage() {
  const customers = [
    { id: '1', name: 'Ananya Patel', phone: '+91 98765 43210', email: 'ananya.patel@email.com', vehicles: ['Toyota Innova TS08HK2345'], extras: '+1 more', services: 12, pending: 1, spend: '₹42,850', visit: '16 May 2025', time: '10:20 AM', rating: 4.8, count: 28 },
    { id: '2', name: 'Rahul Verma', phone: '+91 91234 56789', email: 'rahul.verma@email.com', vehicles: ['Mahindra XUV700 TS09KL4567'], extras: null, services: 8, pending: 2, spend: '₹31,560', visit: '15 May 2025', time: '04:15 PM', rating: 4.6, count: 18 },
    { id: '3', name: 'Sanjay Verma', phone: '+91 99887 76655', email: 'sanjay.verma@email.com', vehicles: ['BMW 320d TS11PQ3456'], extras: null, services: 15, pending: 0, spend: '₹58,430', visit: '15 May 2025', time: '02:45 PM', rating: 4.9, count: 36 },
    { id: '4', name: 'Priya Reddy', phone: '+91 97011 22334', email: 'priya.reddy@email.com', vehicles: ['Hyundai i20 AP39AB5678'], extras: null, services: 6, pending: 1, spend: '₹18,250', visit: '15 May 2025', time: '11:30 AM', rating: 4.5, count: 12 },
    { id: '5', name: 'Karthik R.', phone: '+91 90000 88999', email: 'karthik.r@email.com', vehicles: ['Volkswagen Polo TS13TU2345'], extras: '+1 more', services: 9, pending: 0, spend: '₹26,100', visit: '14 May 2025', time: '06:20 PM', rating: 4.7, count: 22 },
  ];

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Customers</h1>
                 <p className="text-sm text-slate-500">Manage your customers and their vehicle & service history.</p>
               </div>
               <div className="flex gap-3">
                 <button className="bg-[#17307a] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Add Customer</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Download className="w-4 h-4"/> Import</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</button>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2">
               <button className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">All Customers <span className="bg-white text-blue-600 text-[10px] px-1.5 rounded-full ml-1">256</span></button>
               <button className="bg-white text-slate-600 border px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active <span className="text-slate-400 text-[10px] ml-1">198</span></button>
               <button className="bg-white text-slate-600 border px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Inactive <span className="text-slate-400 text-[10px] ml-1">58</span></button>
               <button className="bg-white text-slate-600 border px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> VIP Customers <span className="text-slate-400 text-[10px] ml-1">23</span></button>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-96">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input type="text" placeholder="Search by name, phone, email or vehicle number..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <div className="flex gap-3">
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Vehicles</option></select>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Service Types</option></select>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>Sort by: Newest</option></select>
               </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 w-10"><input type="checkbox" className="rounded text-blue-600" /></th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Customer</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Vehicles</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Total Services</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Pending Jobs</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Lifetime Spending</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Last Visit</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Rating</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {customers.map(c => (
                     <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                       <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-200"></div><div><p className="text-sm font-bold text-[#17307a]">{c.name}</p><p className="text-[11px] text-slate-600 font-medium">{c.phone}</p><p className="text-[10px] text-slate-400">{c.email}</p></div></div></td>
                       <td className="p-4"><div className="flex items-start gap-2"><Car className="w-4 h-4 text-slate-400 mt-0.5"/><div><p className="text-[11px] font-bold text-slate-700">{c.vehicles[0].split(' ')[0]} {c.vehicles[0].split(' ')[1]}</p><p className="text-[10px] text-slate-500">{c.vehicles[0].split(' ')[2]}</p>{c.extras && <span className="inline-block mt-1 text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c.extras}</span>}</div></div></td>
                       <td className="p-4 text-center"><p className="text-sm font-black text-slate-800">{c.services}</p><p className="text-[10px] text-slate-500">Completed</p></td>
                       <td className="p-4 text-center"><p className="text-sm font-black text-blue-600">{c.pending}</p><p className="text-[10px] text-blue-500 font-medium">{c.pending > 0 ? 'In Progress' : 'None'}</p></td>
                       <td className="p-4"><p className="text-sm font-bold text-[#17307a]">{c.spend}</p></td>
                       <td className="p-4"><p className="text-[11px] font-bold text-slate-600">{c.visit}</p><p className="text-[10px] text-slate-400">{c.time}</p></td>
                       <td className="p-4">
                         <div className="flex items-center gap-1 text-yellow-400 mb-1"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                         <p className="text-[10px] font-bold text-slate-700">{c.rating} <span className="text-slate-400 font-normal">({c.count})</span></p>
                       </td>
                       <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                           <button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-500 bg-blue-50 border border-blue-100"><MessageSquare className="w-3.5 h-3.5"/></button>
                           <button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-500 bg-blue-50 border border-blue-100"><Eye className="w-3.5 h-3.5"/></button>
                           <button className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 bg-slate-50 border border-slate-100"><MoreVertical className="w-3.5 h-3.5"/></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
          
          <div className="w-72 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#17307a]">Customers Summary</h3>
                 <span className="text-[10px] font-bold text-slate-500 border px-2 py-1 rounded bg-slate-50">This Month</span>
               </div>
               <div className="space-y-4 text-sm font-bold text-slate-700">
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-blue-100 flex justify-center items-center text-blue-500 text-[10px]">👥</div> Total Customers</span> <span className="text-lg font-black">256</span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-green-100 flex justify-center items-center text-green-500 text-[10px]">⚡</div> Active Customers</span> <span className="font-bold">198</span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-yellow-100 flex justify-center items-center text-yellow-600 text-[10px]">⭐</div> New Customers</span> <span className="font-bold">18</span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-red-100 flex justify-center items-center text-red-500 text-[10px]">🔄</div> Returning Customers</span> <span className="font-bold">43</span></div>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

// Ensure Car is imported
import { Car } from 'lucide-react';
