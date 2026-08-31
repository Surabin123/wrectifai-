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
        g.phone as "garagePhone",
        u.name as "customerName",
        u.mobile_number as "customerPhone",
        u.email as "customerEmail",
        p.city as "customerCity",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.year as "vehicleYear",
        v.vin as "vehicleVin"
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN garages g ON b.garage_id = g.id
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
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
