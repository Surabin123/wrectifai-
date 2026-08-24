require('dotenv').config();
import { query } from './apps/api/src/config/database';

async function check() {
  try {
    const res = await query('SELECT id, ai_estimate FROM quote_requests WHERE ai_estimate IS NOT NULL ORDER BY created_at DESC LIMIT 5');
    console.log("With ai_estimate:", res.rows);
    
    const res2 = await query('SELECT id FROM quote_requests ORDER BY created_at DESC LIMIT 1');
    console.log("Latest request:", res2.rows);
  } catch (e) {
    console.error(e);
  }
}
check();
