import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { findCheckoutOrder, insertProductOrder } from './order-checkout.service';
import {
  commitOrderInventory,
  failProductOrderPayment,
  markProductOrderPaid,
  releaseExpiredOrderReservations,
  releaseOrderInventory,
  reserveOrderInventory,
} from './order-inventory.service';

test('successful order creation maps all 14 SQL parameters to the migrated order columns', async () => {
  let statement = '';
  let values: unknown[] = [];
  const client = {
    query: async (sql: string, params: unknown[]) => {
      statement = sql;
      values = params;
      return { rows: [{ id: 'order-id' }] };
    },
  } as unknown as PoolClient;
  const expires = new Date('2026-10-01T12:15:00Z');
  const id = await insertProductOrder(client, {
    customerId: 'customer-id', garageId: 'garage-id', orderNumber: 'ORD-TEST',
    subtotal: 100, shippingCost: 0, tax: 18, total: 118, currency: 'INR',
    shippingAddress: { pickupGarageId: 'garage-id' }, checkoutSessionId: 'session-1',
    reservationExpiresAt: expires,
  });
  assert.equal(id, 'order-id');
  assert.match(statement, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13, 'RESERVED', \$14\)/);
  assert.equal(values.length, 14);
  assert.deepEqual(values.slice(0, 5), ['customer-id', 'garage-id', 'ORD-TEST', 'PENDING_ACCEPTANCE', 'PENDING']);
  assert.equal(values[11] && (values[11] as any).pickupGarageId, 'garage-id');
  assert.equal(values[12], 'session-1');
  assert.equal(values[13], expires);
});

test('checkout retries look up by customer, garage, and required idempotency key', async () => {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('SELECT o.*')) return { rows: [{ id: 'existing-order', payment_status: 'PENDING' }] };
      return { rows: [] };
    },
  } as unknown as PoolClient;
  const order = await findCheckoutOrder(client, 'customer-a', 'garage-a', 'session-a');
  assert.equal(order.id, 'existing-order');
  assert.match(calls[0], /pg_advisory_xact_lock/);
  assert.match(calls[1], /checkout_session_id = \$3/);
});

function fakeInventoryClient(initialStock: number) {
  const state = {
    stock: initialStock,
    garageId: 'garage-id',
    order: { id: 'order-id', garage_id: 'garage-id', inventory_status: 'RESERVED', payment_status: 'PENDING', currency: 'INR', total: '118', subtotal: '100', tax: '18', order_number: 'ORD-1' },
    lines: [{ product_id: 'product-id', quantity: 1 }],
    payment: { id: 'payment-id', order_id: 'order-id', provider_order_id: 'rzp_order_1', provider_payment_id: null, amount: '118', currency: 'INR', status: 'created' },
    invoices: 0,
  };
  const client = {
    query: async (sql: string, params: any[] = []) => {
      if (sql.includes('UPDATE garage_inventory') && sql.includes('qty_available = qty_available -')) {
        if (state.stock < params[0]) return { rowCount: 0, rows: [] };
        state.stock -= Number(params[0]); return { rowCount: 1, rows: [{ id: 'inventory-id' }] };
      }
      if (sql.includes('UPDATE garage_inventory') && sql.includes('qty_available = qty_available +')) {
        state.stock += Number(params[0]); return { rowCount: 1, rows: [{ id: 'inventory-id' }] };
      }
      if (sql.includes("UPDATE orders SET inventory_status = 'RELEASED'")) {
        if (!params[1].includes(state.order.inventory_status)) return { rowCount: 0, rows: [] };
        state.order.inventory_status = 'RELEASED'; return { rowCount: 1, rows: [{ garage_id: state.order.garage_id }] };
      }
      if (sql.includes('SUM(quantity)::integer')) return { rowCount: 1, rows: state.lines };
      if (sql.includes("UPDATE orders SET inventory_status = 'COMMITTED'")) {
        if (state.order.inventory_status !== 'RESERVED') return { rowCount: 0, rows: [] };
        state.order.inventory_status = 'COMMITTED'; return { rowCount: 1, rows: [{ id: 'order-id' }] };
      }
      if (sql.includes('SELECT inventory_status FROM orders')) return { rows: [{ inventory_status: state.order.inventory_status }] };
      if (sql.includes("WHERE payment_status = 'PENDING' AND inventory_status = 'RESERVED'")) {
        return { rowCount: state.order.inventory_status === 'RESERVED' && state.order.payment_status === 'PENDING' ? 1 : 0,
          rows: state.order.inventory_status === 'RESERVED' && state.order.payment_status === 'PENDING' ? [{ id: 'order-id' }] : [] };
      }
      if (sql.includes('SELECT * FROM orders')) return { rows: [state.order] };
      if (sql.includes('SELECT * FROM payments')) return { rows: [state.payment] };
      if (sql.includes("UPDATE payments SET provider_payment_id = $1, status = 'refund_pending'")) {
        state.payment.status = 'refund_pending'; state.payment.provider_payment_id = params[0]; return { rowCount: 1, rows: [] };
      }
      if (sql.includes("UPDATE payments SET provider_payment_id = $1, status = 'succeeded'")) {
        state.payment.status = 'succeeded'; state.payment.provider_payment_id = params[0]; return { rowCount: 1, rows: [] };
      }
      if (sql.includes("UPDATE orders SET payment_status = 'REFUND_PENDING'")) {
        state.order.payment_status = 'REFUND_PENDING'; return { rowCount: 1, rows: [] };
      }
      if (sql.includes("UPDATE orders SET payment_status = 'PAID'")) {
        state.order.payment_status = 'PAID'; return { rowCount: 1, rows: [state.order] };
      }
      if (sql.includes('SELECT id FROM invoices')) return { rowCount: 0, rows: [] };
      if (sql.includes('INSERT INTO invoices')) { state.invoices++; return { rowCount: 1, rows: [] }; }
      if (sql.includes('SELECT id FROM orders WHERE id = $1 FOR UPDATE')) return { rowCount: 1, rows: [{ id: 'order-id' }] };
      if (sql.includes("UPDATE payments SET status = 'failed'")) {
        if (state.payment.status !== 'created') return { rowCount: 0, rows: [] };
        state.payment.status = 'failed'; return { rowCount: 1, rows: [{ id: 'payment-id' }] };
      }
      if (sql.includes("UPDATE orders SET payment_status = 'FAILED'")) {
        state.order.payment_status = 'FAILED'; return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected test query: ${sql}`);
    },
  } as unknown as PoolClient;
  return { client, state };
}

test('COD and online checkouts use one atomic reservation and cannot sell past zero', async () => {
  const { client, state } = fakeInventoryClient(1);
  await reserveOrderInventory(client, 'garage-id', [{ product_id: 'product-id', quantity: 1 }]);
  assert.equal(state.stock, 0);
  await assert.rejects(reserveOrderInventory(client, 'garage-id', [{ product_id: 'product-id', quantity: 1 }]));
  assert.equal(state.stock, 0);
});

test('online payment verification and webhook-first processing commit one reservation exactly once', async (t) => {
  for (const firstProcessor of ['verification', 'webhook']) {
    await t.test(firstProcessor, async () => {
      const { client, state } = fakeInventoryClient(0);
      const first = await markProductOrderPaid(client, 'order-id', 'rzp_order_1', 'pay-1', 11800, 'INR');
      const retry = await markProductOrderPaid(client, 'order-id', 'rzp_order_1', 'pay-1', 11800, 'INR');
      assert.equal(first.status, 'PAID');
      assert.equal(retry.status, 'PAID');
      assert.equal(state.stock, 0);
      assert.equal(state.invoices, 1);
      assert.equal(await commitOrderInventory(client, 'order-id'), true);
    });
  }
});

test('captured payment after reservation release is not marked paid and enters refund reconciliation', async () => {
  const { client, state } = fakeInventoryClient(1);
  state.order.inventory_status = 'RELEASED';
  const result = await markProductOrderPaid(client, 'order-id', 'rzp_order_1', 'pay-late', 11800, 'INR');
  assert.equal(result.status, 'REFUND_PENDING');
  assert.equal(state.order.payment_status, 'REFUND_PENDING');
  assert.equal(state.payment.status, 'refund_pending');
});

test('failed online payment releases a held reservation only once', async () => {
  const { client, state } = fakeInventoryClient(0);
  assert.equal(await failProductOrderPayment(client, 'order-id', 'rzp_order_1'), true);
  assert.equal(state.stock, 1);
  assert.equal(state.order.payment_status, 'FAILED');
  assert.equal(await failProductOrderPayment(client, 'order-id', 'rzp_order_1'), false);
  assert.equal(state.stock, 1);
});

test('abandoned online reservations expire and release their stock once', async () => {
  const { client, state } = fakeInventoryClient(0);
  assert.equal(await releaseExpiredOrderReservations(client), 1);
  assert.equal(state.stock, 1);
  assert.equal(state.order.inventory_status, 'RELEASED');
  assert.equal(state.order.payment_status, 'FAILED');
  assert.equal(await releaseExpiredOrderReservations(client), 0);
  assert.equal(state.stock, 1);
});

test('cancellation and refund release held or committed stock at most once', async () => {
  const { client, state } = fakeInventoryClient(0);
  assert.equal(await releaseOrderInventory(client, 'order-id'), true);
  assert.equal(state.stock, 1);
  assert.equal(await releaseOrderInventory(client, 'order-id'), false);
  assert.equal(state.stock, 1);
});

test('PostgreSQL serializes competing final-unit reservations (2 and 100 buyers)', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const connectionString = process.env.TEST_DATABASE_URL!;
  const schema = `order_inventory_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new Pool({ connectionString, max: 1 });
  const pool = new Pool({ connectionString, max: 25 });
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.query(`CREATE TABLE ${schema}.garage_inventory (
      id uuid PRIMARY KEY, garage_id uuid NOT NULL, product_id uuid NOT NULL,
      qty_available integer NOT NULL CHECK (qty_available >= 0), updated_at timestamptz NOT NULL DEFAULT NOW()
    )`);
    await admin.query(`CREATE TABLE ${schema}.orders (
      id uuid PRIMARY KEY, customer_id uuid NOT NULL, garage_id uuid NOT NULL,
      checkout_session_id varchar(255), shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )`);
    await admin.query(`CREATE UNIQUE INDEX ${schema}_checkout_key ON ${schema}.orders(customer_id, garage_id, checkout_session_id) WHERE checkout_session_id IS NOT NULL`);
    await admin.query(`CREATE TABLE ${schema}.payments (id uuid PRIMARY KEY, order_id uuid, provider text, created_at timestamptz DEFAULT NOW())`);
    const garageId = randomUUID();
    const productId = randomUUID();
    const inventoryId = randomUUID();
    await admin.query(`INSERT INTO ${schema}.garage_inventory (id, garage_id, product_id, qty_available) VALUES ($1, $2, $3, 1)`, [inventoryId, garageId, productId]);

    const attempt = async () => {
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO ${schema}`);
        await client.query('BEGIN');
        await reserveOrderInventory(client, garageId, [{ product_id: productId, quantity: 1 }]);
        await client.query('COMMIT');
        return true;
      } catch {
        await client.query('ROLLBACK');
        return false;
      } finally {
        client.release();
      }
    };

    assert.equal((await Promise.all([attempt(), attempt()])).filter(Boolean).length, 1);
    await admin.query(`UPDATE ${schema}.garage_inventory SET qty_available = 1 WHERE id = $1`, [inventoryId]);
    assert.equal((await Promise.all(Array.from({ length: 100 }, () => attempt()))).filter(Boolean).length, 1);
    const finalStock = await admin.query(`SELECT qty_available FROM ${schema}.garage_inventory WHERE id = $1`, [inventoryId]);
    assert.equal(finalStock.rows[0].qty_available, 0);

    const customerId = randomUUID();
    const checkout = async (sessionId: string) => {
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO ${schema}`);
        await client.query('BEGIN');
        const existing = await findCheckoutOrder(client, customerId, garageId, sessionId);
        if (existing) {
          await client.query('COMMIT');
          return existing.id;
        }
        const inserted = await client.query(
          `INSERT INTO orders (id, customer_id, garage_id, checkout_session_id) VALUES ($1, $2, $3, $4) RETURNING id`,
          [randomUUID(), customerId, garageId, sessionId]
        );
        await client.query('COMMIT');
        return inserted.rows[0].id;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
    const retryIds = await Promise.all([checkout('session-one'), checkout('session-one')]);
    assert.equal(retryIds[0], retryIds[1]);
    assert.equal((await admin.query(`SELECT COUNT(*)::int AS count FROM ${schema}.orders WHERE checkout_session_id = 'session-one'`)).rows[0].count, 1);
    const separateId = await checkout('session-two');
    assert.notEqual(separateId, retryIds[0]);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
