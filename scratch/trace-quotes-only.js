const http = require('http');

function getJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

function postJSON(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    const loginRes = await postJSON('http://localhost:3000/api/v1/auth/login', {
      mobileNumber: '8431773189',
      otp: '123456',
      country: 'IN'
    });
    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');

    const quotesRes = await getJSON('http://localhost:3000/api/v1/quotes', { 'Cookie': cookieHeader });
    const quotes = JSON.parse(quotesRes.body).data;
    console.log("=== QUOTES FOR 8431773189 ===");
    console.log(JSON.stringify(quotes, null, 2));

  } catch (err) {
    console.error("Error:", err);
  }
}

main();
