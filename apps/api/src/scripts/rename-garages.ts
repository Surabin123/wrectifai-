import { query } from '../config/database';

async function run() {
  const names = [
    'Metro Auto Bay',
    'Speed Motors',
    'Elite Garage',
    'Star Auto Care',
    'Prime Mechanics',
    'Ultimate Auto',
    'Pro Fix Garage',
    'Apex Motors',
    'City Garage',
    'Trust Auto',
    'Quick Fix Motors',
    'Auto Care Pro'
  ];
  for (let i = 1; i <= 12; i++) {
    const phone = '99999999' + i.toString().padStart(2, '0');
    const name = names[i-1];
    
    const userRes = await query('SELECT id FROM users WHERE mobile_number = $1', [phone]);
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;
      await query('UPDATE garages SET name = $1 WHERE owner_user_id = $2', [name, userId]);
      console.log('Renamed to ' + name + ' for phone ' + phone);
    }
  }
  process.exit(0);
}
run();
