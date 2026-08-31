'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { fetchGarageActiveJobs, submitGarageQuote } from '@/lib/quotes-api';
import { useEffect, useState } from 'react';
import { Card } from '@/components/common/card';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { Car, Clock, Settings, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

export default function ActiveJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ 
    labourCost: '', partsCost: '', consumablesCost: '', gstCost: '', otherCost: '',
    estimatedTime: '', remarks: '', availability: '', pickupDrop: 'Available', warranty: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minDate, setMinDate] = useState('');

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDate(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    fetchGarageActiveJobs()
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCreateQuote = async () => {
    if (!selectedJobId) return;
    setIsSubmitting(true);
    try {
      await submitGarageQuote(selectedJobId, {
        labourCost: Number(quoteForm.labourCost),
        partsCost: Number(quoteForm.partsCost),
        consumablesCost: Number(quoteForm.consumablesCost),
        gstCost: Number(quoteForm.gstCost),
        otherCost: Number(quoteForm.otherCost),
        estimatedTime: quoteForm.estimatedTime,
        remarks: quoteForm.remarks,
        availability: quoteForm.availability,
        pickupDrop: quoteForm.pickupDrop,
        warranty: quoteForm.warranty
      });
      // Remove from draft state or re-fetch
      setJobs(prev => prev.filter(job => job.id !== selectedJobId));
      setSelectedJobId(null);
      setQuoteForm({ 
        labourCost: '', partsCost: '', consumablesCost: '', gstCost: '', otherCost: '', 
        estimatedTime: '', remarks: '', availability: '', pickupDrop: 'Available', warranty: '' 
      });
    } catch (err) {
      console.error('Failed to submit quote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-64px)] flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#17307a] mb-1">Active Jobs</h1>
              <p className="text-sm text-slate-500">Track and manage all ongoing jobs in your workshop.</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
             {loading ? (
               <p className="text-slate-500 text-center py-10">Loading jobs...</p>
             ) : jobs.length === 0 ? (
               <p className="text-slate-500 text-center py-10">No Active Jobs found.</p>
             ) : (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {jobs.map(job => (
                   <Card key={job.id} className="p-4 border-l-4 border-l-blue-500">
                     <div className="flex justify-between items-start mb-3">
                       <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded capitalize">{job.bookingStatus === 'requested' ? 'Pending' : job.bookingStatus === 'in_progress' ? 'In Progress' : (job.bookingStatus || 'Unknown')}</span>
                     </div>
                     <p className="font-bold text-[#17307a] text-lg">{job.vehicleMake} {job.vehicleModel}</p>
                     <p className="text-sm text-slate-500 mb-4">{job.customerName}</p>
                     <p className="text-xs text-slate-600 mb-2 line-clamp-2">{job.issueSummary}</p>
                     {job.serviceType === 'Quote Request' && job.quoteStatus === 'draft' && (
                       <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                         <Button 
                           variant="default"
                           className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 h-8"
                           onClick={() => setSelectedJobId(job.id)}
                         >
                           Create Quote
                         </Button>
                       </div>
                     )}
                   </Card>
                 ))}
               </div>
             )}
          </div>
        </div>
        
        <Modal 
          isOpen={!!selectedJobId} 
          onClose={() => !isSubmitting && setSelectedJobId(null)}
          title="Create Quote"
        >
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Labor Cost (₹)</label>
                <input 
                  type="number" min="0"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.labourCost}
                  onChange={e => setQuoteForm({...quoteForm, labourCost: e.target.value})}
                  placeholder="e.g. 1500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Parts Cost (₹)</label>
                <input 
                  type="number" min="0"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.partsCost}
                  onChange={e => setQuoteForm({...quoteForm, partsCost: e.target.value})}
                  placeholder="e.g. 2500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Consumables (₹)</label>
                <input 
                  type="number" min="0"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.consumablesCost}
                  onChange={e => setQuoteForm({...quoteForm, consumablesCost: e.target.value})}
                  placeholder="e.g. 200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">GST (₹)</label>
                <input 
                  type="number" min="0"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.gstCost}
                  onChange={e => setQuoteForm({...quoteForm, gstCost: e.target.value})}
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Other Charges (₹)</label>
                <input 
                  type="number" min="0"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.otherCost}
                  onChange={e => setQuoteForm({...quoteForm, otherCost: e.target.value})}
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Estimated Time</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.estimatedTime}
                  onChange={e => setQuoteForm({...quoteForm, estimatedTime: e.target.value})}
                  placeholder="e.g. 2 days"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Availability</label>
                <input 
                  type="datetime-local" 
                  min={minDate}
                  className="w-full border rounded-lg p-2 text-sm"
                  value={quoteForm.availability}
                  onChange={e => setQuoteForm({...quoteForm, availability: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Pickup & Drop</label>
                <select 
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                  value={quoteForm.pickupDrop}
                  onChange={e => setQuoteForm({...quoteForm, pickupDrop: e.target.value})}
                >
                  <option value="Available">Available</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Warranty Details</label>
              <input 
                type="text" 
                className="w-full border rounded-lg p-2 text-sm"
                value={quoteForm.warranty}
                onChange={e => setQuoteForm({...quoteForm, warranty: e.target.value})}
                placeholder="e.g. 6 Months / 10,000 km"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Remarks</label>
              <textarea 
                className="w-full border rounded-lg p-2 text-sm"
                value={quoteForm.remarks}
                onChange={e => setQuoteForm({...quoteForm, remarks: e.target.value})}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedJobId(null)} disabled={isSubmitting}>Cancel</Button>
              <Button 
                variant="default" 
                className="bg-blue-600 text-white" 
                onClick={handleCreateQuote}
                disabled={isSubmitting || !quoteForm.labourCost}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quote'}
              </Button>
            </div>
          </div>
        </Modal>

      </DashboardShell>
    </RoleGuard>
  );
}
