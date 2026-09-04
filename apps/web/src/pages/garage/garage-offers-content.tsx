'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Search, Plus, Edit2, Trash2, Tag, Percent, Image as ImageIcon, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from '@/components/common/modal';
import { Card } from '@/components/common/card';
import { formatCurrency } from '@/lib/currency';
import { getSavedCity, getCurrencyCodeForCity } from '@/utils/location';

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

interface Deal {
  id: string;
  badge: string;
  title: string;
  description: string;
  numericPrice: number;
  strikePrice?: number;
  discountPercent?: number;
  validFrom?: string;
  validTill?: string;
  image?: string;
  active: boolean;
  bullets?: string[];
}

export default function GarageOffersContent() {
  const [activeTab, setActiveTab] = useState<'offers' | 'deals'>('offers');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown data
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  // Modals for Offers
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isEditOffer, setIsEditOffer] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // Modals for Deals
  const [showDealModal, setShowDealModal] = useState(false);
  const [isEditDeal, setIsEditDeal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', title: '', type: 'offer' });

  // Form States
  const [offerForm, setOfferForm] = useState<Partial<Offer>>({
    code: '', title: '', description: '', discount_type: 'PERCENTAGE', discount_value: '' as any, offer_type: 'SERVICE', active: true
  });
  
  const [dealForm, setDealForm] = useState<Partial<Deal>>({
    title: '', badge: '', description: '', numericPrice: '' as any, active: true
  });
  const [imagePreview, setImagePreview] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Derive the garage's canonical currency code from the saved city cookie
  const [currencyCode, setCurrencyCode] = useState<string>('INR');
  useEffect(() => {
    const city = getSavedCity();
    if (city) setCurrencyCode(getCurrencyCodeForCity(city));
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [o, d, s, i] = await Promise.all([
        apiClient.get<Offer[]>('/garages/my-offers'),
        apiClient.get<Deal[]>('/garages/my-deals'),
        apiClient.get<any[]>('/garages/my-services'),
        apiClient.get<any[]>('/garages/my-inventory')
      ]);
      setOffers(o || []);
      setDeals(d || []);
      setServices(s || []);
      setInventory(i || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setDealForm({ ...dealForm, image: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const getLocalDatetime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleDatetimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, setForm: any, form: any) => {
    const val = e.target.value;
    if (!val) {
      setForm({ ...form, [field]: undefined });
      return;
    }
    // Convert local input back to UTC ISO string
    const date = new Date(val);
    setForm({ ...form, [field]: date.toISOString() });
  };

  const submitOffer = async () => {
    try {
      if (!offerForm.code || !offerForm.title || offerForm.discount_value === undefined) {
        throw new Error('Please fill all required fields.');
      }
      if (!offerForm.valid_from || !offerForm.valid_until) {
        throw new Error('Valid From and Valid Until dates are mandatory.');
      }
      const fromDate = new Date(offerForm.valid_from);
      const untilDate = new Date(offerForm.valid_until);
      if (fromDate >= untilDate) {
        throw new Error('Valid Until must be after Valid From.');
      }
      if (isEditOffer && selectedOffer) {
        await apiClient.put(`/garages/my-offers/${selectedOffer.id}`, offerForm);
      } else {
        await apiClient.post('/garages/my-offers', offerForm);
      }
      setShowOfferModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save promo code.');
    }
  };


  const submitDeal = async () => {
    try {
      if (!dealForm.title || dealForm.numericPrice === undefined) {
        throw new Error('Please fill all required fields.');
      }
      if (isEditDeal && selectedDeal) {
        await apiClient.put(`/garages/my-deals/${selectedDeal.id}`, dealForm);
      } else {
        await apiClient.post('/garages/my-deals', dealForm);
      }
      setShowDealModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save deal.');
    }
  };

  const toggleOfferStatus = async (o: Offer) => {
    await apiClient.put(`/garages/my-offers/${o.id}`, { ...o, active: !o.active });
    fetchData();
  };
  
  const toggleDealStatus = async (d: Deal) => {
    await apiClient.put(`/garages/my-deals/${d.id}`, { active: !d.active });
    fetchData();
  };

  const filteredOffers = offers.filter(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()) || o.code.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDeals = deals.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#17307a] mb-1">Offers & Seasonal Deals</h1>
            <p className="text-sm text-slate-500">Manage promo codes and seasonal care combos for your customers.</p>
          </div>
          <button 
            onClick={() => {
              if (activeTab === 'offers') {
                setOfferForm({ code: '', title: '', description: '', discount_type: 'PERCENTAGE', discount_value: '' as any, offer_type: 'SERVICE', active: true });
                setIsEditOffer(false); setShowOfferModal(true); setErrorMsg('');
              } else {
                setDealForm({ title: '', badge: '', description: '', numericPrice: '' as any, active: true });
                setImagePreview(''); setIsEditDeal(false); setShowDealModal(true); setErrorMsg('');
              }
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> {activeTab === 'offers' ? 'Create Promo Code' : 'Create Combo Deal'}
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button onClick={() => setActiveTab('offers')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'offers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Promo Codes</button>
          <button onClick={() => setActiveTab('deals')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'deals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Seasonal Combos</button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder={`Search ${activeTab === 'offers' ? 'offers' : 'deals'}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading {activeTab}...</div>
      ) : activeTab === 'offers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 font-medium">No promo codes found. Create one to attract more customers.</div>
          ) : (
            filteredOffers.map((o) => (
              <Card key={o.id} className="overflow-hidden flex flex-col border-slate-200">
                <div className="p-5 flex-1 relative group">
                  <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setSelectedOffer(o); setOfferForm(o); setIsEditOffer(true); setShowOfferModal(true); }} className="p-1.5 rounded-full bg-white shadow hover:bg-slate-50 text-slate-700" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleOfferStatus(o)} className="p-1.5 rounded-full bg-white shadow hover:bg-slate-50 text-slate-700" title={o.active ? 'Deactivate' : 'Activate'}>{o.active ? <XCircle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}</button>
                    <button onClick={() => setDeleteModal({ isOpen: true, id: o.id, title: o.title, type: 'offer' })} className="p-1.5 rounded-full bg-white shadow hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex gap-3 mb-3 items-start">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${o.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{o.active ? 'ACTIVE' : 'INACTIVE'}</span>
                      <h3 className="font-bold text-slate-800 leading-tight">{o.title}</h3>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-3 flex justify-between items-center">
                    <span className="font-mono text-sm font-bold text-blue-700">{o.code}</span>
                    <span className="text-sm font-black text-green-600">
                      {o.discount_type === 'PERCENTAGE'
                        ? `${o.discount_value}% OFF`
                        : `${formatCurrency(o.discount_value, currencyCode)} OFF`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{o.description}</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Valid From:</span>
                      <span className="font-bold text-slate-700">{o.valid_from ? new Date(o.valid_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Valid Until:</span>
                      <span className="font-bold text-slate-700">{o.valid_until ? new Date(o.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 font-medium">No seasonal deals found. Create a combo package!</div>
          ) : (
            filteredDeals.map((d) => (
              <Card key={d.id} className="overflow-hidden flex flex-col border-slate-200">
                {d.image ? (
                  <div className="h-32 w-full bg-slate-200 relative">
                    <img src={d.image} alt={d.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 shadow-sm">{d.badge}</div>
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-r from-blue-500 to-indigo-600 relative p-4 flex items-end">
                     <div className="absolute top-2 left-2 bg-white/30 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white">{d.badge}</div>
                     <Percent className="w-16 h-16 text-white/20 absolute -right-2 -bottom-2" />
                  </div>
                )}
                <div className="p-4 flex-1 relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setSelectedDeal(d); setDealForm(d); setImagePreview(d.image || ''); setIsEditDeal(true); setShowDealModal(true); }} className="p-1.5 rounded-full bg-white shadow hover:bg-slate-50 text-slate-700"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleDealStatus(d)} className="p-1.5 rounded-full bg-white shadow hover:bg-slate-50 text-slate-700">{d.active ? <XCircle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}</button>
                    <button onClick={() => setDeleteModal({ isOpen: true, id: d.id, title: d.title, type: 'deal' })} className="p-1.5 rounded-full bg-white shadow hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 pr-16 leading-tight">{d.title}</h3>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-lg font-black text-[#17307a]">{formatCurrency(d.numericPrice, currencyCode)}</span>
                    {d.strikePrice && <span className="text-xs text-slate-400 line-through mb-1">{formatCurrency(d.strikePrice, currencyCode)}</span>}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{d.description}</p>
                </div>
                <div className={`p-2 text-center text-[10px] font-bold uppercase tracking-wider ${d.active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                  {d.active ? 'Active on Dashboard' : 'Currently Hidden'}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Offer Modal */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} title={isEditOffer ? "Edit Promo Code" : "Create Promo Code"}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Promo Code</label>
              <input type="text" value={offerForm.code} onChange={e => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. SUMMER20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Category</label>
              <select value={offerForm.offer_type} onChange={e => setOfferForm({ ...offerForm, offer_type: e.target.value as any })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="SERVICE">Services</option><option value="PARTS">Products</option><option value="COMBO">Combos</option><option value="GLOBAL">Global/All</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Display Title</label>
            <input type="text" value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 20% Off AC Service" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
              <select value={offerForm.discount_type} onChange={e => setOfferForm({ ...offerForm, discount_type: e.target.value as any })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Flat Off ({currencyCode})</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value</label>
              <input type="number" value={offerForm.discount_value === undefined ? '' : offerForm.discount_value} onChange={e => setOfferForm({ ...offerForm, discount_value: e.target.value ? Number(e.target.value) : '' as any })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid From</label>
              <input type="datetime-local" value={getLocalDatetime(offerForm.valid_from)} onChange={e => handleDatetimeChange(e, 'valid_from', setOfferForm, offerForm)} min={getLocalDatetime(new Date().toISOString())} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until</label>
              <input type="datetime-local" value={getLocalDatetime(offerForm.valid_until)} onChange={e => handleDatetimeChange(e, 'valid_until', setOfferForm, offerForm)} min={offerForm.valid_from ? getLocalDatetime(offerForm.valid_from) : getLocalDatetime(new Date().toISOString())} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowOfferModal(false)} className="px-4 py-2 text-slate-600 border rounded-lg text-sm">Cancel</button>
            <button onClick={submitOffer} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Save Promo Code</button>
          </div>
        </div>
      </Modal>

      {/* Deal Modal */}
      <Modal isOpen={showDealModal} onClose={() => setShowDealModal(false)} title={isEditDeal ? "Edit Combo Deal" : "Create Combo Deal"}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>}
          
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 flex-shrink-0 flex flex-col items-center justify-center relative">
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <><ImageIcon className="w-6 h-6 text-slate-400 mb-1" /><span className="text-[9px] text-slate-500 uppercase font-bold">Upload</span></>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Combo Title</label>
                <input type="text" value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Complete Summer AC Care" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Badge / Tag (e.g., POPULAR)</label>
                <input type="text" value={dealForm.badge} onChange={e => setDealForm({ ...dealForm, badge: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. BEST SELLER" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
            <textarea value={dealForm.description || ''} onChange={e => setDealForm({ ...dealForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]" placeholder="What is included in this combo?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Final Deal Price ({currencyCode})</label>
              <input type="number" value={dealForm.numericPrice === undefined ? '' : dealForm.numericPrice} onChange={e => setDealForm({ ...dealForm, numericPrice: e.target.value ? Number(e.target.value) : '' as any })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Original Strike Price ({currencyCode}, Optional)</label>
              <input type="number" value={dealForm.strikePrice === undefined ? '' : dealForm.strikePrice} onChange={e => setDealForm({ ...dealForm, strikePrice: e.target.value ? Number(e.target.value) : undefined })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid From (Optional)</label>
              <input type="datetime-local" value={getLocalDatetime(dealForm.validFrom)} onChange={e => handleDatetimeChange(e, 'validFrom', setDealForm, dealForm)} min={getLocalDatetime(new Date().toISOString())} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until (Optional)</label>
              <input type="datetime-local" value={getLocalDatetime(dealForm.validTill)} onChange={e => handleDatetimeChange(e, 'validTill', setDealForm, dealForm)} min={dealForm.validFrom ? getLocalDatetime(dealForm.validFrom) : getLocalDatetime(new Date().toISOString())} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="activeDeal" checked={dealForm.active} onChange={e => setDealForm({ ...dealForm, active: e.target.checked })} className="w-4 h-4 rounded text-blue-600" />
            <label htmlFor="activeDeal" className="text-sm font-bold text-slate-700">Display this combo immediately</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowDealModal(false)} className="px-4 py-2 text-slate-600 border rounded-lg text-sm">Cancel</button>
            <button onClick={submitDeal} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Save Combo Deal</button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: '', title: '', type: 'offer' })} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Are you sure you want to remove <strong>{deleteModal.title}</strong>? It will no longer be available to customers.</p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setDeleteModal({ isOpen: false, id: '', title: '', type: 'offer' })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button 
              onClick={async () => {
                try {
                  if (deleteModal.type === 'offer') {
                    await apiClient.delete(`/garages/my-offers/${deleteModal.id}`);
                  } else {
                    await apiClient.delete(`/garages/my-deals/${deleteModal.id}`);
                  }
                  setDeleteModal({ isOpen: false, id: '', title: '', type: 'offer' });
                  fetchData();
                } catch(e) {
                  console.error(e);
                  setDeleteModal({ isOpen: false, id: '', title: '', type: 'offer' });
                }
              }} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
