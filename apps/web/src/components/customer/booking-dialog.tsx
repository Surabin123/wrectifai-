'use client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { apiClient } from '@/lib/api-client';
import type { QuoteItem } from '@/components/quotes/quotes-shared';
import { formatCurrency } from '@/lib/currency';
import { getCurrencyCode } from '@/lib/user-phone';
import { AlertCircle } from 'lucide-react';

export function BookingDialog({ quote, onClose, onSuccess }: { quote: QuoteItem, onClose: () => void, onSuccess: () => void }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState(quote.requestIssueSummary || '');
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
      }).catch(console.error);
    }
  }, [targetGarageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setErrorMsg('Please select a vehicle.');
      return;
    }
    if (!quote.preferredDate) {
      setErrorMsg('This quote does not have a valid appointment time.');
      return;
    }
    if (!issueDescription.trim()) {
      setErrorMsg('Please enter the issue description before booking.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    
    const rawAmount = Number(quote.price) || (quote as any).amount || (quote as any).totalCost || 0;
    
    const payload = {
      vehicleId,
      issueDescription: issueDescription,
      scheduledAt: quote.preferredDate,
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
      notifs.unshift({ id: Date.now() + 1, type: 'Booking', title: 'New Booking', desc: `You received a new booking request.`, time: 'Just now', read: false, icon: 'Calendar', color: 'text-blue-500', bg: 'bg-blue-50', audience: 'Garage' });
      localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
      window.dispatchEvent(new Event('notifications-updated'));
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Appointment requested for <strong>{quote.preferredDate ? new Date(quote.preferredDate).toLocaleString() : 'the selected slot'}</strong>.
        </div>

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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !vehicleId || !issueDescription.trim() || !quote.preferredDate}
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
