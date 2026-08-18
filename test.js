const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:Smruti%4022@localhost:5432/wrectifai' }); 

client.connect().then(() => { 
  const params = ['bengaluru', 'in', 'india']; 
  const sql = 'SELECT g.id, g.name FROM garages g WHERE g.approval_status IN (\'active\', \'approved\') AND (LOWER(g.location->>\'city\') = $1) AND (LOWER(g.location->>\'country\') = $2 OR LOWER(g.location->>\'country\') = $3)'; 
  return client.query(sql, params); 
})
.then(res => { console.log(res.rows); client.end(); })
.catch(console.error);
