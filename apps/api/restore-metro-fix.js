const { Client } = require('pg');
const client = new Client('postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new');
client.connect().then(async () => {
  const q = `INSERT INTO garages (id, owner_user_id, name, address, location, specializations, certifications, pickup_drop_supported, approval_status, rating_avg, rating_count, created_at, updated_at, starting_price, distance_km, image, response_mins, city, is_approved) 
  VALUES ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000003', 'Metro Auto Bay', 'Hitech City, Hyderabad', '{"lat": 17.4435, "lng": 78.3772}', '{"Free Inspection","Warranty Available","Free Pickup","Quick Service"}', '{"ISO 9001"}', true, 'active', 4.70, 142, '2026-07-22 13:38:54.357753+05:30', '2026-07-22 13:38:54.472344+05:30', 'Starting ₹549', '2.8 km', '/assets/garage_4_1778071611328.png', 25, 'Hyderabad', true) 
  ON CONFLICT (id) DO NOTHING RETURNING id`;
  const u = await client.query(q);
  console.log('Restored:', u.rows);
  client.end();
}).catch(console.error);
