'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Search, Plus, Filter, Edit2, X, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

interface FormData {
  platformServiceId: string;
  price: string | number;
  durationMins: string | number;
  description: string;
  isActive: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [platformServices, setPlatformServices] = useState<any[]>([]);
  
  const [selectedService, setSelectedService] = useState<any>(null);
  
  const [formData, setFormData] = useState<FormData>({
    platformServiceId: '',
    price: '',
    durationMins: 60,
    description: '',
    isActive: true
  });
  
  // Request Modal State
  const [addTab, setAddTab] = useState<'select' | 'request'>('select');
  const [platformSearch, setPlatformSearch] = useState('');
  const [requestData, setRequestData] = useState({
    name: '',
    category: '',
    description: '',
    suggestedDuration: '',
    suggestedPrice: '',
    image: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  
  const [validationError, setValidationError] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any>('/garages/my-services');
      if (Array.isArray(response)) {
        setServices(response);
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
      const response = await apiClient.get<any>('/services/platform'); 
      if (Array.isArray(response)) {
        setPlatformServices(response);
      }
      setFormData({ platformServiceId: '', price: '', durationMins: 60, description: '', isActive: true });
      setRequestData({ name: '', category: '', description: '', suggestedDuration: '', suggestedPrice: '', image: '' });
      setImagePreview('');
      setPlatformSearch('');
      setAddTab('select');
      setValidationError('');
      setShowAddModal(true);
    } catch (err) {
      console.error('Failed to fetch platform services:', err);
    }
  };

  const submitAddService = async () => {
    if (!formData.platformServiceId) {
      setValidationError('Please select a service.');
      return;
    }
    
    const parsedPrice = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    const parsedDuration = typeof formData.durationMins === 'string' ? parseInt(formData.durationMins, 10) : formData.durationMins;
    
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setValidationError('Price must be a valid non-negative number.');
      return;
    }
    if (isNaN(parsedDuration) || parsedDuration < 0) {
      setValidationError('Duration must be a valid non-negative integer.');
      return;
    }

    try {
      await apiClient.post('/garages/my-services', {
        platformServiceId: formData.platformServiceId,
        price: parsedPrice,
        durationMins: parsedDuration
      });
      setShowAddModal(false);
      fetchServices();
    } catch (err) {
      console.error('Failed to add service:', err);
      setValidationError('Failed to add service. It may already exist.');
    }
  };

  const submitRequestService = async () => {
    if (!requestData.name || !requestData.category) {
      setValidationError('Name and category are required.');
      return;
    }
    
    try {
      await apiClient.post('/garages/my-services/request', {
        ...requestData,
        suggestedPrice: requestData.suggestedPrice ? parseFloat(requestData.suggestedPrice) : undefined,
        suggestedDuration: requestData.suggestedDuration ? parseInt(requestData.suggestedDuration, 10) : undefined
      });
      setShowAddModal(false);
      alert('Service request submitted successfully! An admin will review it shortly.');
    } catch (err) {
      console.error('Failed to request service:', err);
      setValidationError('Failed to submit service request.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setValidationError('Image must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setRequestData({ ...requestData, image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleEditClick = (service: any) => {
    setSelectedService(service);
    setFormData({
      platformServiceId: '',
      price: service.price,
      durationMins: service.duration_mins || 60,
      description: service.description || '',
      isActive: service.is_active
    });
    setValidationError('');
    setShowEditModal(true);
  };

  const submitEditService = async () => {
    const parsedPrice = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    const parsedDuration = typeof formData.durationMins === 'string' ? parseInt(formData.durationMins, 10) : formData.durationMins;
    
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setValidationError('Price must be a valid non-negative number.');
      return;
    }
    if (isNaN(parsedDuration) || parsedDuration < 0) {
      setValidationError('Duration must be a valid non-negative integer.');
      return;
    }

    try {
      await apiClient.put(`/garages/my-services/` + selectedService.id, {
        price: parsedPrice,
        duration_mins: parsedDuration,
        description: formData.description,
        is_active: formData.isActive
      });
      setShowEditModal(false);
      fetchServices();
    } catch (err) {
      console.error('Failed to edit service:', err);
      setValidationError('Failed to update service.');
    }
  };
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    let val = e.target.value;
    
    if (val === '') {
      setFormData({ ...formData, [field]: '' });
      return;
    }

    // Only allow numbers and optional decimal for price, integers for duration
    const regex = field === 'price' ? /^\d*\.?\d*$/ : /^\d*$/;
    if (!regex.test(val)) return;

    // Remove leading zeros unless it's just '0' or starts with '0.'
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
      if (val === '') val = '0';
      if (val.startsWith('.')) val = '0' + val;
    }

    setFormData({ ...formData, [field]: val });
  };

  const filteredServices = services.filter(s => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(lowerQ) || s.category?.toLowerCase().includes(lowerQ);
  });

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
               </div>
             </div>
             
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search by service name or category..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" 
                 />
               </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-xs font-bold text-slate-500 border-b w-1/3">Service Details</th>
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
                   ) : filteredServices.length === 0 ? (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-500">No services found.</td></tr>
                   ) : filteredServices.map((item) => {
                     const price = Number(item.price);
                     const basePrice = Number(item.basePrice);
                     const status = item.is_active ? 'Active' : 'Inactive';
                     
                     // Dynamically load the correct Lucide icon, or fallback
                     const IconComponent = item.icon && (LucideIcons as any)[item.icon] ? (LucideIcons as any)[item.icon] : null;

                     return (
                     <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4">
                         <div className="flex gap-3 items-center">
                           <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-lg shrink-0">
                             {IconComponent ? <IconComponent className="w-5 h-5 text-slate-500" /> : '🔧'}
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm font-bold text-[#17307a] truncate">{item.name}</p>
                             <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={item.description}>{item.description}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600 truncate">{item.category}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.duration_mins ? item.duration_mins + ' mins' : 'N/A'}</p></td>
                       <td className="p-4"><p className="text-xs font-bold text-[#17307a]">{formatCurrency(price)}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-400 line-through">{formatCurrency(basePrice)}</p></td>
                       <td className="p-4">
                         <span className={status === 'Active' ? 'px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600' : 'px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600'}>{status}</span>
                       </td>
                       <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                           <button onClick={() => handleEditClick(item)} className="p-1.5 rounded-md hover:bg-slate-200 text-blue-500 bg-blue-50 border border-blue-100" title="Edit Service"><Edit2 className="w-3.5 h-3.5"/></button>
                           <button onClick={async () => {
                             if(confirm('Are you sure you want to remove this service from your garage? This will not delete historical bookings, but it will no longer be offered.')) {
                               try {
                                 await apiClient.delete('/garages/my-services/' + item.id);
                                 fetchServices();
                               } catch(e) {
                                 alert('Failed to remove service.');
                               }
                             }
                           }} className="p-1.5 rounded-md hover:bg-slate-200 text-red-500 bg-red-50 border border-red-100" title="Remove from Garage"><Trash2 className="w-3.5 h-3.5"/></button>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-[#17307a]">Add Service</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              
              <div className="flex border-b border-slate-200 mb-6">
                <button 
                  className={`px-4 py-2 text-sm font-bold border-b-2 ${addTab === 'select' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setAddTab('select')}
                >
                  Select Existing
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-bold border-b-2 ${addTab === 'request' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setAddTab('request')}
                >
                  Request New Service
                </button>
              </div>
              
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                  {validationError}
                </div>
              )}
              
              {addTab === 'select' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Search Platform Catalog</label>
                    <input 
                      type="text"
                      placeholder="Search for a service..."
                      value={platformSearch}
                      onChange={(e) => setPlatformSearch(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                    />
                    
                    <div className="max-h-40 overflow-y-auto border rounded-lg divide-y bg-slate-50">
                      {platformServices
                        .filter(p => p.name.toLowerCase().includes(platformSearch.toLowerCase()) || p.category.toLowerCase().includes(platformSearch.toLowerCase()))
                        .map(ps => (
                        <div 
                          key={ps.id} 
                          onClick={() => setFormData({...formData, platformServiceId: ps.id, price: ps.base_price || ''})}
                          className={`p-2 cursor-pointer text-sm hover:bg-blue-50 ${formData.platformServiceId === ps.id ? 'bg-blue-100 border-l-2 border-blue-600' : ''}`}
                        >
                          <p className="font-bold text-slate-700">{ps.name}</p>
                          <p className="text-[10px] text-slate-500">{ps.category} • Base: {formatCurrency(ps.base_price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {formData.platformServiceId && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <p className="text-xs font-bold text-slate-700">{platformServices.find(p => p.id === formData.platformServiceId)?.name}</p>
                       <p className="text-[10px] text-slate-500 mt-1">{platformServices.find(p => p.id === formData.platformServiceId)?.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Price</label>
                    <input type="text" inputMode="decimal" value={formData.price} onChange={(e) => handleNumericChange(e, 'price')} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Duration (Mins)</label>
                    <input type="text" inputMode="numeric" value={formData.durationMins} onChange={(e) => handleNumericChange(e, 'durationMins')} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 60" />
                  </div>
                  
                  <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                    <button onClick={submitAddService} disabled={!formData.platformServiceId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Add Service</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Service Name *</label>
                    <input type="text" value={requestData.name} onChange={(e) => setRequestData({...requestData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Custom Tuning" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                    <input type="text" value={requestData.category} onChange={(e) => setRequestData({...requestData, category: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Performance" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Service Image</label>
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                        <button onClick={() => { setImagePreview(''); setRequestData({...requestData, image: ''}) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                      </div>
                    ) : (
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea value={requestData.description} onChange={(e) => setRequestData({...requestData, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Suggested Price</label>
                      <input type="text" inputMode="decimal" value={requestData.suggestedPrice} onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setRequestData({...requestData, suggestedPrice: val});
                      }} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Suggested Duration</label>
                      <input type="text" inputMode="numeric" value={requestData.suggestedDuration} onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         setRequestData({...requestData, suggestedDuration: val});
                      }} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mins" />
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                    <button onClick={submitRequestService} disabled={!requestData.name || !requestData.category} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Submit Request</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedService && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#17307a]">Edit Service</h3>
                <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                  {validationError}
                </div>
              )}
              
              <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-800">{selectedService.name}</p>
                <p className="text-xs text-slate-600 mb-2">Category: {selectedService.category}</p>
                <p className="text-[10px] text-slate-500">Base Price: {formatCurrency(selectedService.basePrice)}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price</label>
                  <input type="text" inputMode="decimal" value={formData.price} onChange={(e) => handleNumericChange(e, 'price')} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Duration (Mins)</label>
                  <input type="text" inputMode="numeric" value={formData.durationMins} onChange={(e) => handleNumericChange(e, 'durationMins')} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Provide specific details about how your garage handles this service."
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Service is currently Active</label>
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

