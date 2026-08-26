const https = require('https');

function checkURL(url) {
  return new Promise((resolve) => {
    console.log(`Checking: ${url} ...`);
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          headers: res.headers,
          body: data.slice(0, 500)
        });
      });
    }).on('error', (err) => {
      resolve({
        url,
        error: err.message
      });
    });
  });
}

async function main() {
  const urls = [
    'https://wrectifai-api.onrender.com/api/v1/health',
    'https://wrectifai-api.vercel.app/api/v1/health',
    'https://wrectifai-api.onrender.com/api/v1/debug-schema',
    'https://wrectifai-api.vercel.app/api/v1/debug-schema'
  ];

  for (const url of urls) {
    const result = await checkURL(url);
    console.log(JSON.stringify(result, null, 2));
    console.log("-----------------------------------------");
  }
}

main();
