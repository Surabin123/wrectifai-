const https = require('https');
https.get('https://wrectifai-web.vercel.app', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    const scripts = [...data.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    console.log('Scripts:', scripts.filter(s => s.includes('_next')));
    
    scripts.filter(s => s.includes('_next/static/chunks/')).forEach(s => {
      const url = 'https://wrectifai-web.vercel.app' + (s.startsWith('/') ? s : '/' + s);
      https.get(url, (rs) => {
        let d = '';
        rs.on('data', c => d+=c);
        rs.on('end', () => {
          if (d.includes('rzp_test_') || d.includes('rzp_live_')) {
            const matches = d.match(/rzp_(test|live)_[a-zA-Z0-9]+/g);
            console.log('Found key in', s, ':', matches);
          }
        });
      });
    });
  });
});
