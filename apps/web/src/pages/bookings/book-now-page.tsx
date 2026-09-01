'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { Calendar, Clock, Plus, Trash2, Wrench, ShieldCheck } from 'lucide-react';
import { getSavedCity, formatCurrencyForCity } from '@/utils/location';

export default function BookNowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const garageId = searchParams?.get('garageId');
  const initialServiceId = searchParams?.get('serviceId');

  const [garage, setGarage] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const userCity = getSavedCity() || 'Bengaluru';

  useEffect(() => {
    if (!garageId) {
      router.push('/services');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch vehicles
        const v = await apiClient.get<any[]>('/vehicles');
        setVehicles(v);
        if (v.length > 0) setSelectedVehicleId(v[0].id);

        // Fetch garage details (we can infer from services API)
        const s = await apiClient.get<any[]>(`/services?city=${encodeURIComponent(userCity)}`);
        // Filter only services belonging to THIS garage
        const garageServices = s.filter(srv => srv.garageId === garageId);
        setAvailableServices(garageServices);

        if (garageServices.length > 0) {
          setGarage({
            id: garageServices[0].garageId,
            name: garageServices[0].garageName
          });
        }

        if (initialServiceId && garageServices.some(srv => srv.id === initialServiceId)) {
          setSelectedServiceIds([initialServiceId]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [garageId, initialServiceId, router, userCity]);

  const selectedServices = useMemo(() => {
    return selectedServiceIds.map(id => availableServices.find(s => s.id === id)).filter(Boolean);
  }, [selectedServiceIds, availableServices]);

  const unselectedServices = useMemo(() => {
    const rawUnselected = availableServices.filter(s => !selectedServiceIds.includes(s.id));
    // Deduplicate by name just in case the API returned multiple identical services
    const seen = new Set();
    return rawUnselected.filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [selectedServiceIds, availableServices]);

  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }, [selectedServices]);

  const handleAddService = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id && !selectedServiceIds.includes(id)) {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
    e.target.value = '';
  };

  const handleRemoveService = (id: string) => {
    setSelectedServiceIds(selectedServiceIds.filter(sId => sId !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      setErrorMsg('Please select at least one service.');
      return;
    }
    if (!preferredDate || !preferredTime) {
      setErrorMsg('Please select a date and time.');
      return;
    }
    
    setSubmitting(true);
    setErrorMsg('');

    try {
      const scheduledAt = `${preferredDate}T${preferredTime}:00`;
      await apiClient.post('/bookings', {
        garageId,
        vehicleId: selectedVehicleId || '00000000-0000-0000-0000-000000000002',
        scheduledAt,
        serviceIds: selectedServiceIds,
        totalAmount: 0, // backend overwrites
        bookingType: 'instant',
        quoteId: null,
        serviceType: notes,
        issueDescription: notes
      });

      router.push('/bookings');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell header={<TopNavbar />}>
        <div className="flex justify-center items-center h-[50vh]">Loading...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Book Service</h1>
          <p className="text-slate-500 text-sm">at {garage?.name || 'Selected Garage'}</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold border border-red-100 flex items-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 rounded-[24px]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600"/> Services Requested</h2>
              
              <div className="space-y-3 mb-6">
                {selectedServices.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-900">{service.name}</h4>
                      <p className="text-xs text-slate-500">{service.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900">{formatCurrencyForCity(service.price, userCity)}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveService(service.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {selectedServices.length === 0 && (
                  <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-300 rounded-xl text-center">
                    No services selected
                  </div>
                )}
              </div>

              {unselectedServices.length > 0 && (
                <div className="pt-2">
                  <select 
                    onChange={handleAddService} 
                    className="w-full p-3 font-semibold text-blue-600 border-2 border-dashed border-blue-200 rounded-xl appearance-none bg-blue-50 focus:outline-none focus:border-blue-500 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                    value=""
                  >
                    <option value="" disabled>+ Add Another Service</option>
                    {unselectedServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {formatCurrencyForCity(s.price, userCity)}</option>
                    ))}
                  </select>
                </div>
              )}
            </Card>

            <Card className="p-6 rounded-[24px] space-y-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600"/> Booking Details</h2>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Select Vehicle</label>
                <select 
                  value={selectedVehicleId} 
                  onChange={(e) => setSelectedVehicleId(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  required
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</option>
                  ))}
                  {vehicles.length === 0 && <option value="">No vehicles found</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Preferred Date</label>
                  <input type="date" required value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Preferred Time</label>
                  <input type="time" required value={preferredTime} onChange={e => setPreferredTime(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Additional Notes</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl h-24 focus:outline-none focus:border-blue-500"
                  placeholder="Any specific instructions for the garage..."
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 rounded-[24px] bg-slate-50 border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">Summary</h3>
              
              <div className="space-y-3 mb-6">
                {selectedServices.map(service => (
                  <div key={service.id} className="flex justify-between text-sm">
                    <span className="text-slate-600 line-clamp-1 pr-4">{service.name}</span>
                    <span className="font-medium text-slate-900 whitespace-nowrap">{formatCurrencyForCity(service.price, userCity)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-200 pt-4 mb-6 flex justify-between items-center">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-xl font-black text-blue-600">{formatCurrencyForCity(totalAmount, userCity)}</span>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl flex gap-3 items-start mb-6 border border-blue-100">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 font-medium">Payment is collected by the garage after the service is completed.</p>
              </div>

              <Button 
                type="submit" 
                disabled={submitting || selectedServices.length === 0} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 text-base"
              >
                {submitting ? 'Confirming...' : 'Confirm Booking'}
              </Button>
            </Card>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
