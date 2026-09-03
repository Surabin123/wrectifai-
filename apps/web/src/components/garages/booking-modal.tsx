'use client';
import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/modal';
import { apiClient } from '@/lib/api-client';
import { getDaySchedule, parseTimeToMinutes, type BusinessHours } from '@/utils/working-hours';
import { AlertCircle, Clock } from 'lucide-react';

export function BookingModal({ 
  isOpen, 
  onClose, 
  garageId, 
  businessHours: initialBusinessHours,
  garageName: initialGarageName,
  onSubmitSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  garageId: string; 
  businessHours?: BusinessHours;
  garageName?: string;
  onSubmitSuccess: () => void; 
}) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [garageHours, setGarageHours] = useState<BusinessHours | undefined>(initialBusinessHours);
  const [garageName, setGarageName] = useState<string>(initialGarageName || '');

  useEffect(() => {
    if (isOpen) {
      apiClient.get<any[]>('/vehicles').then(data => {
        setVehicles(data || []);
        if (data && data.length > 0) setSelectedVehicleId(data[0].id);
      }).catch(console.error);

      if (garageId) {
        apiClient.get<any>(`/garages/${garageId}`).then(data => {
          if (data) {
            if (data.businessHours) setGarageHours(data.businessHours);
            if (data.name) setGarageName(data.name);
          }
        }).catch(console.error);
      }
    }
  }, [isOpen, garageId]);

  const schedule = useMemo(() => {
    return getDaySchedule(garageHours, preferredDate);
  }, [garageHours, preferredDate]);

  // When date changes, update time or show closed status
  useEffect(() => {
    if (preferredDate) {
      if (!schedule.isOpen) {
        setPreferredTime('');
      } else if (schedule.availableTimeSlots.length > 0) {
        // If current selected time is not valid, set to first slot
        const valid = schedule.availableTimeSlots.some(s => s.value === preferredTime);
        if (!valid) {
          setPreferredTime(schedule.availableTimeSlots[0].value);
        }
      }
    }
  }, [preferredDate, schedule]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!issueDescription.trim()) {
      setErrorMsg('Please enter the issue description before booking.');
      return;
    }
    if (!preferredDate || !preferredTime) {
      setErrorMsg('Please select a preferred date and time.');
      return;
    }
    if (!schedule.isOpen) {
      setErrorMsg(`Booking is unavailable because ${garageName || 'the garage'} is closed on ${schedule.dayDisplay}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { createBooking } = await import('@/lib/bookings-api');
      const scheduledAt = `${preferredDate}T${preferredTime}:00`;
      
      await createBooking({
        garageId,
        vehicleId: selectedVehicleId || '00000000-0000-0000-0000-000000000002',
        scheduledAt,
        serviceType: issueDescription,
        totalAmount: 0,
        bookingType: 'instant',
        quoteId: null
      });
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Appointment" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Select Vehicle</label>
          <select 
            value={selectedVehicleId} 
            onChange={(e) => setSelectedVehicleId(e.target.value)} 
            className="w-full p-2.5 border rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Preferred Date</label>
            <input 
              type="date" 
              required 
              min={todayStr}
              value={preferredDate} 
              onChange={e => setPreferredDate(e.target.value)} 
              className="w-full p-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Preferred Time</label>
            {preferredDate && !schedule.isOpen ? (
              <div className="p-2.5 border border-red-200 bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 h-[42px]">
                <span>Closed on {schedule.dayDisplay}</span>
              </div>
            ) : schedule.availableTimeSlots.length > 0 ? (
              <select
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                required
                className="w-full p-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                {schedule.availableTimeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            ) : (
              <input 
                type="time" 
                required 
                value={preferredTime} 
                onChange={e => setPreferredTime(e.target.value)} 
                className="w-full p-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500" 
              />
            )}
          </div>
        </div>

        {preferredDate && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            !schedule.isOpen 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-blue-50 text-blue-800 border border-blue-100'
          }`}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {!schedule.isOpen 
                ? `${garageName || 'This garage'} is CLOSED on ${schedule.dayDisplay}s. Please select an open day.`
                : `Working Hours on ${schedule.dayDisplay}: ${schedule.startStr || '09:00 AM'} - ${schedule.endStr || '07:00 PM'}`}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Issue Description / Notes <span className="text-red-500">*</span></label>
          <textarea 
            value={issueDescription} 
            onChange={e => setIssueDescription(e.target.value)}
            className="w-full p-3 border rounded-xl text-sm h-24 focus:outline-none focus:border-blue-500"
            placeholder="Describe any issues or specific instructions..."
            required
          />
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isSubmitting || (preferredDate ? !schedule.isOpen : false)} 
            className="px-6 py-2.5 bg-[#1a56db] text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Book Now'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
