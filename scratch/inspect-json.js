const http = require('http');

http.get('http://localhost:9229/json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("=== INSPECT JSON ===");
    console.log(data);
  });
}).on('error', (err) => {
  console.error("Error:", err);
});
