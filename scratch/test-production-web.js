const https = require('https');

https.get('https://wrectifai-web.vercel.app/login', (res) => {
  console.log("Status:", res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("HTML length:", data.length);
    console.log("HTML body snippet:", data.substring(0, 1000));
  });
});
