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
  const html = await getUrl('/compare-quotes');
  
  // Extract all JS chunks from the compare-quotes page
  const jsChunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map(m => m[1]);
  
  console.log(`Found ${jsChunks.length} JS chunks. Searching for CheckoutModal (Complete Your Payment)...`);
  
  for (const chunk of jsChunks) {
    const content = await getUrl(chunk);
    if (content.includes('Complete Your Payment') || content.includes('rzp_test_mock123') || content.includes('Razorpay(')) {
      console.log(`\nFound in chunk: ${chunk}`);
      
      const rzpOptionsIndex = content.indexOf('currency:"INR"');
      if (rzpOptionsIndex !== -1) {
        console.log("\nPossible options object in minified code:");
        console.log(content.slice(Math.max(0, rzpOptionsIndex - 150), rzpOptionsIndex + 150));
      }
    }
  }
}

main();
