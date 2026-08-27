export type QuoteStatus = 'new' | 'viewed' | 'expired' | 'open' | 'active' | 'selected' | 'accepted' | 'rejected' | string;

export type QuoteItem = {
  id: string;
  quoteRequestId?: string;
  garageId?: string;
  status: QuoteStatus;
  garage: string;
  garageAddress?: string | null;
  garageImage?: string | null;
  garageCreatedAt?: string;
  image: string;
  rating: string;
  reviews: number;
  expiresAt?: string;
  viewedAt?: string;
  distance: string;
  meta: string;
  metaSecondary: string;
  price: string;
  savings: string;
  time: string;
  tag?: string;
  details?: {
    parts?: number;
    labour?: number;
    consumables?: number;
    gst?: number;
    other?: number;
    total?: number;
    remarks?: string;
    pickupDrop?: string;
    availability?: string;
    warranty?: string;
  };
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
    fuelType?: string;
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

export const quoteContextDefaultIssueIds = ['wheel-balance', 'wheel-alignment'];
export const aiEstimatedQuoteRange = `₹2,800 - ₹3,600`;

export const quotesList: QuoteItem[] = [];
