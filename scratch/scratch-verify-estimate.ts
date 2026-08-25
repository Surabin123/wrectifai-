import { QuoteEstimationService } from '../apps/api/src/modules/quotes/quote-estimation.service';
import { query } from '../apps/api/src/config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verify() {
  console.log("Starting backend estimate logic verification...");
  const quoteRequestId = '4d1fb9cf-7ad0-4f02-8a3e-6fac24dfac1c';
  
  try {
    // 1. Check if we can select from quote_requests with ai_estimate column
    console.log("1. Querying quote_requests...");
    const reqDetails = await query(
      `SELECT vehicle_id, issue_summary, ai_estimate FROM quote_requests WHERE id = $1`,
      [quoteRequestId]
    );
    console.log("Query response row:", reqDetails.rows[0]);
    
    // 2. Clear ai_estimate for testing to force generation
    console.log("2. Clearing ai_estimate to force generation...");
    await query(`UPDATE quote_requests SET ai_estimate = NULL WHERE id = $1`, [quoteRequestId]);
    
    // 3. Generate estimate
    console.log("3. Calling QuoteEstimationService.generateLocalEstimate...");
    const estimate = await QuoteEstimationService.generateLocalEstimate(quoteRequestId);
    console.log("Estimate generated successfully:", JSON.stringify(estimate, null, 2));
    
    // 4. Verify it was saved to DB
    console.log("4. Verifying saved state in DB...");
    const saved = await query(`SELECT ai_estimate FROM quote_requests WHERE id = $1`, [quoteRequestId]);
    console.log("Saved ai_estimate in DB:", saved.rows[0].ai_estimate);
    
  } catch (err: any) {
    console.error("Verification failed with error:", err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

verify();
