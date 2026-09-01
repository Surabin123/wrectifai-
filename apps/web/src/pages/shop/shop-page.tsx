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
import { apiClient } from '@/lib/api-client';

import { getSavedCity, formatCurrencyForCity } from '@/utils/location';

export function ShopPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [garages, setGarages] = useState<any[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>('');
  const [userCity, setUserCity] = useState<string>('Bengaluru');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [userVehicle, setUserVehicle] = useState<any | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // Fetch user's vehicle for compatibility
    apiClient.get<any[]>('/vehicles')
      .then(data => {
        if (data && data.length > 0) {
          const defaultVehicle = data.find(v => v.is_default) || data[0];
          setUserVehicle(defaultVehicle);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Garages for the current city
  const fetchLocationGarages = (city: string) => {
    const activeCity = city || getSavedCity() || 'Bengaluru';
    setUserCity(activeCity);
    apiClient.get<any[]>(`/garages?city=${encodeURIComponent(activeCity)}`)
      .then(data => {
        setGarages(data || []);
        if (data && data.length > 0) {
          const savedGarage = localStorage.getItem('selectedGarageId');
          const isValidSaved = data.some(g => g.id === savedGarage);
          const nextGarageId = isValidSaved ? savedGarage! : data[0].id;
          setSelectedGarageId(nextGarageId);
          localStorage.setItem('selectedGarageId', nextGarageId);
        } else {
          setSelectedGarageId('');
          setProducts([]);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchLocationGarages(getSavedCity() || 'Bengaluru');

    const handleCityChange = () => {
      const newCity = getSavedCity() || 'Bengaluru';
      fetchLocationGarages(newCity);
    };

    window.addEventListener('city-changed', handleCityChange);
    return () => {
      window.removeEventListener('city-changed', handleCityChange);
    };
  }, []);

  // Fetch Inventory when garage changes
  useEffect(() => {
    if (selectedGarageId) {
      setIsLoading(true);
      apiClient.get<any[]>(`/garages/${selectedGarageId}/inventory`)
        .then(data => {
          const mapped = data.map(item => {
            let isCompatible = true; // Assume universal by default
            if (item.compatibleVehicleRules && userVehicle) {
              const rules = item.compatibleVehicleRules;
              if (rules.makes && Array.isArray(rules.makes)) {
                isCompatible = rules.makes.includes(userVehicle.make);
              }
            }

            return {
              id: item.product_id,
              inventory_id: item.inventory_id,
              name: item.name,
              category: item.category,
              formattedPrice: formatCurrencyForCity(Number(item.price), userCity),
              numericPrice: Number(item.price),
              qty_available: item.qty_available,
              img: item.image || '/assets/engine_oil_bottle.png',
              status: item.is_active ? 'approved' : 'rejected',
              isCompatible,
              hasCompatibilityRules: !!item.compatibleVehicleRules
            };
          });
          setProducts(mapped);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
      
      localStorage.setItem('selectedGarageId', selectedGarageId);
    }
  }, [selectedGarageId, userCity, userVehicle]);

  useEffect(() => {
    const savedCart = localStorage.getItem('shopCart');
    const savedWishlist = localStorage.getItem('shopWishlist');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedCart) setCartItems(JSON.parse(savedCart));
     
    if (savedWishlist) setWishlistItems(JSON.parse(savedWishlist));

    const handleSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail);
    };

    window.addEventListener('dashboard-search', handleSearch as EventListener);

    return () => {
      window.removeEventListener('dashboard-search', handleSearch as EventListener);
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
      newItems = [...cartItems, { ...product, garageId: selectedGarageId, quantity: 1 }];
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
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Auto Parts Shop</h1>
              <p className="text-slate-500 text-sm">Find the best parts and accessories for your vehicle</p>
            </div>
            
            {/* Garage Selector */}
            {garages.length > 0 && (
              <div className="flex flex-col gap-1 w-full md:max-w-[280px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Browsing Inventory From:</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedGarageId}
                  onChange={(e) => setSelectedGarageId(e.target.value)}
                >
                  {garages.map(g => (
                    <option key={g.id} value={g.id}>{g.name || g.facade}</option>
                  ))}
                </select>
              </div>
            )}
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
                  
                  {userVehicle && product.hasCompatibilityRules && (
                    <div className="mb-2">
                      {product.isCompatible ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                          <CheckCircle className="w-3 h-3" /> Fits {userVehicle.make}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                          Does not fit {userVehicle.make}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-2 mt-auto">
                    <span className="font-bold text-slate-900">{product.formattedPrice || formatCurrencyForCity(product.numericPrice, userCity)}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{product.qty_available} in stock</span>
                  </div>
                  <Button variant="outline" disabled={product.hasCompatibilityRules && !product.isCompatible} className="w-full mt-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => addToCart(product)}>
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
