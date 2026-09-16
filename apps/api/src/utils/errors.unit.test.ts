import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, NotFoundError, BadRequestError, UnauthorizedError } from './errors';

describe('Phase 11 & 12: Typed API Errors & Consistency', () => {
  test('NotFoundError sets 404 status and NOT_FOUND code', () => {
    const err = new NotFoundError('Booking not found');
    assert.strictEqual(err.statusCode, 404);
    assert.strictEqual(err.errorCode, 'NOT_FOUND');
    assert.strictEqual(err.message, 'Booking not found');
    assert.strictEqual(err instanceof AppError, true);
  });

  test('BadRequestError sets 400 status and BAD_REQUEST code', () => {
    const err = new BadRequestError('Invalid input payload');
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.errorCode, 'BAD_REQUEST');
  });

  test('UnauthorizedError sets 401 status and UNAUTHORIZED code', () => {
    const err = new UnauthorizedError('Invalid access token');
    assert.strictEqual(err.statusCode, 401);
    assert.strictEqual(err.errorCode, 'UNAUTHORIZED');
  });
});
