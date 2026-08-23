const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://wrectifai_db_0c7o_user:gxnPqS81YygUaOLxRuPA0uzRulZqrOQV@dpg-da5epsjm8hqs73cemrrg-a.oregon-postgres.render.com/wrectifai_db_0c7o',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query("SELECT id, name FROM garages WHERE name = 'Urban Garage Works'"))
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => client.end());
