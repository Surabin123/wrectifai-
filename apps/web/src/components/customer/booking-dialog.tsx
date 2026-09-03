'use client';
import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { apiClient } from '@/lib/api-client';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import { formatCurrency } from '@/lib/currency';
import { getCurrencyCode } from '@/lib/user-phone';
import { getDaySchedule, type BusinessHours } from '@/utils/working-hours';
import { Clock, AlertCircle } from 'lucide-react';

export function BookingDialog({ quote, onClose, onSuccess }: { quote: QuoteItem, onClose: () => void, onSuccess: () => void }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState(quote.preferredDate ? quote.preferredDate.split('T')[0] : '');
  const [preferredTime, setPreferredTime] = useState('');
  const [issueDescription, setIssueDescription] = useState(quote.requestIssueSummary || '');
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  const [garageHours, setGarageHours] = useState<BusinessHours | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const targetGarageId = (quote as any).garageId || (quote as any).garage_id;

  useEffect(() => {
    apiClient.get<any[]>('/vehicles').then(data => {
      setVehicles(data || []);
      if (data && data.length === 1) {
        setVehicleId(data[0].id);
      }
    }).catch(console.error);

    if (targetGarageId) {
      apiClient.get<any>(`/garages/${targetGarageId}`).then(gData => {
        if (gData && gData.businessHours) {
          setGarageHours(gData.businessHours);
        }
      }).catch(console.error);
    }
  }, [targetGarageId]);

  const schedule = useMemo(() => {
    return getDaySchedule(garageHours, preferredDate);
  }, [garageHours, preferredDate]);

  useEffect(() => {
    if (preferredDate) {
      if (!schedule.isOpen) {
        setPreferredTime('');
      } else if (schedule.availableTimeSlots.length > 0) {
        const valid = schedule.availableTimeSlots.some(s => s.value === preferredTime);
        if (!valid) {
          setPreferredTime(schedule.availableTimeSlots[0].value);
        }
      }
    }
  }, [preferredDate, schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setErrorMsg('Please select a vehicle.');
      return;
    }
    if (!preferredDate || !preferredTime) {
      setErrorMsg('Please select a preferred date and time.');
      return;
    }
    if (!issueDescription.trim()) {
      setErrorMsg('Please enter the issue description before booking.');
      return;
    }
    if (!schedule.isOpen) {
      setErrorMsg(`Booking is unavailable because ${garageName || 'the garage'} is closed on ${schedule.dayDisplay}.`);
      return;
    }
    
    setErrorMsg('');
    setIsSubmitting(true);
    
    const rawAmount = Number(quote.price) || (quote as any).amount || (quote as any).totalCost || 0;
    
    const payload = {
      vehicleId,
      issueDescription: issueDescription,
      scheduledAt: `${preferredDate}T${preferredTime}:00`,
      notes: additionalNotes,
      totalAmount: rawAmount,
      bookingType: 'quoteBased',
      currency: getCurrencyCode(),
    };
    
    try {
      await apiClient.post(`/bookings/from-quote/${quote.id}`, payload);
      
      // Dispatch Notifications
      const notifs = JSON.parse(localStorage.getItem('wrectifai_notifications') || '[]');
      const gName = (quote as any).garageName || quote.garage || 'A Garage';
      notifs.unshift({ id: Date.now(), type: 'Booking', title: 'New Booking', desc: `Customer booked a service at ${gName}.`, time: 'Just now', read: false, icon: 'Calendar', color: 'text-blue-500', bg: 'bg-blue-50', audience: 'Admin' });
      notifs.unshift({ id: Date.now() + 1, type: 'Booking', title: 'New Booking', desc: `You received a new booking for ${preferredDate} at ${preferredTime}.`, time: 'Just now', read: false, icon: 'Calendar', color: 'text-blue-500', bg: 'bg-blue-50', audience: 'Garage' });
      localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
      window.dispatchEvent(new Event('notifications-updated'));
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const quoteAmount = formatCurrency(quote.price || (quote as any).amount || (quote as any).totalCost || 0);
  const garageName = (quote as any).garageName || quote.garage;

  return (
    <>
    <Modal isOpen={true} onClose={onClose} title="Book Appointment" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="font-bold text-slate-600">Garage:</span>
            <span className="font-bold text-slate-800">{garageName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-slate-600">Quote Amount:</span>
            <span className="font-bold text-blue-700">{quoteAmount}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Vehicle <span className="text-red-500">*</span></label>
          <select 
            value={vehicleId} 
            onChange={e => setVehicleId(e.target.value)} 
            className="w-full p-2.5 border rounded-xl border-slate-300 bg-white text-sm"
            required
          >
            <option value="">Select a vehicle...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Date <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              required 
              min={todayStr}
              value={preferredDate} 
              onChange={e => setPreferredDate(e.target.value)} 
              className="w-full p-2.5 border rounded-xl border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Time <span className="text-red-500">*</span></label>
            {preferredDate && !schedule.isOpen ? (
              <div className="p-2.5 border border-red-200 bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 h-[42px]">
                <span>Closed on {schedule.dayDisplay}</span>
              </div>
            ) : schedule.availableTimeSlots.length > 0 ? (
              <select
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                required
                className="w-full p-2.5 border rounded-xl border-slate-300 bg-white text-sm"
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
                className="w-full p-2.5 border rounded-xl border-slate-300 text-sm"
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
                ? `${garageName || 'This garage'} is CLOSED on ${schedule.dayDisplay}s. Please choose an open day.`
                : `Working Hours on ${schedule.dayDisplay}: ${schedule.startStr || '09:00 AM'} - ${schedule.endStr || '07:00 PM'}`}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Issue Description <span className="text-red-500">*</span></label>
          <textarea
            value={issueDescription}
            onChange={e => setIssueDescription(e.target.value)}
            placeholder="Describe the issue you need fixed..."
            className="w-full p-2.5 border rounded-xl border-slate-300 text-sm h-20"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Additional Notes (Optional)</label>
          <textarea
            value={additionalNotes}
            onChange={e => setAdditionalNotes(e.target.value)}
            placeholder="Any specific instructions for the garage..."
            className="w-full p-2.5 border rounded-xl border-slate-300 text-sm h-20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || (preferredDate ? !schedule.isOpen : false)} 
            className="bg-[#1a56db] text-white"
          >
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </div>
      </form>
    </Modal>
    </>
  );
}
