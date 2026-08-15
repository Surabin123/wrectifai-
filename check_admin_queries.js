const { Pool } = require('pg');

async function checkQueries() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
  try {
    const b = await pool.query(`SELECT b.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName", b.status, b.created_at as "createdAt",
              b.scheduled_at as "serviceDate", b.total_amount as "totalAmount", COALESCE(b.currency, g.business_currency, 'USD') as "currency",
              v.make as "vehicleMake", v.model as "vehicleModel",
              v.vin as "vin", b.quote_id as "quoteId", q.eta_days as "estimatedDays", qr.issue_summary as "issueDescription", qr.preferred_date as "preferredDate",
              (SELECT status FROM payments p WHERE p.booking_id = b.id ORDER BY p.created_at DESC LIMIT 1) as "paymentStatus"
       FROM bookings b
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN garages g ON b.garage_id = g.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       ORDER BY b.created_at DESC`);
    console.log("Bookings fetched:", b.rows.length);

    const q = await pool.query(`SELECT q.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName", q.amount as "totalAmount",
              COALESCE(q.currency, g.business_currency, 'USD') as "currency",
              q.status, q.created_at as "createdAt", q.eta_days as "estimatedDays",
              v.make as "vehicleMake", v.model as "vehicleModel", v.vin as "vin",
              qr.preferred_date as "preferredDate", qr.issue_summary as "issueDescription"
       FROM quotes q
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN garages g ON q.garage_id = g.id
       ORDER BY q.created_at DESC`);
    console.log("Quotes fetched:", q.rows.length);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
checkQueries();
