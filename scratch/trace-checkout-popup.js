const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

// Helper to make POST request
function postJSON(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    const client = urlObj.protocol === 'https:' ? https : http;
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
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: JSON.parse(data)
      }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Helper to make GET request
function getJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers
    };
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const API_BASE = 'https://wrectifai-api-hafr.onrender.com/api/v1';
  
  try {
    console.log("1. Logging in via API...");
    const loginRes = await postJSON(`${API_BASE}/auth/login`, {
      mobileNumber: '0000000000',
      otp: '123456',
      country: 'IN'
    });
    
    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    const headers = { 'Cookie': cookieHeader };
    
    console.log("2. Fetching vehicles and garages to create a booking...");
    const vehicles = await getJSON(`${API_BASE}/vehicles`, headers);
    const garages = await getJSON(`${API_BASE}/garages`, headers);
    
    const vehicleId = vehicles.data?.[0]?.id || vehicles?.[0]?.id;
    const garageId = garages.data?.[0]?.id || garages?.[0]?.id;
    
    if (!vehicleId || !garageId) {
      throw new Error(`Vehicle or Garage not found. v: ${vehicleId}, g: ${garageId}`);
    }
    
    console.log(`Using Vehicle: ${vehicleId}, Garage: ${garageId}`);
    
    console.log("3. Creating booking to get fresh Razorpay Order ID...");
    const bookingRes = await postJSON(`${API_BASE}/bookings`, {
      garageId,
      vehicleId,
      scheduledAt: '2026-12-12T10:00:00',
      totalAmount: 1888.9,
      bookingType: 'instant',
      currency: 'INR',
      serviceType: 'CDP Testing Service'
    }, headers);
    
    const razorpayOrderId = bookingRes.body.data?.razorpayOrderId;
    if (!razorpayOrderId) {
      throw new Error("Failed to get razorpayOrderId");
    }
    
    console.log("Successfully created Razorpay Order ID:", razorpayOrderId);
    
    // 4. Start Chrome
    console.log("\n4. Starting Chrome in headless mode...");
    const chromeProcess = exec('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless --remote-debugging-port=9222 --disable-gpu --no-sandbox --disable-web-security');
    
    await new Promise(r => setTimeout(r, 2000));
    
    const targets = await getJSON('http://localhost:9222/json/list');
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error("No page target found");
    
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    
    ws.on('open', async () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      
      ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log(`[Browser Console] ${msg.params.type}:`, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
        } else if (msg.method === 'Log.entryAdded') {
          console.log(`[Browser Log] ${msg.params.entry.level}: ${msg.params.entry.text}`);
        }
      });
      
      console.log("Navigating to frontend site...");
      ws.send(JSON.stringify({ id: 10, method: 'Page.navigate', params: { url: 'https://wrectifai-web.vercel.app/' } }));
      
      await new Promise(r => setTimeout(r, 4000));
      
      console.log("Injecting Razorpay checkout script and triggering payment flow...");
      const evalJs = `
        (async () => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise((resolve) => {
            script.onload = () => resolve();
            script.onerror = () => resolve();
          });
          
          if (typeof window.Razorpay === 'undefined') {
            console.error("Razorpay is not defined on window!");
            return;
          }
          
          const options = {
            key: 'rzp_test_TU3EDqU2vO75hO',
            amount: 188890,
            currency: 'INR',
            name: 'WrectifAI Services',
            description: 'Payment for Booking',
            order_id: '${razorpayOrderId}',
            handler: function (response) {
              console.log("Payment success handler reached:", response);
            },
            prefill: {
              name: 'Customer',
              email: 'customer@wrectifai.com',
              contact: '9999999999'
            },
            theme: {
              color: '#2563EB'
            }
          };
          
          try {
            const rzp = new window.Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
              console.error("payment.failed event emitted:", response.error);
            });
            
            console.log("Calling rzp.open()...");
            rzp.open();
            
            // Wait 2 seconds and check DOM for Razorpay elements/iframes
            await new Promise(r => setTimeout(r, 2000));
            
            const iframes = Array.from(document.querySelectorAll('iframe'));
            console.log("Number of iframes in document:", iframes.length);
            iframes.forEach((f, idx) => {
              console.log("Iframe " + idx + " src:", f.src);
            });
            
            // Also print any elements with class containing razorpay
            const rzElements = document.querySelectorAll('[class*="razorpay"], [id*="razorpay"]');
            console.log("Razorpay DOM elements found:", rzElements.length);
            
          } catch (e) {
            console.error("Failed to initialize or open Razorpay:", e.message);
          }
        })();
      `;
      
      ws.send(JSON.stringify({ id: 11, method: 'Runtime.evaluate', params: { expression: evalJs } }));
      
      await new Promise(r => setTimeout(r, 6000));
      console.log("Shutting down Chrome...");
      chromeProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
