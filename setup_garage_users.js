const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Smruti%4022@localhost:5432/wrectifai_new',
});

const DEFAULT_DUMMY_GARAGE_USER = '00000000-0000-0000-0000-000000000003';
// Password: Garage@123
const DEFAULT_HASH = '$2b$10$Ts4mFbOYBqelIgnQWdc2cOFXAExrH2iTcr9kl2zhupGzx0SaCQ8ZW';

async function main() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    await client.query('BEGIN');
    
    // Get garage role ID
    const roleRes = await client.query("SELECT id FROM roles WHERE code = 'garage'");
    if (roleRes.rows.length === 0) throw new Error("Garage role not found");
    const roleId = roleRes.rows[0].id;

    // Get all garages
    const garages = await client.query('SELECT id, name, owner_user_id FROM garages ORDER BY created_at');
    console.log(`Found ${garages.rows.length} garages.`);

    for (let i = 0; i < garages.rows.length; i++) {
      const garage = garages.rows[i];
      if (!garage.owner_user_id || garage.owner_user_id === DEFAULT_DUMMY_GARAGE_USER) {
        console.log(`Processing garage: ${garage.name}`);
        
        // Create user name and email based on garage name
        const prefix = garage.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `${prefix}@wrectifai.com`;
        const mobile = `99999999${(i + 1).toString().padStart(2, '0')}`; // e.g., 9999999901
        
        console.log(`  -> Creating user: ${email} (${mobile})`);
        
        // Check if user with email already exists
        const existingUserRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        let userId;
        
        if (existingUserRes.rows.length > 0) {
          console.log(`  -> User ${email} already exists, reusing.`);
          userId = existingUserRes.rows[0].id;
        } else {
          // Insert new user
          const insertUserRes = await client.query(
            `INSERT INTO users (name, email, password_hash, mobile_number, status) 
             VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
            [garage.name, email, DEFAULT_HASH, mobile]
          );
          userId = insertUserRes.rows[0].id;
          
          // Map to role
          await client.query(
            `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, roleId]
          );
        }
        
        // Update garage owner
        await client.query('UPDATE garages SET owner_user_id = $1 WHERE id = $2', [userId, garage.id]);
        console.log(`  -> Mapped garage to user ${userId}`);
      } else {
        console.log(`Garage ${garage.name} already has a specific owner (${garage.owner_user_id}). Skipping.`);
      }
    }

    await client.query('COMMIT');
    console.log('Database setup complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during setup:', err);
  } finally {
    await client.end();
  }
}

main();
