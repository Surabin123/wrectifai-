require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai' });

pool.query(`
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, (SELECT id FROM roles WHERE code = 'user')
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  WHERE ur.role_id IS NULL
`)
.then(res => console.log('Fixed users:', res.rowCount))
.catch(console.error)
.finally(() => pool.end());
