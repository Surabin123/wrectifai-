'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/modal';
import { apiClient } from '@/lib/api-client';

export function RequestQuoteModal({ isOpen, onClose, garageId, onSubmitSuccess }: { isOpen: boolean, onClose: () => void, garageId: string, onSubmitSuccess: () => void }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [serviceType, setServiceType] = useState('General Service');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    const returnFromAi = sessionStorage.getItem('ai_diagnose_result');
    if (returnFromAi) {
      setIssueDescription(returnFromAi);
      sessionStorage.removeItem('ai_diagnose_result');
    }
  }, []);
  useEffect(() => {
    if (isOpen) {
      apiClient.get<any[]>('/vehicles').then(data => {
        setVehicles(data);
        if (data.length > 0) setSelectedVehicleId(data[0].id);
      }).catch(console.error);
    }
  }, [isOpen]);

  const handleUseDiagnosis = () => {
    sessionStorage.setItem('return_to_garage', garageId);
    router.push('/ai-diagnose');
  };

  const handleAddVehicle = () => {
    sessionStorage.setItem('return_to_garage_for_quote', garageId);
    router.push('/vehicles');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const vId = selectedVehicleId;
      if (!vId) {
         setErrorMsg('Please select a vehicle or add a new one.');
         setIsSubmitting(false);
         return;
      }
      if (!issueDescription.trim()) {
         setErrorMsg('Please describe the issue.');
         setIsSubmitting(false);
         return;
      }
      const { createQuoteRequest } = await import('@/lib/quotes-api');
      await createQuoteRequest({
        vehicleId: vId,
        issueSummary: issueDescription || serviceType,
        garageId
      });
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request a Quote" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-semibold">{errorMsg}</div>}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-semibold">Select Vehicle</label>
            <button type="button" onClick={handleAddVehicle} className="text-xs font-bold text-blue-600 hover:underline">
              + Add New Vehicle
            </button>
          </div>
          <select 
            value={selectedVehicleId} 
            onChange={(e) => setSelectedVehicleId(e.target.value)} 
            className="w-full p-2 border rounded"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate_number})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Service Type</label>
          <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full p-2 border rounded">
            <option value="General Service">General Service</option>
            <option value="Repair">Repair</option>
            <option value="Diagnosis">Diagnosis</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Issue Description <span className="text-red-500">*</span></label>
          <textarea 
            value={issueDescription} 
            onChange={e => setIssueDescription(e.target.value)}
            className="w-full p-2 border rounded h-24"
            placeholder="Describe the issue you are facing..."
            required
          />
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button type="button" onClick={handleUseDiagnosis} className="px-4 py-2 bg-blue-50 text-blue-600 rounded font-bold text-sm border border-blue-100">
            Use WrectifAI Diagnosis
          </button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded font-bold text-sm disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
