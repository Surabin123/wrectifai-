'use client';

import { useEffect, useState, useMemo } from 'react';
import { ShieldCheck, Tag, Percent, SlidersHorizontal, Package, Wrench } from 'lucide-react';
import { Card } from '@/components/common/card';
import { TopNavbar } from '@/components/home/top-navbar';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { RoleGuard } from '@/components/common/role-guard';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/utils/cn';

type OfferFilter = 'All' | 'SERVICE' | 'PARTS' | 'COMBO';

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
  offer_type: 'SERVICE' | 'PARTS' | 'COMBO' | 'GLOBAL';
  applicable_item_id?: string;
  terms_conditions?: string;
  garageName?: string;
}

const filters: { label: OfferFilter; displayLabel: string; icon?: any }[] = [
  { label: 'All', displayLabel: 'All Offers', icon: Tag },
  { label: 'SERVICE', displayLabel: 'Service Offers', icon: Wrench },
  { label: 'PARTS', displayLabel: 'Parts & Accessories', icon: Package },
  { label: 'COMBO', displayLabel: 'Combo Offers', icon: Percent },
];

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OfferFilter>('All');
  const [currencyCode, setCurrencyCode] = useState('INR');

  useEffect(() => {
    import('@/utils/location').then(({ getSavedCity, getCurrencyCodeForCity }) => {
      const city = getSavedCity();
      if (city) setCurrencyCode(getCurrencyCodeForCity(city));
    });
  }, []);
  
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const fetchOffers = async () => {
      try {
        const cityCookie = getCookie('wrectifai_city') || 'Location';
        const userCity = decodeURIComponent(cityCookie);
        
        let url = '/offers';
        const params = new URLSearchParams();
        if (userCity && userCity !== 'Location') {
          params.append('city', userCity);
          const { getCountryForCity } = await import('@/utils/location');
          const country = getCountryForCity(userCity).name;
          if (country) params.append('country', country);
        }
        
        if (params.toString()) {
          url += '?' + params.toString();
        }

        const data = await apiClient.get<Offer[]>(url);
        setOffers(data || []);
      } catch (err) {
        console.error('Failed to load offers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const filteredOffers = useMemo(() => {
    if (activeFilter === 'All') return offers;
    return offers.filter(o => o.offer_type === activeFilter);
  }, [offers, activeFilter]);

  return (
    <RoleGuard allowedRoles={['customer']}>
      <DashboardShell hideBottomWidget={true} header={<TopNavbar />}>
        <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 mt-8 pb-24 font-sans">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Active Offers & Promos</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Save big on your next garage visit. Discover exclusive discounts on services, parts, and combos from top-rated garages.
          </p>
        </div>

        {/* Filters */}
        <div className="flex overflow-x-auto pb-4 mb-6 gap-3 hide-scrollbar">
          {filters.map((f) => {
            const Icon = f.icon;
            const active = activeFilter === f.label;
            return (
              <button
                key={f.label}
                onClick={() => setActiveFilter(f.label)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all shadow-sm whitespace-nowrap',
                  active
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {f.displayLabel}
              </button>
            );
          })}
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No offers found</h3>
            <p className="text-sm text-slate-500 mt-1">Check back later for new promotions and discounts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map(offer => (
              <Card 
                key={offer.id} 
                className="overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase">
                      {offer.offer_type}
                    </span>
                    {offer.garageName && (
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                        {offer.garageName}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {offer.title}
                  </h3>
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {offer.description}
                  </p>

                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-black text-green-600">
                      {offer.discount_type === 'PERCENTAGE'
                        ? `${offer.discount_value}% OFF`
                        : `${formatCurrency(offer.discount_value, currencyCode)} OFF`}
                    </span>
                  </div>
                  
                  {(offer.min_order_amount ?? 0) > 0 && (
                    <p className="text-xs text-slate-500 font-medium">
                      On minimum order of {formatCurrency(offer.min_order_amount!, currencyCode)}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Use Code</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm inline-block mt-1">
                      {offer.code}
                    </span>
                  </div>
                  {offer.valid_until && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Valid Until</span>
                      <span className="text-xs font-semibold text-slate-700 mt-1 block">
                        {new Date(offer.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

export default OffersPage;