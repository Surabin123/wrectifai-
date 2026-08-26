const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data.slice(0, 200)
          });
        }
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function check() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Checking Render endpoints...`);
  
  const health = await fetchJson('https://wrectifai-api.onrender.com/api/v1/health');
  console.log("Health Status:", JSON.stringify(health));

  const debug = await fetchJson('https://wrectifai-api.onrender.com/api/v1/debug-schema');
  if (debug.statusCode === 200) {
    console.log("SUCCESS: Debug schema route is LIVE! Deployment complete.");
    console.log("Debug Response:", JSON.stringify(debug.data));
    return true;
  } else {
    console.log(`Debug Schema Route: Status ${debug.statusCode || 'ERROR'} (Still running old deployment)`);
    return false;
  }
}

async function main() {
  const maxAttempts = 25;
  const intervalMs = 15000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`--- Attempt ${attempt}/${maxAttempts} ---`);
    const isLive = await check();
    if (isLive) {
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  
  console.log("Timeout waiting for Render deployment to complete.");
  process.exit(1);
}

main();
