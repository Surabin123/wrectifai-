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
  // When no city is specified, fetch ALL approved garages (display context is set by the UI).
  // When a city is specified, use the search endpoint with city filter (future real-location use).
  const url = city ? `/garages/search?city=${encodeURIComponent(city)}` : '/garages';
  return apiClient.get(url);
}

export async function fetchGarage(id: string): Promise<Garage> {
  return apiClient.get(`/garages/${id}`);
}

export async function fetchPromos(): Promise<Promo[]> {
  return apiClient.get('/promos');
}
