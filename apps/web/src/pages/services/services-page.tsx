'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Wrench, CheckCircle, ChevronDown, Check, Star, Filter, MapPin } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/utils/cn';
import { formatCurrency, getLocationCookie } from '@/utils/location';
import { Modal } from '@/components/common/modal';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';

export const initialMockServices = [
  { id: 1, name: 'Oil Change', category: 'Maintenance', desc: 'Engine oil replacement with premium quality oil for better performance.', price: '10', img: '/assets/engine_oil_bottle.png' },
  { id: 2, name: 'Brake Service', category: 'Repairs', desc: 'Complete brake inspection and maintenance for your safety.', price: '20', img: '/assets/brake_disc_1778070670609.png' },
  { id: 3, name: 'Tyre Services', category: 'Maintenance', desc: 'Tyre rotation, balancing and alignment for smooth driving.', price: '15', img: '/assets/clean_tire.png' },
  { id: 4, name: 'AC Service', category: 'Maintenance', desc: 'AC gas refill and system check for a cool and comfortable ride.', price: '25', img: '/assets/ac_vent_1778070688367.png' },
  { id: 5, name: 'Diagnostics Only', category: 'Diagnostics', desc: 'Advanced scanning to detect and fix problems accurately.', price: '30', img: '/assets/Robo_icon.png' },
  { id: 6, name: 'Battery Replacement', category: 'Repairs', desc: 'High-performance batteries for a reliable start every time.', price: '80', img: '/assets/car_battery.png' },
  { id: 7, name: 'Wiper Replacement', category: 'Other Services', desc: 'Clear visibility in all weather conditions with new wipers.', price: '15', img: '/assets/wiper_blade_1778070781712.png' },
  { id: 8, name: 'Coolant Flush', category: 'Maintenance', desc: 'Keep your engine cool and protected with coolant replacement.', price: '20', img: '/assets/oil_pour_1778070767058.png' },
  { id: 9, name: 'Suspension Check', category: 'Repairs', desc: 'Ensure a smooth and safe driving experience.', price: '40', img: '/assets/Electrical.png' },
];

const TOP_GARAGES = [
  { id: 1, name: 'Speed Car Garage', location: '1.2 km away', rating: 4.8, reviews: 124 },
  { id: 2, name: 'AutoCare Center', location: '2.5 km away', rating: 4.6, reviews: 89 },
  { id: 3, name: 'Elite Motors', location: '3.1 km away', rating: 4.9, reviews: 210 },
];

const CATEGORIES = ['All Services', 'Maintenance', 'Repairs', 'Diagnostics', 'Other Services'];

export function ServicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Services');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
  const [services, setServices] = useState(initialMockServices);
  const [userCity, setUserCity] = useState('');

  useEffect(() => {
    const handleCityChange = () => {
      setUserCity(getLocationCookie('wrectifai_city') || '');
    };
    handleCityChange();
    window.addEventListener('city-changed', handleCityChange);

    const handleSearch = (e: CustomEvent) => setSearchQuery(e.detail);
    
    const loadServices = () => {
      const stored = localStorage.getItem('wrectifai_services');
      if (stored) {
        setServices(JSON.parse(stored));
      } else {
        localStorage.setItem('wrectifai_services', JSON.stringify(initialMockServices));
        setServices(initialMockServices);
      }
    };
    
    loadServices();
    
    window.addEventListener('dashboard-search', handleSearch as EventListener);
    window.addEventListener('services-updated', loadServices);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_services') loadServices();
    });
    
    return () => {
      window.removeEventListener('city-changed', handleCityChange);
      window.removeEventListener('dashboard-search', handleSearch as EventListener);
      window.removeEventListener('services-updated', loadServices);
    };
  }, []);

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Services' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleServiceClick = (service: any) => {
    setSelectedService(service);
    setIsGarageModalOpen(true);
  };

  const handleGarageSelect = (garage: any) => {
    setIsGarageModalOpen(false);
    setTimeout(() => {
      router.push('/bookings');
    }, 500);
  };

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Our Services</h1>
            <p className="text-slate-500 text-sm">Professional car services for every need</p>
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
              Showing results for: <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">"{searchQuery}"</span>
            </div>
          )}

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[24px] border border-slate-100 flex flex-col items-center">
              <Wrench className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No services found</h3>
              <p className="text-slate-500">Try selecting a different category or change your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <Card 
                  key={service.id} 
                  onClick={() => handleServiceClick(service)}
                  className="overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col group bg-white"
                >
                  <div className="relative h-40 bg-slate-50 flex items-center justify-center p-4">
                    <Image src={service.img} alt={service.name} width={120} height={120} className="object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-xs font-semibold text-blue-600 mb-1">{service.category}</div>
                    <h3 className="font-bold text-slate-900 mb-1">{service.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{service.desc}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs font-bold text-slate-900 bg-white/90 px-2 py-1 rounded backdrop-blur-sm shadow-sm">{formatCurrency(parseInt(service.price))} onwards</span>
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
            <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
            <p className="text-sm text-slate-500 mb-6">Find the right service for your vehicle and get it done by trusted garages.</p>
            <div className="space-y-3">
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => router.push('/garages')}>Request a Service</Button>
              <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => router.push('/bookings')}>View Bookings</Button>
            </div>
          </Card>

          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="font-bold text-slate-900 mb-4">Why Choose WrectifAI?</h3>
            <ul className="space-y-3">
              {[
                'Trusted Garages',
                'Transparent Pricing',
                'Real-time Updates',
                'Secure Payments'
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

      <Modal isOpen={isGarageModalOpen} onClose={() => setIsGarageModalOpen(false)} title="Select a Garage">
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500 mb-4">
            Select a trusted garage to book <span className="font-bold text-slate-900">{selectedService?.name}</span>
          </p>
          <div className="space-y-3">
            {TOP_GARAGES.map(garage => (
              <div 
                key={garage.id} 
                onClick={() => handleGarageSelect(garage)}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors group"
              >
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-700">{garage.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center text-xs text-slate-500"><MapPin className="w-3 h-3 mr-1"/> {userCity} • {garage.location}</span>
                    <span className="flex items-center text-xs font-medium text-amber-500"><Star className="w-3 h-3 mr-1 fill-current"/> {garage.rating} ({garage.reviews})</span>
                  </div>
                </div>
                <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Book</Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}

export default ServicesPage;