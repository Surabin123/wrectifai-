import type { PoolClient } from 'pg';

export type OrderInventoryLine = { product_id: string; quantity: number };

export class InsufficientOrderStockError extends Error {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = 'InsufficientOrderStockError';
  }
}

function aggregateLines(lines: OrderInventoryLine[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.product_id, (quantities.get(line.product_id) || 0) + Number(line.quantity));
  }
  return quantities;
}

/** Reserve inventory atomically. Call inside the order/payment transaction. */
export async function reserveOrderInventory(
  client: Pick<PoolClient, 'query'>,
  garageId: string,
  lines: OrderInventoryLine[]
) {
  for (const [productId, quantity] of aggregateLines(lines)) {
    const result = await client.query(
      `UPDATE garage_inventory
       SET qty_available = qty_available - $1, updated_at = NOW()
       WHERE garage_id = $2 AND product_id = $3 AND is_active IS TRUE AND qty_available >= $1
       RETURNING id`,
      [quantity, garageId, productId]
    );
    if (result.rowCount !== 1) throw new InsufficientOrderStockError(productId);
  }
}

/** Release a reservation/committed deduction once; caller owns transaction. */
export async function releaseOrderInventory(
  client: Pick<PoolClient, 'query'>,
  orderId: string,
  allowedStates: ('RESERVED' | 'COMMITTED')[] = ['RESERVED', 'COMMITTED']
) {
  const released = await client.query(
    `UPDATE orders SET inventory_status = 'RELEASED', reservation_expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND inventory_status = ANY($2::text[]) RETURNING garage_id`,
    [orderId, allowedStates]
  );
  if (released.rowCount !== 1) return false;

  const lines = await client.query(
    `SELECT product_id, SUM(quantity)::integer AS quantity
     FROM order_items WHERE order_id = $1 GROUP BY product_id`,
    [orderId]
  );
  for (const line of lines.rows) {
    const restored = await client.query(
      `UPDATE garage_inventory SET qty_available = qty_available + $1, updated_at = NOW()
       WHERE garage_id = $2 AND product_id = $3 RETURNING id`,
      [line.quantity, released.rows[0].garage_id, line.product_id]
    );
    if (restored.rowCount !== 1) throw new Error(`Inventory row missing while restoring product ${line.product_id}`);
  }
  return true;
}

/** Convert a held reservation into a paid deduction without decrementing twice. */
export async function commitOrderInventory(client: Pick<PoolClient, 'query'>, orderId: string) {
  const committed = await client.query(
    `UPDATE orders SET inventory_status = 'COMMITTED', reservation_expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND inventory_status = 'RESERVED' RETURNING id`,
    [orderId]
  );
  if (committed.rowCount === 1) return true;
  const current = await client.query('SELECT inventory_status FROM orders WHERE id = $1', [orderId]);
  return current.rows[0]?.inventory_status === 'COMMITTED';
}

export async function markProductOrderPaid(
  client: Pick<PoolClient, 'query'>,
  orderId: string,
  providerOrderId: string,
  providerPaymentId: string,
  amountInMinorUnits: number,
  currency: string
) {
  const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  const order = orderResult.rows[0];
  if (!order) throw new Error('Product order not found for payment');

  const paymentResult = await client.query(
    `SELECT * FROM payments WHERE order_id = $1 AND provider_order_id = $2 FOR UPDATE`,
    [orderId, providerOrderId]
  );
  const payment = paymentResult.rows[0];
  if (!payment) throw new Error('Payment does not match this product order');
  if (Math.round(Number(payment.amount) * 100) !== amountInMinorUnits ||
      String(payment.currency || order.currency).toUpperCase() !== String(currency).toUpperCase() ||
      String(order.currency).toUpperCase() !== String(currency).toUpperCase()) {
    throw new Error('Payment amount or currency does not match the product order');
  }

  if (order.payment_status === 'PAID') {
    if (payment.provider_payment_id === providerPaymentId) return { order, payment, status: 'PAID' };
    await client.query(
      `UPDATE payments SET provider_payment_id = $1, status = 'refund_pending', updated_at = NOW() WHERE id = $2`,
      [providerPaymentId, payment.id]
    );
    return { order, payment, status: 'REFUND_PENDING' };
  }
  if (order.payment_status === 'REFUNDED' || order.payment_status === 'REFUND_PENDING') {
    if (payment.provider_payment_id !== providerPaymentId) {
      await client.query(
        `UPDATE payments SET provider_payment_id = $1, status = 'refund_pending', updated_at = NOW() WHERE id = $2`,
        [providerPaymentId, payment.id]
      );
      return { order, payment, status: 'REFUND_PENDING' };
    }
    return { order, payment, status: order.payment_status };
  }

  if (order.inventory_status !== 'RESERVED') {
    await client.query(
      `UPDATE payments SET provider_payment_id = $1, status = 'refund_pending', updated_at = NOW() WHERE id = $2`,
      [providerPaymentId, payment.id]
    );
    await client.query(
      `UPDATE orders SET payment_status = 'REFUND_PENDING', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );
    return { order, payment, status: 'REFUND_PENDING' };
  }

  const inventoryCommitted = await commitOrderInventory(client, orderId);
  if (!inventoryCommitted) throw new Error('Product order reservation was already released');

  await client.query(
    `UPDATE payments SET provider_payment_id = $1, status = 'succeeded', signature_status = 'valid', updated_at = NOW()
     WHERE id = $2`,
    [providerPaymentId, payment.id]
  );
  const paidOrder = await client.query(
    `UPDATE orders SET payment_status = 'PAID',
       status = CASE WHEN status = 'PENDING_ACCEPTANCE' THEN 'PENDING_ACCEPTANCE' ELSE status END,
       updated_at = NOW()
     WHERE id = $1 AND payment_status IN ('PENDING', 'FAILED') RETURNING *`,
    [orderId]
  );
  if (paidOrder.rowCount !== 1) throw new Error('Product order payment state changed concurrently');

  const invoice = await client.query('SELECT id FROM invoices WHERE order_id = $1 LIMIT 1', [orderId]);
  if (invoice.rowCount === 0) {
    await client.query(
      `INSERT INTO invoices (order_id, invoice_number, subtotal, tax_amount, total_amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (invoice_number) DO NOTHING`,
      [orderId, `INV-${order.order_number}`, order.subtotal, order.tax, order.total, order.currency]
    );
  }
  return { order: paidOrder.rows[0], payment, status: 'PAID' };
}

export async function failProductOrderPayment(client: Pick<PoolClient, 'query'>, orderId: string, providerOrderId: string) {
  await client.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  const payment = await client.query(
    `UPDATE payments SET status = 'failed', updated_at = NOW()
     WHERE order_id = $1 AND provider_order_id = $2 AND status = 'created' RETURNING id`,
    [orderId, providerOrderId]
  );
  if (!payment.rowCount) return false;
  const released = await releaseOrderInventory(client, orderId, ['RESERVED']);
  await client.query(
    `UPDATE orders SET payment_status = 'FAILED', updated_at = NOW()
     WHERE id = $1 AND payment_status = 'PENDING'`, [orderId]
  );
  return released;
}

/** Release expired unpaid online reservations in bounded batches. */
export async function releaseExpiredOrderReservations(client: Pick<PoolClient, 'query'>, limit = 100) {
  const expired = await client.query(
    `SELECT id FROM orders
     WHERE payment_status = 'PENDING' AND inventory_status = 'RESERVED'
       AND reservation_expires_at <= NOW()
     ORDER BY reservation_expires_at
     LIMIT $1 FOR UPDATE SKIP LOCKED`,
    [limit]
  );
  for (const { id } of expired.rows) {
    const released = await releaseOrderInventory(client, id, ['RESERVED']);
    if (released) {
      await client.query(
        `UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE id = $1 AND payment_status = 'PENDING'`,
        [id]
      );
      await client.query(
        `UPDATE payments SET status = 'failed', updated_at = NOW()
         WHERE order_id = $1 AND status = 'created'`,
        [id]
      );
    }
  }
  return expired.rowCount || 0;
}
