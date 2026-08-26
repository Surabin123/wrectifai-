const http = require('http');

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
    console.log("1. Logging in as Demo Customer (9876543210) on 3005...");
    const loginRes = await postJSON('http://localhost:3005/api/v1/auth/login', {
      mobileNumber: '9876543210',
      otp: '123456',
      country: 'IN'
    });

    console.log(`Login Status: ${loginRes.statusCode}`);
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) {
      console.error("No Set-Cookie header returned!");
      return;
    }

    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    console.log(`Cookie header: ${cookieHeader}`);

    const qid = '00000000-0000-0000-0000-000000000030';
    console.log(`\n--------------------------------------------`);
    console.log(`2. Fetching estimate for quoteRequestId: ${qid} (city: Bengaluru)`);
    const estRes = await postJSON(`http://localhost:3005/api/v1/quotes/requests/${qid}/estimate`, {
      city: 'Bengaluru'
    }, {
      'Cookie': cookieHeader
    });

    console.log(`HTTP Status: ${estRes.statusCode}`);
    console.log(`Response body: ${estRes.body}`);

  } catch (err) {
    console.error("Error running trace:", err);
  }
}

main();
