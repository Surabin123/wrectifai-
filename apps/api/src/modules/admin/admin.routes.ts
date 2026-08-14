import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { query } from '../../config/database';

export const adminRouter = Router();

// Apply auth and admin role requirements to all routes in this sub-router
adminRouter.use(authenticate);
adminRouter.use(requireRole(['admin']));

adminRouter.get('/stats', async (req, res) => {
  try {
    const customersCount = await query(`SELECT COUNT(*) FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.code = 'customer'`);
    const garagesCount = await query(`SELECT COUNT(*) FROM garages WHERE approval_status = 'active'`);
    const pendingCount = await query(`SELECT COUNT(*) FROM garages WHERE approval_status = 'pending'`);
    const bookingsCount = await query(`SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'inService')`);
    const quotesCount = await query(`SELECT COUNT(*) FROM quotes`);
    const serviceRequestsCount = await query(`SELECT COUNT(*) FROM quote_requests`);
    const completedJobsCount = await query(`SELECT COUNT(*) FROM bookings WHERE status = 'completed'`);

    const recentGarages = await query(`
      SELECT g.id, g.name, u.name as "ownerName", u.mobile_number as phone, g.city, g.created_at as "createdAt", g.approval_status as "approvalStatus"
      FROM garages g
      LEFT JOIN users u ON g.owner_user_id = u.id
      WHERE g.approval_status = 'active'
      ORDER BY g.created_at DESC
      LIMIT 12
    `);

    const pendingGarageList = await query(`
      SELECT g.id, g.name, u.name as "ownerName", u.mobile_number as phone, g.city, g.created_at as "createdAt", g.approval_status as "approvalStatus"
      FROM garages g
      LEFT JOIN users u ON g.owner_user_id = u.id
      WHERE g.approval_status = 'pending'
      ORDER BY g.created_at DESC
      LIMIT 10
    `);

    return success(res, {
      totalCustomers: parseInt(customersCount.rows[0].count),
      registeredGarages: parseInt(garagesCount.rows[0].count),
      pendingApprovals: parseInt(pendingCount.rows[0].count),
      activeBookings: parseInt(bookingsCount.rows[0].count),
      quotesCount: parseInt(quotesCount.rows[0].count),
      serviceRequestsCount: parseInt(serviceRequestsCount.rows[0].count),
      completedJobsCount: parseInt(completedJobsCount.rows[0].count),
      recentlyRegisteredGarages: recentGarages.rows,
      pendingGarageList: pendingGarageList.rows
    });
  } catch (err) {
    return error(res, 'Failed to fetch admin stats', 'DATABASE_ERROR', 500);
  }
});

adminRouter.get('/onboarding/garages', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.id, g.name, g.address, g.approval_status as "approvalStatus", g.created_at as "createdAt", g.city, g.specializations,
              u.name as "ownerName"
       FROM garages g
       LEFT JOIN users u ON g.owner_user_id = u.id
       ORDER BY g.created_at DESC`
    );
    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch garages', 'DATABASE_ERROR', 500);
  }
});

adminRouter.get('/onboarding/garages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const garageResult = await query(`
      SELECT g.*, u.name as "ownerName", u.mobile_number as "ownerPhone", u.email as "ownerEmail"
      FROM garages g
      LEFT JOIN users u ON g.owner_user_id = u.id
      WHERE g.id = $1
    `, [id]);
    
    if (garageResult.rows.length === 0) {
      return error(res, 'Garage not found', 'NOT_FOUND', 404);
    }
    
    const servicesResult = await query(`SELECT * FROM services WHERE garage_id = $1`, [id]);
    const docsResult = await query(`SELECT * FROM garage_documents WHERE garage_id = $1`, [id]);
    
    const garageData = garageResult.rows[0];
    garageData.servicesList = servicesResult.rows;
    garageData.docsList = docsResult.rows;
    
    return success(res, garageData);
  } catch (err) {
    return error(res, 'Failed to fetch garage details', 'DATABASE_ERROR', 500);
  }
});

adminRouter.post('/onboarding/garages', async (req, res) => {
  try {
    const { 
      name, type, registrationNumber, phone, email, city, address, 
      ownerName, ownerPhone, password, 
      services, workingHours,
      country, locale, businessCurrency,
      chips, image
    } = req.body;
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create Owner User
    const newUser = await query(
      `INSERT INTO users (name, mobile_number, email, password_hash, status, country, locale) VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING id`,
      [ownerName, ownerPhone || phone, email, passwordHash, country || null, locale || null]
    );
    const ownerId = newUser.rows[0].id;
    
    // Assign Garage Role
    const roleResult = await query("SELECT id FROM roles WHERE code = 'garage'");
    if (roleResult.rows.length > 0) {
      await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [ownerId, roleResult.rows[0].id]);
    }

    // Insert Garage
    const newGarage = await query(
      `INSERT INTO garages (name, address, city, owner_user_id, approval_status, is_approved, country, locale, business_currency, specializations, image)
       VALUES ($1, $2, $3, $4, 'active', true, $5, $6, $7, $8, $9) RETURNING id`,
      [name, address, city, ownerId, country || null, locale || null, businessCurrency || 'USD', chips || [], image || null]
    );
    const garageId = newGarage.rows[0].id;

    // Insert Services
    if (services && Array.isArray(services)) {
      for (const serviceName of services) {
        await query(
          `INSERT INTO services (garage_id, name, description, price, duration_mins) VALUES ($1, $2, $3, $4, $5)`,
          [garageId, serviceName, 'General service', 0, 60]
        );
      }
    }

    // Note: workingHours, documents etc. can be stored in respective tables if schema allows.
    // For now we persist what the database schema supports natively.
    // Services are added to the 'services' table which allows them to appear on the customer side.

    return success(res, { id: garageId, message: 'Garage registered successfully' }, 201);
  } catch (err) {
    console.error('Garage registration error:', err);
    return error(res, 'Failed to register garage', 'DATABASE_ERROR', 500);
  }
});

adminRouter.post('/onboarding/garages/:id/verify-status', async (req, res) => {
  try {
    const { action } = req.body;
    if (!['verify', 'reject'].includes(action)) {
      return error(res, 'Invalid action', 'INVALID_ACTION', 400);
    }
    const status = action === 'verify' ? 'active' : 'rejected';
    const is_approved = action === 'verify';
    
    const result = await query(
      `UPDATE garages SET approval_status = $1, is_approved = $2 WHERE id = $3 RETURNING id`,
      [status, is_approved, req.params.id]
    );
    
    // Also update document status if applicable
    await query(`UPDATE garage_documents SET verification_status = $1 WHERE garage_id = $2`, [status, req.params.id]);

    if (result.rows.length === 0) return error(res, 'Garage not found', 'NOT_FOUND', 404);
    
    return success(res, {
      garageId: req.params.id,
      approvalStatus: status,
      reviewedBy: req.user?.userId,
      reviewedAt: new Date().toISOString(),
    });
  } catch (err) {
    return error(res, 'Failed to update garage', 'DATABASE_ERROR', 500);
  }
});

adminRouter.put('/garages/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended', 'rejected', 'deleted'].includes(status)) {
      return error(res, 'Invalid action', 'INVALID_ACTION', 400);
    }
    const is_approved = (status === 'active');
    
    const result = await query(
      `UPDATE garages SET approval_status = $1, is_approved = $2 WHERE id = $3 RETURNING id`,
      [status, is_approved, req.params.id]
    );
    if (result.rows.length === 0) return error(res, 'Garage not found', 'NOT_FOUND', 404);
    
    return success(res, {
      garageId: req.params.id,
      approvalStatus: status,
      reviewedBy: req.user?.userId,
      reviewedAt: new Date().toISOString(),
    });
  } catch (err) {
    return error(res, 'Failed to update garage', 'DATABASE_ERROR', 500);
  }
});

adminRouter.get('/users', async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.mobile_number as phone, u.created_at as "joined", u.status,
       (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as bookings,
       (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = u.id) as vehicles
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.code = 'customer'
       ORDER BY u.created_at DESC`
    );
    return success(res, result.rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    return error(res, 'Failed to fetch users', 'DATABASE_ERROR', 500);
  }
});

// Add a customer manually
adminRouter.post('/users', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, pincode, vehicleNumber, vehicleModel, vehicleBrand, vehicleType, status } = req.body;
    if (!name || !email) return error(res, 'Name and email are required', 'BAD_REQUEST', 400);
    
    // 1. Insert user
    const userRes = await query(
      `INSERT INTO users (name, email, mobile_number, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, phone || null, status || 'active']
    );
    const user = userRes.rows[0];

    // 2. Get customer role id
    const roleRes = await query(`SELECT id FROM roles WHERE code = 'customer'`);
    if (roleRes.rows.length > 0) {
      await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [user.id, roleRes.rows[0].id]);
    }

    // (Profile insert removed since profiles table was deleted)

    // 4. Insert vehicle if provided
    if (vehicleNumber || vehicleModel || vehicleBrand) {
      await query(
        `INSERT INTO vehicles (customer_id, plate_number, model, make, trim, fuel_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, vehicleNumber || null, vehicleModel || null, vehicleBrand || null, vehicleType || null, 'Petrol'] // default fuel
      );
    }
    
    return success(res, user);
  } catch (err) {
    console.error('Add customer error:', err);
    return error(res, 'Failed to add customer', 'DATABASE_ERROR', 500);
  }
});

// GET /bookings
adminRouter.get('/bookings', async (req, res) => {
  try {
    const result = await query(
      `SELECT b.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName", b.status, b.created_at as "createdAt",
              b.scheduled_at as "serviceDate", b.total_amount as "totalAmount", COALESCE(b.currency, g.business_currency, 'USD') as "currency",
              v.make as "vehicleMake", v.model as "vehicleModel",
              v.vin as "vin", b.quote_id as "quoteId", q.eta_days as "estimatedDays", qr.issue_summary as "issueDescription", qr.preferred_date as "preferredDate",
              (SELECT status FROM payments p WHERE p.booking_id = b.id ORDER BY p.created_at DESC LIMIT 1) as "paymentStatus"
       FROM bookings b
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN garages g ON b.garage_id = g.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       ORDER BY b.created_at DESC`
    );
    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch bookings', 'DATABASE_ERROR', 500);
  }
});

// Update customer status
adminRouter.post('/users/:id/:action', async (req, res) => {
  try {
    const { action } = req.params;
    if (!['verify', 'reject', 'suspend', 'activate'].includes(action)) {
      return error(res, 'Invalid action', 'INVALID_ACTION', 400);
    }
    
    const status = action === 'verify' || action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : 'rejected';
    
    const result = await query(
      `UPDATE users SET status = $1 WHERE id = $2 RETURNING id`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) return error(res, 'User not found', 'NOT_FOUND', 404);
    
    return success(res, { success: true, status });
  } catch (err) {
    return error(res, 'Failed to update customer status', 'DATABASE_ERROR', 500);
  }
});

// Delete customer
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Delete all dependent records first to avoid foreign key constraint errors
    await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await query('DELETE FROM profiles WHERE user_id = $1', [userId]);
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await query('DELETE FROM bookings WHERE customer_id = $1', [userId]);
    await query('DELETE FROM quote_requests WHERE customer_id = $1', [userId]);
    await query('DELETE FROM vehicles WHERE customer_id = $1 OR owner_id = $1', [userId]);
    
    // Finally delete the user
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    
    if (result.rows.length === 0) return error(res, 'User not found', 'NOT_FOUND', 404);
    
    return success(res, { success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    return error(res, 'Failed to delete customer', 'DATABASE_ERROR', 500);
  }
});

adminRouter.post('/service-requests', async (req, res) => {
  try {
    const { customerId, vehicleId, serviceType, priority, description, preferredDate, status } = req.body;
    
    // Ensure we have a valid vehicle ID to satisfy the foreign key constraint. We can query the first vehicle for this customer or fallback to a hardcoded UUID if needed, but it's best to require it or fallback gracefully.
    // If vehicleId is not provided, try to fetch the customer's first vehicle
    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId && customerId) {
      const vRes = await query('SELECT id FROM vehicles WHERE customer_id = $1 LIMIT 1', [customerId]);
      if (vRes.rows.length > 0) resolvedVehicleId = vRes.rows[0].id;
    }
    
    const result = await query(
      `INSERT INTO quote_requests (customer_id, vehicle_id, issue_summary, preferred_date, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customerId || null, resolvedVehicleId || '00000000-0000-0000-0000-000000000002', description || serviceType || 'Issue not provided', preferredDate || null, status || 'open']
    );
    
    return success(res, result.rows[0]);
  } catch (err) {
    console.error('Add service request error:', err);
    return error(res, 'Failed to create service request', 'DATABASE_ERROR', 500);
  }
});

adminRouter.get('/service-requests', async (req, res) => {
  try {
      const result = await query(
      `SELECT DISTINCT ON (qr.created_at) qr.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName", 
              v.make as "vehicleMake", v.model as "vehicleModel", v.vin as "vin", qr.preferred_date as "preferredDate",
              COALESCE(
                qr.issue_summary,
                NULLIF((SELECT string_agg(i->>'title', ', ') FROM diagnosis_results dres, jsonb_array_elements(dres.issues) i WHERE dres.diagnosis_request_id = qr.diagnosis_request_id), ''),
                NULLIF((SELECT symptom_text FROM diagnosis_requests dr WHERE dr.id = qr.diagnosis_request_id), ''),
                'General Service'
              ) as "details", qr.status, qr.created_at as "createdAt"
       FROM quote_requests qr
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN garages g ON qr.garage_id = g.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       ORDER BY qr.created_at DESC`
      );
    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch service requests', 'DATABASE_ERROR', 500);
  }
});



adminRouter.get('/quotes', async (req, res) => {
  try {
    const result = await query(
      `SELECT q.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName", q.amount as "totalAmount",
              COALESCE(q.currency, g.business_currency, 'USD') as "currency",
              q.status, q.created_at as "createdAt", q.eta_days as "estimatedDays",
              v.make as "vehicleMake", v.model as "vehicleModel", v.vin as "vin",
              qr.preferred_date as "preferredDate", qr.issue_summary as "issueDescription"
       FROM quotes q
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN garages g ON q.garage_id = g.id
       ORDER BY q.created_at DESC`
    );
    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch quotes', 'DATABASE_ERROR', 500);
  }
});

adminRouter.post('/quotes', async (req, res) => {
  try {
    const { customerId, garageId, amount, status } = req.body;
    const qrResult = await query(
      `INSERT INTO quote_requests (customer_id, status) VALUES ($1, 'pending') RETURNING id`,
      [customerId || null]
    );
    const qrId = qrResult.rows[0].id;
    
    const result = await query(
      `INSERT INTO quotes (quote_request_id, garage_id, amount, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [qrId, garageId || null, amount || 0, status || 'pending']
    );
    return success(res, result.rows[0]);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to create quote', 'DATABASE_ERROR', 500);
  }
});

