import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationReference } from './notification-navigation';

test('notification navigation parses hidden booking and quote references', () => {
  assert.deepEqual(getNotificationReference({ type: 'Booking', description: 'Vehicle ready. [ID:booking-123]' }), { type: 'booking', id: 'booking-123' });
  assert.deepEqual(getNotificationReference({ type: 'Quote', description: 'Quote submitted. [ID:quote-456]' }), { type: 'quote', id: 'quote-456' });
});

test('notification navigation ignores references for unsupported notification types', () => {
  assert.equal(getNotificationReference({ type: 'Refund', description: 'Refund requested. [ID:booking-123]' }), null);
});
