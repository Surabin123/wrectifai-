require('dotenv').config({ path: 'apps/api/.env' });
const Razorpay = require('razorpay');

async function testRazorpay() {
  const amountInPaise = Math.round(1888.9 * 100);
  const receiptId = 'uuid-1234-5678-9012'.substring(0, 40);
  const notes = {
    bookingId: 'uuid-1234-5678-9012',
    customerId: 'cust-1234-5678'
  };

  const razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock123',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
  });

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: receiptId,
    notes,
    payment_capture: 1
  };

  console.log("Sending options:", options);
  
  try {
    const order = await razorpayClient.orders.create(options);
    console.log("Order created successfully:", order);
  } catch (error) {
    console.error("Razorpay error:");
    console.error(JSON.stringify(error, null, 2));
    if (error.error) console.error("Message:", error.error.description);
  }
}

testRazorpay();
