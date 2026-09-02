import { query } from './apps/api/src/config/database';

async function main() {
  try {
    console.log('Querying garages...');
    const result = await query('SELECT * FROM garages LIMIT 2');
    console.log(result.rows);
    
    if (result.rows.length > 0) {
       const garageId = result.rows[0].id;
       console.log('Fetching services for garage:', garageId);
       const services = await query('SELECT * FROM services WHERE garage_id = ', [garageId]);
       console.log('Services:', services.rows);
       
       console.log('Fetching inventory for garage:', garageId);
       const inventory = await query('SELECT * FROM garage_inventory WHERE garage_id = ', [garageId]);
       console.log('Inventory:', inventory.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
