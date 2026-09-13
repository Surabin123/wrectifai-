'use client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { apiClient } from '@/lib/api-client';

interface CreateBookingModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userRole: 'admin' | 'garage';
  prefilledGarageId?: string;
}

export function CreateBookingModal({ onClose, onSuccess, userRole, prefilledGarageId }: CreateBookingModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [garages, setGarages] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedGarageId, setSelectedGarageId] = useState(prefilledGarageId || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [serviceType, setServiceType] = useState('General Maintenance');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Fetch customers
    apiClient.get<any[]>('/admin/users?role=customer&limit=100').then(data => {
      setCustomers(data || []);
    }).catch(console.error);

    if (userRole === 'admin') {
      apiClient.get<any[]>('/garages').then(data => {
        setGarages(data || []);
      }).catch(console.error);
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedCustomerId) {
      apiClient.get<any[]>(`/admin/users/${selectedCustomerId}/vehicles`).then(data => {
        setVehicles(data || []);
        if (data && data.length > 0) setSelectedVehicleId(data[0].id);
      }).catch(console.error);
    } else {
      setVehicles([]);
    }
  }, [selectedCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedCustomerId || !selectedVehicleId || !selectedGarageId || !scheduledAt || !totalAmount) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = userRole === 'admin' ? '/admin/bookings' : '/bookings';
      await apiClient.post(endpoint, {
        customerId: selectedCustomerId,
        garageId: selectedGarageId,
        vehicleId: selectedVehicleId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        totalAmount: Number(totalAmount),
        bookingType: 'direct',
        serviceType,
        issueDescription
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Booking" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Customer *</label>
            <select 
              value={selectedCustomerId} 
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.email || c.mobile_number}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Vehicle *</label>
            <select 
              value={selectedVehicleId} 
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              required
              disabled={!selectedCustomerId}
            >
              <option value="">Select Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>
              ))}
            </select>
          </div>

          {userRole === 'admin' && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Garage *</label>
              <select 
                value={selectedGarageId} 
                onChange={e => setSelectedGarageId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                required
              >
                <option value="">Select Garage</option>
                {garages.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Scheduled Date & Time *</label>
            <Input 
              type="datetime-local" 
              value={scheduledAt} 
              onChange={e => setScheduledAt(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Total Amount *</label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              placeholder="e.g. 150.00" 
              value={totalAmount} 
              onChange={e => setTotalAmount(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Service Type</label>
            <Input 
              type="text" 
              placeholder="e.g. Oil Change" 
              value={serviceType} 
              onChange={e => setServiceType(e.target.value)} 
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Issue Description</label>
          <textarea
            value={issueDescription}
            onChange={e => setIssueDescription(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Describe the issue or service needed..."
          />
        </div>

        <div className="flex justify-end pt-4 gap-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Booking'}</Button>
        </div>
      </form>
    </Modal>
  );
}
