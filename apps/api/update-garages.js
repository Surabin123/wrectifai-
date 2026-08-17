const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

const bengaluruLocalities = [
  "Malleswaram",
  "Jalali Cross",
  "Nelamangala",
  "Nagasandra",
  "Chandra Layout",
  "Vijayanagar",
  "Nagarbhavi Circle",
  "Sumanahalli",
  "Attiguppe",
  "Magadi Road",
  "Malleswaram",
  "Basaveshwar Nagar"
];

async function run() {
  await client.connect();
  try {
    const res = await client.query(`SELECT id, name, location FROM garages WHERE name != 'AutoFix Pro' ORDER BY created_at ASC`);
    const garages = res.rows;
    
    for (let i = 0; i < garages.length; i++) {
      const garage = garages[i];
      const locality = bengaluruLocalities[i % bengaluruLocalities.length];
      
      // Bengaluru base coords: 12.9716, 77.5946
      // Add slight offset based on index so they aren't all exactly the same
      const lat = 12.9716 + (i * 0.005) - 0.025;
      const lng = 77.5946 + (i * 0.005) - 0.025;
      
      const newLocation = {
        ...garage.location,
        city: "Bengaluru",
        locality: locality,
        lat: parseFloat(lat.toFixed(4)),
        lng: parseFloat(lng.toFixed(4))
      };
      
      await client.query(
        `UPDATE garages SET city = $1, location = $2 WHERE id = $3`,
        ["Bengaluru", newLocation, garage.id]
      );
      console.log(`Updated ${garage.name} to Bengaluru, ${locality}`);
    }
  } catch (err) {
    console.error(err.message);
  }
  await client.end();
}
run();
