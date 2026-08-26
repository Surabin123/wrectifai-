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

  // Find id="price-breakup" in the file
  const index = content.indexOf('id:"price-breakup"');
  if (index !== -1) {
    console.log("Found 'id:\"price-breakup\"' at index:", index);
    
    // Print 3000 characters after the index to see how the table rows are mapped and rendered
    const start = Math.max(0, index - 200);
    const end = Math.min(content.length, index + 2500);
    console.log("\n=== TABLE RENDERING CONTEXT ===");
    console.log(content.slice(start, end));
  } else {
    console.log("Not found with exactly id:\"price-breakup\", trying case-insensitive search or just 'price-breakup'");
    const idx2 = content.indexOf('price-breakup');
    if (idx2 !== -1) {
      console.log("Found 'price-breakup' at index:", idx2);
      console.log(content.slice(idx2 - 200, idx2 + 1000));
    }
  }
}

main();
