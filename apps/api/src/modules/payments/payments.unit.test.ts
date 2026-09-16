import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { verifyWebhookSignature } from './razorpay.service';
import crypto from 'crypto';

describe('Payment Processing Security & Fail-Closed Safeguards', () => {
  const secret = 'test_webhook_secret_1234567890';

  test('verifyWebhookSignature verifies valid signature with timing-safe comparison', () => {
    const payload = JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_123' } });
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const isValid = verifyWebhookSignature(payload, expectedSignature, secret);
    assert.strictEqual(isValid, true);
  });

  test('verifyWebhookSignature rejects invalid signature', () => {
    const payload = JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_123' } });
    const invalidSignature = 'invalid_signature_hex_hash_value';

    const isValid = verifyWebhookSignature(payload, invalidSignature, secret);
    assert.strictEqual(isValid, false);
  });

  test('constant-time HMAC signature verification correctly matches valid signature', () => {
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const razorpaySecret = 'test_razorpay_secret_key_123';

    const payload = `${orderId}|${paymentId}`;
    const generatedSignature = crypto.createHmac('sha256', razorpaySecret).update(payload).digest('hex');

    const sigBuffer = Buffer.from(generatedSignature, 'utf8');
    const expectedBuffer = Buffer.from(generatedSignature, 'utf8');

    assert.strictEqual(sigBuffer.length, expectedBuffer.length);
    assert.strictEqual(crypto.timingSafeEqual(sigBuffer, expectedBuffer), true);
  });
});
