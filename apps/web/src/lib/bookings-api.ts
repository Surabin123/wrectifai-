import { apiClient } from './api-client';

export interface Booking {
  id: string;
  customerId: string;
  garageId: string;
  vehicleId: string;
  quoteId?: string | null;
  bookingType: 'instant' | 'quoteBased';
  scheduledAt: string;
  status: 'requested' | 'confirmed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'readyForCollection' | 'collected';
  paymentStatus?: 'UNPAID' | 'PAYMENT_DUE' | 'PAYMENT_PROCESSING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_FAILED';
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  garageName?: string;
  garageAddress?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  discountApplied?: number;
}

export async function fetchBookings(): Promise<Booking[]> {
  return apiClient.get<Booking[]>('/bookings');
}

export async function fetchBooking(id: string): Promise<Booking> {
  return apiClient.get<Booking>(`/bookings/${id}`);
}

export async function createBooking(data: {
  garageId?: string;
  vehicleId: string;
  scheduledAt: string;
  totalAmount: number;
  bookingType: 'instant' | 'quoteBased';
  quoteId?: string | null;
  currency?: string;
  serviceType?: string;
}): Promise<Booking> {
  return apiClient.post<Booking>('/bookings', data);
}

export async function updateBookingStatus(id: string, status: string, collectionTime?: string): Promise<Booking> {
  return apiClient.patch<Booking>(`/bookings/${id}/status`, { status, collectionTime });
}

export async function applyOfferToBooking(id: string, offerCode: string): Promise<{ discount: number; message: string }> {
  return apiClient.post<{ discount: number; message: string }>(`/bookings/${id}/apply-offer`, { offerCode });
}

export async function payForBooking(id: string, walletAmountToUse?: number): Promise<{ razorpayOrderId?: string; fullyPaidViaWallet?: boolean }> {
  return apiClient.post<{ razorpayOrderId?: string; fullyPaidViaWallet?: boolean }>(`/bookings/${id}/pay`, { walletAmountToUse });
}

export async function fetchInvoice(bookingId: string): Promise<any> {
  return apiClient.get<any>(`/invoices/by-booking/${bookingId}`);
}
