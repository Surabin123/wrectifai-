'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Flame, Star, Package, CheckCircle, Percent, Clock, ChevronDown, Filter } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/common/modal';

import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';

import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

export function OffersPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSearch = (e: CustomEvent) => setSearchQuery(e.detail);
    
    const loadOffers = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<any>('/offers');
        if (Array.isArray(res)) setOffers(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadOffers();
    window.addEventListener('dashboard-search', handleSearch as EventListener);
    return () => {
      window.removeEventListener('dashboard-search', handleSearch as EventListener);
    };
  }, []);

  const filterOffer = (offer: any) => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) || offer.description.toLowerCase().includes(searchQuery.toLowerCase()) || offer.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  };

  const filteredOffers = offers.filter(filterOffer);

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Offers</h1>
          <p className="text-slate-500 text-sm">Exclusive deals and discounts just for you!</p>
        </div>

        {searchQuery && (
          <div className="text-sm font-medium text-slate-600">
            Searching offers for: <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">"{searchQuery}"</span>
          </div>
        )}

        {/* Hero Banner Placeholder */}
        {!searchQuery && selectedCategory === 'All' && (
          <Card className="h-48 rounded-[24px] bg-gradient-to-r from-blue-50 to-blue-100 flex items-center p-8 relative overflow-hidden border-blue-200 shadow-sm">
            <div className="relative z-10 w-2/3">
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Save More. Drive Better.</h2>
              <p className="text-blue-700 text-sm mb-4">Grab the best offers from top garages near you.</p>
            </div>
            <div className="absolute right-0 bottom-0 h-full w-1/2 flex items-end justify-end">
               <Image src="/assets/summner_car.png" alt="Hero" width={300} height={200} className="object-contain" />
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Service', 'Parts', 'Combo'].map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={cn("px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors", selectedCategory === cat ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
            >
              {cat === 'All' ? 'All Offers' : `${cat} Offers`}
            </button>
          ))}
        </div>

        {/* Regular Offers List */}
        {!loading && filteredOffers.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Available Offers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredOffers.map((offer) => (
                 <Card key={offer.id} className="p-4 flex gap-4 border-slate-100 shadow-sm hover:border-blue-200 transition-colors cursor-pointer group rounded-[20px]" onClick={() => setSelectedOffer(offer)}>
                    <div className="w-24 h-24 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 bg-blue-50 text-blue-600 relative overflow-hidden">
                       <Percent className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">{offer.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{offer.description}</p>
                      <div className="mt-auto flex items-center justify-between">
                         <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                           Code: {offer.code}
                         </div>
                      </div>
                    </div>
                 </Card>
               ))}
            </div>
          </div>
        )}

        {loading && <div className="p-8 text-center text-slate-500">Loading offers...</div>}

        {!loading && filteredOffers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[20px] border border-slate-100 shadow-sm">
             <Percent className="w-12 h-12 text-slate-200 mx-auto mb-3" />
             <p className="text-slate-500 font-medium">No offers found matching your criteria</p>
             <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="text-blue-600 text-sm mt-2 hover:underline font-semibold">Clear filters</button>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedOffer} onClose={() => setSelectedOffer(null)} title="Offer Details">
        {selectedOffer && (
          <div className="space-y-4">
             <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-blue-50 text-blue-600">
                <Percent className="w-5 h-5" />
             </div>
             <div>
               <div className="flex justify-between items-center mb-2">
                 <span className="px-2 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700">Code: {selectedOffer.code}</span>
               </div>
               
               <h3 className="text-xl font-bold text-slate-900">{selectedOffer.title}</h3>
               <p className="text-sm text-slate-600 my-4">{selectedOffer.description}</p>
               
               <div className="bg-slate-50 rounded-lg p-3 flex flex-col gap-1 border border-slate-100 mb-6 text-sm text-slate-700">
                 <p>Discount: {selectedOffer.discount_type === 'percentage' ? `${selectedOffer.discount_value}%` : formatCurrency(selectedOffer.discount_value)}</p>
                 {selectedOffer.max_discount && <p>Max Discount: {formatCurrency(selectedOffer.max_discount)}</p>}
                 {selectedOffer.min_order_amount > 0 && <p>Min Order: {formatCurrency(selectedOffer.min_order_amount)}</p>}
               </div>
               
               <Button className="w-full bg-blue-600 text-white" onClick={() => setSelectedOffer(null)}>Close</Button>
             </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}

export default OffersPage;