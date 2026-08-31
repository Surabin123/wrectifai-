import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../apps/api/.env') });

import { query } from '../apps/api/src/config/database';

async function test() {
  try {
    const qr = await query('SELECT COUNT(*), garage_id, status FROM quote_requests GROUP BY garage_id, status');
    console.log('quote_requests:', qr.rows);
    
    const b = await query('SELECT COUNT(*), garage_id, status FROM bookings GROUP BY garage_id, status');
    console.log('bookings:', b.rows);
    
    const q = await query('SELECT COUNT(*), garage_id, status FROM quotes GROUP BY garage_id, status');
    console.log('quotes:', q.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
