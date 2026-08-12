'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { garageNavItems } from '@/lib/garage-config';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Modal } from '@/components/common/modal';
import Image from 'next/image';

const defaultProducts = [
  { id: 1, name: 'Mobil 1 5W-30 Fully Synthetic Engine Oil', category: 'Oils & Fluids', price: '$12.99', oldPrice: 1599, discount: '19% OFF', rating: '4.6', reviews: 128, img: '/assets/engine_oil_bottle.png', stock: 50 },
  { id: 2, name: 'Bosch Car Air Filter', category: 'Engine Parts', price: '$5.99', oldPrice: 799, discount: '25% OFF', rating: '4.5', reviews: 96, img: '/assets/Parts and components.png', stock: 20 },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', category: 'Oils & Fluids', price: '', stock: 10, img: '/assets/engine_oil_bottle.png' });

  useEffect(() => {
    const stored = localStorage.getItem('wrectifai_products');
    if (stored) {
      setProducts(JSON.parse(stored));
    } else {
      localStorage.setItem('wrectifai_products', JSON.stringify(defaultProducts));
      setProducts(defaultProducts);
    }
  }, []);

  const saveProducts = (newProducts: any[]) => {
    setProducts(newProducts);
    localStorage.setItem('wrectifai_products', JSON.stringify(newProducts));
    window.dispatchEvent(new Event('products-updated'));
    // Notify admin
    const storedNotifs = localStorage.getItem('wrectifai_notifications');
    const notifs = storedNotifs ? JSON.parse(storedNotifs) : [];
    notifs.unshift({ id: Date.now(), type: 'System', title: 'Inventory Update', desc: 'A garage updated their inventory.', time: 'Just now', read: false, icon: 'FileText', color: 'text-blue-500', bg: 'bg-blue-50', audience: 'Garage' });
    localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const handleSave = () => {
    if (editingProduct) {
      saveProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...formData, price: formData.price.startsWith('$') ? formData.price : `$${formData.price}` } : p));
    } else {
      saveProducts([...products, { ...formData, id: Date.now(), price: formData.price.startsWith('$') ? formData.price : `$${formData.price}`, oldPrice: 0, discount: '', rating: '0.0', reviews: 0 }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    saveProducts(products.filter(p => p.id !== id));
  };

  const toggleOutOfStock = (p: any) => {
    saveProducts(products.map(item => item.id === p.id ? { ...item, stock: item.stock === 0 ? 10 : 0 } : item));
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader title="Inventory Management" />}>
        <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Manage Products</h2>
            <Button className="bg-[#1a56db] hover:bg-[#174ac2] text-white" onClick={() => { setEditingProduct(null); setFormData({ name: '', category: 'Oils & Fluids', price: '', stock: 10, img: '/assets/engine_oil_bottle.png' }); setIsModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <Card key={product.id} className={`p-4 shadow-sm border-slate-100 flex flex-col justify-between ${product.stock === 0 ? 'opacity-70 grayscale' : ''}`}>
                <div>
                  <div className="relative w-full h-32 mb-4 bg-slate-50 rounded-xl overflow-hidden flex justify-center items-center">
                    <Image src={product.img} alt={product.name} width={80} height={80} className="object-contain" />
                    {product.stock === 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">OUT OF STOCK</span>}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 min-h-[40px]">{product.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-[#1a56db]">{product.price}</span>
                    <span className="text-xs font-semibold text-slate-500">Stock: {product.stock ?? 10}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1 text-xs h-8" onClick={() => { setEditingProduct(product); setFormData({ name: product.name, category: product.category, price: product.price, stock: product.stock ?? 10, img: product.img }); setIsModalOpen(true); }}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" className="flex-1 text-xs h-8 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => toggleOutOfStock(product)}>
                    {product.stock === 0 ? 'Restock' : 'No Stock'}
                  </Button>
                  <Button variant="outline" className="px-2 h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Edit Product" : "Add Product"}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">Product Name</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Engine Oil" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Price</label>
                <Input value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="$0.00" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Stock</label>
                <Input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Image URL</label>
              <Input value={formData.img} onChange={e => setFormData({ ...formData, img: e.target.value })} placeholder="/assets/image.png" />
            </div>
            <Button className="w-full bg-[#1a56db] text-white hover:bg-[#174ac2]" onClick={handleSave}>
              Save Product
            </Button>
          </div>
        </Modal>
      </DashboardShell>
    </RoleGuard>
  );
}
