const https = require('https');

function postJSON(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => { reject(e); });
    req.write(postData);
    req.end();
  });
}

function getJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => { reject(e); });
    req.end();
  });
}

async function main() {
  const API_BASE = 'https://wrectifai-api-hafr.onrender.com/api/v1';
  try {
    console.log("1. Logging in as Admin on production...");
    const loginRes = await postJSON(`${API_BASE}/auth/login`, {
      mobileNumber: '0000000000',
      otp: '123456',
      country: 'IN'
    });

    console.log(`Login Status: ${loginRes.statusCode}`);
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) {
      console.error("No Set-Cookie header returned!");
      console.log("Body:", loginRes.body);
      return;
    }
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    const headers = { 'Cookie': cookieHeader };

    console.log("\n2. Fetching quotes as admin...");
    const quotesRes = await getJSON(`${API_BASE}/quotes`, headers);
    console.log(`Quotes Fetch Status: ${quotesRes.statusCode}`);
    
    let quotes = [];
    try {
      const parsed = JSON.parse(quotesRes.body);
      quotes = parsed.data || parsed;
    } catch (e) {
      console.error("Failed to parse quotes body:", quotesRes.body);
      return;
    }

    console.log(`Found ${quotes.length} quotes on production.`);
    
    // Search for quote IDs from URL: 0af2d3c5-118a-436c-a921-608d08c56934 or 2083eef0-e1de-4cc5-9675-e3b93fe4d744
    const targetQuoteIds = ['0af2d3c5-118a-436c-a921-608d08c56934', '2083eef0-e1de-4cc5-9675-e3b93fe4d744'];
    const matchedQuotes = quotes.filter(q => targetQuoteIds.includes(q.id));
    console.log("\nMatched Quotes:");
    console.log(JSON.stringify(matchedQuotes, null, 2));

    let quoteRequestId = null;
    if (matchedQuotes.length > 0) {
      quoteRequestId = matchedQuotes[0].quoteRequestId || matchedQuotes[0].quote_request_id;
    }
    
    if (!quoteRequestId && quotes.length > 0) {
      console.log("Could not find matching quote in user's list. Using first available quote's request ID.");
      quoteRequestId = quotes[0].quoteRequestId || quotes[0].quote_request_id;
    }

    if (!quoteRequestId) {
      console.error("No quote request ID found!");
      return;
    }

    console.log(`\nUsing quoteRequestId: ${quoteRequestId}`);

    console.log(`\n3. Fetching AI Estimate from production...`);
    const estRes = await postJSON(`${API_BASE}/quotes/requests/${quoteRequestId}/estimate`, {
      city: 'Bengaluru'
    }, headers);

    console.log(`Estimate HTTP Status: ${estRes.statusCode}`);
    console.log(`Raw Estimate Response Body:\n${estRes.body}`);

  } catch (err) {
    console.error("Error in script execution:", err);
  }
}

main();
