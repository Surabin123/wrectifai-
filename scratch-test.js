require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});
(async () => {
  const result = await pool.query(
    `SELECT details FROM quotes WHERE details->>'consumablesCost' IS NOT NULL`
  );
  console.log("Quotes with consumablesCost:", result.rows.length);
  if (result.rows.length > 0) {
    console.log("Example:", JSON.stringify(result.rows[0].details));
  }
  process.exit(0);
})();
