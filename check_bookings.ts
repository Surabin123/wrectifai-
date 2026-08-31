import { query } from './apps/api/src/config/database';
query('SELECT column_name FROM information_schema.columns WHERE table_name = \'bookings\'').then(res => console.log(res.rows.map(r=>r.column_name))).catch(console.error).finally(() => process.exit(0));
