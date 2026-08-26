const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});

async function main() {
  await client.connect();
  try {
    console.log("=== ALL QUOTE REQUESTS ===");
    const res = await client.query(`
      SELECT qr.id, qr.issue_summary, qr.status, qr.ai_estimate
      FROM quote_requests qr
      ORDER BY qr.created_at DESC
    `);
    
    for (const row of res.rows) {
      console.log(`\nID: ${row.id}`);
      console.log(`Issue: ${row.issue_summary}`);
      console.log(`Status: ${row.status}`);
      console.log(`AI Estimate: ${JSON.stringify(row.ai_estimate, null, 2)}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
