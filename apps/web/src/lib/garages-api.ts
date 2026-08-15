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

const localitiesMap: Record<string, string[]> = {
  'Bengaluru': ['Koramangala', 'Indiranagar', 'Jayanagar', 'Whitefield', 'HSR Layout', 'Marathahalli', 'BTM Layout', 'Malleshwaram', 'Rajajinagar', 'Basavanagudi', 'Yelahanka', 'Hebbal'],
  'Mumbai': ['Bandra', 'Andheri', 'Juhu', 'Colaba', 'Worli', 'Malad', 'Powai', 'Goregaon', 'Dadar', 'Borivali', 'Chembur', 'Khar'],
  'Delhi': ['Connaught Place', 'South Extension', 'Hauz Khas', 'Vasant Kunj', 'Saket', 'Karol Bagh', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Pitampura', 'Rajouri Garden', 'Chandni Chowk'],
  'Hyderabad': ['Banjara Hills', 'Jubilee Hills', 'HITEC City', 'Madhapur', 'Kondapur', 'Gachibowli', 'Kukatpally', 'Ameerpet', 'Begumpet', 'Secunderabad', 'Dilsukhnagar', 'Mehdipatnam'],
  'Chennai': ['T Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Nungambakkam', 'Mylapore', 'Alwarpet', 'Thiruvanmiyur', 'Tambaram', 'Guindy', 'Okhla', 'Besant Nagar'],
  'Kolkata': ['Salt Lake', 'Park Street', 'New Town', 'Ballygunge', 'Alipore', 'Dum Dum', 'Tollygunge', 'Howrah', 'Gariahat', 'Jadavpur', 'Behala', 'Rajarhat'],
  'New York': ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island', 'Harlem', 'Upper East Side', 'Greenwich Village', 'SoHo', 'Tribeca', 'Williamsburg', 'Astoria'],
  'Los Angeles': ['Hollywood', 'Downtown LA', 'Santa Monica', 'Venice', 'Beverly Hills', 'Silver Lake', 'Echo Park', 'Westwood', 'Koreatown', 'Pasadena', 'Glendale', 'Burbank'],
  'Chicago': ['The Loop', 'Lincoln Park', 'Wicker Park', 'Logan Square', 'Lakeview', 'River North', 'West Loop', 'Hyde Park', 'Gold Coast', 'Old Town', 'Pilsen', 'Bronzeville'],
  'Houston': ['Downtown', 'Midtown', 'Montrose', 'The Heights', 'River Oaks', 'Galleria', 'Medical Center', 'EaDo', 'Museum District', 'Memorial', 'Energy Corridor', 'Westchase'],
  'Dubai': ['Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Business Bay', 'Deira', 'Al Barsha', 'Palm Jumeirah', 'Bur Dubai', 'JLT', 'Arabian Ranches', 'Al Quoz', 'DIFC'],
  'Abu Dhabi': ['Corniche', 'Al Reem Island', 'Yas Island', 'Saadiyat Island', 'Al Khalidiya', 'Al Raha', 'Khalifa City', 'Tourist Club Area', 'Al Bateen', 'Al Mushrif', 'Masdar City', 'Mohammed Bin Zayed City']
};

export async function fetchGarages(city?: string): Promise<Garage[]> {
  const url = '/garages';
  const garages: Garage[] = await apiClient.get(url);
  
  if (city && garages.length > 0) {
    const defaultLocalities = localitiesMap[city] || localitiesMap['New York'];
    return garages.map((garage, index) => {
      const locality = defaultLocalities[index % defaultLocalities.length];
      return {
        ...garage,
        location: `${locality}, ${city}`
      };
    });
  }
  
  return garages;
}

export async function fetchGarage(id: string): Promise<Garage> {
  return apiClient.get(`/garages/${id}`);
}

export async function fetchPromos(): Promise<Promo[]> {
  return apiClient.get('/promos');
}
