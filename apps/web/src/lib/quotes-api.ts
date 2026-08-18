import { apiClient } from './api-client';
import type { QuoteItem } from '@/components/quotes/quotes-shared';

export async function fetchQuotes(): Promise<QuoteItem[]> {
  return apiClient.get('/quotes');
}

export async function fetchQuote(id: string): Promise<QuoteItem> {
  return apiClient.get(`/quotes/${id}`);
}

export interface QuoteRequestResponse {
  id: string;
  customerId: string;
  customerName?: string;
  customerAvatar?: string;
  vehicleId: string;
  diagnosisRequestId?: string | null;
  issueSummary: string;
  preferredDate?: string | null;
  status: string;
  createdAt: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    vin?: string;
    mileage?: number;
  } | null;
  sentQuote?: {
    id: string;
    totalCost: number;
    labourCost: number;
    partsCost: number;
    etaDays?: number | null;
    etaNote?: string;
    remarks?: string;
    status: string;
    currency?: string;
  } | null;
}

export interface CreateQuoteRequestPayload {
  garageId: string;
  vehicleId: string;
  issueSummary: string;
  diagnosisRequestId?: string;
  preferredDate?: string;
}

export async function createQuoteRequest(payload: CreateQuoteRequestPayload): Promise<QuoteRequestResponse> {
  return apiClient.post('/quotes/requests', payload);
}

export async function getQuoteRequest(id: string): Promise<QuoteRequestResponse> {
  return apiClient.get(`/quotes/requests/${id}`);
}

export async function fetchQuoteRequests(): Promise<QuoteRequestResponse[]> {
  return apiClient.get('/quotes/requests');
}

export async function getGarageIncomingRequests(): Promise<QuoteRequestResponse[]> {
  return apiClient.get('/quotes/garage-requests');
}

export async function acceptQuoteRequest(id: string): Promise<{ success: boolean; message: string }> {
  return apiClient.post(`/quotes/garage-requests/${id}/accept`, {});
}

export interface SubmitQuotePayload {
  labourCost: number;
  partsCost: number;
  consumablesCost?: number;
  gstCost?: number;
  otherCost?: number;
  estimatedTime: string;
  remarks: string;
  availability?: string;
  pickupDrop?: string;
  warranty?: string;
}

export async function submitGarageQuote(quoteRequestId: string, payload: SubmitQuotePayload): Promise<{ success: boolean; quoteId: string }> {
  return apiClient.post(`/quotes/${quoteRequestId}/quotes`, payload);
}

export interface GarageStatsResponse {
  incoming: number;
  activeJobs: number;
  generatedQuotes: number;
  completed: number;
}

export async function fetchGarageStats(): Promise<GarageStatsResponse> {
  return apiClient.get('/quotes/garage/stats');
}

export async function updateBookingStatus(id: string, status: string): Promise<any> {
  return apiClient.patch(`/bookings/${id}/status`, { status });
}

export interface GarageActiveJob {
  id: string;
  quoteRequestId: string;
  amount: number;
  quoteStatus: string;
  quoteCreatedAt: string;
  details: any;
  issueSummary: string;
  requestStatus: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  customerName: string;
  customerAvatar: string | null;
  bookingStatus?: string | null;
  bookingDate?: string | null;
  serviceType?: string | null;
  currency?: string;
}

export async function fetchGarageActiveJobs(): Promise<GarageActiveJob[]> {
  return apiClient.get('/quotes/garage/active-jobs');
}

export interface GarageQuote {
  id: string;
  quoteRequestId: string;
  totalCost: number;
  laborCost: number;
  partsCost: number;
  etaDays: number;
  etaNote: string;
  quoteStatus: string;
  createdAt: string;
  details: any;
  issueSummary: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  customerName: string;
  customerAvatar: string | null;
  currency?: string;
}

export async function fetchGarageQuotes(): Promise<GarageQuote[]> {
  return apiClient.get('/quotes/garage/quotes');
}

export interface GarageCompletedJob {
  id: string;
  bookingStatus: string;
  completionDate: string;
  quoteAmount: number;
  details: any;
  issueSummary: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  customerName: string;
  customerContact: string | null;
  customerAvatar: string | null;
  currency?: string;
}

export async function fetchGarageCompletedJobs(): Promise<GarageCompletedJob[]> {
  return apiClient.get('/quotes/garage/completed-jobs');
}

export async function getGarageIncomingBookings(): Promise<any[]> {
  return apiClient.get('/bookings/garage-incoming');
}
