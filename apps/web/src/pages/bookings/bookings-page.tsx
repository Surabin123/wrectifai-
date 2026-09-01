'use client';

import { useEffect, useState, useMemo } from 'react';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Modal } from '@/components/common/modal';
import { fetchBookings, updateBookingStatus, fetchInvoice } from '@/lib/bookings-api';
import type { Booking } from '@/lib/bookings-api';
import { cn } from '@/utils/cn';
import { Calendar, Clock, Wrench, XCircle, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useUserPhone } from '@/lib/user-phone';
import { PaymentSuccessModal } from '@/components/common/payment-success-modal';

type TabKey = 'all' | 'upcoming' | 'accepted' | 'inProgress' | 'completed' | 'cancelled';

export function BookingsPage() {
  const userPhone = useUserPhone();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [viewDetailsBooking, setViewDetailsBooking] = useState<any | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [bookingToCollect, setBookingToCollect] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [paymentSelectionBooking, setPaymentSelectionBooking] = useState<Booking | null>(null);
  const [paymentSelectionModalOpen, setPaymentSelectionModalOpen] = useState(false);
  const [isProcessingCash, setIsProcessingCash] = useState(false);
  
  const [paymentSuccessData, setPaymentSuccessData] = useState<{isOpen: boolean, method: 'online'|'cash', amount: number, transactionId?: string, title?: string, desc?: string} | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleViewInvoice = async (bookingId: string) => {
    setLoadingInvoice(true);
    try {
      const data = await fetchInvoice(bookingId);
      setInvoiceData(data);
      setInvoiceModalOpen(true);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to fetch invoice');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const loadBookings = async () => {
    await Promise.resolve();
    setLoading(true);
    setErrorText(null);
    try {
      const data = await fetchBookings();
      setBookings(data || []);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to retrieve bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadBookings();
      }
    });

    const handleSync = () => {
      if (active) loadBookings();
    };

    window.addEventListener('booking-updated', handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrectifai_sync_bookings') {
        handleSync();
      }
    });

    return () => {
      active = false;
      window.removeEventListener('booking-updated', handleSync);
    };
  }, []);

  const handleCancelBooking = (id: string) => {
    setBookingToCancel(id);
    setCancelModalOpen(true);
    setCancelError(false);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      await updateBookingStatus(bookingToCancel, 'cancelled');
      // Update locally
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingToCancel ? { ...b, status: 'cancelled' as const } : b))
      );
      // Dispatch Notifications
      const notifs = JSON.parse(localStorage.getItem('wrectifai_notifications') || '[]');
      notifs.unshift({ id: Date.now(), type: 'System', title: 'Booking Cancelled', desc: `Customer cancelled booking ${bookingToCancel.substring(0, 8)}.`, time: 'Just now', read: false, icon: 'ShieldAlert', color: 'text-red-500', bg: 'bg-red-50', audience: 'Admin' });
      notifs.unshift({ id: Date.now() + 1, type: 'System', title: 'Booking Cancelled', desc: `A customer cancelled their booking.`, time: 'Just now', read: false, icon: 'ShieldAlert', color: 'text-red-500', bg: 'bg-red-50', audience: 'Garage' });
      localStorage.setItem('wrectifai_notifications', JSON.stringify(notifs));
      window.dispatchEvent(new Event('notifications-updated'));
      setCancelModalOpen(false);
      setBookingToCancel(null);
    } catch (err) {
      setCancelError(true);
    }
  };

  const handleMarkCollected = (b: any) => {
    setBookingToCollect(b.id);
    setCollectionModalOpen(true);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const [paymentProcessingId, setPaymentProcessingId] = useState<string | null>(null);

  const handlePayNow = (booking: Booking) => {
    setPaymentSelectionBooking(booking);
    setPaymentSelectionModalOpen(true);
  };

  const handlePayOnline = async () => {
    if (!paymentSelectionBooking) return;
    const booking = paymentSelectionBooking;
    setPaymentSelectionModalOpen(false);
    try {
      setPaymentProcessingId(booking.id);
      const { payForBooking } = await import('@/lib/bookings-api');
      const { razorpayOrderId } = await payForBooking(booking.id);
      
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError('Failed to load Razorpay payment SDK.');
        setPaymentProcessingId(null);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock123',
        amount: Math.round(booking.totalAmount * 100),
        currency: 'INR',
        name: 'WrectifAI Services',
        description: 'Payment for Booking',
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          try {
            const { apiClient } = await import('@/lib/api-client');
            const verifyRes = await apiClient.post<{verified: boolean}>('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            if (verifyRes.verified) {
              setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, paymentStatus: 'PAID' } : b)));
              setPaymentSuccessData({
                isOpen: true,
                method: 'online',
                amount: booking.totalAmount,
                transactionId: response.razorpay_payment_id
              });
              // Force refresh bookings in background to ensure latest state
              loadBookings();
            } else {
              setPaymentError('Payment verification failed. Your payment was not verified by our servers.');
            }
          } catch (err) {
            setPaymentError('Payment verification failed. Please contact support.');
          } finally {
            setPaymentProcessingId(null);
          }
        },
        prefill: {
          name: 'Customer',
          contact: userPhone || '9999999999'
        },
        theme: {
          color: '#2563EB'
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessingId(null);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async function (response: any) {
        try {
          const { apiClient } = await import('@/lib/api-client');
          await apiClient.post('/payments/fail', {
            razorpay_order_id: response.error.metadata.order_id || razorpayOrderId,
            razorpay_payment_id: response.error.metadata.payment_id,
            error_reason: response.error.description
          });
        } catch (e) {
          console.error('Failed to notify backend of payment failure', e);
        }
        setPaymentError('Payment failed: ' + response.error.description);
        setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, paymentStatus: 'FAILED' } : b)));
        setPaymentProcessingId(null);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment intent generation failed', err);
      setPaymentError('Failed to initialize payment.');
      setPaymentProcessingId(null);
    }
  };

  const handlePayCash = async () => {
    if (!paymentSelectionBooking) return;
    setIsProcessingCash(true);
    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.post(`/bookings/${paymentSelectionBooking.id}/select-cash`, {});
      setPaymentSelectionModalOpen(false);
      setPaymentSuccessData({
        isOpen: true,
        method: 'cash',
        amount: paymentSelectionBooking.totalAmount,
        title: 'Cash Payment Selected',
        desc: 'Your cash payment preference has been recorded. Please pay at the garage.'
      });
      setBookings((prev) => prev.map((b) => (b.id === paymentSelectionBooking.id ? { ...b, paymentStatus: 'PENDING_CASH' } : b)));
      loadBookings();
      setPaymentSelectionBooking(null);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to select cash payment.');
    } finally {
      setIsProcessingCash(false);
    }
  };

  const handleRefund = async (bookingId: string) => {
    if (!confirm('Are you sure you want to request a refund for this booking?')) return;
    setPaymentProcessingId(bookingId);
    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.post(`/payments/booking/${bookingId}/refund`, {});
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, paymentStatus: 'REFUNDED' } : b)));
      // Instead of alert, we could use a custom modal, but simple error modal works for success too with a tweak, or just a small notification.
      // Let's use a standard Modal for simplicity or just repurpose PaymentSuccessModal.
      setPaymentSuccessData({
        isOpen: true,
        method: 'online',
        amount: bookings.find(b => b.id === bookingId)?.totalAmount || 0,
        title: 'Refund Processed',
        desc: 'Refund requested successfully. It may take a few days to reflect.'
      });
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to request refund.');
    } finally {
      setPaymentProcessingId(null);
    }
  };

  const confirmMarkCollected = async () => {
    if (!bookingToCollect) return;
    try {
      await updateBookingStatus(bookingToCollect, 'collected');
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingToCollect ? { ...b, status: 'collected' as any } : b))
      );
      setCollectionModalOpen(false);
      setBookingToCollect(null);
    } catch (err) {
      console.error('Failed to mark collected', err);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'upcoming') return b.status === 'requested';
      if (activeTab === 'accepted') return b.status === 'confirmed' || b.status === 'accepted';
      if (activeTab === 'inProgress') return b.status === 'in_progress';
      if (activeTab === 'completed') return b.status === 'completed' || b.status === 'readyForCollection' || b.status === 'collected';
      if (activeTab === 'cancelled') return b.status === 'cancelled';
      return true;
    });
  }, [bookings, activeTab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All Bookings' },
    { key: 'upcoming', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'inProgress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="space-y-4">
        {/* Header */}
        <Card className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8ab4]">
                WrectifAI Workspace
              </p>
              <h1 className="mt-1 text-[25px] font-bold tracking-[-0.04em] text-[#17307a]">
                My Bookings
              </h1>
            </div>
          </div>
        </Card>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-1.5 border-b border-[#eef3ff] pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'rounded-[10px] px-3.5 py-1.5 text-[11.5px] font-bold transition-all',
                activeTab === tab.key
                  ? 'bg-[#1a56db] text-white shadow-sm'
                  : 'bg-white border border-[#e2eefc] text-[#17307a] hover:bg-[#f8fbff]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content States */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </Card>
            ))}
          </div>
        ) : errorText ? (
          <Card className="p-5 border-[#ffcccc] bg-[#fffbfb] flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-8 w-8 text-[#ff3b30] mb-2" />
            <p className="text-[13px] font-bold text-[#ff3b30]">{errorText}</p>
            <Button onClick={loadBookings} variant="outline" className="mt-3">
              Retry
            </Button>
          </Card>
        ) : filteredBookings.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <Calendar className="h-10 w-10 text-[#8a99ad] mb-2" />
            <p className="text-[13.5px] font-bold text-[#17307a]">No bookings found</p>
            <p className="text-slate-500 mt-2">You don't have any {activeTab !== 'all' ? activeTab : ''} bookings yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => (
              <Card key={b.id} className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-[#eef3ff]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase',
                        b.status === 'requested' && 'bg-[#fef3c7] text-[#b45309]',
                        (b.status === 'confirmed' || b.status === 'accepted') && 'bg-[#e0f2fe] text-[#0369a1]',
                        b.status === 'in_progress' && 'bg-[#e0e7ff] text-[#4338ca]',
                        b.status === 'completed' && 'bg-[#dcfce7] text-[#15803d]',
                        b.status === 'readyForCollection' && 'bg-[#fef9c3] text-[#ca8a04]',
                        b.status === 'collected' && 'bg-[#e5e7eb] text-[#374151]',
                        b.status === 'cancelled' && 'bg-[#fee2e2] text-[#b91c1c]'
                      )}
                    >
                       {b.status === 'requested' ? 'Pending' : 
                        b.status === 'confirmed' ? 'Confirmed' :
                        b.status === 'accepted' ? 'Accepted' : 
                        b.status === 'in_progress' ? 'In Progress' : 
                        b.status === 'completed' ? 'Completed' :
                        b.status === 'readyForCollection' ? 'Ready for Collection' :
                        b.status === 'collected' ? 'Collected' :
                        b.status === 'cancelled' ? 'Cancelled' :
                        b.status}
                    </span>
                  </div>

                  <h3 className="text-[14.5px] font-bold text-[#17307a]">{b.garageName || 'Garage'}</h3>
                  
                  {b.garageAddress && (
                    <p className="text-[11px] text-[#5c6e8e] font-normal leading-none">{b.garageAddress}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-[#17307a] font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-[#1a56db]" />
                      {new Date(b.scheduledAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#1a56db]" />
                      {new Date(b.scheduledAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {b.vehicleMake && (
                      <span className="flex items-center gap-1 border-l border-[#eef3ff] pl-4">
                        <Wrench className="h-3.5 w-3.5 text-[#1a56db]" />
                        {b.vehicleYear} {b.vehicleMake} {b.vehicleModel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-[#eef3ff] pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-[#8a96b8] uppercase">Total Cost</p>
                    <p className="text-[15.5px] font-extrabold text-[#17307a]">{formatCurrency(b.totalAmount, b.currency)}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setViewDetailsBooking(b)}
                      variant="outline"
                      className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      View Details
                    </Button>
                    {(b.status === 'requested' || b.status === 'confirmed' || b.status === 'accepted') && (
                      <Button
                        onClick={() => handleCancelBooking(b.id)}
                        variant="outline"
                        className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Cancel
                      </Button>
                    )}
                    {b.status === 'readyForCollection' && (
                      <Button
                        onClick={() => handleMarkCollected(b)}
                        variant="outline"
                        className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                      >
                        Confirm Collection
                      </Button>
                    )}
                    {(b.status === 'completed' || b.status === 'readyForCollection' || b.status === 'collected') && (
                      <Button
                        onClick={() => handleViewInvoice(b.id)}
                        disabled={loadingInvoice}
                        variant="outline"
                        className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {loadingInvoice ? 'Loading...' : 'View Invoice'}
                      </Button>
                    )}
                    {(b.status === 'completed' || b.status === 'readyForCollection') && (b.paymentStatus === 'PAYMENT_DUE' || b.paymentStatus === 'FAILED') && (
                      <Button
                        onClick={() => handlePayNow(b)}
                        disabled={paymentProcessingId === b.id}
                        className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold bg-[#17307a] text-white hover:bg-[#1a3a96]"
                      >
                        {paymentProcessingId === b.id ? 'Processing...' : 'Pay Now'}
                      </Button>
                    )}
                    {b.paymentStatus === 'PAID' && b.status !== 'completed' && b.status !== 'collected' && (
                      <Button
                        onClick={() => handleRefund(b.id)}
                        disabled={paymentProcessingId === b.id}
                        variant="outline"
                        className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      >
                        {paymentProcessingId === b.id ? 'Processing...' : 'Request Refund'}
                      </Button>
                    )}
                    {b.status === 'collected' && (
                      <Button
                        onClick={() => window.location.href = `/garages?garageId=${b.garageId}&bookingId=${b.id}&review=true`}
                        variant="outline"
                        className="h-8 rounded-[9px] px-2.5 text-[10.5px] font-semibold border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      >
                        Leave a Review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {viewDetailsBooking && (
        <Modal isOpen={true} onClose={() => setViewDetailsBooking(null)} title="Booking Details" className="max-w-2xl">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm text-slate-700">
            <div>
              <span className="block font-bold text-slate-500 mb-1">Garage Name</span>
              <p className="font-semibold">{viewDetailsBooking.garageName}</p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Vehicle</span>
              <p className="font-semibold">
                {viewDetailsBooking.vehicleMake ? `${viewDetailsBooking.vehicleMake} ${viewDetailsBooking.vehicleModel} ${viewDetailsBooking.vehicleYear}` : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Vehicle Number / VIN</span>
              <p className="font-semibold">{viewDetailsBooking.vehicleVin || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <span className="block font-bold text-slate-500 mb-1">Issue Description</span>
              <p className="bg-slate-50 p-3 rounded border border-slate-200">
                {viewDetailsBooking.issueDescription || 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Estimated Days</span>
              <p className="font-semibold">
                {viewDetailsBooking.estimatedDays ? (/^\d+$/.test(String(viewDetailsBooking.estimatedDays).trim()) ? `${String(viewDetailsBooking.estimatedDays).trim()} Days` : viewDetailsBooking.estimatedDays) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Preferred Date</span>
              <p className="font-semibold">
                {viewDetailsBooking.preferredDate ? new Date(viewDetailsBooking.preferredDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Preferred Time</span>
              <p className="font-semibold">
                {viewDetailsBooking.preferredDate ? new Date(viewDetailsBooking.preferredDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Booking Status</span>
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded uppercase">
                {viewDetailsBooking.status}
              </span>
            </div>
            <div>
              <span className="block font-bold text-slate-500 mb-1">Payment Status</span>
              <span className={`inline-block px-2 py-1 font-bold text-xs rounded uppercase ${
                viewDetailsBooking.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
              }`}>
                {viewDetailsBooking.paymentStatus || 'pending'}
              </span>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setViewDetailsBooking(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      <Modal 
        isOpen={cancelModalOpen} 
        onClose={() => setCancelModalOpen(false)}
        title={cancelError ? 'Unable to Cancel' : 'Cancel Booking'}
      >
        <div className="py-4 flex flex-col items-center text-center">
          {cancelError ? (
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
          )}
          
          <h3 className="text-xl font-bold text-[#17307a] mb-2">
            {cancelError ? 'Unable to Cancel' : 'Cancel Booking'}
          </h3>
          
          <p className="text-slate-600 mb-8 max-w-sm">
            {cancelError ? (
              <>We couldn't cancel your booking right now.<br/><br/>Please try again in a few moments.</>
            ) : (
              <>Are you sure you want to cancel this booking? This action cannot be undone.</>
            )}
          </p>
          
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setCancelModalOpen(false)}
            >
              {cancelError ? 'Close' : 'Keep Booking'}
            </Button>
            {!cancelError && (
              <Button 
                variant="default" 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                onClick={confirmCancelBooking}
              >
                Yes, Cancel
              </Button>
            )}
          </div>
        </div>
      </Modal>
      <Modal 
        isOpen={collectionModalOpen} 
        onClose={() => setCollectionModalOpen(false)}
        title="Vehicle Collection"
      >
        <div className="py-4 flex flex-col items-center text-center">
          {(() => {
            const b = bookings.find(x => x.id === bookingToCollect);
            const isPaid = b?.paymentStatus === 'PAID';
            return (
              <>
                {!isPaid ? (
                  <>
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[#17307a] mb-2">Payment Required</h3>
                    <p className="text-slate-600 mb-6 max-w-sm">
                      Payment is required before vehicle collection. Please complete the payment first.
                    </p>
                    <div className="flex gap-3 w-full">
                      <Button className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setCollectionModalOpen(false)}>Close</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[#17307a] mb-2">Confirm Vehicle Collection</h3>
                    <p className="text-slate-600 mb-6 max-w-sm">
                      Are you sure you want to mark this vehicle as collected? This means the customer has received their vehicle and the service lifecycle is fully complete.
                    </p>
                    <div className="flex gap-3 w-full">
                      <Button variant="outline" className="flex-1" onClick={() => setCollectionModalOpen(false)}>Cancel</Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirmMarkCollected}>Confirm Collection</Button>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </Modal>

      {invoiceData && (
        <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Invoice" className="max-w-2xl">
          <div className="p-4 bg-white text-slate-800">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">INVOICE</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">{invoiceData.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{invoiceData.garageName}</p>
                <p className="text-sm text-slate-600">{invoiceData.garageAddress}</p>
                <p className="text-sm text-slate-600">{invoiceData.garageCity}</p>
              </div>
            </div>
            
            <div className="flex justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
                <p className="font-semibold">{invoiceData.customerName || 'Customer'}</p>
                <p className="text-sm text-slate-600">{invoiceData.customerPhone || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</p>
                <p className="font-semibold">{invoiceData.vehicleMake} {invoiceData.vehicleModel}</p>
                <p className="text-sm text-slate-600">{invoiceData.vehicleVin || 'N/A'}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
              <div className="flex justify-between mb-2 pb-2 border-b border-slate-200">
                <p className="font-bold text-slate-700">Description</p>
                <p className="font-bold text-slate-700">Amount</p>
              </div>
              <div className="flex justify-between py-2">
                <p className="text-slate-600">{invoiceData.serviceType || 'Vehicle Service'}</p>
                <p className="font-medium">{formatCurrency(invoiceData.subtotal, invoiceData.currency)}</p>
              </div>
              
              {/* Detailed Breakdown from Quote if available */}
              {invoiceData.quoteDetails && (
                <div className="ml-4 mt-2 space-y-1 text-sm">
                  {invoiceData.quoteDetails.laborCost !== undefined && (
                    <div className="flex justify-between text-slate-500">
                      <span>Labour Cost</span>
                      <span>{formatCurrency(invoiceData.quoteDetails.laborCost, invoiceData.currency)}</span>
                    </div>
                  )}
                  {invoiceData.quoteDetails.partsCost !== undefined && (
                    <div className="flex justify-between text-slate-500">
                      <span>Parts Cost</span>
                      <span>{formatCurrency(invoiceData.quoteDetails.partsCost, invoiceData.currency)}</span>
                    </div>
                  )}
                  {invoiceData.quoteDetails.consumablesCost !== undefined && (
                    <div className="flex justify-between text-slate-500">
                      <span>Consumables</span>
                      <span>{formatCurrency(invoiceData.quoteDetails.consumablesCost, invoiceData.currency)}</span>
                    </div>
                  )}
                </div>
              )}

              {Number(invoiceData.discountAmount) > 0 && (
                <div className="flex justify-between py-2 text-green-600">
                  <p>Discount Applied</p>
                  <p>- {formatCurrency(invoiceData.discountAmount, invoiceData.currency)}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <p className="text-slate-500 font-medium">Subtotal</p>
                  <p className="font-semibold">{formatCurrency(invoiceData.subtotal, invoiceData.currency)}</p>
                </div>
                {Number(invoiceData.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <p className="text-slate-500 font-medium">Tax</p>
                    <p className="font-semibold">{formatCurrency(invoiceData.taxAmount, invoiceData.currency)}</p>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3">
                  <p className="font-bold text-slate-800 uppercase tracking-wider">Total</p>
                  <p className="text-xl font-bold text-[#17307a]">{formatCurrency(invoiceData.totalAmount, invoiceData.currency)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-200 pt-6">
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                <span className={`inline-block px-3 py-1 font-bold text-xs rounded uppercase ${
                  invoiceData.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {invoiceData.paymentStatus}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.print()}
                  variant="outline"
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Print / Save PDF
                </Button>
                <Button 
                  onClick={() => setInvoiceModalOpen(false)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {paymentSelectionBooking && (
        <Modal 
          isOpen={paymentSelectionModalOpen} 
          onClose={() => { setPaymentSelectionModalOpen(false); setPaymentSelectionBooking(null); }}
          title="Select Payment Method"
        >
          <div className="py-4 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-[#17307a] mb-2">How would you like to pay?</h3>
            <p className="text-slate-600 mb-8 max-w-sm">
              Please choose whether to pay online right now or pay with cash directly at the garage.
            </p>
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="flex-1 bg-white border-slate-300 hover:bg-slate-50"
                onClick={handlePayCash}
                disabled={isProcessingCash}
              >
                {isProcessingCash ? 'Processing...' : 'Pay with Cash'}
              </Button>
              <Button 
                variant="default" 
                className="flex-1 bg-[#1a56db] hover:bg-blue-700 text-white"
                onClick={handlePayOnline}
                disabled={isProcessingCash}
              >
                Pay Online
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {paymentSuccessData && (
        <PaymentSuccessModal
          isOpen={paymentSuccessData.isOpen}
          onClose={() => setPaymentSuccessData(null)}
          amount={paymentSuccessData.amount}
          paymentMethod={paymentSuccessData.method}
          transactionId={paymentSuccessData.transactionId}
          title={paymentSuccessData.title}
          description={paymentSuccessData.desc}
          primaryActionLabel="View Bookings"
          onPrimaryAction={() => setPaymentSuccessData(null)}
        />
      )}

      <Modal isOpen={!!paymentError} onClose={() => setPaymentError(null)} title="Payment Issue">
        <div className="py-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#17307a] mb-2">Something went wrong</h3>
          <p className="text-slate-600 mb-6 max-w-sm">
            {paymentError}
          </p>
          <Button className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setPaymentError(null)}>
            Close
          </Button>
        </div>
      </Modal>

    </DashboardShell>
  );
}

export default BookingsPage;
