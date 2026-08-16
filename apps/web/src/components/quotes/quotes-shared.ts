export type QuoteStatus = 'new' | 'viewed' | 'expired' | 'open' | 'active' | 'selected' | 'accepted' | 'rejected' | string;

export type QuoteItem = {
  id: string;
  quoteRequestId?: string;
  status: QuoteStatus;
  garage: string;
  image: string;
  rating: string;
  reviews: number;
  distance: string;
  meta: string;
  metaSecondary: string;
  price: string;
  savings: string;
  time: string;
  tag?: string;
  details?: any;
  requestCreatedAt?: string;
  requestIssueSummary?: string;
  preferredDate?: string;
  currency?: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    vin?: string;
    mileage?: number;
  } | null;
  isBooked?: boolean;
  bookingDetails?: {
    id: string;
    status: string;
    createdAt: string;
    scheduledAt: string;
  } | null;
  customerName?: string;
};

const DOLLAR = '$';

export const quoteContextDefaultIssueIds = ['wheel-balance', 'wheel-alignment'];
export const aiEstimatedQuoteRange = `${DOLLAR}2,800 - ${DOLLAR}3,600`;

export const quotesList: QuoteItem[] = [];
