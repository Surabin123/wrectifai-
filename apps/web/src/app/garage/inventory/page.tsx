'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Plus, Filter, Download, MoreVertical, Edit2 } from 'lucide-react';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await apiClient.get<any>('/garages/my-inventory');
        if (response?.data) {
          setInventory(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Inventory</h1>
                 <p className="text-sm text-slate-500">Track and manage all your spare parts and consumables.</p>
               </div>
               <div className="flex gap-3">
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Add Item</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Download className="w-4 h-4"/> Import</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</button>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
                <div className="flex-1 bg-white border border-blue-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Total Items</p>
                    <p className="text-2xl font-black text-[#17307a]">{inventory.length}</p>
                    <p className="text-[10px] text-slate-400">All items in inventory</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">📦</div>
                </div>
                <div className="flex-1 bg-white border border-green-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Total Value</p>
                    <p className="text-2xl font-black text-[#17307a]">₹{inventory.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.qty_available)), 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Current inventory value</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">₹</div>
                </div>
                <div className="flex-1 bg-white border border-yellow-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Low Stock Items</p>
                    <p className="text-2xl font-black text-[#17307a]">{inventory.filter(i => i.qty_available > 0 && i.qty_available <= 20).length}</p>
                    <p className="text-[10px] text-slate-400">Reorder soon</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center">!</div>
                </div>
                <div className="flex-1 bg-white border border-red-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Out of Stock Items</p>
                    <p className="text-2xl font-black text-[#17307a]">{inventory.filter(i => i.qty_available <= 0).length}</p>
                    <p className="text-[10px] text-slate-400">Need immediate attention</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">×</div>
                </div>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input type="text" placeholder="Search by part name, brand or part number..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <div className="flex gap-3">
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Categories</option></select>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Brands</option></select>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Status</option></select>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>Sort by: Newest</option></select>
               </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Item Details</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Category</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Brand</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Part Number</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Stock</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Unit Price</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Total Value</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Status</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                     <tr><td colSpan={9} className="p-8 text-center text-slate-500">Loading inventory...</td></tr>
                   ) : inventory.length === 0 ? (
                     <tr><td colSpan={9} className="p-8 text-center text-slate-500">No inventory found. Add some items.</td></tr>
                   ) : inventory.map((item) => {
                     const stock = Number(item.qty_available);
                     const price = Number(item.price);
                     const status = stock > 20 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
                     const total = stock * price;
                     return (
                     <tr key={item.inventory_id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4"><div className="flex gap-3 items-center"><div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">{item.image ? <img src={item.image} className="object-cover w-full h-full"/> : '📦'}</div><div><p className="text-sm font-bold text-[#17307a]">{item.name}</p><p className="text-[10px] text-slate-500">{item.description || 'No description'}</p></div></div></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.category}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">-</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.product_id?.substring(0, 8)}</p></td>
                       <td className="p-4 text-center"><p className="text-sm font-bold text-slate-800">{stock}</p><p className="text-[10px] text-slate-400">Pcs</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">₹{price.toLocaleString()}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">₹{total.toLocaleString()}</p></td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${status === 'In Stock' ? 'bg-green-50 text-green-600' : status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>{status}</span>
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
          
          <div className="w-72 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#17307a]">Inventory Summary</h3>
                 <span className="text-[10px] font-bold text-slate-500 border px-2 py-1 rounded bg-slate-50">This Month</span>
               </div>
               <div className="flex items-center gap-4 mb-4">
                 <div className="w-24 h-24 rounded-full border-[8px] border-green-500 border-l-yellow-400 border-b-red-500 border-r-blue-500 flex items-center justify-center font-bold text-xl text-[#17307a]">
                   <div className="text-center">{inventory.length}<div className="text-[9px] font-medium text-slate-400 -mt-1">Total Items</div></div>
                 </div>
                 <div className="space-y-2 text-[10px] font-bold text-slate-600 flex-1">
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> In Stock</span> <span>{inventory.filter(i => i.qty_available > 20).length}</span></div>
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Low Stock</span> <span>{inventory.filter(i => i.qty_available > 0 && i.qty_available <= 20).length}</span></div>
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Out of Stock</span> <span>{inventory.filter(i => i.qty_available <= 0).length}</span></div>
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Total Items</span> <span>{inventory.length}</span></div>
                 </div>
               </div>
               <a href="#" className="block text-[11px] text-blue-600 font-bold mt-2">View Full Report &rarr;</a>
             </Card>
             <Card className="p-5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-[#17307a]">Low Stock Alerts</h3>
                 <span className="text-[10px] text-blue-600 font-bold">View All</span>
               </div>
               <div className="space-y-4 text-xs font-bold text-slate-700">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100"></div>
                      <div><p className="text-xs">Brake Pads (Front)</p><p className="text-[9px] text-slate-500 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> Brembo • BR-FP-2211</p></div>
                    </div>
                    <div className="text-right"><p className="text-xs">18 Sets</p><p className="text-[9px] text-slate-400 font-medium">Min. 25</p></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100"></div>
                      <div><p className="text-xs">Spark Plug</p><p className="text-[9px] text-slate-500 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> NGK • NGK-ILZKAR7B</p></div>
                    </div>
                    <div className="text-right"><p className="text-xs">25 Pcs</p><p className="text-[9px] text-slate-400 font-medium">Min. 40</p></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100"></div>
                      <div><p className="text-xs">Car Battery (55Ah)</p><p className="text-[9px] text-slate-500 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> Exide • EX-55MF</p></div>
                    </div>
                    <div className="text-right"><p className="text-xs">7 Pcs</p><p className="text-[9px] text-slate-400 font-medium">Min. 10</p></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100"></div>
                      <div><p className="text-xs">Wiper Blade (20")</p><p className="text-[9px] text-slate-500 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> Valeo • VA-20A</p></div>
                    </div>
                    <div className="text-right"><p className="text-xs">15 Pcs</p><p className="text-[9px] text-slate-400 font-medium">Min. 25</p></div>
                 </div>
               </div>
             </Card>
             <Card className="p-5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-[#17307a]">Recent Activity</h3>
                 <span className="text-[10px] text-blue-600 font-bold">View All</span>
               </div>
               <div className="space-y-4 pl-6 relative before:absolute before:inset-0 before:ml-2 before:h-full before:w-px before:bg-slate-100">
                 <div className="relative">
                   <div className="absolute w-4 h-4 rounded-full bg-green-100 flex items-center justify-center -left-6 top-1 border-2 border-white"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div></div>
                   <p className="text-[11px] font-bold text-slate-700">Engine Oil 5W-30 added<br/><span className="text-[9px] text-slate-400 font-medium">by Vinay K.</span></p>
                   <p className="text-[9px] text-slate-400 absolute right-0 top-1">Today, 10:20 AM</p>
                 </div>
                 <div className="relative">
                   <div className="absolute w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center -left-6 top-1 border-2 border-white"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div></div>
                   <p className="text-[11px] font-bold text-slate-700">Brake Pads (Front) stock updated<br/><span className="text-[9px] text-slate-400 font-medium">by Amit K.</span></p>
                   <p className="text-[9px] text-slate-400 absolute right-0 top-1">Today, 09:45 AM</p>
                 </div>
                 <div className="relative">
                   <div className="absolute w-4 h-4 rounded-full bg-red-100 flex items-center justify-center -left-6 top-1 border-2 border-white"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div></div>
                   <p className="text-[11px] font-bold text-slate-700">Air Filter <span className="text-red-500">marked as out of stock</span><br/><span className="text-[9px] text-slate-400 font-medium">by Manoj</span></p>
                   <p className="text-[9px] text-slate-400 absolute right-0 top-1">Today, 09:10 AM</p>
                 </div>
                 <div className="relative">
                   <div className="absolute w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center -left-6 top-1 border-2 border-white"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div></div>
                   <p className="text-[11px] font-bold text-slate-700">Clutch Kit stock updated<br/><span className="text-[9px] text-slate-400 font-medium">by Vinay K.</span></p>
                   <p className="text-[9px] text-slate-400 absolute right-0 top-1">Yesterday, 06:30 PM</p>
                 </div>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
