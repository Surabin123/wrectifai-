const https = require('https');

async function testRazorpayAPI() {
  const payload = JSON.stringify({
    amount: 188890,
    currency: "INR",
    receipt: "uuid-1234-5678-9012",
    notes: {
      bookingId: "uuid-1234-5678-9012",
      customerId: "cust-1234-5678"
    },
    payment_capture: 1
  });

  const options = {
    hostname: 'api.razorpay.com',
    port: 443,
    path: '/v1/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
      // We will use dummy auth. Razorpay will return 401 if it reaches auth,
      // but if the payload schema is invalid, it might return 400 first before auth.
      // Let's see what it returns.
      'Authorization': 'Basic ' + Buffer.from('rzp_test_mock123:mock_secret').toString('base64')
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
  });

  req.write(payload);
  req.end();
}

testRazorpayAPI();
