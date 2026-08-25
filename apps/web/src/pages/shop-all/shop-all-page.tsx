'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Filter, ShoppingBag, Heart, ArrowLeft, Star } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { TopNavbar } from '@/components/home/top-navbar';
import { formatCurrency } from '@/lib/currency';

const mockAllProducts = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  name: `Premium Auto Part ${i + 1}`,
  category: i % 3 === 0 ? 'Engine Components' : i % 3 === 1 ? 'Accessories' : 'Maintenance',
  price: `$${(Math.random() * 100 + 20).toFixed(2)}`,
  rating: (Math.random() * 2 + 3).toFixed(1),
  reviews: Math.floor(Math.random() * 100) + 10,
  img: null,
}));

const CATEGORIES = ['All', 'Engine Components', 'Accessories', 'Maintenance', 'Fluids & Oils', 'Brakes'];

export function ShopAllPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [userPhone, setUserPhone] = useState<string | undefined>(undefined);
  
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('shopCart');
    const savedWishlist = localStorage.getItem('shopWishlist');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedCart) setCartItems(JSON.parse(savedCart));
     
    if (savedWishlist) setWishlistItems(JSON.parse(savedWishlist));

    const handleSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail);
    };

    try {
      const userStr = localStorage.getItem('wrectifai-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.mobile_number) setUserPhone(user.mobile_number);
        else if (user && user.phone) setUserPhone(user.phone);
      }
    } catch(e) {}

    window.addEventListener('dashboard-search', handleSearch as EventListener);
    return () => window.removeEventListener('dashboard-search', handleSearch as EventListener);
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
  };

  const filteredProducts = mockAllProducts
    .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price-low') return parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', ''));
      if (sortBy === 'price-high') return parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', ''));
      if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating);
      return 0; // newest default
    });

  return (
    <div>
      <TopNavbar />
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">All Products</h1>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-[20px] shadow-sm border border-slate-100">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  selectedCategory === cat 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Showing {filteredProducts.length} results</span>
          {searchQuery && (
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Search: &quot;{searchQuery}&quot;
            </span>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center bg-white rounded-[24px] border border-slate-100">
            <ShoppingBag className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-500">Try adjusting your filters or search query</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>Clear All Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="p-5 flex flex-col group relative rounded-[20px] border-slate-200 hover:shadow-lg transition-all duration-300 bg-white">
                <button 
                  onClick={() => toggleWishlist(product)} 
                  className={cn(
                    "absolute top-4 right-4 z-10 p-2 rounded-full transition-colors",
                    wishlistItems.some((i: any) => i.id === product.id) 
                      ? "bg-red-50 text-red-500" 
                      : "bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  )}
                >
                  <Heart className="w-4 h-4" fill={wishlistItems.some((i: any) => i.id === product.id) ? 'currentColor' : 'none'} />
                </button>
                
                <div className="aspect-square bg-slate-50 rounded-xl mb-4 flex items-center justify-center p-4">
                  {product.img ? (
                    <Image src={product.img} alt={product.name} width={150} height={150} className="object-contain group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ShoppingBag className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="text-xs font-semibold text-blue-600 mb-2">{product.category}</div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-2 h-10 mb-2">{product.name}</h4>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-900">{formatCurrency(parseFloat(product.price.replace('$', '')), userPhone)}</span>
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    <span className="text-xs font-medium text-slate-700">{product.rating}</span>
                    <span className="text-xs text-slate-400">({product.reviews})</span>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="font-bold text-lg text-slate-900">{formatCurrency(parseFloat(product.price.replace('$', '')), userPhone)}</div>
                    <Button size="sm" className="rounded-full px-4" onClick={() => addToCart(product)}>
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default ShopAllPage;
