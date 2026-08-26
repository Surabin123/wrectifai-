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

  // Search for the declaration of ep
  // Let's look for something like "ep=" or "ep =" or ",ep="
  const regex = /[^a-zA-Z0-9](ep\s*=\s*)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    console.log(`Found ep= assignment at index: ${match.index}`);
    console.log(content.slice(match.index - 50, match.index + 200));
  }
}

main();
