'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/common/input';
import { topNavIcons } from '@/components/home/data';
import { cn } from '@/utils/cn';
import { useAuth } from '@/lib/auth-context';
import { setLocationCookie, getLocationCookie } from '@/utils/location';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { Trash2, ShoppingCart, Heart } from 'lucide-react';
import Image from 'next/image';

const IN_CITIES = [
  'Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi'
];

const US_CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'San Antonio', 'San Diego', 'Dallas', 'Austin', 'San Jose'
];

const AE_CITIES = [
  'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 
  'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain'
];

export function TopNavbar() {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [citySearch, setCitySearch] = useState('');
  const [currentCities, setCurrentCities] = useState<string[]>(IN_CITIES);
  
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(3);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Authentication context
  const { user, logout } = useAuth();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    
    // Listen for cart and wishlist updates
    const updateCart = () => {
      const items = localStorage.getItem('shopCart');
      setCartCount(items ? JSON.parse(items).length : 0);
    };
    const updateWishlist = () => {
      const items = localStorage.getItem('shopWishlist');
      const parsed = items ? JSON.parse(items) : [];
      setWishlistCount(parsed.length);
      setWishlistItems(parsed);
    };
    const updateNotifications = () => {
      const items = localStorage.getItem('wrectifai_notifications');
      if (items) {
        const parsed = JSON.parse(items);
        const isAdmin = user?.roles?.includes('admin');
        const isGarage = user?.roles?.includes('garage');
        const audienceRole = isAdmin ? 'Admin' : isGarage ? 'Garage' : 'Customer';
        
        const relevantNotifs = parsed.filter((n: any) => 
          n.audience === 'All' || n.audience === audienceRole
        );
        setNotificationCount(relevantNotifs.filter((n: any) => !n.read).length);
      }
    };
    
    // Initial load
    updateCart();
    updateWishlist();
    updateNotifications();
    
    window.addEventListener('cart-updated', updateCart);
    window.addEventListener('wishlist-updated', updateWishlist);
    window.addEventListener('notifications-updated', updateNotifications);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_notifications') updateNotifications();
    });
    
    // Load country and set cities
    const countryCode = getLocationCookie('wrectifai_country_code');
    let activeCities = IN_CITIES;
    if (countryCode === '+1') activeCities = US_CITIES;
    else if (countryCode === '+971') activeCities = AE_CITIES;
    
    setCurrentCities(activeCities);

    // Load city from cookie
    const savedCity = getLocationCookie('wrectifai_city');
    if (savedCity && activeCities.includes(savedCity)) {
      setSelectedCity(savedCity);
    } else {
      setSelectedCity(activeCities[0]);
      setLocationCookie('wrectifai_city', activeCities[0]);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('cart-updated', updateCart);
      window.removeEventListener('wishlist-updated', updateWishlist);
      window.removeEventListener('notifications-updated', updateNotifications);
    };
  }, [user]);

  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = window.location.pathname;
    const isLocalSearch = ['/services', '/shop', '/shop-all', '/wallet-payments', '/offers', '/car-tips'].includes(path);
    
    if (isLocalSearch) {
      return; // Handled by local pages
    }
    
    if (query.trim()) {
      router.push(`/garages?search=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/garages');
    }
  };

  const filteredCities = currentCities.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <header className="w-full flex flex-wrap items-center justify-between gap-3 lg:flex-nowrap lg:gap-6">
      
      {/* Left Section: Mobile Menu & Location Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#dbe6ff] bg-white text-[#1a56db] shadow-sm lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>

        {/* Location Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setCitySearch(''); // Reset search on toggle
            }}
            className="flex h-10 shrink-0 items-center gap-[10px] rounded-lg border border-[#dbe6ff] bg-white px-3.5 text-[13px] font-semibold text-[#17307a] hover:bg-[#fcfdff] transition-all shadow-sm focus:outline-none focus:ring-0 focus:border-[#dbe6ff] focus-visible:outline-none focus-visible:ring-0 active:border-[#dbe6ff] active:ring-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px] text-[#17307a] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s-6-4.35-6-11a6 6 0 1 1 12 0c0 6.65-6 11-6 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>{selectedCity}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-[#17307a] shrink-0 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-[165px] rounded-xl border border-[#e4ecff] bg-white p-2.5 shadow-[0_12px_30px_rgba(23,48,122,0.12)]">
              {/* Search input bar - rounded-lg matches cities tiles */}
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8ea0c7]" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search your city..."
                  className="h-[36px] w-full rounded-lg border border-[#7fa5f7] bg-white pl-9 pr-3 text-[12.5px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#4d82f3] focus:ring-1 focus:ring-[#4d82f3]"
                  autoFocus
                />
              </div>

              {/* City options list - constrained to show exactly 5 options at a time */}
              <div className="max-h-[175px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-100 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setSelectedCity(city);
                        setLocationCookie('wrectifai_city', city);
                        window.dispatchEvent(new Event('city-changed'));
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "flex h-[34px] w-full items-center rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors",
                        city === selectedCity 
                          ? "bg-[#1a56db] text-white" 
                          : "text-[#17307a] hover:bg-[#f2f6ff]"
                      )}
                    >
                      {city}
                    </button>
                  ))
                ) : (
                  <div className="py-3 text-center text-[11px] font-normal text-[#17307a]">
                    No cities found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Section: Search input form */}
      <form className="relative w-full order-3 lg:order-none lg:flex-1 lg:max-w-[420px] lg:mx-auto" onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7aa5]" />
        <Input
          value={query}
          onChange={(event) => {
            const newQuery = event.target.value;
            setQuery(newQuery);
            window.dispatchEvent(
              new CustomEvent('dashboard-search', {
                detail: newQuery.trim(),
              })
            );
          }}
          className="h-10 rounded-lg pl-11 pr-4 w-full"
          placeholder="Search for services, parts, garages..."
          aria-label="Search for services, parts, garages"
        />
      </form>

      {/* Right Section: Notifications, Chat, Favorites, Profile */}
      <div className="flex items-center gap-[7px] sm:gap-[12px] shrink-0 ml-auto lg:ml-0">
        {topNavIcons.map(({ icon: Icon, badge, label, href }) => (
          <button
            key={label}
            aria-label={label}
            onClick={() => {
              if (label === 'Wishlist') {
                setIsWishlistOpen(true);
              } else if (href.startsWith('#')) {
                // If it's a hash, dispatch an event or do nothing for now since it's mock
              } else {
                router.push(href);
              }
            }}
            className={cn(
              "relative h-9 w-9 lg:h-10 lg:w-10 shrink-0 flex items-center justify-center rounded-full bg-white text-[#17307a] shadow-sm ring-1 ring-[#e5ecfb]",
              label !== 'Notifications' ? "hidden lg:flex" : "flex"
            )}
          >
            <Icon className="h-4 w-4 lg:h-[18px] lg:w-[18px]" />
            {((label === 'Notifications' && notificationCount > 0) || (label === 'Cart' && cartCount > 0) || (label === 'Wishlist' && wishlistCount > 0)) ? (
              <span className="absolute right-0 top-0 lg:right-1 flex h-4 lg:h-5 min-w-4 lg:min-w-5 items-center justify-center rounded-full bg-[#ff2f44] px-1 text-[9px] lg:text-[9.5px] font-bold text-white">
                {label === 'Cart' ? cartCount : label === 'Wishlist' ? wishlistCount : label === 'Notifications' ? notificationCount : badge}
              </span>
            ) : null}
          </button>
        ))}

        {user ? (
          <div className="relative group ml-[5px]">
            <button className="flex h-9 lg:h-10 shrink-0 items-center gap-2 rounded-full border border-[#dbe6ff] bg-white p-0.5 lg:py-1 lg:pl-1.5 lg:pr-3 hover:bg-[#fcfdff] transition-all shadow-sm focus:outline-none">
              <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-[#1a56db] text-white font-bold text-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden text-[13px] font-semibold text-[#17307a] lg:block">Hi, {user.name}</span>
              <ChevronDown className="hidden h-4 w-4 text-[#17307a] lg:block group-hover:rotate-180 transition-transform duration-200" />
            </button>
            <div className="absolute right-0 top-full pt-2 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="bg-white border border-[#e4ecff] rounded-xl shadow-lg p-1.5">
                <button
                  onClick={() => {
                    const path = window.location.pathname;
                    const basePath = path.startsWith('/admin') ? '/admin' : path.startsWith('/garage') ? '/garage' : '';
                    router.push(`${basePath}/profile`);
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold text-[#1a56db] hover:bg-[#f2f6ff] rounded-lg transition-colors border-b border-[#f2f6ff] mb-1"
                >
                  View Profile
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="ml-[5px] flex h-9 lg:h-10 shrink-0 items-center justify-center rounded-full border border-[#1a56db] bg-[#1a56db] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[#1546b5] transition-all focus:outline-none"
          >
            Log In
          </Link>
        )}
      </div>

      <Modal isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} title="Your Wishlist">
        {wishlistItems.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <Heart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Your wishlist is empty</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
            <div>
              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Saved Garages</h3>
              {wishlistItems.filter((i) => i.type === 'garage').length === 0 ? (
                <p className="text-slate-500 text-sm py-2">No saved garages yet.</p>
              ) : (
                <div className="space-y-3">
                  {wishlistItems.filter((i) => i.type === 'garage').map((item) => (
                    <div key={item.id || item.name} className="flex gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center relative overflow-hidden shrink-0">
                        {item.img && <Image src={item.img} alt={item.name} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                        <p className="text-xs text-slate-500">{item.category}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs text-red-500 border-red-100 hover:bg-red-50"
                          onClick={() => {
                            const newWishlist = wishlistItems.filter((i: any) => i.id !== item.id);
                            setWishlistItems(newWishlist);
                            sessionStorage.setItem('shopWishlist', JSON.stringify(newWishlist));
                            window.dispatchEvent(new Event('wishlist-updated'));
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Saved Products</h3>
              {wishlistItems.filter((i) => i.type !== 'garage').length === 0 ? (
                <p className="text-slate-500 text-sm py-2">No saved products yet.</p>
              ) : (
                <div className="space-y-3">
            {wishlistItems.filter((i) => i.type !== 'garage').map((item) => (
              <div key={item.id} className="flex gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center relative overflow-hidden shrink-0">
                  <Image src={item.img} alt={item.name} fill className="object-contain p-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                  <p className="text-xs text-slate-500">{item.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-slate-900 text-sm">{item.price}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    className="h-8 text-xs bg-blue-600 text-white"
                    onClick={() => {
                      const cart = JSON.parse(sessionStorage.getItem('shopCart') || '[]');
                      const existing = cart.find((i: any) => i.id === item.id);
                      let newCart;
                      if (existing) {
                        newCart = cart.map((i: any) => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
                      } else {
                        newCart = [...cart, { ...item, quantity: 1 }];
                      }
                      sessionStorage.setItem('shopCart', JSON.stringify(newCart));
                      window.dispatchEvent(new Event('cart-updated'));
                      
                      // Remove from wishlist after adding to cart
                      const newWishlist = wishlistItems.filter((i: any) => i.id !== item.id);
                      setWishlistItems(newWishlist);
                      sessionStorage.setItem('shopWishlist', JSON.stringify(newWishlist));
                      window.dispatchEvent(new Event('wishlist-updated'));
                    }}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" /> Add
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs text-red-500 border-red-100 hover:bg-red-50"
                    onClick={() => {
                      const newWishlist = wishlistItems.filter((i: any) => i.id !== item.id);
                      setWishlistItems(newWishlist);
                      sessionStorage.setItem('shopWishlist', JSON.stringify(newWishlist));
                      window.dispatchEvent(new Event('wishlist-updated'));
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </header>
  );
}

