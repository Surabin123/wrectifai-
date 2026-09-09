import { query } from '../config/database';

async function run() {
  try {
    const targetTables = [
      'users', 'user_roles', 'roles', 'profiles', // User & Authentication
      'refresh_tokens', 'login_activity', 'otp_challenges', 'password_resets', // Auth
      'vehicles', 'vehicle_images_cache', // Vehicle
      'garages', 'services', 'garage_services', // Garage & Service
      'bookings', 'orders', 'order_items' // Booking & Order
      // 'address', 'country', 'currency' -> might be embedded in JSON columns, let's check
    ];
    
    for (const table of targetTables) {
      console.log(`\n=== Table: ${table} ===`);
      const res = await query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      console.log(res.rows.map(r => `  ${r.column_name}: ${r.data_type} ${r.character_maximum_length ? '('+r.character_maximum_length+')' : ''} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`).join('\n'));
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
