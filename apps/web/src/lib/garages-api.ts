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
  distanceKm?: number;
  price?: string;
  responseMins: number;
  chips: string[];
  facade?: string;
  tone?: string;
  artwork?: string;
  verified: boolean;
  image?: string;
  coordinates?: [number, number];
  city?: string;
  description?: string;
  businessHours?: any;
  approvalStatus?: string;
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

export async function fetchGarages(city?: string, lat?: number, lng?: number, country?: string): Promise<Garage[]> {
  let url = '/garages';
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  // country enforces region-scoped filtering in the backend (India vs USA vs UAE)
  if (country) params.append('country', country);
  if (lat !== undefined) params.append('lat', lat.toString());
  if (lng !== undefined) params.append('lng', lng.toString());
  
  if (params.toString()) {
    url += '?' + params.toString();
  }
  
  const garages: Garage[] = await apiClient.get(url);
  return garages;
}

export async function fetchGarage(id: string): Promise<Garage> {
  return apiClient.get(`/garages/${id}`);
}

export async function fetchPromos(): Promise<Promo[]> {
  return apiClient.get('/promos');
}
