require('dotenv').config({path: './apps/api/.env'});
const { QuoteEstimationService } = require('./apps/api/src/modules/quotes/quote-estimation.service');
const { Pool } = require('pg');

async function verify() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query("SELECT id, issue_summary FROM quote_requests WHERE issue_summary ILIKE '%diesel car has poor acceleration%' LIMIT 1");
    if (res.rows.length > 0) {
      console.log('Testing estimate for:', res.rows[0].issue_summary);
      const est = await QuoteEstimationService.generateLocalEstimate(res.rows[0].id, 'Bengaluru');
      console.log('Result:', est);
    } else {
      console.log('No quote request found for diesel test.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

verify();
