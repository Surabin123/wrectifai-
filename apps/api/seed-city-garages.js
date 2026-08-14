const { Client } = require('pg');
require('dotenv').config();

const garagesData = [
  // Koramangala (Bangalore) - 15 garages
  { city: 'Koramangala', name: 'Elite Auto Care Koramangala', price: 999, dist: 1.2 },
  { city: 'Koramangala', name: 'Koramangala Motors', price: 850, dist: 2.1 },
  { city: 'Koramangala', name: 'Speedy Fix Koramangala', price: 1200, dist: 0.8 },
  { city: 'Koramangala', name: 'Bangalore Best Servicing', price: 750, dist: 3.4 },
  { city: 'Koramangala', name: 'Urban Drive Auto', price: 1100, dist: 1.5 },
  { city: 'Koramangala', name: 'Metro Auto Bay', price: 950, dist: 2.8 },
  { city: 'Koramangala', name: 'TrustMechanic Koramangala', price: 1050, dist: 1.1 },
  { city: 'Koramangala', name: 'Prime Motors Bangalore', price: 1300, dist: 4.2 },
  { city: 'Koramangala', name: 'City Auto Spa', price: 600, dist: 2.5 },
  { city: 'Koramangala', name: 'Koramangala Garage Hub', price: 890, dist: 1.8 },
  { city: 'Koramangala', name: 'ProCare Auto', price: 1400, dist: 3.1 },
  { city: 'Koramangala', name: 'NextGen Mechanics', price: 1150, dist: 0.9 },
  { city: 'Koramangala', name: 'Classic Auto Works', price: 800, dist: 2.3 },
  { city: 'Koramangala', name: 'Rapid Repair Koramangala', price: 980, dist: 1.6 },
  { city: 'Koramangala', name: 'Koramangala Wheel & Tire', price: 1250, dist: 2.9 },
  
  // Hyderabad - 5 garages
  { city: 'Hyderabad', name: 'Hitech City Auto Care', price: 1000, dist: 2.0 },
  { city: 'Hyderabad', name: 'Jubilee Hills Motors', price: 1500, dist: 4.5 },
  { city: 'Hyderabad', name: 'Hyderabad Speedy Fix', price: 850, dist: 1.5 },
  { city: 'Hyderabad', name: 'Banjara Auto Spa', price: 1200, dist: 3.2 },
  { city: 'Hyderabad', name: 'Nizam Auto Works', price: 950, dist: 2.8 },

  // New York - 5 garages
  { city: 'New York', name: 'Manhattan Auto Hub', price: 150, dist: 1.2 }, // Note: prices will be formatted in local currency
  { city: 'New York', name: 'Brooklyn Motors', price: 120, dist: 3.5 },
  { city: 'New York', name: 'Queens Repair Shop', price: 90, dist: 5.1 },
  { city: 'New York', name: 'NYC Central Garage', price: 200, dist: 0.8 },
  { city: 'New York', name: 'Empire State Mechanics', price: 180, dist: 2.4 },

  // Dubai - 5 garages
  { city: 'Dubai', name: 'Dubai Marina Motors', price: 300, dist: 2.5 },
  { city: 'Dubai', name: 'Desert Auto Spa', price: 250, dist: 4.0 },
  { city: 'Dubai', name: 'Burj Mechanics', price: 500, dist: 1.1 },
  { city: 'Dubai', name: 'Jumeirah Car Care', price: 400, dist: 3.8 },
  { city: 'Dubai', name: 'Emirates Auto Hub', price: 350, dist: 2.2 },
];

const images = [
  '/assets/garage_1.png',
  '/assets/garage_2.png',
  '/assets/garage_3.png',
  '/assets/garage_4.png',
  '/assets/garage_5.png',
  '/assets/garage_6.png'
];

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Get an owner user ID (use the first user, typically demo/admin)
    const userRes = await client.query('SELECT id FROM users LIMIT 1');
    if (userRes.rowCount === 0) {
      console.log('No users found to assign garages to.');
      return;
    }
    const ownerId = userRes.rows[0].id;

    for (let i = 0; i < garagesData.length; i++) {
      const g = garagesData[i];
      const image = images[i % images.length];
      const rating = (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1);
      const reviewsCount = Math.floor(Math.random() * 200) + 50;
      const responseMins = [30, 45, 60][Math.floor(Math.random() * 3)];
      const specs = ['Warranty', 'Genuine Parts', 'Free Pickup'];

      // Insert garage
      const res = await client.query(`
        INSERT INTO garages (
          owner_user_id, name, address, city, location, specializations, 
          approval_status, rating_avg, rating_count, image, starting_price, 
          distance_km, response_mins
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'approved', $7, $8, $9, $10, $11, $12
        ) RETURNING id
      `, [
        ownerId,
        g.name,
        `${g.name} Address, ${g.city}`,
        g.city,
        JSON.stringify({ lat: 0, lng: 0 }),
        specs,
        rating,
        reviewsCount,
        image,
        g.price,
        g.dist,
        responseMins
      ]);

      const garageId = res.rows[0].id;

      // Insert 2 reviews for dynamic comment threading
      await client.query(`
        INSERT INTO garage_reviews (garage_id, customer_name, rating, text) VALUES
        ($1, 'John D.', 5.0, 'Great service! Highly recommend this place in ' || $2),
        ($1, 'Sarah M.', 4.5, 'Very quick and professional. Would come back.')
      `, [garageId, g.city]);
    }

    console.log('Successfully seeded 30 dynamic garages and reviews!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
