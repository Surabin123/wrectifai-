const https = require('https');

function getUrl(path) {
  return new Promise((resolve) => {
    https.get('https://wrectifai-web.vercel.app' + path, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', () => { resolve(''); });
  });
}

async function main() {
  const content = await getUrl('/_next/static/chunks/0x.u-5cv-grdm.js');
  if (!content) {
    console.log("Failed to load script");
    return;
  }

  // Find "ep.map" or similar in the file
  const index = content.indexOf('ep.map');
  if (index !== -1) {
    console.log("Found 'ep.map' at index:", index);
    
    // Print 1000 characters before the index to find the assignment of ep
    const start = Math.max(0, index - 1500);
    const end = Math.min(content.length, index + 100);
    console.log("\n=== EP DEFINITION CONTEXT ===");
    console.log(content.slice(start, end));
  }
}

main();
