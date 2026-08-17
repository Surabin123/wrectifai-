const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

const updates = [
  { name: 'SpeedFix Auto Care', lat: 12.9622, lng: 77.5338 }, // Attiguppe
  { name: 'AutoWorks Garage', lat: 13.0031, lng: 77.5643 }, // Malleswaram
  { name: 'Metro Auto Bay', lat: 13.0450, lng: 77.5450 }, // Jalali Cross (Jalahalli Cross)
  { name: 'Royal Motor Service', lat: 13.0963, lng: 77.3962 }, // Nelamangala
  { name: 'PitStop Car Care', lat: 13.0463, lng: 77.4988 }, // Nagasandra
  { name: 'Galaxy Auto Garage', lat: 12.9587, lng: 77.5256 }, // Chandra Layout
  { name: 'TorquePlus Service Hub', lat: 12.9719, lng: 77.5286 }, // Vijayanagar
  { name: 'Five Star Automotive', lat: 12.9755, lng: 77.5065 }, // Nagarbhavi Circle
  { name: 'QuickPit Service Center', lat: 12.9780, lng: 77.5190 }, // Sumanahalli
  { name: 'Prime Service Point', lat: 12.9754, lng: 77.5518 }, // Magadi Road
  { name: 'Urban Garage Works', lat: 13.0031, lng: 77.5643 }, // Malleswaram
  { name: 'CarNest Workshop', lat: 12.9856, lng: 77.5401 } // Basaveshwar Nagar
];

client.connect().then(async () => {
  for (const update of updates) {
    await client.query(`
      UPDATE garages 
      SET location = jsonb_set(
        jsonb_set(location, '{lat}', $1::text::jsonb),
        '{lng}', $2::text::jsonb
      )
      WHERE name = $3 AND city ILIKE 'Bengaluru'
    `, [update.lat.toString(), update.lng.toString(), update.name]);
  }
  console.log('Bengaluru garage coordinates updated to be geographically accurate.');
  client.end();
}).catch(e => { console.error(e.message); client.end(); });
