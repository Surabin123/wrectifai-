'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Search, Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Modal } from '@/components/common/modal';

interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_discount?: number;
  min_order_amount?: number;
  valid_from?: string;
  valid_until?: string;
  usage_limit?: number;
  per_user_limit?: number;
  active: boolean;
  offer_type: 'SERVICE' | 'PARTS' | 'COMBO' | 'GLOBAL';
  applicable_item_id?: string;
  terms_conditions?: string;
}

export function GarageOffersContent() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Items for dropdown
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', title: '' });

  const [formData, setFormData] = useState<Partial<Offer>>({
    code: '',
    title: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 0,
    offer_type: 'SERVICE',
    active: true,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Offer[]>('/garages/my-offers');
      setOffers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const s = await apiClient.get<any[]>('/garages/my-services');
      const i = await apiClient.get<any[]>('/garages/my-inventory');
      setServices(s || []);
      setInventory(i || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchItems();
  }, []);

  const handleAddClick = () => {
    setFormData({
      code: '', title: '', description: '', discount_type: 'PERCENTAGE', 
      discount_value: 0, offer_type: 'SERVICE', active: true
    });
    setErrorMsg('');
    setShowAddModal(true);
  };

  const submitOffer = async (isEdit: boolean) => {
    setErrorMsg('');
    if (!formData.code || !formData.title || formData.discount_value === undefined) {
      setErrorMsg('Code, title, and discount value are required.');
      return;
    }
    try {
      if (isEdit && selectedOffer) {
        await apiClient.put(`/garages/my-offers/${selectedOffer.id}`, formData);
      } else {
        await apiClient.post('/garages/my-offers', formData);
      }
      setShowAddModal(false);
      setShowEditModal(false);
      fetchOffers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save offer.');
    }
  };

  const filteredOffers = offers.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.title.toLowerCase().includes(q) || o.code.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#17307a] mb-1">Offers & Promos</h1>
            <p className="text-sm text-slate-500">Manage discounts and promotions for your customers.</p>
          </div>
          <button onClick={handleAddClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4"/> Create Offer
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search offers by title or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" 
            />
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 text-xs font-bold text-slate-500 border-b">Offer Details</th>
                <th className="p-4 text-xs font-bold text-slate-500 border-b">Type</th>
                <th className="p-4 text-xs font-bold text-slate-500 border-b">Discount</th>
                <th className="p-4 text-xs font-bold text-slate-500 border-b">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading offers...</td></tr>
              ) : filteredOffers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No offers found.</td></tr>
              ) : filteredOffers.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-500">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{o.title}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{o.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-600">{o.offer_type}</td>
                  <td className="p-4 text-sm font-bold text-green-600">
                    {o.discount_type === 'PERCENTAGE' ? `${o.discount_value}%` : `₹${o.discount_value}`} OFF
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${o.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {o.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelectedOffer(o); setFormData(o); setErrorMsg(''); setShowEditModal(true); }} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => setDeleteModal({ isOpen: true, id: o.id, title: o.title })} className="p-1.5 rounded-md hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={showAddModal || showEditModal} 
        onClose={() => { setShowAddModal(false); setShowEditModal(false); }} 
        title={showAddModal ? "Create Offer" : "Edit Offer"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Offer Code</label>
              <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. SUMMER20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Offer Type</label>
              <select value={formData.offer_type} onChange={e => setFormData({...formData, offer_type: e.target.value as any})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="SERVICE">Service Offer</option>
                <option value="PARTS">Parts Offer</option>
                <option value="COMBO">Combo Offer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Offer Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 20% Off AC Service" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]" placeholder="Explain the offer..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
              <select value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value as any})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value</label>
              <input type="number" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Applicable Item (Optional)</label>
            <select value={formData.applicable_item_id || ''} onChange={e => setFormData({...formData, applicable_item_id: e.target.value || undefined})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">-- Apply to any --</option>
              {formData.offer_type === 'SERVICE' || formData.offer_type === 'COMBO' ? (
                <optgroup label="Services">
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ) : null}
              {formData.offer_type === 'PARTS' || formData.offer_type === 'COMBO' ? (
                <optgroup label="Products">
                  {inventory.map(i => <option key={i.inventory_id} value={i.inventory_id}>{i.name}</option>)}
                </optgroup>
              ) : null}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="activeOffer" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
            <label htmlFor="activeOffer" className="text-sm font-bold text-slate-700">Offer is Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-4 py-2 text-slate-600 border rounded-lg text-sm">Cancel</button>
            <button onClick={() => submitOffer(showEditModal)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Save Offer</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, id: '', title: '' })} 
        title="Remove Offer"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Are you sure you want to remove <strong>{deleteModal.title}</strong>? Historical data will be preserved, but customers will no longer see this offer.</p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setDeleteModal({ isOpen: false, id: '', title: '' })} className="px-4 py-2 text-slate-600 border rounded-lg text-sm">Cancel</button>
            <button 
              onClick={async () => {
                try {
                  await apiClient.delete(`/garages/my-offers/${deleteModal.id}`);
                  setDeleteModal({ isOpen: false, id: '', title: '' });
                  fetchOffers();
                } catch(e) {
                  console.error(e);
                }
              }} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
