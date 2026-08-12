'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { fetchBookings } from '@/lib/bookings-api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/common/card';
import { Modal } from '@/components/common/modal';
import { updateBookingStatus } from '@/lib/bookings-api';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  useEffect(() => {
    fetchBookings()
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateBookingStatus(id, newStatus);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      localStorage.setItem('wrectifai_sync_bookings', Date.now().toString());
      
      // Dispatch Notifications
      const notifs = JSON.parse(localStorage.getItem('wrectifai_notifications') || '[]');
      let title = '';
      let desc = '';
      let icon = 'CheckCircle2';
      let color = 'text-green-500';
      let bg = 'bg-green-50';
      
      if (newStatus === 'accepted') {
        title = 'Booking Confirmed';
        desc = `Your booking ${id.substring(0, 8)} has been confirmed by the garage.`;
      } else if (newStatus === 'rejected') {
        title = 'Booking Rejected';
        desc = `Your booking ${id.substring(0, 8)} was rejected by the garage.`;
        icon = 'ShieldAlert'; color = 'text-red-500'; bg = 'bg-red-50';
      } else if (newStatus === 'in_progress') {
        title = 'Service Started';
        desc = `The garage has started working on your vehicle for booking ${id.substring(0, 8)}.`;
        icon = 'Wrench'; color = 'text-indigo-500'; bg = 'bg-indigo-50';
      } else if (newStatus === 'completed') {
        title = 'Service Completed';
        desc = `The garage has completed the service for booking ${id.substring(0, 8)}.`;
        icon = 'CheckCircle2'; color = 'text-emerald-500'; bg = 'bg-emerald-50';
      }
      
      if (title) {
        notifs.unshift({ id: Date.now(), type: 'Booking', title, desc, time: 'Just now', read: false, icon, color, bg, audience: 'Customer' });
        notifs.unshift({ id: Date.now() + 1, type: 'Booking', title: `Booking: ${title}`, desc: `Garage updated booking ${id.substring(0, 8)} to ${newStatus}.`, time: 'Just now', read: false, icon, color, bg, audience: 'Garage' });
        localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error(err);
      console.error('Failed to update status');
    }
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-64px)]">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#17307a] mb-1">Bookings</h1>
              <p className="text-sm text-slate-500">Manage all your bookings and workshop schedules.</p>
            </div>
          </div>
          
          <Card className="p-6">
            {loading ? (
              <p className="text-center text-slate-500 py-10">Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <p className="text-center text-slate-500 py-10">No Bookings Found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-sm font-semibold text-[#17307a]">Booking ID</th>
                      <th className="p-3 text-sm font-semibold text-[#17307a]">Date</th>
                      <th className="p-3 text-sm font-semibold text-[#17307a]">Vehicle</th>
                      <th className="p-3 text-sm font-semibold text-[#17307a]">Status</th>
                      <th className="p-3 text-sm font-semibold text-[#17307a] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 text-sm font-medium">{b.id.substring(0, 8).toUpperCase()}</td>
                        <td className="p-3 text-sm text-slate-600">{new Date(b.scheduledAt).toLocaleString()}</td>
                        <td className="p-3 text-sm text-slate-600">{b.vehicleMake} {b.vehicleModel}</td>
                        <td className="p-3 text-sm text-slate-600 capitalize">
                          {b.status === 'pendingPayment' ? 'Pending' : b.status === 'in_progress' ? 'In Progress' : b.status}
                        </td>
                        <td className="p-3 text-sm text-right space-x-2 flex justify-end items-center h-full">
                          {b.status === 'pendingPayment' && (
                            <>
                              <button onClick={() => handleUpdateStatus(b.id, 'accepted')} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-semibold hover:bg-blue-200">
                                Accept
                              </button>
                              <button onClick={() => handleUpdateStatus(b.id, 'rejected')} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded font-semibold hover:bg-red-200 ml-2">
                                Reject
                              </button>
                            </>
                          )}
                          {(b.status === 'confirmed' || b.status === 'accepted') && (
                            <button onClick={() => handleUpdateStatus(b.id, 'in_progress')} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-semibold hover:bg-indigo-200">
                              Start Job
                            </button>
                          )}
                          {b.status === 'in_progress' && (
                            <button onClick={() => handleUpdateStatus(b.id, 'completed')} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded font-semibold hover:bg-green-200">
                              Complete Job
                            </button>
                          )}
                          {b.status === 'completed' && (
                            <button onClick={() => router.push(`/garage/service-history`)} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded font-semibold hover:bg-slate-200 inline-block">
                              View History
                            </button>
                          )}
                          {b.status === 'cancelled' && (
                            <button onClick={() => setSelectedBooking(b)} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded font-semibold hover:bg-slate-200 inline-block">
                              View Details
                            </button>
                          )}
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button onClick={() => setSelectedBooking(b)} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded font-semibold hover:bg-slate-200 inline-block ml-2">
                              Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {selectedBooking && (
          <Modal isOpen={true} onClose={() => setSelectedBooking(null)} title="Booking Details" className="max-w-2xl">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-700">
              <div>
                <span className="block font-bold text-slate-500 mb-1">Booking ID</span>
                <p className="font-semibold">{selectedBooking.id}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Quote ID</span>
                <p className="font-semibold">{selectedBooking.quoteId || 'N/A'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Garage Name</span>
                <p className="font-semibold">{selectedBooking.garageName || 'N/A'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Created Date</span>
                <p className="font-semibold">
                  {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Customer Name</span>
                <p className="font-semibold">{selectedBooking.customerName || 'N/A'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Customer Phone</span>
                <p className="font-semibold">{selectedBooking.customerPhone || 'N/A'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Customer Email</span>
                <p className="font-semibold">{selectedBooking.customerEmail || 'N/A'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Vehicle</span>
                <p className="font-semibold">
                  {selectedBooking.vehicleMake ? `${selectedBooking.vehicleMake} ${selectedBooking.vehicleModel} ${selectedBooking.vehicleYear}` : 'N/A'}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Vehicle Number / VIN</span>
                <p className="font-semibold">{selectedBooking.vehicleVin || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="block font-bold text-slate-500 mb-1">Issue Description</span>
                <p className="bg-slate-50 p-3 rounded border border-slate-200">
                  {selectedBooking.issueDescription || 'N/A'}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Estimated Days</span>
                <p className="font-semibold">
                  {selectedBooking.estimatedDays ? (/^\d+$/.test(String(selectedBooking.estimatedDays).trim()) ? `${String(selectedBooking.estimatedDays).trim()} Days` : selectedBooking.estimatedDays) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Quote Amount</span>
                <p className="font-semibold text-blue-700">
                  {selectedBooking.currency} {selectedBooking.totalAmount}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Preferred Date</span>
                <p className="font-semibold">
                  {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Preferred Time</span>
                <p className="font-semibold">
                  {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Current Status</span>
                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded uppercase">
                  {selectedBooking.status === 'pendingPayment' ? 'Pending' : selectedBooking.status === 'in_progress' ? 'In Progress' : selectedBooking.status}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </Modal>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
