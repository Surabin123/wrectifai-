'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Car,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  ShieldAlert,
  X,
  Sparkles,
  Settings
} from 'lucide-react';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
  warranty?: unknown;
  plateNumber?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const data = await apiClient.get<Vehicle[]>('/vehicles');
      setVehicles(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load vehicles';
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchVehicles();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchVehicles]);

  return { vehicles, loading, errorText, fetchVehicles };
}

function FeatureHeader({ onAddClick }: { onAddClick: () => void }) {
  return (
    <Card className="rounded-[20px] border border-[#dfe8ff] bg-white/90 p-4 shadow-[0_12px_30px_rgba(30,58,138,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8ab4]">
              WrectifAI Workspace
            </p>
            <h1 className="mt-1 text-[25px] font-bold tracking-[-0.04em] text-[#17307a]">
              My Vehicles
            </h1>
          </div>
        </div>
        <div>
          <Button onClick={onAddClick} className="w-full lg:w-auto flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Vehicle
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FeatureAside() {
  const tips = [
    {
      title: 'Why Register Your Vehicle?',
      text: 'Adding real vehicle details enables accurate diagnostic lookup, precise spare parts compatibility matching, and accurate garage repair quotes.',
      icon: Sparkles,
    },
    {
      title: 'VIN Benefits',
      text: 'Providing your 17-digit Vehicle Identification Number (VIN) unlocks factory recall alerts and manufacturer warranty status tracking directly within WrectifAI.',
      icon: ShieldAlert,
    },
  ];

  return (
    <aside className="space-y-4">
      {tips.map(({ title, text, icon: Icon }) => (
        <Card key={title} className="rounded-[20px] p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef4ff] text-[#1a56db] shadow-[0_10px_24px_rgba(26,86,219,0.12)]">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-[16.5px] font-bold tracking-[-0.03em] text-[#17307a]">
            {title}
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-[#5d6f9f]">{text}</p>
        </Card>
      ))}
    </aside>
  );
}

export function VehiclesPage() {
  const { user } = useAuth();
  const country = user?.country || 'India';
  const { vehicles, loading, errorText, fetchVehicles } = useVehicles();

  // Modal control states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [vin, setVin] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [image, setImage] = useState('');
  const [mileage, setMileage] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setMake('');
    setModel('');
    setYear(new Date().getFullYear());
    setVin('');
    setPlateNumber('');
    setImage('');
    setMileage('');
    setFormError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!make.trim() || !model.trim() || !year || mileage === '' || !vin.trim() || !plateNumber.trim() || !image) {
      setFormError('Make, model, year, mileage, VIN, Plate Number, and Picture are all required.');
      return;
    }

    const currentYear = new Date().getFullYear();
    if (Number(year) > currentYear) {
      setFormError(`Vehicle year cannot be in the future (max ${currentYear}).`);
      return;
    }

    const isIndia = country === 'India';
    const isUSA = country === 'USA';
    const isUAE = country === 'UAE';
    
    if (vin.trim().length !== 17) {
      setFormError(`VIN number must be exactly 17 characters for ${country}.`);
      return;
    }

    const pLen = plateNumber.trim().length;
    if (isIndia && pLen !== 10) {
      setFormError(`Plate number must be exactly 10 characters for India.`);
      return;
    } else if (isUSA && (pLen < 2 || pLen > 8)) {
      setFormError(`Plate number must be between 2 and 8 characters for USA.`);
      return;
    } else if (isUAE && (pLen < 3 || pLen > 7)) {
      setFormError(`Plate number must be between 3 and 7 characters for UAE.`);
      return;
    }

    setSubmitting(true);
    try {
      const newVehicle = await apiClient.post('/vehicles', {
        make,
        model,
        year: Number(year),
        vin: vin.trim() || undefined,
        plateNumber: plateNumber.trim() || undefined,
        image: image || undefined,
        mileage: Number(mileage),
      });
      setIsAddOpen(false);
      resetForm();
      fetchVehicles();
      if (typeof window !== 'undefined') {
        localStorage.setItem('wrectifai_selected_vehicle', JSON.stringify(newVehicle));
        window.dispatchEvent(new Event('wrectifai-vehicle-changed'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save vehicle';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(vehicle.year);
    setVin(vehicle.vin || '');
    setPlateNumber(vehicle.plateNumber || '');
    setImage(vehicle.image || '');
    setMileage(vehicle.mileage || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedVehicle) return;

    if (!make.trim() || !model.trim() || !year || mileage === '' || !vin.trim() || !plateNumber.trim() || !image) {
      setFormError('Make, model, year, mileage, VIN, Plate Number, and Picture are all required.');
      return;
    }

    const currentYear = new Date().getFullYear();
    if (Number(year) > currentYear) {
      setFormError(`Vehicle year cannot be in the future (max ${currentYear}).`);
      return;
    }

    const isIndia = country === 'India';
    const isUSA = country === 'USA';
    const isUAE = country === 'UAE';

    if (vin.trim().length !== 17) {
      setFormError(`VIN number must be exactly 17 characters for ${country}.`);
      return;
    }

    const pLen = plateNumber.trim().length;
    if (isIndia && pLen !== 10) {
      setFormError(`Plate number must be exactly 10 characters for India.`);
      return;
    } else if (isUSA && (pLen < 2 || pLen > 8)) {
      setFormError(`Plate number must be between 2 and 8 characters for USA.`);
      return;
    } else if (isUAE && (pLen < 3 || pLen > 7)) {
      setFormError(`Plate number must be between 3 and 7 characters for UAE.`);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.patch(`/vehicles/${selectedVehicle.id}`, {
        make,
        model,
        year: Number(year),
        vin: vin.trim() || undefined,
        plateNumber: plateNumber.trim() || undefined,
        image: image || undefined,
        mileage: Number(mileage),
      });
      setIsEditOpen(false);
      setSelectedVehicle(null);
      resetForm();
      fetchVehicles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update vehicle';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDeleteError(null);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVehicle) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/vehicles/${selectedVehicle.id}`);
      setIsDeleteOpen(false);
      setSelectedVehicle(null);
      fetchVehicles();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('wrectifai-vehicle-changed'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete vehicle';
      setDeleteError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell
      header={<FeatureHeader onAddClick={() => { resetForm(); setIsAddOpen(true); }} />}
      aside={<FeatureAside />}
    >
      <div className="space-y-6">
        {loading ? (
          // Loading Skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse rounded-[24px] border border-[#dbe6ff] bg-white p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 w-2/3">
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : errorText ? (
          <Card className="rounded-[24px] border border-red-100 bg-red-50/50 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-800">Error Loading Vehicles</h3>
            <p className="mt-2 text-sm text-red-600 max-w-md mx-auto">{errorText}</p>
            <Button variant="outline" className="mt-4 border-red-200 hover:bg-red-50" onClick={fetchVehicles}>
              Retry Fetching
            </Button>
          </Card>
        ) : vehicles.length === 0 ? (
          // Empty State
          <Card className="rounded-[24px] border border-[#dfe8ff] bg-white p-8 text-center shadow-[0_12px_36px_rgba(30,58,138,0.04)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#eef4ff] text-[#1a56db] mx-auto mb-6 shadow-[0_10px_24px_rgba(26,86,219,0.1)]">
              <Car className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#17307a]">No Vehicles Registered Yet</h2>
            <p className="mt-2 text-sm text-[#5d6f9f] max-w-md mx-auto leading-6">
              Register your vehicle to quickly request maintenance quotes, diagnose issues with AI, and track service history.
            </p>
            <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="mt-6 flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" />
              Add Your First Vehicle
            </Button>
          </Card>
        ) : (
          // Vehicles Grid List
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="relative overflow-hidden rounded-[24px] border border-[#dbe6ff] bg-white p-6 shadow-[0_10px_30px_rgba(30,58,138,0.03)] hover:shadow-[0_15px_40px_rgba(26,86,219,0.06)] hover:border-[#bfd1ff] transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-[#17307a] leading-tight">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="mt-1 text-[13px] font-medium text-[#7a8ab4] uppercase tracking-wider">
                      ID: {vehicle.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#eef4ff] text-[#1a56db]">
                    <Car className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100/80 text-[13.5px]">
                  {vehicle.vin && (
                    <div className="flex justify-between text-[#5d6f9f]">
                      <span className="font-medium">VIN:</span>
                      <span className="font-mono text-[#17307a] tracking-tight">{vehicle.vin}</span>
                    </div>
                  )}
                  {vehicle.mileage !== undefined && vehicle.mileage !== null && (
                    <div className="flex justify-between text-[#5d6f9f]">
                      <span className="font-medium">Mileage:</span>
                      <span className="text-[#17307a] font-semibold">{vehicle.mileage.toLocaleString()} miles</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(vehicle)}
                    className="flex items-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(vehicle)}
                    className="border-red-100 text-red-600 hover:border-red-200 hover:bg-red-50/50 flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Add Vehicle */}
        {isAddOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,18,45,0.4)] px-4 py-5 backdrop-blur-[2px]">
            <Card className="w-full max-w-lg rounded-[24px] border border-[#dbe6ff] bg-white p-6 shadow-[0_20px_50px_rgba(10,18,45,0.15)] relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsAddOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-[#17307a] mb-5 flex items-center gap-2">
                <Car className="h-5 w-5 text-[#1a56db]" />
                Add New Vehicle
              </h2>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-[10px]">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Make *
                  </label>
                  <Input
                    placeholder="e.g. Honda, Toyota"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Model *
                  </label>
                  <Input
                    placeholder="e.g. Accord, RAV4"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                      Year *
                    </label>
                    <Input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={year}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 4) setYear(Number(val));
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                      Mileage (miles)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 45000"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value !== '' ? Number(e.target.value) : '')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    VIN (17 characters)
                  </label>
                  <Input
                    placeholder="Enter 17-digit VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    maxLength={17}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Plate Number
                  </label>
                  <Input
                    placeholder="e.g. ABC 1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Vehicle Picture
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const t = file.type.toLowerCase();
                        const n = file.name.toLowerCase();
                        const isValidFormat = t.includes('jpeg') || t.includes('jpg') || t.includes('png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png');
                        if (!isValidFormat) {
                          setFormError('Only JPG or PNG format is accepted for vehicle picture.');
                          e.target.value = '';
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setFormError('Vehicle picture must be less than 5MB.');
                          e.target.value = '';
                          return;
                        }
                        setFormError(null);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer border rounded-lg p-1.5"
                  />
                  {image && (
                    <img src={image} alt="Vehicle Preview" className="mt-2 h-24 object-cover rounded-lg border" />
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Vehicle'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Edit Vehicle */}
        {isEditOpen && selectedVehicle && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,18,45,0.4)] px-4 py-5 backdrop-blur-[2px]">
            <Card className="w-full max-w-lg rounded-[24px] border border-[#dbe6ff] bg-white p-6 shadow-[0_20px_50px_rgba(10,18,45,0.15)] relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsEditOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-[#17307a] mb-5 flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#1a56db]" />
                Edit Vehicle Details
              </h2>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-[10px]">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Make *
                  </label>
                  <Input
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Model *
                  </label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                      Year *
                    </label>
                    <Input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={year}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 4) setYear(Number(val));
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                      Mileage (miles)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 45000"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value !== '' ? Number(e.target.value) : '')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    VIN (17 characters)
                  </label>
                  <Input
                    placeholder="Enter 17-digit VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    maxLength={17}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Plate Number
                  </label>
                  <Input
                    placeholder="e.g. ABC 1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Vehicle Picture
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const t = file.type.toLowerCase();
                        const n = file.name.toLowerCase();
                        const isValidFormat = t.includes('jpeg') || t.includes('jpg') || t.includes('png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png');
                        if (!isValidFormat) {
                          setFormError('Only JPG or PNG format is accepted for vehicle picture.');
                          e.target.value = '';
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setFormError('Vehicle picture must be less than 5MB.');
                          e.target.value = '';
                          return;
                        }
                        setFormError(null);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer border rounded-lg p-1.5"
                  />
                  {image && (
                    <img src={image} alt="Vehicle Preview" className="mt-2 h-24 object-cover rounded-lg border" />
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Confirm Delete */}
        {isDeleteOpen && selectedVehicle && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,18,45,0.4)] px-4 py-5 backdrop-blur-[2px]">
            <Card className="w-full max-w-md rounded-[24px] border border-[#dbe6ff] bg-white p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#17307a]">Delete Vehicle?</h2>
              
              {deleteError ? (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {deleteError}
                </div>
              ) : (
                <p className="mt-2 text-[14px] leading-6 text-[#5d6f9f]">
                  Are you sure you want to remove the <strong>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</strong>?
                  This action is permanent and will hide it from your diagnostics and quotes request lists.
                </p>
              )}

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                  {deleteError ? 'Close' : 'Cancel'}
                </Button>
                {!deleteError && (
                  <Button
                    disabled={submitting}
                    onClick={handleDeleteConfirm}
                    className="bg-red-600 text-white shadow-[0_10px_20px_rgba(220,38,38,0.2)] hover:bg-red-700"
                  >
                    {submitting ? 'Deleting...' : 'Confirm Delete'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Modal: Edit Vehicle */}
        {isEditOpen && selectedVehicle && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,18,45,0.4)] px-4 py-5 backdrop-blur-[2px]">
            <Card className="w-full max-w-lg rounded-[24px] border border-[#dbe6ff] bg-white p-6 shadow-[0_20px_50px_rgba(10,18,45,0.15)] relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsEditOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-[#17307a] mb-5 flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#1a56db]" />
                Edit Vehicle Details
              </h2>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-[10px]">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Make *
                  </label>
                  <Input
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Model *
                  </label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                      Year *
                    </label>
                    <Input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={year}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 4) setYear(Number(val));
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                      Mileage (miles)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 45000"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value !== '' ? Number(e.target.value) : '')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    VIN (17 characters)
                  </label>
                  <Input
                    placeholder="Enter 17-digit VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    maxLength={17}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Plate Number
                  </label>
                  <Input
                    placeholder="e.g. ABC 1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5d6f9f] uppercase tracking-wider mb-1.5">
                    Vehicle Picture
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const t = file.type.toLowerCase();
                        const n = file.name.toLowerCase();
                        const isValidFormat = t.includes('jpeg') || t.includes('jpg') || t.includes('png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png');
                        if (!isValidFormat) {
                          setFormError('Only JPG or PNG format is accepted for vehicle picture.');
                          e.target.value = '';
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setFormError('Vehicle picture must be less than 5MB.');
                          e.target.value = '';
                          return;
                        }
                        setFormError(null);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer border rounded-lg p-1.5"
                  />
                  {image && (
                    <img src={image} alt="Vehicle Preview" className="mt-2 h-24 object-cover rounded-lg border" />
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Confirm Delete */}
        {isDeleteOpen && selectedVehicle && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,18,45,0.4)] px-4 py-5 backdrop-blur-[2px]">
            <Card className="w-full max-w-md rounded-[24px] border border-[#dbe6ff] bg-white p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#17307a]">Delete Vehicle?</h2>
              
              {deleteError ? (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {deleteError}
                </div>
              ) : (
                <p className="mt-2 text-[14px] leading-6 text-[#5d6f9f]">
                  Are you sure you want to remove the <strong>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</strong>?
                  This action is permanent and will hide it from your diagnostics and quotes request lists.
                </p>
              )}

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                  {deleteError ? 'Close' : 'Cancel'}
                </Button>
                {!deleteError && (
                  <Button
                    disabled={submitting}
                    onClick={handleDeleteConfirm}
                    className="bg-red-600 text-white shadow-[0_10px_20px_rgba(220,38,38,0.2)] hover:bg-red-700"
                  >
                    {submitting ? 'Deleting...' : 'Confirm Delete'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default VehiclesPage;