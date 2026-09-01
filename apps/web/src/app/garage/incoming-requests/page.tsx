'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { useEffect, useState } from 'react';
import { getGarageIncomingBookings, updateBookingStatus } from '@/lib/quotes-api';
import { formatCurrency } from '@/lib/currency';

export default function IncomingRequestsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const data = await getGarageIncomingBookings();
      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    setIsUpdating(true);
    try {
      await updateBookingStatus(id, status);
      // Dispatch Notifications
      const notifs = JSON.parse(localStorage.getItem('wrectifai_notifications') || '[]');
      if (status === 'confirmed') {
        notifs.unshift({ id: Date.now(), type: 'Booking', title: 'Booking Confirmed', desc: `Your booking ${id.substring(0, 8)} has been confirmed by the garage.`, time: 'Just now', read: false, icon: 'CheckCircle2', color: 'text-green-500', bg: 'bg-green-50', audience: 'Customer' });
        notifs.unshift({ id: Date.now() + 1, type: 'Booking', title: 'Booking Accepted', desc: `Garage accepted booking ${id.substring(0, 8)}.`, time: 'Just now', read: false, icon: 'CheckCircle2', color: 'text-green-500', bg: 'bg-green-50', audience: 'Garage' });
      } else {
        notifs.unshift({ id: Date.now(), type: 'System', title: 'Booking Rejected', desc: `Your booking ${id.substring(0, 8)} was rejected by the garage.`, time: 'Just now', read: false, icon: 'ShieldAlert', color: 'text-red-500', bg: 'bg-red-50', audience: 'Customer' });
        notifs.unshift({ id: Date.now() + 1, type: 'System', title: 'Booking Rejected', desc: `Garage rejected booking ${id.substring(0, 8)}.`, time: 'Just now', read: false, icon: 'ShieldAlert', color: 'text-red-500', bg: 'bg-red-50', audience: 'Garage' });
      }
      localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
      window.dispatchEvent(new Event('notifications-updated'));
      setSelectedBooking(null);
      await loadBookings();
    } catch (err) {
      console.error('Failed to update booking status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h1 className="text-lg font-bold text-slate-800">Incoming Bookings</h1>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-4 font-bold text-slate-600 border-b">Customer</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Vehicle</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Appointment</th>
                     <th className="p-4 font-bold text-slate-600 border-b">Status</th>
                     <th className="p-4 font-bold text-slate-600 border-b text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">Loading bookings...</td>
                       </tr>
                   ) : bookings.length === 0 ? (
                       <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">No incoming bookings found.</td>
                       </tr>
                   ) : bookings.map(booking => (
                     <tr key={booking.id} className="hover:bg-slate-50">
                       <td className="p-4 text-slate-700">{booking.customerName || 'Customer'}</td>
                       <td className="p-4 text-slate-700">{booking.vehicleMake} {booking.vehicleModel} {booking.vehicleYear}</td>
                       <td className="p-4 text-slate-700 font-medium">{formatTime(booking.scheduledAt)}</td>
                       <td className="p-4 text-slate-600 uppercase text-xs font-bold text-orange-600">Pending</td>
                       <td className="p-4 text-center">
                         <button 
                           onClick={() => setSelectedBooking(booking)}
                           className="text-blue-600 font-bold hover:underline"
                         >
                           View Details
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* View Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Booking Details</h2>
                <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-sm">
                <div>
                  <span className="font-bold text-slate-600">Customer Name:</span>
                  <p className="text-slate-800">{selectedBooking.customerName || 'Customer'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Customer Phone:</span>
                  <p className="text-slate-800">{selectedBooking.customerPhone || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Vehicle:</span>
                  <p className="text-slate-800">{selectedBooking.vehicleMake} {selectedBooking.vehicleModel} {selectedBooking.vehicleYear}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">VIN:</span>
                  <p className="text-slate-800">{selectedBooking.vehicleVin || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Preferred Date:</span>
                  <p className="text-slate-800 font-bold bg-slate-50 p-2 mt-1 rounded border border-slate-200">
                    {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Preferred Time:</span>
                  <p className="text-slate-800 font-bold bg-slate-50 p-2 mt-1 rounded border border-slate-200">
                    {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Estimated Days:</span>
                  <p className="text-slate-800 font-bold bg-slate-50 p-2 mt-1 rounded border border-slate-200">
                    {selectedBooking.estimatedDays ? (/^\d+$/.test(String(selectedBooking.estimatedDays).trim()) ? `${String(selectedBooking.estimatedDays).trim()} Days` : selectedBooking.estimatedDays) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Current Status:</span>
                  <p className="text-orange-600 font-bold bg-slate-50 p-2 mt-1 rounded border border-slate-200 uppercase">
                    Pending
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Quote Amount:</span>
                  <p className="text-green-700 font-bold bg-slate-50 p-2 mt-1 rounded border border-slate-200">{formatCurrency(selectedBooking.quoteAmount || selectedBooking.totalAmount || 0, selectedBooking.currency)}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Issue Description:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">
                    {selectedBooking.issueSummary || selectedBooking.issueDescription || selectedBooking.customerNote || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Notes / Details:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">{
                    (() => {
                      if (!selectedBooking.quoteDetails) return '—';
                      let details = selectedBooking.quoteDetails;
                      if (typeof details === 'string') {
                        try { details = JSON.parse(details); } catch (e) { return details || '—'; }
                      }
                      if (details.remarks) return details.remarks;
                      return '—';
                    })()
                  }</p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                {selectedBooking && !['completed', 'readyForCollection', 'collected'].includes(selectedBooking.status || 'requested') && (
                  <>
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                      className="px-4 py-2 border border-red-200 bg-white rounded text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    {selectedBooking.status !== 'confirmed' && (
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                        className="px-4 py-2 bg-green-600 rounded text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {isUpdating ? 'Updating...' : 'Accept'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
