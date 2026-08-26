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

async function searchAllChunks() {
  const pages = ['/', '/quotes', '/compare-quotes', '/garages'];
  const allChunks = new Set();
  
  for (const page of pages) {
    const html = await getUrl(page);
    const jsChunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map(m => m[1]);
    jsChunks.forEach(c => allChunks.add(c));
  }
  
  console.log(`Found ${allChunks.size} unique JS chunks to search...`);
  
  for (const chunk of allChunks) {
    const content = await getUrl(chunk);
    
    // Check if it's the checkout modal
    if (content.includes('Complete Your Payment') || content.includes('rzp_test_mock123') || content.includes('payment verification failed')) {
      console.log(`\n>>> FOUND CHECKOUT MODAL in ${chunk} <<<`);
      
      const rzpIndex = content.indexOf('rzp_test_mock123');
      if (rzpIndex !== -1) {
         console.log(`\nFallback key found at index ${rzpIndex}:`);
         console.log(content.slice(Math.max(0, rzpIndex - 100), rzpIndex + 100));
      }
      
      const rzpLiveIndex = content.indexOf('rzp_live_');
      if (rzpLiveIndex !== -1) {
         console.log(`\nLIVE key found at index ${rzpLiveIndex}:`);
         console.log(content.slice(Math.max(0, rzpLiveIndex - 100), rzpLiveIndex + 100));
      }
      
      const rzpTestIndex = content.indexOf('rzp_test_');
      if (rzpTestIndex !== -1 && rzpTestIndex !== rzpIndex) {
         console.log(`\nTEST key found at index ${rzpTestIndex}:`);
         console.log(content.slice(Math.max(0, rzpTestIndex - 100), rzpTestIndex + 100));
      }
    }
  }
}

searchAllChunks();
