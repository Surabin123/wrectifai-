const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT g.id, g.name,
        CASE 
          WHEN g.location->>'lat' IS NOT NULL AND g.location->>'lng' IS NOT NULL THEN
            (6371 * acos(
              cos(radians($1)) * cos(radians(CAST(g.location->>'lat' AS NUMERIC))) * 
              cos(radians(CAST(g.location->>'lng' AS NUMERIC)) - radians($2)) + 
              sin(radians($1)) * sin(radians(CAST(g.location->>'lat' AS NUMERIC)))
            ))
          ELSE CAST(g.distance_km AS NUMERIC)
        END as "distanceKm"
      FROM garages g
      WHERE g.approval_status = 'active' AND (LOWER(g.city) = 'mumbai' OR LOWER(g.location->>'city') = 'mumbai')
    `, [12.9716, 77.5946]);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err.message);
  }
  await client.end();
}
run();
