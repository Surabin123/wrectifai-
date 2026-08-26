import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { query, getDbPool } from '../../config/database';
import fs from 'fs';
import path from 'path';

export const adminRouter = Router();

// Apply auth and admin role requirements to all routes in this sub-router
adminRouter.use(authenticate);
adminRouter.use(requireRole(['admin']));

adminRouter.get('/stats', async (req, res) => {
  try {
    const [
      customersCount,
      garagesCount,
      pendingCount,
      bookingsCount,
      quotesCount,
      serviceRequestsCount,
      completedJobsCount
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.code = 'customer'`),
      query(`SELECT COUNT(*) FROM garages WHERE approval_status IN ('active', 'approved')`),
      query(`SELECT COUNT(*) FROM garages WHERE approval_status = 'pending'`),
      query(`SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'inService')`),
      query(`SELECT COUNT(*) FROM quotes`),
      query(`SELECT COUNT(*) FROM quote_requests`),
      query(`SELECT COUNT(*) FROM bookings WHERE status = 'completed'`)
    ]);

    const [recentGarages, pendingGarageList] = await Promise.all([
      query(`
        SELECT g.id, g.name, u.name as "ownerName", u.mobile_number as phone, g.city, g.created_at as "createdAt", g.approval_status as "approvalStatus"
        FROM garages g
        LEFT JOIN users u ON g.owner_user_id = u.id
        WHERE g.approval_status IN ('active', 'approved')
        ORDER BY g.created_at DESC
      `),
      query(`
        SELECT g.id, g.name, u.name as "ownerName", u.mobile_number as phone, g.city, g.created_at as "createdAt", g.approval_status as "approvalStatus"
        FROM garages g
        LEFT JOIN users u ON g.owner_user_id = u.id
        WHERE g.approval_status = 'pending'
        ORDER BY g.created_at DESC
        LIMIT 10
      `)
    ]);

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
       WHERE g.approval_status != 'deleted'
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

    // Extract fields from jsonb 'location'
    if (garageData.location && typeof garageData.location === 'object') {
      garageData.country = garageData.location.country || garageData.country;
      garageData.locality = garageData.location.locality || garageData.locality;
    }

    // Map fields for frontend
    garageData.businessHours = garageData.business_hours || garageData.businessHours;
    garageData.createdAt = garageData.created_at || garageData.createdAt;
    garageData.approvalStatus = garageData.approval_status || garageData.approvalStatus;
    
    return success(res, garageData);
  } catch (err) {
    return error(res, 'Failed to fetch garage details', 'DATABASE_ERROR', 500);
  }
});

adminRouter.post('/onboarding/garages', async (req, res) => {
  const client = await getDbPool().connect();
  try {
    const { 
      name, phone, email, city, address, area,
      ownerName, ownerPhone, password, 
      services, description, workingHours,
      chips, image, country, responseMins
    } = req.body;

    // Backend validation for documents (before DB work)
    if (image) {
      if (image.type !== 'image/png') return error(res, 'Profile Image must be a PNG file.', 'VALIDATION_ERROR', 400);
      if (image.size && image.size > 2 * 1024 * 1024) return error(res, 'Profile Image must be less than 2MB.', 'VALIDATION_ERROR', 400);
    }

    const { businessRegDoc, businessLicenseDoc, ownerIdDoc, addressProofDoc } = req.body;
    const docs = [
      { obj: businessRegDoc, type: 'Business Registration' },
      { obj: businessLicenseDoc, type: 'Business License' },
      { obj: ownerIdDoc, type: 'Owner Identity Proof' },
      { obj: addressProofDoc, type: 'Address Proof' }
    ];

    for (const doc of docs) {
      if (doc.obj) {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(doc.obj.type)) return error(res, `Invalid file type for ${doc.type}.`, 'VALIDATION_ERROR', 400);
        if (doc.obj.size && doc.obj.size > 10 * 1024 * 1024) return error(res, `${doc.type} must be less than 10MB.`, 'VALIDATION_ERROR', 400);
      }
    }

    // Helper to save base64 files locally (fallback for dev)
    const saveBase64File = (fileObj: any, folder: string) => {
      if (!fileObj || !fileObj.data) return null;
      const match = fileObj.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!match || match.length !== 3) return null;
      const ext = fileObj.name.split('.').pop() || 'png';
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fullPath = path.join(process.cwd(), 'uploads', folder);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      fs.writeFileSync(path.join(fullPath, filename), Buffer.from(match[2], 'base64') as any);
      return `/uploads/${folder}/${filename}`;
    };

    // Helper to upload base64 files to Cloudinary for production
    const uploadBase64File = async (fileObj: any, folder: string) => {
      if (!fileObj || !fileObj.data) return null;
      if (process.env.RENDER === 'true' || process.env.CLOUDINARY_URL) {
        try {
          const { v2: cloudinary } = require('cloudinary');
          
          const config = cloudinary.config();
          const diagnostics = {
             hasUrl: !!process.env.CLOUDINARY_URL,
             hasCloudName: !!config.cloud_name,
             hasApiKey: !!config.api_key,
             hasApiSecret: !!config.api_secret
          };
          console.log('Cloudinary Env Check:', diagnostics);

          const result = await cloudinary.uploader.upload(fileObj.data, {
            folder: `wrectifai/${folder}`,
            public_id: `garage_${Date.now()}_${Math.random().toString(36).substring(7)}`
          });
          return result.secure_url;
        } catch (err: any) {
          console.error('Cloudinary Upload Error:', err);
          const { v2: cloudinary } = require('cloudinary');
          const config = cloudinary.config();
          const diagStr = `hasUrl=${!!process.env.CLOUDINARY_URL}, hasCloudName=${!!config.cloud_name}, hasApiKey=${!!config.api_key}, hasApiSecret=${!!config.api_secret}`;
          throw new Error(`Cloudinary upload failed: ${err.message || 'Unknown error'}. Diagnostics: ${diagStr}`);
        }
      }
      return saveBase64File(fileObj, folder);
    };

    const geocodeAddress = async (address: string, area: string, city: string, country: string) => {
      try {
        const queryParts = [address, area, city, country].filter(Boolean);
        const query = encodeURIComponent(queryParts.join(', '));
        if (!query) return { lat: null, lng: null };
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
          headers: { 'User-Agent': 'WrectifAI-App/1.0 (admin@wrectifai.com)' },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          }
        }
        
        // Fallback: Try just city and country if full address fails
        const fallbackQuery = encodeURIComponent([city, country].filter(Boolean).join(', '));
        if (fallbackQuery) {
          const fbRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${fallbackQuery}&limit=1`, {
            headers: { 'User-Agent': 'WrectifAI-App/1.0 (admin@wrectifai.com)' },
            signal: AbortSignal.timeout(5000)
          });
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData && fbData.length > 0) {
              return { lat: parseFloat(fbData[0].lat), lng: parseFloat(fbData[0].lon) };
            }
          }
        }
      } catch (err) {
        console.warn('[WrectifAI Geocoding] Nominatim failed or timed out:', err);
      }
      
      // Smart Fallback for popular testing cities if GPS completely fails
      console.warn('[WrectifAI Geocoding] Using smart fallback for city:', city);
      const fallbackCities: Record<string, {lat: number, lng: number}> = {
        'chennai': { lat: 13.0827, lng: 80.2707 },
        'bengaluru': { lat: 12.9716, lng: 77.5946 },
        'bangalore': { lat: 12.9716, lng: 77.5946 },
        'mumbai': { lat: 19.0760, lng: 72.8777 },
        'delhi': { lat: 28.7041, lng: 77.1025 },
        'hyderabad': { lat: 17.3850, lng: 78.4867 },
        'pune': { lat: 18.5204, lng: 73.8567 },
        'dubai': { lat: 25.2048, lng: 55.2708 },
        'new york': { lat: 40.7128, lng: -74.0060 }
      };
      
      const cityKey = (city || '').toLowerCase().trim();
      if (fallbackCities[cityKey]) {
        return fallbackCities[cityKey];
      }

      return { lat: null, lng: null };
    };

    await client.query('BEGIN');

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if user already exists
    let ownerId;
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1 OR mobile_number = $2', [email, ownerPhone || phone]);
    
    if (existingUser.rows.length > 0) {
      ownerId = existingUser.rows[0].id;
      // Optionally update password hash
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, ownerId]);
    } else {
      // Create Owner User
      const newUser = await client.query(
        `INSERT INTO users (name, mobile_number, email, password_hash, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
        [ownerName, ownerPhone || phone, email, passwordHash]
      );
      ownerId = newUser.rows[0].id;
    }

    // Assign Garage Role
    const roleResult = await client.query("SELECT id FROM roles WHERE code = 'garage'");
    if (roleResult.rows.length > 0) {
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ownerId, roleResult.rows[0].id]);
    }

    const imagePath = await uploadBase64File(image, 'garages');
    const coords = await geocodeAddress(address, area, city, country || 'IN');

    // Insert Garage — only columns that exist in the live garages table
    const newGarage = await client.query(
      `INSERT INTO garages (
        name, address, city, owner_user_id, approval_status, is_approved,
        specializations, image, location, response_mins, description, business_hours
      ) VALUES ($1, $2, $3, $4, 'approved', true, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        name,
        address,
        city || null,
        ownerId,
        chips || [],
        imagePath || null,
        JSON.stringify({ city, lat: coords.lat, lng: coords.lng, locality: area || null, country: country || 'IN' }),
        responseMins || null,
        description || null,
        workingHours ? JSON.stringify(workingHours) : null
      ]
    );
    const garageId = newGarage.rows[0].id;

    // Insert Documents
    for (const doc of docs) {
      if (doc.obj) {
        const docPath = await uploadBase64File(doc.obj, 'garages/documents');
        if (docPath) {
          await client.query(
            `INSERT INTO garage_documents (garage_id, doc_type, file_url, verification_status) VALUES ($1, $2, $3, 'approved')`,
            [garageId, doc.type, docPath]
          );
        }
      }
    }

    // Insert Services
    if (services && Array.isArray(services)) {
      for (const serviceName of services) {
        await client.query(
          `INSERT INTO services (garage_id, name, description, price, duration_mins) VALUES ($1, $2, $3, $4, $5)`,
          [garageId, serviceName, 'General service', 0, 60]
        );
      }
    }

    await client.query('COMMIT');

    return success(res, { id: garageId, message: 'Garage registered successfully' }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Garage registration error:', err);
    return error(res, err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Failed to register garage'), 'DATABASE_ERROR', 500);
  } finally {
    client.release();
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
    
    if (status === 'delete') {
      // Permanently delete garage and its dependencies
      await query('DELETE FROM garage_documents WHERE garage_id = $1', [req.params.id]);
      await query('DELETE FROM garage_badges WHERE garage_id = $1', [req.params.id]);
      await query('DELETE FROM services WHERE garage_id = $1', [req.params.id]);
      await query('DELETE FROM quotes WHERE garage_id = $1', [req.params.id]);
      await query('DELETE FROM bookings WHERE garage_id = $1', [req.params.id]);
      
      const result = await query('DELETE FROM garages WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) return error(res, 'Garage not found', 'NOT_FOUND', 404);

      return success(res, { success: true, message: 'Garage permanently deleted' });
    }

    if (!['active', 'inactive', 'suspended', 'rejected'].includes(status)) {
      return error(res, 'Invalid action', 'INVALID_ACTION', 400);
    }
    const is_approved = (status === 'active');
    const dbStatus = status === 'active' ? 'approved' : status === 'inactive' ? 'pending' : status;
    
    const result = await query(
      `UPDATE garages SET approval_status = $1, is_approved = $2 WHERE id = $3 RETURNING id`,
      [dbStatus, is_approved, req.params.id]
    );
    if (result.rows.length === 0) return error(res, 'Garage not found', 'NOT_FOUND', 404);
    
    return success(res, {
      garageId: req.params.id,
      approvalStatus: status, // return what frontend expects
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

// GET Customer details
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userRes = await query(`SELECT id, name, email, mobile_number as phone, created_at as joined, status FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) return error(res, 'User not found', 'NOT_FOUND', 404);
    const user = userRes.rows[0];

    const vehiclesRes = await query(`SELECT id, make, model, year, vin, plate_number as "plateNumber" FROM vehicles WHERE customer_id = $1`, [userId]);
    const bookingsRes = await query(`
      SELECT b.id, b.status, b.created_at as "createdAt", g.name as "garageName", v.make as "vehicleMake", v.model as "vehicleModel", 
             b.total_amount as "amount", COALESCE(b.currency, g.business_currency, 'USD') as currency
      FROM bookings b
      LEFT JOIN garages g ON b.garage_id = g.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.customer_id = $1 ORDER BY b.created_at DESC`, [userId]);
    const quotesRes = await query(`
      SELECT q.id, q.status, q.created_at as "createdAt", g.name as "garageName", v.make as "vehicleMake", v.model as "vehicleModel", 
             q.amount, COALESCE(q.currency, g.business_currency, 'USD') as currency
      FROM quotes q
      LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
      LEFT JOIN garages g ON q.garage_id = g.id
      LEFT JOIN vehicles v ON qr.vehicle_id = v.id
      WHERE qr.customer_id = $1 ORDER BY q.created_at DESC`, [userId]);

    user.vehicles = vehiclesRes.rows;
    user.bookings = bookingsRes.rows;
    user.quotes = quotesRes.rows;

    return success(res, user);
  } catch (err) {
    return error(res, 'Failed to fetch user details', 'DATABASE_ERROR', 500);
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
      `SELECT b.id, u.name as "customerName", u.mobile_number as "customerPhone", p.city as "customerCity", g.name as "garageName", b.status, b.created_at as "createdAt",
              b.scheduled_at as "scheduledAt", b.total_amount as "totalAmount", COALESCE(b.currency, g.business_currency, 'USD') as "currency",
              v.make as "vehicleMake", v.model as "vehicleModel",
              v.vin as "vin", b.quote_id as "quoteId", q.eta_days as "estimatedDays", qr.issue_summary as "issueDescription", qr.preferred_date as "preferredDate",
              (SELECT status FROM payments p WHERE p.booking_id = b.id ORDER BY p.created_at DESC LIMIT 1) as "paymentStatus"
       FROM bookings b
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
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

adminRouter.get('/service-history', async (req, res) => {
  try {
      const result = await query(
      `SELECT b.id, u.name as "customerName", u.mobile_number as "customerPhone", g.name as "garageName",
              COALESCE(b.total_amount, q.amount) as "totalAmount", COALESCE(b.currency, g.business_currency, 'USD') as "currency",
              b.status, b.created_at as "createdAt", b.updated_at as "completedAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.vin as "vin",
              COALESCE(qr.issue_summary, b.booking_type, 'General Service') as "details"
       FROM bookings b
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN garages g ON b.garage_id = g.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       WHERE b.status IN ('completed', 'readyForCollection', 'collected')
       ORDER BY b.updated_at DESC`
      );
    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch service history', 'DATABASE_ERROR', 500);
  }
});



adminRouter.get('/quotes', async (req, res) => {
  try {
    const result = await query(
      `SELECT q.id, u.name as "customerName", u.mobile_number as "customerPhone", p.city as "customerCity", g.name as "garageName", g.city as "garageCity", q.amount as "totalAmount",
              COALESCE(g.business_currency, q.currency, 'USD') as "currency",
              q.status, q.created_at as "createdAt", q.eta_days as "estimatedDays",
              v.make as "vehicleMake", v.model as "vehicleModel", v.vin as "vin",
              qr.preferred_date as "preferredDate", qr.issue_summary as "issueDescription"
       FROM quotes q
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
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

adminRouter.put('/garages/:id', async (req, res) => {
  try {
    const { name, phone, address, description, businessHours } = req.body;
    
    // Update garage details
    // For phone number update, we would ideally update the owner's user account, 
    // but for now, we just assume it's part of the user's mobile_number or garage contact logic.
    // If we only have address, description, businessHours, name on garage table, let's update those:
    const result = await query(
      `UPDATE garages 
       SET name = COALESCE($1, name), 
           address = COALESCE($2, address), 
           description = COALESCE($3, description), 
           business_hours = COALESCE($4, business_hours),
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, address, description, businessHours, req.params.id]
    );

    if (result.rows.length === 0) {
      return error(res, 'Garage not found', 'NOT_FOUND', 404);
    }
    
    // If phone is provided, let's update the owner's phone if there is a way to link it (e.g. via users table).
    // The current architecture registers the user, we will try to find the owner user via an association or assume the current user is the owner if garage side, 
    // but since this is admin side, we might not have a direct garage owner mapping without joining garage_team/users.
    
    return success(res, result.rows[0]);
  } catch (err) {
    console.error('Update garage error:', err);
    return error(res, 'Failed to update garage', 'DATABASE_ERROR', 500);
  }
});

