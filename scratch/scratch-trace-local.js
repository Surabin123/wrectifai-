const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const ids = ['0af2d3c5-118a-436c-a921-608d08c56934', '2083eef0-e1de-4cc5-9675-e3b93fe4d744'];
    console.log('Querying quotes table for IDs:', ids);
    const quotesRes = await pool.query('SELECT id, quote_request_id, garage_id, details FROM quotes WHERE id = ANY($1)', [ids]);
    console.log('Quotes found in DB:', quotesRes.rows.length);
    console.log(JSON.stringify(quotesRes.rows, null, 2));

    if (quotesRes.rows.length > 0) {
      const qrIds = [...new Set(quotesRes.rows.map(q => q.quote_request_id))];
      console.log('Querying quote_requests for IDs:', qrIds);
      const qrRes = await pool.query('SELECT id, ai_estimate FROM quote_requests WHERE id = ANY($1)', [qrIds]);
      console.log('Quote requests found in DB:', qrRes.rows.length);
      console.log(JSON.stringify(qrRes.rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
