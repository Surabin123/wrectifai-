const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new',
});

// Assign proper cities to demo garages so the city filter works end-to-end
const cityAssignments = [
  { name: 'Demo Garage 1',  city: 'Bengaluru', address: 'Koramangala, Bengaluru' },
  { name: 'Demo Garage 2',  city: 'Bengaluru', address: 'Indiranagar, Bengaluru' },
  { name: 'Demo Garage 3',  city: 'Bengaluru', address: 'Whitefield, Bengaluru' },
  { name: 'Demo Garage 4',  city: 'Bengaluru', address: 'Jayanagar, Bengaluru' },
  { name: 'Demo Garage 5',  city: 'Hyderabad', address: 'Hitech City, Hyderabad' },
  { name: 'Demo Garage 6',  city: 'Hyderabad', address: 'Banjara Hills, Hyderabad' },
  { name: 'Demo Garage 7',  city: 'Mumbai',    address: 'Andheri West, Mumbai' },
  { name: 'Demo Garage 8',  city: 'Mumbai',    address: 'Bandra, Mumbai' },
  { name: 'Demo Garage 9',  city: 'Chennai',   address: 'Anna Nagar, Chennai' },
  { name: 'Demo Garage 10', city: 'Chennai',   address: 'T. Nagar, Chennai' },
  { name: 'Demo Garage 11', city: 'Delhi',     address: 'Connaught Place, Delhi' },
  { name: 'Demo Garage 12', city: 'Delhi',     address: 'Lajpat Nagar, Delhi' },
];

async function run() {
  for (const g of cityAssignments) {
    const res = await pool.query(
      "UPDATE garages SET city = $1, address = $2 WHERE name = $3",
      [g.city, g.address, g.name]
    );
    console.log(`Updated ${g.name} -> city: ${g.city} (${res.rowCount} row)`);
  }
  pool.end();
}

run().catch(console.error);
