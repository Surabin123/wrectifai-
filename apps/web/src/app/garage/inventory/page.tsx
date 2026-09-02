'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Search, Plus, Edit2, X, Package, DollarSign, AlertCircle, AlertTriangle } from 'lucide-react';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

interface FormData {
  productId: string;
  price: string | number;
  qtyAvailable: string | number;
  isActive: boolean;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [formData, setFormData] = useState<FormData>({
    productId: '',
    price: '',
    qtyAvailable: '',
    isActive: true
  });
  
  const [validationError, setValidationError] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any>('/garages/my-inventory');
      if (Array.isArray(response)) {
        setInventory(response);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddClick = async () => {
    try {
      // Fetch products to let them choose
      const response = await apiClient.get<any>('/products'); 
      if (Array.isArray(response)) {
        setProducts(response);
      }
      setFormData({ productId: '', price: '', qtyAvailable: '', isActive: true });
      setValidationError('');
      setShowAddModal(true);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const submitAddItem = async () => {
    if (!formData.productId) {
      setValidationError('Please select a product.');
      return;
    }
    
    const parsedPrice = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    const parsedQty = typeof formData.qtyAvailable === 'string' ? parseInt(formData.qtyAvailable, 10) : formData.qtyAvailable;
    
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setValidationError('Price must be a valid non-negative number.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty < 0) {
      setValidationError('Quantity must be a valid non-negative integer.');
      return;
    }

    try {
      await apiClient.post('/garages/my-inventory', {
        productId: formData.productId,
        price: parsedPrice,
        qtyAvailable: parsedQty
      });
      setShowAddModal(false);
      fetchInventory();
    } catch (err) {
      console.error('Failed to add item:', err);
      setValidationError('Failed to add product. It may already exist in your inventory.');
    }
  };

  const handleEditClick = (item: any) => {
    setSelectedItem(item);
    setFormData({
      productId: '',
      price: item.price,
      qtyAvailable: item.qty_available,
      isActive: item.is_active
    });
    setValidationError('');
    setShowEditModal(true);
  };

  const submitEditItem = async () => {
    const parsedPrice = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    const parsedQty = typeof formData.qtyAvailable === 'string' ? parseInt(formData.qtyAvailable, 10) : formData.qtyAvailable;
    
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setValidationError('Price must be a valid non-negative number.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty < 0) {
      setValidationError('Quantity must be a valid non-negative integer.');
      return;
    }

    try {
      await apiClient.put(`/garages/my-inventory/` + selectedItem.inventory_id, {
        price: parsedPrice,
        qty_available: parsedQty,
        is_active: formData.isActive
      });
      setShowEditModal(false);
      fetchInventory();
    } catch (err) {
      console.error('Failed to edit item:', err);
      setValidationError('Failed to update product.');
    }
  };
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    let val = e.target.value;
    
    if (val === '') {
      setFormData({ ...formData, [field]: '' });
      return;
    }

    // Only allow numbers and optional decimal for price, integers for qty
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

  const filteredInventory = inventory.filter(i => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return i.name?.toLowerCase().includes(lowerQ) || i.category?.toLowerCase().includes(lowerQ) || i.product_id?.toLowerCase().includes(lowerQ);
  });

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
                 <button onClick={handleAddClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Add Product</button>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
                <div className="flex-1 bg-white border border-blue-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Total Items</p>
                    <p className="text-2xl font-black text-[#17307a]">{inventory.length}</p>
                    <p className="text-[10px] text-slate-400">All items in inventory</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 bg-white border border-green-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Total Value</p>
                    <p className="text-2xl font-black text-[#17307a]">{formatCurrency(inventory.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.qty_available)), 0))}</p>
                    <p className="text-[10px] text-slate-400">Current inventory value</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 bg-white border border-yellow-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Low Stock Items</p>
                    <p className="text-2xl font-black text-[#17307a]">{inventory.filter(i => i.qty_available > 0 && i.qty_available <= 20).length}</p>
                    <p className="text-[10px] text-slate-400">Reorder soon</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 bg-white border border-red-100 rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Out of Stock Items</p>
                    <p className="text-2xl font-black text-[#17307a]">{inventory.filter(i => i.qty_available <= 0).length}</p>
                    <p className="text-[10px] text-slate-400">Need immediate attention</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search by product name, category or ID..." 
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
                     <th className="p-4 text-xs font-bold text-slate-500 border-b w-1/3">Item Details</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Category</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Stock</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Unit Price</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Status</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                     <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading inventory...</td></tr>
                   ) : filteredInventory.length === 0 ? (
                     <tr><td colSpan={6} className="p-8 text-center text-slate-500">No inventory found.</td></tr>
                   ) : filteredInventory.map((item) => {
                     const stock = Number(item.qty_available);
                     const price = Number(item.price);
                     const status = !item.is_active ? 'Inactive' : stock > 20 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
                     return (
                     <tr key={item.inventory_id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4">
                         <div className="flex gap-3 items-center">
                           <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                             {item.image ? <img src={item.image} className="object-cover w-full h-full"/> : <Package className="w-5 h-5 text-slate-400" />}
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm font-bold text-[#17307a] truncate">{item.name}</p>
                             <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {item.product_id?.substring(0, 8)}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600 truncate">{item.category}</p></td>
                       <td className="p-4 text-center"><p className="text-sm font-bold text-slate-800">{stock}</p><p className="text-[10px] text-slate-400">Units</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{formatCurrency(price)}</p></td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${status === 'In Stock' ? 'bg-green-50 text-green-600' : status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600' : status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'}`}>{status}</span>
                       </td>
                       <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-1.5">
                           <button onClick={() => handleEditClick(item)} className="p-1.5 rounded-md hover:bg-slate-200 text-blue-500 bg-blue-50 border border-blue-100" title="Edit Inventory Item"><Edit2 className="w-3.5 h-3.5"/></button>
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
            <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#17307a]">Add Product</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                  {validationError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Product from Platform Catalog</label>
                  <select 
                    value={formData.productId}
                    onChange={(e) => {
                      const sel = products.find(p => p.id === e.target.value);
                      setFormData({...formData, productId: e.target.value, price: sel?.price || ''});
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">-- Choose a product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Base: {formatCurrency(p.price)})</option>
                    ))}
                  </select>
                </div>
                
                {formData.productId && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <p className="text-xs font-bold text-slate-700">{products.find(p => p.id === formData.productId)?.name}</p>
                     <p className="text-[10px] text-slate-500 mt-1 truncate">{products.find(p => p.id === formData.productId)?.description}</p>
                     <p className="text-[10px] text-slate-500 mt-1 font-semibold">Category: {products.find(p => p.id === formData.productId)?.category}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price</label>
                  <input type="text" inputMode="decimal" value={formData.price} onChange={(e) => handleNumericChange(e, 'price')} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Quantity</label>
                  <input type="text" inputMode="numeric" value={formData.qtyAvailable} onChange={(e) => handleNumericChange(e, 'qtyAvailable')} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={submitAddItem} disabled={!formData.productId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Add Product</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#17307a]">Edit Product</h3>
                <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                  {validationError}
                </div>
              )}
              
              <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-800">{selectedItem.name}</p>
                <p className="text-xs text-slate-600 mb-2">Category: {selectedItem.category}</p>
                <p className="text-[10px] text-slate-500">Base Price: {formatCurrency(selectedItem.basePrice || selectedItem.price)}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price</label>
                  <input type="text" inputMode="decimal" value={formData.price} onChange={(e) => handleNumericChange(e, 'price')} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input type="text" inputMode="numeric" value={formData.qtyAvailable} onChange={(e) => handleNumericChange(e, 'qtyAvailable')} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Product is Active</label>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={submitEditItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
