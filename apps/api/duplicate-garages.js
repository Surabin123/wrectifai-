const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

const cities = [
  {
    name: 'Hyderabad',
    lat: 17.3850,
    lng: 78.4867,
    localities: ['Gachibowli', 'Madhapur', 'Hitech City', 'Kondapur', 'Kukatpally', 'Miyapur', 'Banjara Hills', 'Jubilee Hills', 'Ameerpet', 'Begumpet', 'Uppal', 'LB Nagar'],
    countryCode: 'IN'
  },
  {
    name: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    localities: ['Bandra', 'Andheri', 'Juhu', 'Powai', 'Colaba', 'Worli', 'Dadar', 'Goregaon', 'Malad', 'Borivali', 'Vile Parle', 'Santacruz'],
    countryCode: 'IN'
  },
  {
    name: 'New York',
    lat: 40.7128,
    lng: -74.0060,
    localities: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Harlem', 'SoHo', 'Tribeca', 'Chelsea', 'Greenwich Village', 'Upper East Side', 'Upper West Side'],
    countryCode: 'US'
  }
];

async function run() {
  await client.connect();
  try {
    const res = await client.query(`SELECT * FROM garages WHERE name != 'AutoFix Pro' ORDER BY created_at ASC LIMIT 12`);
    const baseGarages = res.rows;

    for (const city of cities) {
      console.log(`Duplicating garages for ${city.name}...`);
      await client.query(`DELETE FROM garages WHERE city = $1`, [city.name]);
      
      for (let i = 0; i < baseGarages.length; i++) {
        const bg = baseGarages[i];
        const newId = crypto.randomUUID();
        const locality = city.localities[i % city.localities.length];
        const location = {
          city: city.name,
          locality: locality,
          lat: parseFloat((city.lat + (Math.random() - 0.5) * 0.1).toFixed(4)),
          lng: parseFloat((city.lng + (Math.random() - 0.5) * 0.1).toFixed(4)),
          country: city.name === 'New York' ? 'USA' : 'India'
        };
        
        await client.query(
          `INSERT INTO garages (
            id, owner_user_id, name, address, 
            city, state, postal_code, 
            description, specializations, location, 
            approval_status, starting_price, response_mins, distance_km, 
            rating_avg, rating_count, image, created_at,
            address_line, verification_status, is_approved, country
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21
          )`,
          [
            newId, bg.owner_user_id, bg.name, bg.address,
            city.name, bg.state, bg.postal_code,
            bg.description, bg.specializations, location,
            bg.approval_status, bg.starting_price, bg.response_mins, bg.distance_km,
            bg.rating_avg, bg.rating_count, bg.image,
            bg.address_line, bg.verification_status, bg.is_approved, city.countryCode
          ]
        );
      }
      console.log(`Inserted 12 garages for ${city.name}.`);
    }
  } catch (err) {
    console.error(err);
  }
  await client.end();
}
run();
