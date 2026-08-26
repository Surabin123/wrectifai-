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

  // Find Total Estimate label in the file
  const index = content.indexOf('Total Estimate');
  if (index !== -1) {
    console.log("Found 'Total Estimate' at index:", index);
    
    // Print 3000 characters before and after to get full context of the function
    const start = Math.max(0, index - 2000);
    const end = Math.min(content.length, index + 2000);
    console.log("\n=== CONTEXT ===");
    console.log(content.slice(start, end));
  }
}

main();
