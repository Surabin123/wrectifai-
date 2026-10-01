import type { PoolClient } from 'pg';

export const CREATE_PRODUCT_ORDER_SQL = `
  INSERT INTO orders (customer_id, garage_id, order_number, status, payment_status,
    subtotal, shipping_cost, tax, total, currency, fulfillment_mode, shipping_address,
    checkout_session_id, inventory_status, reservation_expires_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'RESERVED', $14)
  RETURNING id`;

export type NewProductOrder = {
  customerId: string;
  garageId: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: Record<string, unknown>;
  checkoutSessionId: string | null;
  reservationExpiresAt: Date | null;
};

export async function insertProductOrder(client: Pick<PoolClient, 'query'>, order: NewProductOrder) {
  const result = await client.query(CREATE_PRODUCT_ORDER_SQL, [
    order.customerId,
    order.garageId,
    order.orderNumber,
    'PENDING_ACCEPTANCE',
    'PENDING',
    order.subtotal,
    order.shippingCost,
    order.tax,
    order.total,
    order.currency,
    'inHouse',
    order.shippingAddress,
    order.checkoutSessionId,
    order.reservationExpiresAt,
  ]);
  if (!result.rows[0]?.id) throw new Error('Product order insert did not return an ID');
  return result.rows[0].id as string;
}

export async function findCheckoutOrder(
  client: Pick<PoolClient, 'query'>,
  customerId: string,
  garageId: string,
  checkoutSessionId: string
) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    `${customerId}:${garageId}:${checkoutSessionId}`,
  ]);
  const result = await client.query(
    `SELECT o.*, (SELECT provider FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) AS payment_method
     FROM orders o
     WHERE o.customer_id = $1 AND o.garage_id = $2
       AND (o.checkout_session_id = $3 OR o.shipping_address->>'checkoutSessionId' = $3)
     ORDER BY o.created_at DESC LIMIT 1`,
    [customerId, garageId, checkoutSessionId]
  );
  return result.rows[0] || null;
}
