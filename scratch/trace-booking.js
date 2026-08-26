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

    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    const headers = { 'Cookie': cookieHeader };

    console.log("2. Fetching vehicles & garages...");
    const vehiclesRes = await getJSON(`${API_BASE}/vehicles`, headers);
    const vehiclesBody = JSON.parse(vehiclesRes.body);
    const vehicles = vehiclesBody.data || vehiclesBody;
    const vehicleId = vehicles.length > 0 ? vehicles[0].id : null;

    const garagesRes = await getJSON(`${API_BASE}/garages`, headers);
    const garagesBody = JSON.parse(garagesRes.body);
    const garages = garagesBody.data || garagesBody;
    const garageId = garages.length > 0 ? garages[0].id : null;

    if (!vehicleId || !garageId) {
      console.log("No vehicle or garage found.");
      return;
    }

    console.log(`Using Vehicle ID: ${vehicleId}`);
    console.log(`Using Garage ID: ${garageId}`);

    console.log("\n3. Testing instant booking...");
    const payload = {
      garageId,
      vehicleId,
      scheduledAt: '2026-10-10T10:00:00',
      totalAmount: 1888.9,
      bookingType: 'instant',
      currency: 'INR',
      serviceType: 'Test Service'
    };

    const bookRes = await postJSON(`${API_BASE}/bookings`, payload, headers);
    console.log(`Booking Status: ${bookRes.statusCode}`);
    console.log(`Booking Response Body:\n${bookRes.body}`);

  } catch (err) {
    console.error("Error:", err);
  }
}

main();
