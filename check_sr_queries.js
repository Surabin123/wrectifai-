const { Pool } = require('pg');

async function checkQueries() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
  try {
    const sr = await pool.query(`SELECT DISTINCT ON (qr.created_at) qr.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName", 
              v.make as "vehicleMake", v.model as "vehicleModel", v.vin as "vin", qr.preferred_date as "preferredDate",
              COALESCE(
                qr.issue_summary,
                NULLIF((SELECT string_agg(i->>'title', ', ') FROM diagnosis_results dres, jsonb_array_elements(dres.issues) i WHERE dres.diagnosis_request_id = qr.diagnosis_request_id), ''),
                NULLIF((SELECT symptom_text FROM diagnosis_requests dr WHERE dr.id = qr.diagnosis_request_id), ''),
                'General Service'
              ) as "details", qr.status, qr.created_at as "createdAt"
       FROM quote_requests qr
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN garages g ON qr.garage_id = g.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       ORDER BY qr.created_at DESC`);
    console.log("Service Requests fetched:", sr.rows.length);
  } catch(e) {
    console.error("Service request error: ", e.message);
  } finally {
    pool.end();
  }
}
checkQueries();
