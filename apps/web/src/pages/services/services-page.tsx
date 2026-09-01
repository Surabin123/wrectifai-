'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Wrench, CheckCircle, ChevronDown, Check, Star, Filter, MapPin } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/utils/cn';
import { setLocationCookie, getLocationCookie } from '@/utils/location';
import { formatCurrency } from '@/lib/currency';
import { Modal } from '@/components/common/modal';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
// Trigger recompile

import { apiClient } from '@/lib/api-client';
import { getSavedCity, formatCurrencyForCity } from '@/utils/location';

const CATEGORIES = ['All Services', 'Maintenance', 'Repairs', 'Diagnostics', 'Electrical', 'Inspection', 'Other'];

function getServiceImage(name: string) {
  if (name.includes('Oil')) return '/assets/engine_oil_bottle.png';
  if (name.includes('Brake')) return '/assets/brake_disc_1778070670609.png';
  if (name.includes('Tyre') || name.includes('Wheel')) return '/assets/clean_tire.png';
  if (name.includes('AC')) return '/assets/ac_vent_1778070688367.png';
  if (name.includes('Diagnost')) return '/assets/Robo_icon.png';
  if (name.includes('Battery')) return '/assets/car_battery.png';
  if (name.includes('Wiper')) return '/assets/wiper_blade_1778070781712.png';
  if (name.includes('Coolant')) return '/assets/oil_pour_1778070767058.png';
  return '/assets/Electrical.png';
}

export function ServicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Services');
  const [selectedServiceGroup, setSelectedServiceGroup] = useState<any>(null);
  const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
  const [rawServices, setRawServices] = useState<any[]>([]);
  const [userCity, setUserCity] = useState('');

  const fetchServices = (city: string) => {
    const activeCity = city || getSavedCity() || 'Bengaluru';
    setUserCity(activeCity);
    apiClient.get<any[]>(`/services?city=${encodeURIComponent(activeCity)}`)
      .then(data => {
        setRawServices(data || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchServices(getSavedCity() || 'Bengaluru');

    const handleCityChange = () => {
      fetchServices(getSavedCity() || 'Bengaluru');
    };

    const handleSearch = (e: CustomEvent) => setSearchQuery(e.detail);

    window.addEventListener('city-changed', handleCityChange);
    window.addEventListener('dashboard-search', handleSearch as EventListener);
    
    return () => {
      window.removeEventListener('city-changed', handleCityChange);
      window.removeEventListener('dashboard-search', handleSearch as EventListener);
    };
  }, []);

  // Group services by name so customer sees unique service types in current city
  const groupedServicesMap: Record<string, {
    name: string;
    category: string;
    description: string;
    minPrice: number;
    img: string;
    garages: Array<{ id: string; garageId: string; garageName: string; price: number; formattedPrice: string }>;
  }> = {};

  rawServices.forEach(item => {
    const key = item.name;
    const priceNum = Number(item.price);
    if (!groupedServicesMap[key]) {
      groupedServicesMap[key] = {
        name: item.name,
        category: item.category || 'Maintenance',
        description: item.description || `${item.name} for your vehicle by trusted local garages.`,
        minPrice: priceNum,
        img: getServiceImage(item.name),
        garages: []
      };
    }
    if (priceNum > 0 && priceNum < groupedServicesMap[key].minPrice) {
      groupedServicesMap[key].minPrice = priceNum;
    }
    groupedServicesMap[key].garages.push({
      id: item.id,
      garageId: item.garageId,
      garageName: item.garageName,
      price: priceNum,
      formattedPrice: formatCurrencyForCity(priceNum, userCity)
    });
  });

  const groupedServicesList = Object.values(groupedServicesMap);

  const filteredServices = groupedServicesList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Services' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleServiceClick = (serviceGroup: any) => {
    setSelectedServiceGroup(serviceGroup);
    setIsGarageModalOpen(true);
  };

  const handleGarageSelect = (garageOffer: any) => {
    setIsGarageModalOpen(false);
    localStorage.setItem('selectedGarageId', garageOffer.garageId);
    setTimeout(() => {
      router.push('/bookings');
    }, 300);
  };

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Services in {userCity}</h1>
            <p className="text-slate-500 text-sm">Professional car services offered by verified garages in {userCity}</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-semibold transition-colors",
                  selectedCategory === cat 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {searchQuery && (
            <div className="text-sm font-medium text-slate-600">
              Showing results for: <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">&quot;{searchQuery}&quot;</span>
            </div>
          )}

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[24px] border border-slate-100 flex flex-col items-center">
              <Wrench className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No services found in {userCity}</h3>
              <p className="text-slate-500">Try selecting a different category or change your location context.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((serviceGroup) => (
                <Card 
                  key={serviceGroup.name} 
                  onClick={() => handleServiceClick(serviceGroup)}
                  className="overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col group bg-white border-slate-100 rounded-[20px]"
                >
                  <div className="relative h-40 bg-slate-50 flex items-center justify-center p-4">
                    <Image src={serviceGroup.img} alt={serviceGroup.name} width={120} height={120} className="object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-xs font-semibold text-blue-600 mb-1">{serviceGroup.category}</div>
                    <h3 className="font-bold text-slate-900 mb-1">{serviceGroup.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{serviceGroup.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {formatCurrencyForCity(serviceGroup.minPrice, userCity)} onwards ({serviceGroup.garages.length} {serviceGroup.garages.length === 1 ? 'garage' : 'garages'})
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <Card className="p-6 text-center border-blue-100 shadow-sm bg-gradient-to-b from-blue-50/50 to-white rounded-[24px]">
            <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Wrench className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Need Service in {userCity}?</h3>
            <p className="text-sm text-slate-500 mb-6">Book top-rated verified garages in {userCity} with transparent pricing.</p>
            <div className="space-y-3">
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => router.push('/garages')}>Browse Garages</Button>
              <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => router.push('/bookings')}>View Bookings</Button>
            </div>
          </Card>

          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="font-bold text-slate-900 mb-4">Why Choose WrectifAI?</h3>
            <ul className="space-y-3">
              {[
                'Verified Local Garages',
                'Transparent Local Pricing',
                'Real-time Updates',
                'Separate Shop & Service Invoices'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal isOpen={isGarageModalOpen} onClose={() => setIsGarageModalOpen(false)} title={`Garages in ${userCity} Offering ${selectedServiceGroup?.name || ''}`}>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500 mb-4">
            Select a garage offering <span className="font-bold text-slate-900">{selectedServiceGroup?.name}</span> in <span className="font-bold text-slate-900">{userCity}</span>:
          </p>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {selectedServiceGroup?.garages.map((garageOffer: any) => (
              <div 
                key={garageOffer.id} 
                onClick={() => handleGarageSelect(garageOffer)}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors group"
              >
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-700">{garageOffer.garageName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center text-xs text-slate-500"><MapPin className="w-3 h-3 mr-1"/> {userCity}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{garageOffer.formattedPrice}</span>
                  </div>
                </div>
                <Button size="sm" className="opacity-90 group-hover:opacity-100">Select & Book</Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}

export default ServicesPage;