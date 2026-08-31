import { query } from './apps/api/src/config/database';

async function test() {
  const qr = await query('SELECT COUNT(*), garage_id, status FROM quote_requests GROUP BY garage_id, status');
  console.log('quote_requests:', qr.rows);
  
  const b = await query('SELECT COUNT(*), garage_id, status FROM bookings GROUP BY garage_id, status');
  console.log('bookings:', b.rows);
  
  const q = await query('SELECT COUNT(*), garage_id, status FROM quotes GROUP BY garage_id, status');
  console.log('quotes:', q.rows);
  
  process.exit(0);
}

test();
