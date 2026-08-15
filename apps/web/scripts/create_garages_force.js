const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new',
});

async function run() {
  for (let i = 1; i <= 12; i++) {
    const phone = '99999999' + i.toString().padStart(2, '0');
    const name = 'Demo Garage ' + i;
    
    const existing = await pool.query('SELECT id FROM users WHERE mobile_number = $1', [phone]);
    let userId;
    if (existing.rows.length === 0) {
      const userRes = await pool.query(
        "INSERT INTO users (mobile_number, name, email, status) VALUES ($1, $2, $3, 'active') RETURNING id",
        [phone, name + ' Owner', 'garage' + i + '@demo.com']
      );
      userId = userRes.rows[0].id;
    } else {
      userId = existing.rows[0].id;
    }
    
    // Check if garage exists
    const garageRes = await pool.query('SELECT id FROM garages WHERE owner_user_id = $1', [userId]);
    if (garageRes.rows.length === 0) {
      await pool.query(
        "INSERT INTO garages (owner_user_id, name, address, city, location, approval_status, rating_avg, rating_count, starting_price) VALUES ($1, $2, $3, $4, $5, 'approved', 4.5, 100, 100)", 
        [userId, name, '123 Demo St', 'Demo City', JSON.stringify({lat: 0, lng: 0})]
      );
      console.log('Created garage for ' + name);
    }
  }
  pool.end();
}
run();
