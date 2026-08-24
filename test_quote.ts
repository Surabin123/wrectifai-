import { getDbPool } from './apps/api/src/config/database';

async function test() {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const quoteRequestId = '172f7ca2-374f-4ca9-83b7-c6377cd281b0';
    const garageId = '00000000-0000-0000-0000-000000000101';
    const amount = 1555;
    const quoteCurrency = 'USD';
    const estimatedTime = '1';
    
    await client.query(
      INSERT INTO quote_requests (id, customer_id, garage_id, vehicle_id, issue_summary, status)
      VALUES ($1, '00000000-0000-0000-0000-000000000002', $2, '00000000-0000-0000-0000-000000000011', 'Test', 'pending')
      ON CONFLICT DO NOTHING
    , [quoteRequestId, garageId]);

    const result = await client.query(
      INSERT INTO quotes (quote_request_id, garage_id, amount, currency, status, details, parts_cost, labor_cost, total_cost, eta_note, eta_days, comparison_label)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11)
       RETURNING id,
      [
        quoteRequestId, garageId, amount, quoteCurrency,
        JSON.stringify({ remarks: "test" }),
        Number(765 || 0), Number(790 || 0), amount,
        estimatedTime, parseInt(estimatedTime) || null, 'Standard Quote'
      ]
    );
    console.log("Success! ID:", result.rows[0].id);
  } catch(err) {
    console.error("Error:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}
test();
