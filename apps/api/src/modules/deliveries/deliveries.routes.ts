import { Router } from 'express';
import { getDbPool } from '../../config/database';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';

export const deliveriesRouter = Router();

// GET /api/v1/deliveries
// Delivery agent sees their assigned deliveries
deliveriesRouter.get('/', authenticate, requireRole(['delivery_agent', 'admin']), async (req, res) => {
  const agentId = req.user?.userId;
  const pool = getDbPool();
  try {
    const result = await pool.query(`
      SELECT da.*, 
             o.order_number, o.shipping_address, o.total,
             g.name as garage_name
      FROM delivery_assignments da
      JOIN orders o ON da.order_id = o.id
      JOIN garages g ON da.garage_id = g.id
      WHERE da.delivery_agent_id = $1
      ORDER BY da.created_at DESC
    `, [agentId]);
    return success(res, result.rows);
  } catch (err) {
    console.error('Failed to fetch deliveries:', err);
    return error(res, 'Failed to fetch deliveries', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// PUT /api/v1/deliveries/:id/status
deliveriesRouter.put('/:id/status', authenticate, requireRole(['delivery_agent']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const agentId = req.user?.userId;

  const validStatuses = ['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  if (!validStatuses.includes(status)) {
    return error(res, 'Invalid delivery status', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Check assignment ownership
    const assignRes = await client.query(`
      SELECT * FROM delivery_assignments 
      WHERE id = $1 AND delivery_agent_id = $2 FOR UPDATE
    `, [id, agentId]);

    if (assignRes.rows.length === 0) {
      throw new Error('Delivery assignment not found or unauthorized');
    }
    const assignment = assignRes.rows[0];

    // Update assignment
    const updateRes = await client.query(`
      UPDATE delivery_assignments 
      SET status = $1, 
          picked_up_at = CASE WHEN $1 = 'PICKED_UP' THEN NOW() ELSE picked_up_at END,
          delivered_at = CASE WHEN $1 = 'DELIVERED' THEN NOW() ELSE delivered_at END,
          updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [status, id]);

    // Update order status based on delivery status
    let orderStatus = null;
    if (status === 'PICKED_UP') orderStatus = 'shipped'; // Or specific pickup status
    if (status === 'DELIVERED') orderStatus = 'delivered';

    if (orderStatus) {
      await client.query(`
        UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2
      `, [orderStatus, assignment.order_id]);
    }

    await client.query('COMMIT');
    return success(res, updateRes.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Status update error:', err);
    return error(res, err.message, 'UPDATE_ERROR', 400);
  } finally {
    client.release();
  }
});
