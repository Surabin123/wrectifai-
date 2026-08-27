import { config } from 'dotenv';
config({ path: './apps/api/.env' });
import { QuoteEstimationService } from './apps/api/src/modules/quotes/quote-estimation.service';
import { query } from './apps/api/src/config/database';

async function verify() {
  try {
    const res = await query("SELECT id, issue_summary FROM quote_requests WHERE issue_summary ILIKE '%diesel car has poor acceleration%' LIMIT 1");
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
    process.exit(0);
  }
}

verify();
