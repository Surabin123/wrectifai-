import { query } from './apps/api/src/config/database';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkIndex() {
  try {
    const res = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'vehicle_service_history';
    `);
    console.log("Indexes on vehicle_service_history:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkIndex();
