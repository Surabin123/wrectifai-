import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

export const invoicesRouter = Router();

// GET /invoices/by-booking/:bookingId
invoicesRouter.get('/by-booking/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Authorization: User must be admin, the garage for this booking, or the customer.
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;
    
    let filterCondition = '1=1';
    const params: any[] = [bookingId];

    if (!userRoles.includes('admin')) {
      if (userRoles.includes('garage')) {
        const garageId = req.user?.garageId;
        if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
        
        filterCondition = 'b.garage_id = $2';
        params.push(garageId);
      } else {
        filterCondition = 'b.customer_id = $2';
        params.push(userId);
      }
    }

    const result = await query(
      `SELECT 
        i.id,
        i.invoice_number as "invoiceNumber",
        i.subtotal,
        i.tax_amount as "taxAmount",
        i.platform_fee as "platformFee",
        i.discount_amount as "discountAmount",
        i.total_amount as "totalAmount",
        i.currency,
        i.issued_at as "issuedAt",
        i.created_at as "createdAt",
        b.id as "bookingId",
        b.payment_status as "paymentStatus",
        b.status as "serviceStatus",
        b.customer_note as "serviceType",
        b.booking_type as "bookingType",
        g.name as "garageName",
        g.address as "garageAddress",
        g.city as "garageCity",
        gu.mobile_number as "garagePhone",
        u.name as "customerName",
        u.mobile_number as "customerPhone",
        u.email as "customerEmail",
        p.city as "customerCity",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.year as "vehicleYear",
        v.vin as "vehicleVin",
        q.details as "quoteDetails"
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN garages g ON b.garage_id = g.id
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN users gu ON g.owner_user_id = gu.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       WHERE i.booking_id = $1 AND ${filterCondition}`,
      params
    );

    if (result.rows.length === 0) {
      return error(res, 'Invoice not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0], 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve invoice',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// GET /invoices/by-order/:orderId
invoicesRouter.get('/by-order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Authorization: User must be admin, the garage for this order, or the customer.
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;
    
    let filterCondition = '1=1';
    const params: any[] = [orderId];

    if (!userRoles.includes('admin')) {
      if (userRoles.includes('garage')) {
        const garageId = req.user?.garageId;
        if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
        
        filterCondition = 'o.garage_id = $2';
        params.push(garageId);
      } else {
        filterCondition = 'o.customer_id = $2';
        params.push(userId);
      }
    }

    const result = await query(
      `SELECT 
        i.id,
        i.invoice_number as "invoiceNumber",
        i.subtotal,
        i.tax_amount as "taxAmount",
        i.platform_fee as "platformFee",
        i.discount_amount as "discountAmount",
        i.total_amount as "totalAmount",
        i.currency,
        i.issued_at as "issuedAt",
        i.created_at as "createdAt",
        o.id as "orderId",
        o.status as "paymentStatus",
        o.order_number as "orderNumber",
        'Inventory Purchase' as "bookingType",
        'Inventory Purchase' as "serviceType",
        g.name as "garageName",
        g.address as "garageAddress",
        g.city as "garageCity",
        gu.mobile_number as "garagePhone",
        u.name as "customerName",
        u.mobile_number as "customerPhone",
        u.email as "customerEmail",
        p.city as "customerCity"
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       JOIN garages g ON o.garage_id = g.id
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN users gu ON g.owner_user_id = gu.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE i.order_id = $1 AND ${filterCondition}`,
      params
    );

    if (result.rows.length === 0) {
      return error(res, 'Invoice not found or unauthorized', 'NOT_FOUND', 404);
    }

    // Fetch order items to include in quoteDetails for rendering
    const invoiceData = result.rows[0];
    const itemsResult = await query(
      `SELECT oi.quantity, oi.unit_price, oi.total_price, p.name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    // Mock quoteDetails for UI invoice reuse
    invoiceData.quoteDetails = {
      description: "Inventory Order",
      estimated_price: invoiceData.subtotal,
      parts_cost: invoiceData.subtotal,
      labor_cost: 0,
      breakdown: {
        parts: itemsResult.rows.map((item: any) => ({
          name: item.name,
          price: Number(item.unit_price),
          quantity: item.quantity,
          total: Number(item.total_price)
        })),
        labor: []
      }
    };

    return success(res, invoiceData, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve invoice',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

