const https = require('https');

const scriptUrls = [
  '/_next/static/chunks/16b.pn3o9ao4y.js',
  '/_next/static/chunks/017.z7lyeydwn.js',
  '/_next/static/chunks/0j.rs84x71crn.js',
  '/_next/static/chunks/0m9.3_fb_lo.k.js',
  '/_next/static/chunks/0py70t25sseot.js',
  '/_next/static/chunks/0i_ly.a383fww.js',
  '/_next/static/chunks/10jxklyjs_wns.js',
  '/_next/static/chunks/0x.u-5cv-grdm.js',
  '/_next/static/chunks/0qas._.tr5_-h.js',
  '/_next/static/chunks/0e8j4bs.xw42e.js',
  '/_next/static/chunks/006b07_1lvtkk.js'
];

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
  for (const path of scriptUrls) {
    console.log(`Checking ${path}...`);
    const content = await getUrl(path);
    if (!content) continue;

    // Search for keywords
    if (content.includes('aiBreakupSum')) {
      console.log(`  -> Found 'aiBreakupSum' in ${path}`);
    }
    if (content.includes('minScaled')) {
      console.log(`  -> Found 'minScaled' in ${path}`);
    }
    if (content.includes('partsCost')) {
      console.log(`  -> Found 'partsCost' in ${path}`);
    }
    
    // Let's print matching snippets around these keywords
    const keywords = ['aiBreakupSum', 'minScaled', 'getAiRange', 'Total Estimate', 'partsCost'];
    for (const kw of keywords) {
      let idx = content.indexOf(kw);
      if (idx !== -1) {
        console.log(`\nSnippet for '${kw}' in ${path}:`);
        console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 250)));
      }
    }
  }
}

main();
