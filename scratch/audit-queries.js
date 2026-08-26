const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function audit() {
  const client = await pool.connect();
  try {
    const paidBookings = await client.query(`
      SELECT b.id, b.status, b.payment_status, b.scheduled_at, b.customer_id, b.garage_id, b.quote_id, p.id as payment_id, p.amount as payment_amount, p.status as payment_record_status
      FROM bookings b
      JOIN payments p ON b.id = p.booking_id
      WHERE p.status = 'succeeded'
      ORDER BY b.created_at DESC
      LIMIT 1
    `);
    
    if (paidBookings.rows.length > 0) {
      console.log('--- LATEST PAID BOOKING ---');
      console.table(paidBookings.rows);
      
      const b = paidBookings.rows[0];
      const qId = b.quote_id;

      if (qId) {
        console.log('\n--- QUOTE RECORD ---');
        const quotes = await client.query(`SELECT id, garage_id, quote_request_id, amount, details, status FROM quotes WHERE id = $1`, [qId]);
        console.table(quotes.rows);

        const qrId = quotes.rows[0]?.quote_request_id;
        if (qrId) {
          console.log('\n--- QUOTE REQUEST RECORD ---');
          const qReq = await client.query(`SELECT id, customer_id, vehicle_id, status, preferred_date, preferred_time FROM quote_requests WHERE id = $1`, [qrId]);
          console.table(qReq.rows);
        }
      }

      console.log('\n--- LOCATIONS ---');
      const uLoc = await client.query(`SELECT city, address_line FROM profiles WHERE user_id = $1`, [b.customer_id]);
      console.log('Customer Location:', uLoc.rows[0]);
      
      const gLoc = await client.query(`SELECT city, address FROM garages WHERE id = $1`, [b.garage_id]);
      console.log('Garage Location:', gLoc.rows[0]);
    } else {
      console.log('No paid bookings found in wrectifai_new database. This means the DB doesn\'t match production state.');
    }
  } finally {
    client.release();
    pool.end();
  }
}
audit();
