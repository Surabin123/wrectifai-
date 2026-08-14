const { query } = require('./apps/api/src/config/database');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('Connected to DB');
    
    const sqlPath = path.join(__dirname, 'apps', 'api', 'src', 'db', 'migrations', '002_add_global_localization.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await query(sql);
    console.log('Migration 002 applied successfully');
    
    // Seed existing garages based on address clues
    const res = await query(`SELECT id, address, name FROM garages`);
    for (const garage of res.rows) {
        let country = 'US';
        let currency = 'USD';
        let locale = 'en-US';
        
        const text = (garage.address + ' ' + garage.name).toLowerCase();
        if (text.includes('india') || text.includes('hyderabad') || text.includes('bengaluru') || text.includes('mumbai') || text.includes('delhi')) {
            country = 'IN';
            currency = 'INR';
            locale = 'en-IN';
        } else if (text.includes('uae') || text.includes('dubai') || text.includes('abu dhabi')) {
            country = 'AE';
            currency = 'AED';
            locale = 'ar-AE';
        } else if (text.includes('japan') || text.includes('tokyo')) {
            country = 'JP';
            currency = 'JPY';
            locale = 'ja-JP';
        } else if (text.includes('uk') || text.includes('london')) {
            country = 'GB';
            currency = 'GBP';
            locale = 'en-GB';
        }
        
        await query(`UPDATE garages SET country = $1, business_currency = $2, locale = $3 WHERE id = $4`, [country, currency, locale, garage.id]);
    }
    console.log('Seeded existing garages successfully');

  } catch (err) {
    console.error('Error applying migration', err);
  } finally {
    process.exit(0);
  }
}

run();
