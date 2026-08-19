'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, History, X, Trash2, ShoppingCart, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/common/input';
import { topNavIcons } from '@/components/home/data';
import { cn } from '@/utils/cn';
import { useAuth } from '@/lib/auth-context';
import {
  COUNTRIES,
  detectCountryFromPhone,
  getCountryForCity,
  getSavedDialCode,
  saveCity,
  initLocationForUser,
  setLocationCookie,
} from '@/utils/location';
import { Badge } from '@/components/common/badge';
import { resolveImageUrl } from '@/lib/utils';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { getChatHistory } from '@/lib/diagnosis-api';
import Image from 'next/image';

const getMediaUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
  const hostUrl = baseUrl.replace(/\/api(\/v1)?\/?$/, '');
  return `${hostUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export function TopNavbar() {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Location');
  const [citySearch, setCitySearch] = useState('');
  const [isTypingCustom, setIsTypingCustom] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [pastMessages, setPastMessages] = useState<any[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Authentication context
  const { user, logout } = useAuth();

  // Close dropdown on click outside + initialise carts/notifications + location
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    // Cart / wishlist / notification helpers
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
      } else {
        setNotificationCount(0);
      }
    };

    updateCart();
    updateWishlist();
    updateNotifications();

    window.addEventListener('cart-updated', updateCart);
    window.addEventListener('wishlist-updated', updateWishlist);
    window.addEventListener('notifications-updated', updateNotifications);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_notifications') updateNotifications();
    });

    // ── Location initialisation ────────────────────────────────────────────────
    // Priority:
    //   1. Authenticated user's DB country or phone country
    //   2. Saved cookie → user has already chosen a city within their country
    //   3. Fallback → India
    const city = initLocationForUser(user);
    setSelectedCity(city);
    window.dispatchEvent(new Event('city-changed'));
    // ──────────────────────────────────────────────────────────────────────────

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
    if (isLocalSearch) return;
    if (query.trim()) {
      router.push(`/garages?search=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/garages');
    }
  };

  // ── City dropdown list ────────────────────────────────────────────────────────
  // Show only the cities that belong to the user's detected/saved country.
  // Priority: 1. DB country, 2. Phone detection, 3. Guest Cookie, 4. Fallback
  const savedDialCode = getSavedDialCode();
  
  let activeCountry = COUNTRIES[0];
  if (user) {
    if (user.country) {
      activeCountry = COUNTRIES.find(c => c.name === user.country || c.code === user.country) || detectCountryFromPhone(user.mobileNumber);
    } else {
      activeCountry = detectCountryFromPhone(user.mobileNumber);
    }
  } else if (savedDialCode) {
    activeCountry = COUNTRIES.find(c => c.dialCode === savedDialCode) ?? COUNTRIES[0];
  }

  const activeCityList = activeCountry.cities;

  const filteredCities = activeCityList.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );
  // ─────────────────────────────────────────────────────────────────────────────

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
              setCitySearch('');
              setIsTypingCustom(false);
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
              {/* Search / custom-city input */}
              <div className="relative mb-2 flex items-center gap-1">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8ea0c7]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && citySearch.trim()) {
                        e.preventDefault();
                        const city = citySearch.trim();
                        const countryForCity = getCountryForCity(city);
                        setSelectedCity(city);
                        saveCity(city, countryForCity.dialCode);
                        window.dispatchEvent(new Event('city-changed'));
                        setIsDropdownOpen(false);
                        setIsTypingCustom(false);
                      }
                    }}
                    placeholder={isTypingCustom ? 'Type city...' : 'Search your city...'}
                    className="h-[36px] w-full rounded-lg border border-[#7fa5f7] bg-white pl-9 pr-3 text-[12.5px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#4d82f3] focus:ring-1 focus:ring-[#4d82f3]"
                    autoFocus
                  />
                </div>
                {isTypingCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      if (citySearch.trim()) {
                        const city = citySearch.trim();
                        const countryForCity = getCountryForCity(city);
                        setSelectedCity(city);
                        saveCity(city, countryForCity.dialCode);
                        window.dispatchEvent(new Event('city-changed'));
                        setIsDropdownOpen(false);
                        setIsTypingCustom(false);
                      }
                    }}
                    className="h-[36px] shrink-0 rounded-lg bg-[#1a56db] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#174ec4]"
                  >
                    Set
                  </button>
                )}
              </div>

              {/* City list */}
              <div className="max-h-[175px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-100 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        const countryForCity = getCountryForCity(city);
                        setSelectedCity(city);
                        saveCity(city, countryForCity.dialCode);
                        window.dispatchEvent(new Event('city-changed'));
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        'flex h-[34px] w-full items-center rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors',
                        city === selectedCity
                          ? 'bg-[#1a56db] text-white'
                          : 'text-[#17307a] hover:bg-[#f2f6ff]'
                      )}
                    >
                      {city}
                    </button>
                  ))
                ) : (
                  <div className="py-3 text-center text-[11px] font-normal text-[#17307a]">
                    Not in list. Press Enter to use &ldquo;{citySearch}&rdquo;
                  </div>
                )}

                {!isTypingCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTypingCustom(true);
                      setCitySearch('');
                      searchInputRef.current?.focus();
                    }}
                    className="flex h-[34px] w-full items-center rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors text-[#17307a] hover:bg-[#f2f6ff] mt-1 border-t border-[#f2f6ff]"
                  >
                    Other
                  </button>
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
            window.dispatchEvent(new CustomEvent('dashboard-search', { detail: newQuery.trim() }));
          }}
          className="h-10 rounded-lg pl-11 pr-4 w-full"
          placeholder="Search for services, parts, garages..."
          aria-label="Search for services, parts, garages"
        />
      </form>

      {/* Right Section: Notifications, Chat, Favorites, Profile */}
      <div className="flex items-center gap-[7px] sm:gap-[12px] shrink-0 ml-auto lg:ml-0">
        <button
          title="Past Conversations"
          onClick={async () => {
            const savedVehicleStr = localStorage.getItem('wrectifai_selected_vehicle');
            const vId = savedVehicleStr ? JSON.parse(savedVehicleStr).id : 'guest';

            if (vId !== 'guest') {
              try {
                const response = await getChatHistory(vId);
                if (response?.messages && response.messages.length > 0) {
                  setPastMessages(response.messages);
                  setIsHistoryModalOpen(true);
                  return;
                }
              } catch (e) {
                // suppress; fall through to localStorage
              }
            }

            const saved = localStorage.getItem(`ai_chat_history_${vId}`);
            if (saved) {
              try { setPastMessages(JSON.parse(saved)); } catch (e) { setPastMessages([]); }
            } else { setPastMessages([]); }
            setIsHistoryModalOpen(true);
          }}
          className="relative h-9 w-9 lg:h-10 lg:w-10 shrink-0 flex items-center justify-center rounded-full bg-white text-[#17307a] shadow-sm ring-1 ring-[#e5ecfb] hover:bg-[#f2f6ff]"
        >
          <History className="h-4 w-4 lg:h-[18px] lg:w-[18px]" />
        </button>

        {topNavIcons.map(({ icon: Icon, badge, label, href }) => (
          <button
            key={label}
            aria-label={label}
            onClick={() => {
              if (label === 'Wishlist') {
                setIsWishlistOpen(true);
              } else if (href.startsWith('#')) {
                // hash links – handled elsewhere
              } else {
                router.push(href);
              }
            }}
            className={cn(
              'relative h-9 w-9 lg:h-10 lg:w-10 shrink-0 flex items-center justify-center rounded-full bg-white text-[#17307a] shadow-sm ring-1 ring-[#e5ecfb]',
              label !== 'Notifications' ? 'hidden lg:flex' : 'flex'
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

      {/* Wishlist Modal */}
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
                        {item.img && <Image src={resolveImageUrl(item.img) || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'} alt={item.name} fill className="object-cover" />}
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
                            localStorage.setItem('shopWishlist', JSON.stringify(newWishlist));
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
                        <Image src={resolveImageUrl(item.img) || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'} alt={item.name} fill className="object-contain p-2" />
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
                            const cart = JSON.parse(localStorage.getItem('shopCart') || '[]');
                            const existing = cart.find((i: any) => i.id === item.id);
                            const newCart = existing
                              ? cart.map((i: any) => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i)
                              : [...cart, { ...item, quantity: 1 }];
                            localStorage.setItem('shopCart', JSON.stringify(newCart));
                            window.dispatchEvent(new Event('cart-updated'));
                            const newWishlist = wishlistItems.filter((i: any) => i.id !== item.id);
                            setWishlistItems(newWishlist);
                            localStorage.setItem('shopWishlist', JSON.stringify(newWishlist));
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
                            localStorage.setItem('shopWishlist', JSON.stringify(newWishlist));
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

      {/* Past Conversations Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070e20]/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h2 className="text-[17px] font-bold text-[#17307a]">Past Conversations</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="rounded-full p-1.5 transition-colors hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {pastMessages.length === 0 ? (
                <div className="py-10 text-center text-sm font-medium text-gray-400">No past conversations found.</div>
              ) : (
                pastMessages.map((msg, i) => (
                  <div key={i} className="w-full flex flex-col">
                    {msg.id === 'msg-initial' && (
                      <div className="flex items-center justify-center py-5 my-2">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="mx-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest bg-white">
                          Diagnosis Session {msg.time && `• ${msg.time}`}
                        </span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} mb-3`}>
                      <span className="mb-1 text-[11px] font-bold text-gray-400">{msg.time}</span>
                      
                      {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2 justify-end">
                          {msg.mediaUrls.map((url: string, imgIdx: number) => (
                            <div key={imgIdx} className="relative h-20 w-20 overflow-hidden rounded-md border border-[#c7d8ff] bg-white">
                              <Image
                                src={getMediaUrl(url)}
                                alt="Attached media"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Only render the text bubble if there's actual text */}
                      {(msg.text || msg.question) && (
                        <div className={`max-w-[85%] rounded-2xl p-3.5 text-[13.5px] leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-[#2451f6] text-white' : 'bg-[#f4f7ff] text-[#17307a]'}`}>
                          {msg.text || msg.question}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
