const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai' });

async function run() {
  try {
    // Get all tables and columns
    const tablesRes = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('character varying', 'text', 'jsonb', 'json')
    `);

    console.log(`Searching across ${tablesRes.rows.length} columns...`);

    for (const row of tablesRes.rows) {
      const { table_name, column_name, data_type } = row;
      try {
        let queryStr;
        if (data_type.startsWith('json')) {
          queryStr = `SELECT id FROM "${table_name}" WHERE "${column_name}"::text ILIKE '%Dzire%' OR "${column_name}"::text ILIKE '%A12345%' LIMIT 5`;
        } else {
          queryStr = `SELECT id FROM "${table_name}" WHERE "${column_name}" ILIKE '%Dzire%' OR "${column_name}" ILIKE '%A12345%' LIMIT 5`;
        }
        const match = await pool.query(queryStr);
        if (match.rows.length > 0) {
          console.log(`MATCH FOUND in table [${table_name}], column [${column_name}] (Type: ${data_type}):`, match.rows);
          // Let's fetch the full matching rows
          const ids = match.rows.map(r => r.id);
          const fullRows = await pool.query(`SELECT * FROM "${table_name}" WHERE id = ANY($1)`, [ids]);
          console.log("Details:", JSON.stringify(fullRows.rows, null, 2));
        }
      } catch (err) {
        // Some tables might not have an "id" column, that's fine, ignore or handle it
        try {
          let queryStr;
          if (data_type.startsWith('json')) {
            queryStr = `SELECT * FROM "${table_name}" WHERE "${column_name}"::text ILIKE '%Dzire%' OR "${column_name}"::text ILIKE '%A12345%' LIMIT 5`;
          } else {
            queryStr = `SELECT * FROM "${table_name}" WHERE "${column_name}" ILIKE '%Dzire%' OR "${column_name}" ILIKE '%A12345%' LIMIT 5`;
          }
          const match = await pool.query(queryStr);
          if (match.rows.length > 0) {
            console.log(`MATCH FOUND in table [${table_name}] (no id column), column [${column_name}] (Type: ${data_type}):`);
            console.log("Details:", JSON.stringify(match.rows, null, 2));
          }
        } catch (e) {
          // Ignore table errors
        }
      }
    }
    console.log("Search finished.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
