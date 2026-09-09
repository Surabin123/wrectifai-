require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai'
});

async function run() {
  await client.connect();

  console.log('--- FIXING GARAGE PASSWORDS ---');
  const res = await client.query(`
    SELECT u.id, u.email, u.password_hash, u.name, g.id as garage_id, g.name as garage_name
    FROM users u 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    LEFT JOIN garages g ON u.id = g.owner_user_id
    WHERE r.code = 'garage'
  `);
  
  const results = [];

  for (const row of res.rows) {
    if (!row.garage_name) {
       console.log(`Skipping ${row.email} - No associated garage name`);
       continue;
    }

    const firstWord = row.garage_name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    const newPassword = `${firstWord}@123`;
    
    // Determine if it already has a valid hash
    let needsUpdate = false;
    if (!row.password_hash || !row.password_hash.startsWith('$2')) {
      needsUpdate = true;
    } else {
      // It has a valid hash. Is it the demo password we just set, or something else?
      // If it works with the unique password, we skip.
      const isValidUnique = bcrypt.compareSync(newPassword, row.password_hash);
      const isLegacyGarage123 = bcrypt.compareSync('Garage@123', row.password_hash);
      
      if (isValidUnique) {
        console.log(`Skipping ${row.email} - Already uses correct unique password (${newPassword})`);
      } else if (isLegacyGarage123) {
        console.log(`Updating ${row.email} from generic Garage@123 to unique password`);
        needsUpdate = true;
      } else {
        console.log(`Skipping ${row.email} - Has custom valid password`);
      }
    }

    if (needsUpdate) {
      const newHash = bcrypt.hashSync(newPassword, 10);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, row.id]);
      
      // Verify
      const check = await client.query('SELECT password_hash FROM users WHERE id = $1', [row.id]);
      const valid = bcrypt.compareSync(newPassword, check.rows[0].password_hash);
      
      results.push({
        Garage: row.garage_name,
        Email: row.email,
        DemoPassword: newPassword,
        Status: valid ? '✅' : '❌'
      });
    } else {
      // Just for the table, we output the known password if it was the unique one or generic one
      const isValidUnique = row.password_hash && row.password_hash.startsWith('$2') ? bcrypt.compareSync(newPassword, row.password_hash) : false;
      const isGeneric = row.password_hash && row.password_hash.startsWith('$2') ? bcrypt.compareSync('Garage@123', row.password_hash) : false;
      
      results.push({
        Garage: row.garage_name,
        Email: row.email,
        DemoPassword: isValidUnique ? newPassword : (isGeneric ? 'Garage@123' : 'Custom'),
        Status: '✅ (Skipped)'
      });
    }
  }

  console.table(results);
  await client.end();
}

run().catch(console.error);
