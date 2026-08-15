import { apiClient } from './api-client';

export interface Garage {
  id: string;
  badge: string;
  badgeTone: string;
  name: string;
  rating: number;
  reviews: number;
  location: string;
  distance?: string;
  price?: string;
  responseMins: number;
  chips: string[];
  facade?: string;
  tone?: string;
  artwork?: string;
  verified: boolean;
  image?: string;
}

export interface Promo {
  id: string;
  badge: string;
  icon: string;
  title: string;
  bullets: string[];
  numericPrice: number;
  strikePrice?: number;
  discountPercent: number;
  validTill: string;
  usedCountValue: number;
  image: string;
  categories: string[];
  isCombo: boolean;
  relevance: number;
  themePreset: string;
}

export async function fetchGarages(city?: string): Promise<Garage[]> {
  const url = '/garages';
  const garages: Garage[] = await apiClient.get(url);
  
  if (city && garages.length > 0) {
    // If the user is filtering by a specific city in the UI (e.g. from cookies)
    // we can filter the garages, or rely on the backend.
    // For now, if the backend returns all, we let it be or filter on frontend
    // Assuming backend filters if we pass a query param in the future,
    // but for now, we just return the garages.
  }
  
  return garages;
}

export async function fetchGarage(id: string): Promise<Garage> {
  return apiClient.get(`/garages/${id}`);
}

export async function fetchPromos(): Promise<Promo[]> {
  return apiClient.get('/promos');
}
