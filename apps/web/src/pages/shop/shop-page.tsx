'use client';

import { SupportModal } from '@/components/common/support-modal';
import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Heart, CheckCircle, Clock, Shield, Star, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

import { TopNavbar } from '@/components/home/top-navbar';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { formatCurrency } from '@/lib/currency';

export const initialMockProducts: any[] = [
  { id: 1, name: 'Mobil 1 5W-30 Fully Synthetic Engine Oil', category: 'Oils & Fluids', price: '$12.99', oldPrice: 1599, discount: '19% OFF', rating: '4.6', reviews: 128, img: '/assets/engine_oil_bottle.png', status: 'approved' },
  { id: 2, name: 'Bosch Car Air Filter', category: 'Engine Parts', price: '$5.99', oldPrice: 799, discount: '25% OFF', rating: '4.5', reviews: 96, img: '/assets/Parts and components.png', status: 'approved' },
  { id: 3, name: 'Amaron Pro Rider Battery 42B20L', category: 'Batteries', price: '$42.99', oldPrice: 4999, discount: '14% OFF', rating: '4.7', reviews: 78, img: '/assets/car_battery.png', status: 'approved' },
  { id: 4, name: 'Brembo Front Brake Pads', category: 'Brakes', price: '$18.99', oldPrice: 2299, discount: '17% OFF', rating: '4.6', reviews: 64, img: '/assets/brake_disc_1778070670609.png', status: 'approved' },
  { id: 5, name: 'Philips H7 LED Headlight Bulb', category: 'Electrical', price: '$14.99', oldPrice: 1899, discount: '21% OFF', rating: '4.4', reviews: 54, img: '/assets/Electrical.png', status: 'approved' },
  { id: 6, name: 'Bosch Aerotwin Wiper Blade Set', category: 'Accessories', price: '$8.99', oldPrice: 1199, discount: '25% OFF', rating: '4.5', reviews: 112, img: '/assets/wiper_blade_1778070781712.png', status: 'approved' },
  { id: 7, name: 'Bosch Oil Filter', category: 'Engine Parts', price: '$2.99', oldPrice: 399, discount: '25% OFF', rating: '4.6', reviews: 88, img: '/assets/Accessories (2).png', status: 'approved' },
  { id: 8, name: 'Liqui Moly Coolant Ready Mix 1L', category: 'Oils & Fluids', price: '$4.99', oldPrice: 649, discount: '23% OFF', rating: '4.3', reviews: 46, img: '/assets/oil_pour_1778070767058.png', status: 'approved' },
];

export function ShopPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [products, setProducts] = useState(initialMockProducts);
  const [userPhone, setUserPhone] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const savedCart = localStorage.getItem('shopCart');
    const savedWishlist = localStorage.getItem('shopWishlist');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedCart) setCartItems(JSON.parse(savedCart));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedWishlist) setWishlistItems(JSON.parse(savedWishlist));

    try {
      const userStr = localStorage.getItem('wrectifai-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.mobile_number) setUserPhone(user.mobile_number);
        else if (user && user.phone) setUserPhone(user.phone);
      }
    } catch(e) {}

    const handleSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail);
    };

    const loadProducts = () => {
      const stored = localStorage.getItem('wrectifai_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        localStorage.setItem('wrectifai_products', JSON.stringify(initialMockProducts));
        setProducts(initialMockProducts);
      }
    };

    loadProducts();

    window.addEventListener('dashboard-search', handleSearch as EventListener);
    window.addEventListener('products-updated', loadProducts);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_products') loadProducts();
    });

    return () => {
      window.removeEventListener('dashboard-search', handleSearch as EventListener);
      window.removeEventListener('products-updated', loadProducts);
    };
  }, []);

  const toggleWishlist = (product: any) => {
    const exists = wishlistItems.find(i => i.id === product.id);
    const newItems = exists ? wishlistItems.filter(i => i.id !== product.id) : [...wishlistItems, product];
    setWishlistItems(newItems);
    localStorage.setItem('shopWishlist', JSON.stringify(newItems));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const addToCart = (product: any) => {
    const exists = cartItems.find(i => i.id === product.id);
    let newItems;
    if (exists) {
      newItems = cartItems.map(i => i.id === product.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
    } else {
      newItems = [...cartItems, { ...product, quantity: 1 }];
    }
    setCartItems(newItems);
    localStorage.setItem('shopCart', JSON.stringify(newItems));
    window.dispatchEvent(new Event('cart-updated'));
    showToast('Added to Cart');
  };

  const filteredProducts = products.filter(p => 
    p.status !== 'rejected' &&
    (selectedCategory === 'All' || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Auto Parts Shop</h1>
            <p className="text-slate-500 text-sm">Find the best parts and accessories for your vehicle</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {['All', 'Engine Parts', 'Oils & Fluids', 'Batteries', 'Brakes', 'Electrical'].map(category => (
              <button 
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-semibold transition-colors",
                  selectedCategory === category 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Hero Banner Placeholder */}
          <Card className="w-full h-40 bg-gradient-to-r from-blue-900 to-slate-900 rounded-[24px] overflow-hidden relative flex items-center p-8">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-2">Summer Mega Sale</h2>
              <p className="text-blue-100 mb-4 max-w-sm">Up to 40% off on all engine oils and maintenance products.</p>
              <Button className="bg-white text-blue-900 hover:bg-slate-50">Shop Now</Button>
            </div>
          </Card>

          {/* Products Grid */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Popular Products</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="p-4 flex flex-col group relative rounded-[16px] border-slate-200 hover:shadow-lg transition-shadow">
                  <button 
                    onClick={() => toggleWishlist(product)} 
                    className={cn(
                      "absolute top-3 right-3 transition-colors z-10",
                      wishlistItems.some((i: any) => i.id === product.id) ? 'text-red-500' : 'text-slate-300 hover:text-red-500'
                    )}
                  >
                    <Heart className="w-5 h-5" fill={wishlistItems.some((i: any) => i.id === product.id) ? 'currentColor' : 'none'} />
                  </button>
                  <div className="relative h-32 flex items-center justify-center mb-4">
                    <Image src={product.img} alt={product.name} width={100} height={100} className="object-contain group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-2 h-10 mb-2">{product.name}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-900">{formatCurrency(parseFloat(product.price.replace('$', '')), userPhone)}</span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{product.discount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 mb-4">
                    <Star className="w-3.5 h-3.5 fill-current" /> {product.rating} <span className="text-slate-400 font-normal">({product.reviews})</span>
                  </div>
                  <Button variant="outline" className="w-full mt-auto text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => addToCart(product)}>
                    <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[300px] space-y-6">
          <Card className="p-5 shadow-sm border-slate-100 rounded-[20px]">
            <h3 className="font-bold text-slate-900 mb-4">Shop with Confidence</h3>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                 <Shield className="w-5 h-5 text-blue-500 shrink-0" />
                 <div>
                   <p className="font-bold text-slate-900">Genuine Parts</p>
                   <p className="text-xs text-slate-500">100% authentic products</p>
                 </div>
              </li>
              <li className="flex gap-3">
                 <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
                 <div>
                   <p className="font-bold text-slate-900">Best Prices</p>
                   <p className="text-xs text-slate-500">Competitive prices guaranteed</p>
                 </div>
              </li>
              <li className="flex gap-3">
                 <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                 <div>
                   <p className="font-bold text-slate-900">Fast Delivery</p>
                   <p className="text-xs text-slate-500">Quick delivery to your doorstep</p>
                 </div>
              </li>
            </ul>
          </Card>

          <Card className="p-5 shadow-sm border-slate-100 bg-blue-50/50 rounded-[20px]">
            <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
            <p className="text-sm text-slate-500 mb-4">Can&apos;t find what you&apos;re looking for? Our experts are here to help you.</p>
            <Button variant="outline" className="w-full bg-white border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setIsSupportModalOpen(true)}>
              Contact Support
            </Button>
          </Card>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5 text-green-400" />
          {toastMessage}
        </div>
      )}
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </DashboardShell>
  );
}

export default ShopPage;
