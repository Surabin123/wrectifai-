'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Plus, Filter, Download, MoreVertical, Edit2, X } from 'lucide-react';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    productId: '',
    price: 0,
    qtyAvailable: 0,
    isActive: true
  });

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
      setFormData({ productId: '', price: 0, qtyAvailable: 1, isActive: true });
      setShowAddModal(true);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const submitAddItem = async () => {
    if (!formData.productId) return;
    try {
      await apiClient.post('/garages/my-inventory', {
        productId: formData.productId,
        price: Number(formData.price),
        qtyAvailable: Number(formData.qtyAvailable)
      });
      setShowAddModal(false);
      fetchInventory();
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('Failed to add item');
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
    setShowEditModal(true);
  };

  const submitEditItem = async () => {
    try {
      await apiClient.put(`/garages/my-inventory/` + selectedItem.inventory_id, {
        price: Number(formData.price),
        qty_available: Number(formData.qtyAvailable),
        is_active: formData.isActive
      });
      setShowEditModal(false);
      fetchInventory();
    } catch (err) {
      console.error('Failed to edit item:', err);
      alert('Failed to update item');
    }
  };

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
                 <button onClick={handleAddClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Add Item</button>
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
                    <p className="text-2xl font-black text-[#17307a]">{formatCurrency(inventory.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.qty_available)), 0))}</p>
                    <p className="text-[10px] text-slate-400">Current inventory value</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">💰</div>
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
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Item Details</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Category</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Part Number</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Stock</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Unit Price</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Status</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading inventory...</td></tr>
                   ) : inventory.length === 0 ? (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-500">No inventory found. Add some items.</td></tr>
                   ) : inventory.map((item) => {
                     const stock = Number(item.qty_available);
                     const price = Number(item.price);
                     const status = !item.is_active ? 'Inactive' : stock > 20 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
                     return (
                     <tr key={item.inventory_id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4"><div className="flex gap-3 items-center"><div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden">{item.image ? <img src={item.image} className="object-cover w-full h-full"/> : '📦'}</div><div><p className="text-sm font-bold text-[#17307a]">{item.name}</p><p className="text-[10px] text-slate-500">{item.description || 'No description'}</p></div></div></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.category}</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{item.product_id?.substring(0, 8)}</p></td>
                       <td className="p-4 text-center"><p className="text-sm font-bold text-slate-800">{stock}</p><p className="text-[10px] text-slate-400">Pcs</p></td>
                       <td className="p-4"><p className="text-xs font-medium text-slate-600">{formatCurrency(price)}</p></td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${status === 'In Stock' ? 'bg-green-50 text-green-600' : status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600' : status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'}`}>{status}</span>
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
                <h3 className="font-bold text-lg text-[#17307a]">Add Product</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Product</label>
                  <select 
                    value={formData.productId}
                    onChange={(e) => {
                      const sel = products.find(p => p.id === e.target.value);
                      setFormData({...formData, productId: e.target.value, price: sel?.price || 0});
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">-- Choose a product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Base: {formatCurrency(p.price)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Quantity</label>
                  <input type="number" value={formData.qtyAvailable} onChange={(e) => setFormData({...formData, qtyAvailable: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#17307a]">Edit Product</h3>
                <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
              </div>
              <div className="mb-6">
                <p className="font-bold text-slate-800">{selectedItem.name}</p>
                <p className="text-xs text-slate-500">Base Price: {formatCurrency(selectedItem.basePrice || selectedItem.price)}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Price</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input type="number" value={formData.qtyAvailable} onChange={(e) => setFormData({...formData, qtyAvailable: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-blue-600" />
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
