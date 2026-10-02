'use client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/modal';
import { apiClient } from '@/lib/api-client';
import { AlertCircle } from 'lucide-react';
import type { BusinessHours } from '@/utils/working-hours';

function toIndiaAppointmentTimestamp(date: string, time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return `${date}T${time}`;
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
  return `${date}T${String(hour).padStart(2, '0')}:${match[2]}:00+05:30`;
}

export function BookingModal({ 
  isOpen, 
  onClose, 
  garageId, 
  businessHours: initialBusinessHours,
  garageName: initialGarageName,
  comboId,
  comboTitle,
  selectedDate = '',
  selectedTime = '',
  onSubmitSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  garageId: string; 
  businessHours?: BusinessHours;
  garageName?: string;
  comboId?: string;
  comboTitle?: string;
  selectedDate?: string;
  selectedTime?: string;
  onSubmitSuccess?: () => void; 
}) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [issueDescription, setIssueDescription] = useState(comboTitle || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [garageName, setGarageName] = useState<string>(initialGarageName || '');

  useEffect(() => {
    if (isOpen) {
      apiClient.get<any[]>('/vehicles').then(data => {
        setVehicles(data || []);
        // DO NOT preselect a vehicle to force the user to select one
        setSelectedVehicleId('');
      }).catch(console.error);

      if (garageId) {
        apiClient.get<any>(`/garages/${garageId}`).then(data => {
          if (data) {
            if (data.name) setGarageName(data.name);
          }
        }).catch(console.error);
      }
      
      if (comboTitle) {
        setIssueDescription(comboTitle);
      } else {
        setIssueDescription('');
      }
    }
  }, [isOpen, garageId, comboTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!issueDescription.trim()) {
      setErrorMsg('Please enter the issue description before booking.');
      return;
    }
    if (!selectedVehicleId) {
      setErrorMsg('Please select a vehicle.');
      return;
    }
    if (!selectedDate || !selectedTime) {
      setErrorMsg('Please select an available appointment date and time first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { createQuoteRequest } = await import('@/lib/quotes-api');
      await createQuoteRequest({
        garageId,
        vehicleId: selectedVehicleId,
        issueSummary: issueDescription.trim(),
        preferredDate: toIndiaAppointmentTimestamp(selectedDate, selectedTime)
      });

      if (onSubmitSuccess) onSubmitSuccess();
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
          <label className="block text-sm font-semibold mb-1">Select Vehicle <span className="text-red-500">*</span></label>
          <select 
            value={selectedVehicleId} 
            onChange={(e) => setSelectedVehicleId(e.target.value)} 
            className="w-full p-2.5 border rounded-xl bg-white text-sm focus:outline-none focus:border-blue-500"
            required
          >
            <option value="" disabled>Select a vehicle</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Service or Issue Description <span className="text-red-500">*</span></label>
          <textarea
            className="w-full rounded-xl border border-gray-300 p-2.5 text-sm disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:border-blue-500"
            rows={3}
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="E.g., Oil change, brake pad replacement, weird noise from engine..."
            disabled={!!comboTitle}
          />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Appointment requested for <strong>{selectedDate}</strong> at <strong>{selectedTime}</strong> at {garageName || 'this garage'}.
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isSubmitting || !selectedVehicleId || !issueDescription.trim() || !selectedDate || !selectedTime}
            className="px-6 py-2.5 bg-[#1a56db] text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Request Quote'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
