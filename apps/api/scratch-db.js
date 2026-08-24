const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});
async function testInsert() {
  const quoteRequestId = 'cd281b02-0000-0000-0000-000000000000'; // dummy for test - will fail FK
  // Use a real quote_request_id and garage_id from the DB
  const qrRes = await pool.query("SELECT id, garage_id FROM quote_requests LIMIT 1");
  if (!qrRes.rows.length) { console.log('No quote requests found'); process.exit(0); }
  
  const quoteRequestIdReal = qrRes.rows[0].id;
  const garageId = qrRes.rows[0].garage_id;
  console.log('Testing with quote_request_id:', quoteRequestIdReal, 'garage_id:', garageId);
  
  // Test the exact INSERT we use
  try {
    const result = await pool.query(
      `INSERT INTO quotes (quote_request_id, garage_id, amount, currency, status, details, parts_cost, labor_cost, total_cost, eta_note, eta_days, comparison_label)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        quoteRequestIdReal,
        garageId,
        1540,
        'USD',
        JSON.stringify({ remarks: 'test', laborCost: 670, partsCost: 870 }),
        870,
        670,
        1540,
        '1 day',
        1,
        'Standard Quote'
      ]
    );
    console.log('SUCCESS! Inserted quote id:', result.rows[0].id);
    // Clean up
    await pool.query('DELETE FROM quotes WHERE id = $1', [result.rows[0].id]);
    console.log('Cleaned up test row');
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error('Detail:', err.detail);
    console.error('Constraint:', err.constraint);
  }
  process.exit(0);
}
testInsert();
