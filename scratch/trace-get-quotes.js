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
    console.log("1. Logging in as Demo Customer (9876543210)...");
    const loginRes = await postJSON('http://localhost:3000/api/v1/auth/login', {
      mobileNumber: '9876543210',
      otp: '123456',
      country: 'IN'
    });

    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) {
      console.error("No Set-Cookie header returned!");
      return;
    }
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');

    console.log("\n2. Fetching GET /api/v1/quotes...");
    const quotesRes = await getJSON('http://localhost:3000/api/v1/quotes', { 'Cookie': cookieHeader });
    console.log(`HTTP Status: ${quotesRes.statusCode}`);
    console.log(`Response: ${quotesRes.body}`);

    console.log("\n3. Fetching GET /api/v1/quotes/requests...");
    const reqsRes = await getJSON('http://localhost:3000/api/v1/quotes/requests', { 'Cookie': cookieHeader });
    console.log(`HTTP Status: ${reqsRes.statusCode}`);
    console.log(`Response: ${reqsRes.body}`);

  } catch (err) {
    console.error("Error:", err);
  }
}

main();
