'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Search, Plus, Filter, Edit2, MoreVertical, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [platformServices, setPlatformServices] = useState<any[]>([]);
  
  const [selectedService, setSelectedService] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    platformServiceId: '',
    price: 0,
    durationMins: 60,
    isActive: true
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddServiceClick = async () => {
    try {
      // Fetch platform services to let them choose
      const response = await apiClient.get<any>('/services'); 
      if (response?.data?.data) {
        setPlatformServices(response.data.data);
      }
      setFormData({ platformServiceId: '', price: 0, durationMins: 60, isActive: true });
      setShowAddModal(true);
    } catch (err) {
      console.error('Failed to fetch platform services:', err);
    }
  };

  const submitAddService = async () => {
    if (!formData.platformServiceId) return;
    try {
      await apiClient.post('/garages/my-services', {
        platformServiceId: formData.platformServiceId,
        price: Number(formData.price),
        durationMins: Number(formData.durationMins)
      });
      setShowAddModal(false);
      fetchServices();
    } catch (err) {
      console.error('Failed to add service:', err);
      alert('Failed to add service');
    }
  };

  const handleEditClick = (service: any) => {
    setSelectedService(service);
    setFormData({
      platformServiceId: '',
      price: service.price,
      durationMins: service.duration_mins || 60,
      isActive: service.is_active
    });
    setShowEditModal(true);
  };

  const submitEditService = async () => {
    try {
      await apiClient.put(`/garages/my-services/` + selectedService.id, {
        price: Number(formData.price),
        duration_mins: Number(formData.durationMins),
        is_active: formData.isActive
      });
      setShowEditModal(false);
      fetchServices();
    } catch (err) {
      console.error('Failed to edit service:', err);
      alert('Failed to update service');
    }
  };

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
                 <button onClick={handleAddServiceClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Add Service</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</button>
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
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.duration_mins ? item.duration_mins + ' mins' : 'N/A'}</p></td>
                       <td className="p-4"><p className="text-xs font-bold text-[#17307a]">₹{price.toLocaleString()}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-400 line-through">₹{basePrice.toLocaleString()}</p></td>
                       <td className="p-4">
                         <span className={status === 'Active' ? 'px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600' : 'px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600'}>{status}</span>
                       </td>
                       <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                           <button onClick={() => handleEditClick(item)} className="p-1.5 rounded-md hover:bg-slate-200 text-blue-500 bg-blue-50 border border-blue-100"><Edit2 className="w-3.5 h-3.5"/></button>
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

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#17307a]">Add Service</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Service</label>
                  <select 
                    value={formData.platformServiceId}
                    onChange={(e) => {
                      const sel = platformServices.find(p => p.id === e.target.value);
                      setFormData({...formData, platformServiceId: e.target.value, price: sel?.base_price || 0});
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">-- Choose a service --</option>
                    {platformServices.map(ps => (
                      <option key={ps.id} value={ps.id}>{ps.name} (Base: ₹{ps.base_price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price (₹)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input type="number" value={formData.durationMins} onChange={(e) => setFormData({...formData, durationMins: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={submitAddService} disabled={!formData.platformServiceId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Add Service</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedService && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#17307a]">Edit Service</h3>
                <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              <div className="mb-6">
                <p className="font-bold text-slate-800">{selectedService.name}</p>
                <p className="text-xs text-slate-500">Base Price: ₹{selectedService.basePrice}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price (₹)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input type="number" value={formData.durationMins} onChange={(e) => setFormData({...formData, durationMins: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-blue-600" />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Service is Active</label>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={submitEditService} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
