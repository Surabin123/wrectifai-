/**
 * WrectifAI — Multi-City Demo Garage Seeder
 * 
 * Seeds demo garage records for all supported cities across India, USA, UAE.
 * DOES NOT delete, modify, or re-create existing garages.
 * Uses INSERT only for cities that currently have zero active garages.
 * Idempotent: safe to re-run.
 */

const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

// ─── City seed data ──────────────────────────────────────────────────────────

const CITIES = [
  // ─── India ───────────────────────────────────────────────────────────────
  {
    city: 'Delhi', country: 'India', countryCode: 'IN',
    center: { lat: 28.6139, lng: 77.2090 },
    localities: [
      { name: 'Connaught Place', lat: 28.6304, lng: 77.2177 },
      { name: 'Karol Bagh', lat: 28.6519, lng: 77.1909 },
      { name: 'Lajpat Nagar', lat: 28.5674, lng: 77.2433 },
      { name: 'Dwarka', lat: 28.5921, lng: 77.0460 },
      { name: 'Rohini', lat: 28.7386, lng: 77.1313 },
      { name: 'Saket', lat: 28.5244, lng: 77.2066 },
      { name: 'Janakpuri', lat: 28.6219, lng: 77.0831 },
      { name: 'Pitampura', lat: 28.7033, lng: 77.1311 },
    ],
  },
  {
    city: 'Chennai', country: 'India', countryCode: 'IN',
    center: { lat: 13.0827, lng: 80.2707 },
    localities: [
      { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
      { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
      { name: 'Velachery', lat: 12.9815, lng: 80.2180 },
      { name: 'Ambattur', lat: 13.0982, lng: 80.1561 },
      { name: 'Mylapore', lat: 13.0336, lng: 80.2679 },
      { name: 'Tambaram', lat: 12.9249, lng: 80.1000 },
      { name: 'Perungudi', lat: 12.9664, lng: 80.2457 },
      { name: 'Porur', lat: 13.0358, lng: 80.1567 },
    ],
  },
  {
    city: 'Kolkata', country: 'India', countryCode: 'IN',
    center: { lat: 22.5726, lng: 88.3639 },
    localities: [
      { name: 'Salt Lake', lat: 22.5958, lng: 88.4130 },
      { name: 'Park Street', lat: 22.5536, lng: 88.3511 },
      { name: 'Dum Dum', lat: 22.6548, lng: 88.3975 },
      { name: 'Tollygunge', lat: 22.5014, lng: 88.3464 },
      { name: 'Howrah', lat: 22.5958, lng: 88.2636 },
      { name: 'Behala', lat: 22.4926, lng: 88.3114 },
      { name: 'Jadavpur', lat: 22.4978, lng: 88.3714 },
      { name: 'New Town', lat: 22.5825, lng: 88.4736 },
    ],
  },
  {
    city: 'Pune', country: 'India', countryCode: 'IN',
    center: { lat: 18.5204, lng: 73.8567 },
    localities: [
      { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
      { name: 'Hinjewadi', lat: 18.5912, lng: 73.7389 },
      { name: 'Hadapsar', lat: 18.5018, lng: 73.9258 },
      { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
      { name: 'Pimpri', lat: 18.6186, lng: 73.8003 },
      { name: 'Baner', lat: 18.5590, lng: 73.7868 },
      { name: 'Wakad', lat: 18.5989, lng: 73.7615 },
      { name: 'Shivajinagar', lat: 18.5314, lng: 73.8446 },
    ],
  },
  {
    city: 'Kochi', country: 'India', countryCode: 'IN',
    center: { lat: 9.9312, lng: 76.2673 },
    localities: [
      { name: 'Edappally', lat: 10.0209, lng: 76.3067 },
      { name: 'Kakkanad', lat: 10.0163, lng: 76.3390 },
      { name: 'Fort Kochi', lat: 9.9640, lng: 76.2423 },
      { name: 'Aluva', lat: 10.1080, lng: 76.3510 },
      { name: 'Tripunithura', lat: 9.9431, lng: 76.3448 },
      { name: 'Thripunithura', lat: 9.9431, lng: 76.3461 },
      { name: 'Muvattupuzha', lat: 9.9848, lng: 76.5803 },
      { name: 'Perumbavoor', lat: 10.1073, lng: 76.4718 },
    ],
  },
  {
    city: 'Ahmedabad', country: 'India', countryCode: 'IN',
    center: { lat: 23.0225, lng: 72.5714 },
    localities: [
      { name: 'Navrangpura', lat: 23.0395, lng: 72.5655 },
      { name: 'Satellite', lat: 23.0244, lng: 72.5154 },
      { name: 'Maninagar', lat: 22.9921, lng: 72.6047 },
      { name: 'Bopal', lat: 23.0338, lng: 72.4702 },
      { name: 'Chandkheda', lat: 23.1099, lng: 72.6005 },
      { name: 'Thaltej', lat: 23.0574, lng: 72.5147 },
      { name: 'Gota', lat: 23.1045, lng: 72.5476 },
      { name: 'Vastral', lat: 23.0289, lng: 72.6638 },
    ],
  },
  {
    city: 'Jaipur', country: 'India', countryCode: 'IN',
    center: { lat: 26.9124, lng: 75.7873 },
    localities: [
      { name: 'Malviya Nagar', lat: 26.8535, lng: 75.8069 },
      { name: 'Mansarovar', lat: 26.8596, lng: 75.7586 },
      { name: 'Vaishali Nagar', lat: 26.9274, lng: 75.7411 },
      { name: 'Civil Lines', lat: 26.9310, lng: 75.8058 },
      { name: 'Tonk Road', lat: 26.8608, lng: 75.8185 },
      { name: 'Sodala', lat: 26.9233, lng: 75.7623 },
      { name: 'Ajmer Road', lat: 26.9220, lng: 75.7296 },
      { name: 'Gopalpura', lat: 26.8805, lng: 75.7897 },
    ],
  },
  {
    city: 'Surat', country: 'India', countryCode: 'IN',
    center: { lat: 21.1702, lng: 72.8311 },
    localities: [
      { name: 'Adajan', lat: 21.2011, lng: 72.7914 },
      { name: 'Vesu', lat: 21.1435, lng: 72.7920 },
      { name: 'Katargam', lat: 21.2095, lng: 72.8399 },
      { name: 'Varachha', lat: 21.1984, lng: 72.8681 },
      { name: 'Piplod', lat: 21.1601, lng: 72.7981 },
      { name: 'Dindoli', lat: 21.1528, lng: 72.8616 },
      { name: 'Pal', lat: 21.1536, lng: 72.7748 },
      { name: 'Udhna', lat: 21.1683, lng: 72.8688 },
    ],
  },
  {
    city: 'Lucknow', country: 'India', countryCode: 'IN',
    center: { lat: 26.8467, lng: 80.9462 },
    localities: [
      { name: 'Gomti Nagar', lat: 26.8476, lng: 81.0074 },
      { name: 'Hazratganj', lat: 26.8481, lng: 80.9462 },
      { name: 'Aliganj', lat: 26.8719, lng: 80.9461 },
      { name: 'Indira Nagar', lat: 26.8693, lng: 80.9924 },
      { name: 'Alambagh', lat: 26.8063, lng: 80.9176 },
      { name: 'Chinhat', lat: 26.8785, lng: 81.0588 },
      { name: 'Mahanagar', lat: 26.8748, lng: 80.9427 },
      { name: 'Vikas Nagar', lat: 26.8861, lng: 80.9765 },
    ],
  },
  {
    city: 'Kanpur', country: 'India', countryCode: 'IN',
    center: { lat: 26.4499, lng: 80.3319 },
    localities: [
      { name: 'Kakadeo', lat: 26.4676, lng: 80.2955 },
      { name: 'Kidwai Nagar', lat: 26.4620, lng: 80.3362 },
      { name: 'Civil Lines', lat: 26.4653, lng: 80.3536 },
      { name: 'Armapur', lat: 26.4948, lng: 80.3022 },
      { name: 'Govind Nagar', lat: 26.4381, lng: 80.2940 },
      { name: 'Shyam Nagar', lat: 26.4777, lng: 80.3561 },
      { name: 'Rawatpur', lat: 26.5012, lng: 80.3512 },
      { name: 'Swaroop Nagar', lat: 26.4593, lng: 80.3185 },
    ],
  },
  {
    city: 'Nagpur', country: 'India', countryCode: 'IN',
    center: { lat: 21.1458, lng: 79.0882 },
    localities: [
      { name: 'Dharampeth', lat: 21.1514, lng: 79.0618 },
      { name: 'Pratap Nagar', lat: 21.1371, lng: 79.0741 },
      { name: 'Sadar', lat: 21.1497, lng: 79.0862 },
      { name: 'Manewada', lat: 21.1056, lng: 79.1253 },
      { name: 'Hingna', lat: 21.1268, lng: 78.9964 },
      { name: 'Kamptee Road', lat: 21.1803, lng: 79.1125 },
      { name: 'Trimurti Nagar', lat: 21.1571, lng: 79.0509 },
      { name: 'Wadi', lat: 21.1958, lng: 79.1153 },
    ],
  },
  {
    city: 'Patna', country: 'India', countryCode: 'IN',
    center: { lat: 25.5941, lng: 85.1376 },
    localities: [
      { name: 'Boring Road', lat: 25.6177, lng: 85.1049 },
      { name: 'Bailey Road', lat: 25.6131, lng: 85.0972 },
      { name: 'Kankarbagh', lat: 25.5940, lng: 85.1581 },
      { name: 'Rajendra Nagar', lat: 25.5801, lng: 85.1154 },
      { name: 'Danapur', lat: 25.6183, lng: 85.0373 },
      { name: 'Patna City', lat: 25.5928, lng: 85.1976 },
      { name: 'Kadamkuan', lat: 25.6057, lng: 85.1269 },
      { name: 'Anisabad', lat: 25.5684, lng: 85.1509 },
    ],
  },
  // ─── USA ─────────────────────────────────────────────────────────────────
  {
    city: 'Los Angeles', country: 'United States', countryCode: 'US',
    center: { lat: 34.0522, lng: -118.2437 },
    localities: [
      { name: 'Hollywood', lat: 34.0928, lng: -118.3286 },
      { name: 'Santa Monica', lat: 34.0195, lng: -118.4912 },
      { name: 'Burbank', lat: 34.1808, lng: -118.3090 },
      { name: 'Culver City', lat: 34.0211, lng: -118.3965 },
      { name: 'Van Nuys', lat: 34.1858, lng: -118.4489 },
      { name: 'Pasadena', lat: 34.1478, lng: -118.1445 },
      { name: 'Torrance', lat: 33.8358, lng: -118.3406 },
      { name: 'Inglewood', lat: 33.9617, lng: -118.3531 },
    ],
  },
  {
    city: 'Chicago', country: 'United States', countryCode: 'US',
    center: { lat: 41.8781, lng: -87.6298 },
    localities: [
      { name: 'Lincoln Park', lat: 41.9217, lng: -87.6472 },
      { name: 'Wicker Park', lat: 41.9083, lng: -87.6794 },
      { name: 'Evanston', lat: 42.0451, lng: -87.6877 },
      { name: 'Oak Park', lat: 41.8850, lng: -87.7845 },
      { name: 'Hyde Park', lat: 41.8027, lng: -87.5987 },
      { name: 'Naperville', lat: 41.7508, lng: -88.1535 },
      { name: 'Schaumburg', lat: 42.0334, lng: -88.0834 },
      { name: 'Skokie', lat: 42.0334, lng: -87.7333 },
    ],
  },
  {
    city: 'Houston', country: 'United States', countryCode: 'US',
    center: { lat: 29.7604, lng: -95.3698 },
    localities: [
      { name: 'Midtown', lat: 29.7447, lng: -95.3773 },
      { name: 'The Woodlands', lat: 30.1658, lng: -95.4613 },
      { name: 'Sugar Land', lat: 29.6196, lng: -95.6349 },
      { name: 'Katy', lat: 29.7858, lng: -95.8245 },
      { name: 'Pearland', lat: 29.5635, lng: -95.2860 },
      { name: 'Pasadena', lat: 29.6910, lng: -95.2091 },
      { name: 'Webster', lat: 29.5377, lng: -95.1191 },
      { name: 'Friendswood', lat: 29.5294, lng: -95.2010 },
    ],
  },
  {
    city: 'Phoenix', country: 'United States', countryCode: 'US',
    center: { lat: 33.4484, lng: -112.0740 },
    localities: [
      { name: 'Scottsdale', lat: 33.4942, lng: -111.9261 },
      { name: 'Tempe', lat: 33.4255, lng: -111.9400 },
      { name: 'Mesa', lat: 33.4152, lng: -111.8315 },
      { name: 'Chandler', lat: 33.3062, lng: -111.8413 },
      { name: 'Glendale', lat: 33.5387, lng: -112.1860 },
      { name: 'Peoria', lat: 33.5806, lng: -112.2374 },
      { name: 'Gilbert', lat: 33.3528, lng: -111.7890 },
      { name: 'Surprise', lat: 33.6292, lng: -112.3679 },
    ],
  },
  {
    city: 'Philadelphia', country: 'United States', countryCode: 'US',
    center: { lat: 39.9526, lng: -75.1652 },
    localities: [
      { name: 'Fishtown', lat: 39.9738, lng: -75.1358 },
      { name: 'South Philly', lat: 39.9190, lng: -75.1635 },
      { name: 'Manayunk', lat: 40.0268, lng: -75.2244 },
      { name: 'Chestnut Hill', lat: 40.0734, lng: -75.2085 },
      { name: 'Northeast Philly', lat: 40.0687, lng: -75.0555 },
      { name: 'King of Prussia', lat: 40.0884, lng: -75.3829 },
      { name: 'Cherry Hill', lat: 39.9348, lng: -75.0246 },
      { name: 'Norristown', lat: 40.1215, lng: -75.3399 },
    ],
  },
  {
    city: 'San Antonio', country: 'United States', countryCode: 'US',
    center: { lat: 29.4241, lng: -98.4936 },
    localities: [
      { name: 'Alamo Heights', lat: 29.4694, lng: -98.4683 },
      { name: 'Stone Oak', lat: 29.6218, lng: -98.4901 },
      { name: 'Helotes', lat: 29.5744, lng: -98.6918 },
      { name: 'Leon Valley', lat: 29.4952, lng: -98.6141 },
      { name: 'Converse', lat: 29.5135, lng: -98.3085 },
      { name: 'Schertz', lat: 29.5552, lng: -98.2696 },
      { name: 'Universal City', lat: 29.5474, lng: -98.2918 },
      { name: 'Boerne', lat: 29.7944, lng: -98.7320 },
    ],
  },
  {
    city: 'San Diego', country: 'United States', countryCode: 'US',
    center: { lat: 32.7157, lng: -117.1611 },
    localities: [
      { name: 'La Jolla', lat: 32.8328, lng: -117.2713 },
      { name: 'Mission Valley', lat: 32.7658, lng: -117.1521 },
      { name: 'El Cajon', lat: 32.7948, lng: -116.9625 },
      { name: 'Chula Vista', lat: 32.6401, lng: -117.0842 },
      { name: 'Escondido', lat: 33.1192, lng: -117.0864 },
      { name: 'Santee', lat: 32.8384, lng: -116.9739 },
      { name: 'National City', lat: 32.6784, lng: -117.0992 },
      { name: 'Oceanside', lat: 33.1959, lng: -117.3795 },
    ],
  },
  {
    city: 'Dallas', country: 'United States', countryCode: 'US',
    center: { lat: 32.7767, lng: -96.7970 },
    localities: [
      { name: 'Uptown', lat: 32.7990, lng: -96.8058 },
      { name: 'Plano', lat: 33.0198, lng: -96.6989 },
      { name: 'Irving', lat: 32.8141, lng: -96.9489 },
      { name: 'Garland', lat: 32.9126, lng: -96.6389 },
      { name: 'Frisco', lat: 33.1507, lng: -96.8236 },
      { name: 'Mesquite', lat: 32.7668, lng: -96.5992 },
      { name: 'Arlington', lat: 32.7357, lng: -97.1081 },
      { name: 'Richardson', lat: 32.9483, lng: -96.7299 },
    ],
  },
  {
    city: 'Austin', country: 'United States', countryCode: 'US',
    center: { lat: 30.2672, lng: -97.7431 },
    localities: [
      { name: 'South Congress', lat: 30.2477, lng: -97.7504 },
      { name: 'Round Rock', lat: 30.5083, lng: -97.6789 },
      { name: 'Cedar Park', lat: 30.5052, lng: -97.8203 },
      { name: 'Pflugerville', lat: 30.4393, lng: -97.6200 },
      { name: 'Georgetown', lat: 30.6327, lng: -97.6774 },
      { name: 'Kyle', lat: 29.9889, lng: -97.8775 },
      { name: 'Buda', lat: 30.0852, lng: -97.8403 },
      { name: 'Manor', lat: 30.3427, lng: -97.5567 },
    ],
  },
  {
    city: 'San Jose', country: 'United States', countryCode: 'US',
    center: { lat: 37.3382, lng: -121.8863 },
    localities: [
      { name: 'Willow Glen', lat: 37.3025, lng: -121.9052 },
      { name: 'Santa Clara', lat: 37.3541, lng: -121.9552 },
      { name: 'Sunnyvale', lat: 37.3688, lng: -122.0363 },
      { name: 'Milpitas', lat: 37.4323, lng: -121.8996 },
      { name: 'Mountain View', lat: 37.3861, lng: -122.0839 },
      { name: 'Cupertino', lat: 37.3230, lng: -122.0322 },
      { name: 'Campbell', lat: 37.2872, lng: -121.9500 },
      { name: 'Los Gatos', lat: 37.2358, lng: -121.9624 },
    ],
  },
  // ─── UAE ─────────────────────────────────────────────────────────────────
  {
    city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE',
    center: { lat: 25.2048, lng: 55.2708 },
    localities: [
      { name: 'Downtown Dubai', lat: 25.1972, lng: 55.2744 },
      { name: 'Deira', lat: 25.2697, lng: 55.3094 },
      { name: 'Al Quoz', lat: 25.1503, lng: 55.2269 },
      { name: 'Jumeirah', lat: 25.2106, lng: 55.2462 },
      { name: 'Dubai Silicon Oasis', lat: 25.1209, lng: 55.3778 },
      { name: 'Al Barsha', lat: 25.1124, lng: 55.1966 },
      { name: 'Motor City', lat: 25.0478, lng: 55.2381 },
      { name: 'Mirdif', lat: 25.2234, lng: 55.4150 },
    ],
  },
  {
    city: 'Abu Dhabi', country: 'United Arab Emirates', countryCode: 'AE',
    center: { lat: 24.4539, lng: 54.3773 },
    localities: [
      { name: 'Khalidiyah', lat: 24.4717, lng: 54.3621 },
      { name: 'Mussafah', lat: 24.3462, lng: 54.4955 },
      { name: 'Al Reem Island', lat: 24.4951, lng: 54.4070 },
      { name: 'Yas Island', lat: 24.4870, lng: 54.6076 },
      { name: 'Al Ain', lat: 24.2075, lng: 55.7447 },
      { name: 'Hamdan Street', lat: 24.4790, lng: 54.3561 },
      { name: 'Corniche', lat: 24.4764, lng: 54.3370 },
      { name: 'Mohammed Bin Zayed City', lat: 24.3766, lng: 54.5274 },
    ],
  },
  {
    city: 'Sharjah', country: 'United Arab Emirates', countryCode: 'AE',
    center: { lat: 25.3462, lng: 55.4209 },
    localities: [
      { name: 'Al Nahda', lat: 25.3295, lng: 55.4004 },
      { name: 'Industrial Area', lat: 25.3254, lng: 55.4740 },
      { name: 'Al Qasimia', lat: 25.3680, lng: 55.4160 },
      { name: 'Al Majaz', lat: 25.3523, lng: 55.3940 },
      { name: 'Al Taawun', lat: 25.3162, lng: 55.4056 },
      { name: 'Muwaileh', lat: 25.2980, lng: 55.5153 },
      { name: 'Halwan', lat: 25.3612, lng: 55.4530 },
      { name: 'Rolla', lat: 25.3676, lng: 55.3956 },
    ],
  },
  {
    city: 'Ajman', country: 'United Arab Emirates', countryCode: 'AE',
    center: { lat: 25.4052, lng: 55.5136 },
    localities: [
      { name: 'Al Rashidiya', lat: 25.4102, lng: 55.4980 },
      { name: 'Al Jurf', lat: 25.3870, lng: 55.5308 },
      { name: 'Al Nuaimia', lat: 25.4153, lng: 55.5124 },
      { name: 'Al Bustan', lat: 25.4040, lng: 55.5369 },
      { name: 'Al Hamidiya', lat: 25.4251, lng: 55.4924 },
      { name: 'Al Mowaihat', lat: 25.4018, lng: 55.5587 },
      { name: 'Emirates City', lat: 25.4338, lng: 55.5437 },
      { name: 'Ajman Uptown', lat: 25.3736, lng: 55.5671 },
    ],
  },
  {
    city: 'Ras Al Khaimah', country: 'United Arab Emirates', countryCode: 'AE',
    center: { lat: 25.7895, lng: 55.9432 },
    localities: [
      { name: 'Al Nakheel', lat: 25.7947, lng: 55.9454 },
      { name: 'Dafan Al Khor', lat: 25.8163, lng: 55.9709 },
      { name: 'Khuzam', lat: 25.7686, lng: 55.9330 },
      { name: 'Al Qurm', lat: 25.7540, lng: 55.9177 },
      { name: 'Mina Al Arab', lat: 25.8296, lng: 55.9969 },
      { name: 'Al Hamra Village', lat: 25.6779, lng: 55.7785 },
      { name: 'Al Jazeera Al Hamra', lat: 25.6712, lng: 55.7863 },
      { name: 'Suhaim', lat: 25.8390, lng: 55.9601 },
    ],
  },
  {
    city: 'Fujairah', country: 'United Arab Emirates', countryCode: 'AE',
    center: { lat: 25.1288, lng: 56.3265 },
    localities: [
      { name: 'Fujairah City Center', lat: 25.1287, lng: 56.3264 },
      { name: 'Dibba Al Fujairah', lat: 25.5895, lng: 56.2718 },
      { name: 'Al Faseel', lat: 25.1186, lng: 56.3375 },
      { name: 'Rugaylat', lat: 25.0928, lng: 56.3104 },
      { name: 'Al Hayl', lat: 25.0826, lng: 56.2768 },
      { name: 'Qidfa', lat: 25.3531, lng: 56.3617 },
      { name: 'Khor Fakkan', lat: 25.3367, lng: 56.3549 },
      { name: 'Kalba', lat: 25.0535, lng: 56.3619 },
    ],
  },
];

// ─── Garage name templates per category ─────────────────────────────────────
const GARAGE_TEMPLATES = [
  { prefix: 'AutoFix', suffix: 'Service' },
  { prefix: 'Metro', suffix: 'Auto Bay' },
  { prefix: 'SpeedFit', suffix: 'Garage' },
  { prefix: 'Prime', suffix: 'Motors' },
  { prefix: 'Royal', suffix: 'Auto Works' },
  { prefix: 'TechCar', suffix: 'Workshop' },
  { prefix: 'EcoFix', suffix: 'Garage' },
  { prefix: 'Elite', suffix: 'Auto Care' },
];

const CHIP_SETS = [
  ['Free Inspection', 'Pay After Service', 'Warranty Available'],
  ['Free Pickup', '1 Month Warranty', 'Original Parts'],
  ['AC Service Expert', 'Pick & Drop', 'Genuine Parts'],
  ['Quick Service', 'Free Inspection', 'Pay After Service'],
  ['1 Month Warranty', 'Free Pickup', 'Quality Parts'],
  ['Warranty Available', 'Original Parts', 'Certified Mechanics'],
  ['Expert Mechanics', 'Free Inspection', 'Genuine Parts'],
  ['Free Pickup & Drop', 'Pay After Service', '1 Month Warranty'],
];

function getGarageName(localityName, index) {
  const t = GARAGE_TEMPLATES[index % GARAGE_TEMPLATES.length];
  return `${t.prefix} ${localityName.split(' ')[0]} ${t.suffix}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  await client.connect();
  console.log('Connected to database.');

  // Fetch an existing owner_user_id to use for demo garages (column is NOT NULL)
  const ownerRes = await client.query("SELECT owner_user_id FROM garages WHERE owner_user_id IS NOT NULL LIMIT 1");
  if (ownerRes.rows.length === 0) {
    console.error('No existing owner_user_id found. Cannot seed demo garages.');
    await client.end();
    process.exit(1);
  }
  const DEMO_OWNER_ID = ownerRes.rows[0].owner_user_id;
  console.log(`Using demo owner_user_id: ${DEMO_OWNER_ID}`);

  let totalInserted = 0;

  for (const cityDef of CITIES) {
    // Check how many active garages already exist for this city
    const existing = await client.query(
      "SELECT COUNT(*) as count FROM garages WHERE LOWER(city) = $1 AND approval_status = 'active'",
      [cityDef.city.toLowerCase()]
    );
    const existingCount = parseInt(existing.rows[0].count, 10);

    if (existingCount >= 6) {
      console.log(`[SKIP] ${cityDef.city} already has ${existingCount} garages.`);
      continue;
    }

    console.log(`[SEED] ${cityDef.city} has ${existingCount} garages — seeding ${cityDef.localities.length - existingCount} more...`);

    for (let i = existingCount; i < cityDef.localities.length; i++) {
      const locality = cityDef.localities[i];
      const name = getGarageName(locality.name, i);
      const newId = crypto.randomUUID();
      const chips = CHIP_SETS[i % CHIP_SETS.length];

      const location = {
        city: cityDef.city,
        locality: locality.name,
        lat: locality.lat,
        lng: locality.lng,
        country: cityDef.country,
      };

      await client.query(
        `INSERT INTO garages (
          id, owner_user_id, name, address, city, country, location,
          specializations, approval_status,
          rating_avg, rating_count, response_mins,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, 'active',
          0, 0, $9,
          NOW(), NOW()
        )`,
        [
          newId,
          DEMO_OWNER_ID,         // required NOT NULL — using existing demo owner
          name,
          `${locality.name}, ${cityDef.city}`,
          cityDef.city,
          cityDef.countryCode,   // VARCHAR(2) — e.g. 'IN', 'US', 'AE'
          location,              // JSONB with full country name + locality + lat/lng
          chips,
          20 + (i * 5 % 40),    // responseMins between 20-60
        ]
      );
      totalInserted++;
    }

    console.log(`[DONE] ${cityDef.city}`);
  }

  console.log(`\n✅ Seeding complete. Inserted ${totalInserted} new garage records.`);
  await client.end();
}

run().catch(async (err) => {
  console.error('Seeding failed:', err.message);
  await client.end();
  process.exit(1);
});
