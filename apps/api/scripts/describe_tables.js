require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai' });

pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('quotes', 'bookings')`)
.then(res => console.log(JSON.stringify(res.rows, null, 2)))
.catch(console.error)
.finally(() => pool.end());
