import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneForDisplay } from './phone-display';

test('masks local numbers without exposing more than two digits', () => {
  assert.equal(formatPhoneForDisplay('+919926264119'), '+91 ********19');
  assert.equal(formatPhoneForDisplay('+14155552671'), '+1 ********71');
  assert.equal(formatPhoneForDisplay('+971501234567'), '+971 *******67');
  assert.equal(formatPhoneForDisplay('+819012345678'), '+81 ********78');
});
