const https = require('https');

function getUrl(path) {
  return new Promise((resolve, reject) => {
    https.get('https://wrectifai-web.vercel.app' + path, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', reject);
  });
}

async function main() {
  const html = await getUrl('/');
  
  // Extract all JS chunks
  const jsChunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map(m => m[1]);
  
  console.log(`Found ${jsChunks.length} JS chunks. Searching for CheckoutModal (Complete Your Payment)...`);
  
  for (const chunk of jsChunks) {
    const content = await getUrl(chunk);
    if (content.includes('Complete Your Payment') || content.includes('rzp_test_mock123')) {
      console.log(`\nFound in chunk: ${chunk}`);
      
      const rzpIndex = content.indexOf('rzp_test_mock123');
      if (rzpIndex !== -1) {
        console.log(`\nRazorpay Key fallback found at index ${rzpIndex}:`);
        console.log(content.slice(Math.max(0, rzpIndex - 150), rzpIndex + 150));
      }
      
      const rzpOptionsIndex = content.indexOf('key:');
      if (rzpOptionsIndex !== -1 && content.includes('order_id')) {
        // Try to find the options object
        console.log("\nPossible options object in minified code:");
        const idx = content.indexOf('handler:');
        if (idx !== -1) {
           console.log(content.slice(Math.max(0, idx - 200), idx + 200));
        }
      }
    }
  }
}

main();
