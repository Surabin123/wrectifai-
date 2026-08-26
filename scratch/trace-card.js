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

  // Find "WrectifAI Estimated" in the file
  const index = content.indexOf('WrectifAI Estimated');
  if (index !== -1) {
    console.log("Found 'WrectifAI Estimated' at index:", index);
    
    // Print 1500 characters after the index to see how it renders the estimate
    const start = Math.max(0, index - 200);
    const end = Math.min(content.length, index + 1500);
    console.log("\n=== CARD RENDERING CONTEXT ===");
    console.log(content.slice(start, end));
  } else {
    // Try other spellings/cases if not found
    const index2 = content.indexOf('Wrectfai');
    if (index2 !== -1) {
      console.log("Found 'Wrectfai' at index:", index2);
      console.log(content.slice(index2 - 200, index2 + 1000));
    }
  }
}

main();
