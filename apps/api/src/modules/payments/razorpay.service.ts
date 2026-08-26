import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getEnv } from '../../config/env';

const env = getEnv();

// Initialize Razorpay conditionally so tests don't crash if keys are missing
export const razorpayInstance = new Razorpay({
  key_id: env.groqApiKey || 'rzp_test_mock123', // We use dummy default if not set for safety
  key_secret: env.jwtSecret || 'mock_secret_key', 
});

// Since the user might not have set real Razorpay keys in env yet,
// we wrap this to avoid throwing on boot.
let razorpayClient: Razorpay;
try {
  // In a real app we'd load RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
  // Assuming they are in process.env
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock123',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
  });
} catch (err) {
  console.warn('Razorpay keys not configured fully.');
}

/**
 * Validates a Razorpay webhook signature.
 * @param webhookBody The raw JSON string of the webhook body.
 * @param signature The x-razorpay-signature header.
 * @param secret The webhook secret configured in Razorpay Dashboard.
 */
export function verifyWebhookSignature(webhookBody: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex');
    return expectedSignature === signature;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a standard Razorpay Order.
 */
export async function createRazorpayOrder(amountInPaise: number, receiptId: string, notes: any = {}) {
  try {
    const options = {
      amount: amountInPaise, 
      currency: "INR",
      receipt: receiptId,
      notes,
      payment_capture: 1 // Auto-capture
    };
    
    return await razorpayClient.orders.create(options);
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw new Error('Failed to create payment order.');
  }
}

/**
 * Issues a refund for a previously captured Razorpay payment.
 */
export async function issueRazorpayRefund(paymentId: string, amountInPaise?: number) {
  try {
    const options = amountInPaise ? { amount: amountInPaise } : {};
    return await razorpayClient.payments.refund(paymentId, options);
  } catch (error) {
    console.error('Razorpay refund failed:', error);
    throw new Error('Failed to initiate refund.');
  }
}
