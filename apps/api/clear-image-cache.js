const { Client } = require('pg');
const client = new Client('postgresql://postgres:Smruti%4022@localhost:5432/wrectifai_new');
client.connect().then(() => {
  client.query("DELETE FROM vehicle_images_cache")
    .then(res => {
      console.log('Cleared cache');
      client.end();
    })
    .catch(err => {
      console.error(err);
      client.end();
    });
});
