import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query, getDbPool } from '../../config/database';

export const garagesRouter = Router();

// Helper: resolve garageId from token or DB (handles stale tokens without garageId)
async function resolveGarageId(userId: string, tokenGarageId?: string): Promise<string | null> {
  if (tokenGarageId) return tokenGarageId;
  const result = await query(
    'SELECT id FROM garages WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Badges removed per product requirement — no promotional badge fields returned
function mapGarageDbRow(g: any) {
  // Extract coordinates from JSONB location column
  let coordinates: [number, number] | null = null;
  const loc = g.location || {};
  if (loc.lat && loc.lng) {
    coordinates = [Number(loc.lng), Number(loc.lat)];
  }

  // Use GPS-calculated distanceKm when available; never fall back to static seeded value
  const distanceKm = (g.distanceKm !== null && g.distanceKm !== undefined && g.distanceKm !== '')
    ? Number(g.distanceKm)
    : null;

  return {
    id: g.id,
    name: g.name,
    // Full address string for detail views
    address: g.address || '',
    // Structured location from JSONB — all fields from DB, never hardcoded
    locationData: {
      locality: loc.locality || null,
      city: loc.city || g.city || null,
      state: loc.state || null,
      country: loc.country || null,
      lat: loc.lat ? Number(loc.lat) : null,
      lng: loc.lng ? Number(loc.lng) : null,
    },
    rating: g.ratingAvg !== null && g.ratingAvg !== undefined ? Number(g.ratingAvg) : 0,
    reviews: Number(g.ratingCount || 0),
    // distanceKm: only present when calculated from real GPS coords, null otherwise
    distanceKm,
    price: g.startingPrice || null,
    // badge intentionally omitted — no promotional badges
    image: g.image || null,
    chips: g.specializations || [],
    verified: g.approval_status === 'active' || g.approval_status === 'approved',
    // responseMins: null means not specified — frontend must NOT default to 30
    responseMins: (g.responseMins !== null && g.responseMins !== undefined) ? Number(g.responseMins) : null,
    coordinates,
    description: g.description || null,
    businessHours: g.business_hours || null,
    approvalStatus: g.approval_status || null,
  };
}

garagesRouter.get('/', async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const city = req.query.city ? (req.query.city as string).toLowerCase() : null;
    // country enforces region isolation: India users see only India garages, US only US, etc.
    const country = req.query.country ? (req.query.country as string) : null;

    // No GPS coords provided: return NULL — never show seeded/fake distance values
    let distanceSql = 'NULL::NUMERIC as "distanceKm"';
    const params: any[] = [];
    let condition = "g.approval_status IN ('active', 'approved', 'suspended')";

    if (lat !== null && !isNaN(lat) && lng !== null && !isNaN(lng)) {
      // Haversine formula in Postgres to calculate distance in km using JSONB coordinates
      distanceSql = `
        CASE 
          WHEN g.location->>'lat' IS NOT NULL AND g.location->>'lng' IS NOT NULL THEN
            (6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(CAST(g.location->>'lat' AS NUMERIC))) * 
                cos(radians(CAST(g.location->>'lng' AS NUMERIC)) - radians($2)) + 
                sin(radians($1)) * sin(radians(CAST(g.location->>'lat' AS NUMERIC)))
              ))
            ))
          ELSE NULL
        END as "distanceKm"
      `;
      params.push(lat, lng);
    }

    // Strict city filter — backend enforced, not frontend hidden
    if (city && city !== 'location') {
      condition += ` AND LOWER(COALESCE(g.location->>'city', g.city)) = $${params.length + 1}`;
      params.push(city);
    }

    // Country filter — region-scopes the query so India/USA/UAE garages never mix.
    if (country) {
      const countryIsoMap: Record<string, string> = {
        'india': 'in',
        'united states': 'us',
        'usa': 'us',
        'united arab emirates': 'ae',
        'uae': 'ae',
      };
      const isoCode = countryIsoMap[country.toLowerCase()] || country.toLowerCase();
      condition += ` AND (
        LOWER(COALESCE(g.location->>'country', '')) = $${params.length + 1}
        OR LOWER(COALESCE(g.location->>'country', '')) = $${params.length + 2}
      )`;
      params.push(country.toLowerCase(), isoCode);
    }

    const result = await query(`
      SELECT g.id, g.name, g.address, g.specializations, g.approval_status, 
             g.rating_avg as "ratingAvg", g.rating_count as "ratingCount",
             g.starting_price as "startingPrice", ${distanceSql},
             g.image, g.response_mins as "responseMins",
             g.location, g.description, g.business_hours
      FROM garages g
      WHERE ${condition}
      ORDER BY g.created_at ASC
    `, params);

    const mapped = result.rows.map(mapGarageDbRow);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return success(res, mapped);
  } catch (err) {
    console.error('Error fetching garages:', err);
    return error(res, 'Failed to fetch garages', 'DATABASE_ERROR', 500);
  }
});

// GET /api/v1/garages/:id/inventory
garagesRouter.get('/:id/inventory', async (req, res) => {
  try {
    const result = await query(
      `SELECT gi.id as inventory_id, p.id as product_id, p.name, p.category, p.description, p.is_diy_kit, p.image,
              p.compatible_vehicle_rules as "compatibleVehicleRules",
              gi.qty_available, COALESCE(gi.price, p.price) as price, gi.is_active
       FROM garage_inventory gi
       JOIN products p ON gi.product_id = p.id
       WHERE gi.garage_id = $1 AND gi.is_active = true AND p.is_active = true
       ORDER BY p.name ASC`,
      [req.params.id]
    );
    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch garage inventory', 'INTERNAL_SERVER_ERROR', 500);
  }
});

garagesRouter.get('/my-profile', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT g.id, g.name as "garageName", g.address, g.location, g.specializations, 
              g.pickup_drop_supported as "pickupDropSupported", g.approval_status as "approvalStatus", 
              g.rating_avg as "ratingAvg", g.rating_count as "ratingCount", 
              g.image, g.description, g.business_hours as "businessHours",
              u.name as "ownerName", u.email as "ownerEmail", u.mobile_number as "ownerPhone",
              (SELECT COUNT(*) FROM services WHERE garage_id = g.id) as "servicesCount",
              (SELECT COUNT(*) FROM garage_inventory WHERE garage_id = g.id) as "inventoryCount"
       FROM garages g
       JOIN users u ON g.owner_user_id = u.id
       WHERE g.id = $1 AND g.owner_user_id = $2`,
      [garageId, garageUserId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Garage profile not found', 'NOT_FOUND', 404);
    }

    const documentsResult = await query(
      `SELECT doc_type, verification_status FROM garage_documents WHERE garage_id = $1`,
      [garageId]
    );

    return success(res, {
      ...result.rows[0],
      servicesCount: Number(result.rows[0].servicesCount),
      inventoryCount: Number(result.rows[0].inventoryCount),
      documents: documentsResult.rows
    });
  } catch (err) {
    console.error('Failed to fetch garage profile:', err);
    return error(res, 'Failed to fetch garage profile', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.put('/my-profile', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const { 
      garageName, address, location, specializations, 
      pickupDropSupported, image, description, businessHours 
    } = req.body;

    let processedImage = image;
    
    if (image && image.startsWith('data:image')) {
      if (process.env.RENDER === 'true' || process.env.CLOUDINARY_URL) {
        try {
          const { v2: cloudinary } = require('cloudinary');
          const uploadResult = await cloudinary.uploader.upload(image, {
            folder: `wrectifai/garages`,
            public_id: `garage_${Date.now()}_${Math.random().toString(36).substring(7)}`
          });
          processedImage = uploadResult.secure_url;
        } catch (err) {
          console.error('Cloudinary Upload Error:', err);
          // If cloudinary fails, keep the base64 or fallback (could be too large for DB)
        }
      }
    }

    const result = await query(
      `UPDATE garages 
       SET name = COALESCE($1, name), 
           address = COALESCE($2, address), 
           location = COALESCE($3, location), 
           specializations = COALESCE($4, specializations), 
           pickup_drop_supported = COALESCE($5, pickup_drop_supported), 
           image = COALESCE($6, image), 
           description = COALESCE($7, description), 
           business_hours = COALESCE($8, business_hours), 
           updated_at = NOW()
       WHERE id = $9 AND owner_user_id = $10
       RETURNING id, name as "garageName", address, location, specializations, 
                 pickup_drop_supported as "pickupDropSupported", approval_status as "approvalStatus", 
                 image, description, business_hours as "businessHours"`,
      [
        garageName, address, location ? JSON.stringify(location) : null, 
        specializations, pickupDropSupported, processedImage, description, 
        businessHours ? JSON.stringify(businessHours) : null, 
        garageId, garageUserId
      ]
    );

    if (result.rows.length === 0) {
      return error(res, 'Garage profile not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0]);
  } catch (err) {
    console.error('Failed to update garage profile:', err);
    return error(res, 'Failed to update garage profile', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/my-customers', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `WITH customer_bookings AS (
         SELECT customer_id, 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status IN ('requested', 'confirmed', 'in_progress', 'readyForCollection') THEN 1 END) as pending_bookings,
                SUM(total_amount) as total_booking_spend,
                MIN(created_at) as first_booking_date,
                MAX(updated_at) as last_booking_date
         FROM bookings
         WHERE garage_id = $1
         GROUP BY customer_id
       ),
       customer_orders AS (
         SELECT customer_id, 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status IN ('pendingPayment', 'paid', 'processing', 'shipped') THEN 1 END) as pending_orders,
                SUM(total) as total_order_spend,
                MIN(created_at) as first_order_date,
                MAX(updated_at) as last_order_date
         FROM orders
         WHERE garage_id = $1
         GROUP BY customer_id
       ),
       customer_vehicles AS (
         SELECT v.customer_id, array_agg(DISTINCT (v.make || ' ' || v.model || COALESCE(' (' || v.vin || ')', ''))) as vehicles
         FROM vehicles v
         JOIN bookings b ON b.vehicle_id = v.id
         WHERE b.garage_id = $1
         GROUP BY v.customer_id
       )
       SELECT 
         u.id, 
         u.name, 
         u.email, 
         u.mobile_number as "mobileNumber", 
         v.vehicles,
         COALESCE(cb.total_bookings, 0) as "totalBookings",
         COALESCE(cb.pending_bookings, 0) as "pendingBookings",
         COALESCE(co.total_orders, 0) as "totalOrders",
         COALESCE(co.pending_orders, 0) as "pendingOrders",
         COALESCE(cb.total_booking_spend, 0) + COALESCE(co.total_order_spend, 0) as "totalSpend",
         LEAST(cb.first_booking_date, co.first_order_date) as "firstInteractionDate",
         GREATEST(cb.last_booking_date, co.last_order_date) as "lastVisit"
       FROM users u
       LEFT JOIN customer_bookings cb ON u.id = cb.customer_id
       LEFT JOIN customer_orders co ON u.id = co.customer_id
       LEFT JOIN customer_vehicles v ON u.id = v.customer_id
       WHERE cb.customer_id IS NOT NULL OR co.customer_id IS NOT NULL
       ORDER BY "lastVisit" DESC`,
      [garageId]
    );

    const customers = result.rows.map(row => ({
      id: row.id,
      name: row.name || 'Unknown',
      email: row.email,
      phone: row.mobileNumber,
      avatar: null,
      vehicles: row.vehicles || [],
      joinDate: row.firstInteractionDate,
      lastVisit: row.lastVisit,
      totalBookings: Number(row.totalBookings),
      pendingBookings: Number(row.pendingBookings),
      totalOrders: Number(row.totalOrders),
      pendingOrders: Number(row.pendingOrders),
      totalSpend: Number(row.totalSpend)
    }));

    return success(res, customers);
  } catch (err) {
    console.error('Failed to fetch garage customers', err);
    return error(res, 'Failed to fetch customers', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/my-customers/:id', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const customerId = req.params.id;

    // Verify customer actually belongs to this garage
    const verifyResult = await query(
      `SELECT 1 FROM (
         SELECT customer_id FROM bookings WHERE garage_id = $1 AND customer_id = $2
         UNION
         SELECT customer_id FROM orders WHERE garage_id = $1 AND customer_id = $2
       ) as interactions`,
      [garageId, customerId]
    );

    if (verifyResult.rows.length === 0) {
      return error(res, 'Customer not found or access denied', 'NOT_FOUND', 404);
    }

    // Fetch user details
    const userResult = await query(
      `SELECT id, name, email, mobile_number as "phone", created_at as "joined", status
       FROM users WHERE id = $1`,
      [customerId]
    );
    const user = userResult.rows[0];

    // Fetch vehicles
    const vehiclesResult = await query(
      `SELECT DISTINCT v.id, v.make, v.model, v.year, v.vin, v.plate_number as "plateNumber"
       FROM vehicles v
       JOIN bookings b ON b.vehicle_id = v.id
       WHERE v.customer_id = $1 AND b.garage_id = $2`,
      [customerId, garageId]
    );

    // Fetch bookings with this garage
    const bookingsResult = await query(
      `SELECT b.id, b.created_at as "createdAt", 'INR' as "currency", b.total_amount as "amount", b.status, g.name as "garageName"
       FROM bookings b
       JOIN garages g ON b.garage_id = g.id
       WHERE b.customer_id = $1 AND b.garage_id = $2
       ORDER BY b.created_at DESC`,
      [customerId, garageId]
    );

    // Fetch orders with this garage
    const ordersResult = await query(
      `SELECT o.id, o.created_at as "createdAt", 'INR' as "currency", o.total as "amount", o.status, g.name as "garageName"
       FROM orders o
       JOIN garages g ON o.garage_id = g.id
       WHERE o.customer_id = $1 AND o.garage_id = $2
       ORDER BY o.created_at DESC`,
      [customerId, garageId]
    );

    return success(res, {
      ...user,
      vehicles: vehiclesResult.rows,
      bookings: bookingsResult.rows,
      orders: ordersResult.rows,
      quotes: [] // Optional: if garage quotes exist, can be fetched similarly
    });

  } catch (err) {
    console.error('Failed to fetch garage customer details', err);
    return error(res, 'Failed to fetch customer details', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/my-inventory', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT gi.id as inventory_id, p.id as product_id, p.name, p.category, p.description, p.is_diy_kit, p.image,
              gi.qty_available, COALESCE(gi.price, p.price) as price, gi.is_active,
              p.price as "basePrice"
       FROM garage_inventory gi
       JOIN products p ON gi.product_id = p.id
       WHERE gi.garage_id = $1
       ORDER BY p.name ASC`,
      [garageId]
    );

    return success(res, result.rows);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch inventory', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.post('/my-inventory', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { productId, price, qtyAvailable } = req.body;
    
    if (!productId || price === undefined || qtyAvailable === undefined) {
      return error(res, 'Missing required fields', 'BAD_REQUEST', 400);
    }

    const parsedPrice = Number(price);
    const parsedQty = parseInt(qtyAvailable, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0 || isNaN(parsedQty) || parsedQty < 0) {
      return error(res, 'Invalid price or quantity', 'BAD_REQUEST', 400);
    }

    // Check if it already exists
    const existing = await query(
      `SELECT id FROM garage_inventory WHERE garage_id = $1 AND product_id = $2`,
      [garageId, productId]
    );

    if (existing.rows.length > 0) {
      return error(res, 'Product already in your inventory', 'ALREADY_EXISTS', 400);
    }

    const result = await query(
      `INSERT INTO garage_inventory (garage_id, product_id, price, qty_available, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [garageId, productId, parsedPrice, parsedQty]
    );

    return success(res, result.rows[0], 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to add inventory item', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.put('/my-inventory/:inventoryId', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { price, qty_available, is_active } = req.body;
    
    const parsedPrice = price !== undefined ? Number(price) : undefined;
    const parsedQty = qty_available !== undefined ? parseInt(qty_available, 10) : undefined;
    if ((parsedPrice !== undefined && (isNaN(parsedPrice) || parsedPrice < 0)) || 
        (parsedQty !== undefined && (isNaN(parsedQty) || parsedQty < 0))) {
      return error(res, 'Invalid price or quantity', 'BAD_REQUEST', 400);
    }

    // Ensure we only update if it belongs to this garage
    const result = await query(
      `UPDATE garage_inventory 
       SET price = COALESCE($1, price), qty_available = COALESCE($2, qty_available), is_active = COALESCE($3, is_active), updated_at = NOW()
       WHERE id = $4 AND garage_id = $5
       RETURNING *`,
      [parsedPrice, parsedQty, is_active, req.params.inventoryId, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Inventory item not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0]);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to update inventory', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.delete('/my-inventory/:inventoryId', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const result = await query(
      `DELETE FROM garage_inventory WHERE id = $1 AND garage_id = $2 RETURNING id`,
      [req.params.inventoryId, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Inventory item not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, { message: 'Inventory item removed successfully' });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to remove inventory item', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.post('/my-inventory/request', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { name, category, description, brand, suggestedPrice, image } = req.body;
    
    if (!name || !category) {
      return error(res, 'Name and category are required', 'BAD_REQUEST', 400);
    }
    
    let processedImage = image;
    if (image && image.startsWith('data:image')) {
      if (process.env.RENDER === 'true' || process.env.CLOUDINARY_URL) {
        try {
          const { v2: cloudinary } = require('cloudinary');
          const uploadResult = await cloudinary.uploader.upload(image, {
            folder: `wrectifai/requests`,
          });
          processedImage = uploadResult.secure_url;
        } catch (err) {}
      }
    }

    const result = await query(
      `INSERT INTO product_requests (garage_id, name, category, description, brand, image, suggested_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [garageId, name, category, description, brand || null, processedImage, suggestedPrice || null]
    );

    return success(res, result.rows[0], 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to submit product request', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/my-services', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT s.id, ps.name, ps.category, ps.description, ps.icon, s.price, s.is_active, s.duration_mins,
              s.duration_unit, ps.base_price as "basePrice"
       FROM services s 
       JOIN platform_services ps ON s.platform_service_id = ps.id 
       WHERE s.garage_id = $1
       ORDER BY ps.name ASC`,
      [garageId]
    );
    return success(res, result.rows);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch services', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.post('/my-services', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { platformServiceId, price, durationMins } = req.body;
    
    if (!platformServiceId || price === undefined) {
      return error(res, 'Missing required fields', 'BAD_REQUEST', 400);
    }

    const parsedPrice = Number(price);
    const parsedDuration = Number(durationMins || 60);
    if (isNaN(parsedPrice) || parsedPrice < 0 || isNaN(parsedDuration) || parsedDuration < 0) {
      return error(res, 'Invalid price or duration', 'BAD_REQUEST', 400);
    }

    // Fetch the platform service details to copy into the garage service
    const psResult = await query(
      `SELECT name, category, description FROM platform_services WHERE id = $1`,
      [platformServiceId]
    );
    
    if (psResult.rows.length === 0) {
      return error(res, 'Platform service not found', 'NOT_FOUND', 404);
    }
    const ps = psResult.rows[0];

    // Check if it already exists
    const existing = await query(
      `SELECT id FROM services WHERE garage_id = $1 AND platform_service_id = $2`,
      [garageId, platformServiceId]
    );

    if (existing.rows.length > 0) {
      return error(res, 'Service already added to your garage', 'ALREADY_EXISTS', 400);
    }

    const result = await query(
      `INSERT INTO services (garage_id, platform_service_id, name, category, description, price, duration_mins, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [garageId, platformServiceId, ps.name, ps.category, ps.description, parsedPrice, parsedDuration]
    );

    return success(res, result.rows[0], 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to add service', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.put('/my-services/:serviceId', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { price, is_active, duration_mins, description } = req.body;
    
    const parsedPrice = price !== undefined ? Number(price) : undefined;
    const parsedDuration = duration_mins !== undefined ? Number(duration_mins) : undefined;
    if ((parsedPrice !== undefined && (isNaN(parsedPrice) || parsedPrice < 0)) || 
        (parsedDuration !== undefined && (isNaN(parsedDuration) || parsedDuration < 0))) {
      return error(res, 'Invalid price or duration', 'BAD_REQUEST', 400);
    }

    const result = await query(
      `UPDATE services 
       SET price = COALESCE($1, price), is_active = COALESCE($2, is_active), duration_mins = COALESCE($3, duration_mins), description = COALESCE($4, description), updated_at = NOW()
       WHERE id = $5 AND garage_id = $6
       RETURNING *`,
      [parsedPrice, is_active, parsedDuration, description, req.params.serviceId, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Service not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0]);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to update service', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.delete('/my-services/:serviceId', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const result = await query(
      `DELETE FROM services WHERE id = $1 AND garage_id = $2 RETURNING id`,
      [req.params.serviceId, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Service not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, { message: 'Service removed successfully' });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to remove service', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.post('/my-services/request', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { name, category, description, suggestedDuration, suggestedPrice, durationUnit } = req.body;
    
    if (!name || !category) {
      return error(res, 'Name and category are required', 'BAD_REQUEST', 400);
    }
    
    const parsedPrice = suggestedPrice !== undefined && suggestedPrice !== '' ? Number(suggestedPrice) : 0;
    const parsedDuration = suggestedDuration !== undefined && suggestedDuration !== '' ? Number(suggestedDuration) : 60;
    
    // We optionally use durationUnit if the schema supports it. It was passed by the frontend.
    // If not, it will just insert the default columns safely.
    const result = await query(
      `INSERT INTO services (garage_id, name, category, description, price, duration_mins, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [garageId, name, category, description, parsedPrice, parsedDuration]
    );

    // Also update the duration_unit if the column exists (safe update)
    if (durationUnit) {
      try {
        await query(`UPDATE services SET duration_unit = $1 WHERE id = $2`, [durationUnit, result.rows[0].id]);
      } catch (e) {
        // Ignore if duration_unit column does not exist
      }
    }

    return success(res, result.rows[0], 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to add service', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/search', async (req, res) => {
  try {
    const { rating, specialization, price_range, lat, lng, distance, city } = req.query;

    const conditions: string[] = ["g.approval_status IN ('active', 'approved', 'suspended')"];
    const params: any[] = [];

    if (rating) {
      params.push(Number(rating));
      conditions.push(`g.rating_avg >= $${params.length}`);
    }

    if (specialization) {
      params.push(specialization);
      conditions.push(`$${params.length} = ANY(g.specializations)`);
    }

    if (city) {
      params.push(city);
      conditions.push(`(LOWER(g.location->>'city') = $${params.length} OR LOWER(g.city) = $${params.length})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT g.id, g.name, g.address, g.specializations, g.approval_status, 
              g.rating_avg as "ratingAvg", g.rating_count as "ratingCount",
              g.starting_price as "startingPrice", NULL::NUMERIC as "distanceKm",
              g.image, g.response_mins as "responseMins",
              g.location, g.description, g.business_hours
       FROM garages g
       ${whereClause}`,
      params
    );

    const mapped = result.rows.map(mapGarageDbRow);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return success(res, mapped);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

// GET /api/v1/garages/my-requests
garagesRouter.get('/my-requests', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const [servicesRes, productsRes] = await Promise.all([
      query(`SELECT *, 'service' as type FROM service_requests WHERE garage_id = $1 ORDER BY created_at DESC`, [garageId]),
      query(`SELECT *, 'product' as type FROM product_requests WHERE garage_id = $1 ORDER BY created_at DESC`, [garageId])
    ]);
    // added_service_id / added_inventory_id are now included in SELECT * from migration 057

    const allRequests = [...servicesRes.rows, ...productsRes.rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return success(res, allRequests);
  } catch (err) {
    console.error('Fetch my-requests error:', err);
    return error(res, 'Failed to fetch requests', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/:id', async (req, res) => {
  try {
    const [result, servicesResult] = await Promise.all([
      query(
        `SELECT g.id, g.name, g.address, g.specializations, g.approval_status, 
                g.rating_avg as "ratingAvg", g.rating_count as "ratingCount",
                g.starting_price as "startingPrice", NULL::NUMERIC as "distanceKm",
                g.image, g.response_mins as "responseMins",
                g.location, g.description, g.business_hours
         FROM garages g
         WHERE g.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT s.id, ps.name, ps.category, ps.description, ps.icon, s.price, s.is_active 
         FROM services s 
         JOIN platform_services ps ON s.platform_service_id = ps.id 
         WHERE s.garage_id = $1`,
        [req.params.id]
      )
    ]);
    
    if (result.rows.length === 0) {
      return error(res, 'Garage not found', 'NOT_FOUND', 404);
    }
    const mapped = mapGarageDbRow(result.rows[0]);
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    return success(res, { ...mapped, services: servicesResult.rows });
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

garagesRouter.get('/:id/reviews', async (req, res) => {
  try {
    const currentUserId = req.query.userId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [reviewsResult, statsResult, countResult] = await Promise.all([
      query(
        `SELECT r.id, r.customer_id as "customerId", COALESCE(u.name, r.customer_name) as "name", r.rating, r.text, r.created_at as "date", 
                'Verified Customer' as "status", r.likes_count as "likes", r.unlikes_count as "unlikes",
                EXISTS (
                  SELECT 1 FROM garage_review_likes grl 
                  WHERE grl.review_id = r.id AND grl.customer_id = $2 AND grl.vote_type = 'like'
                ) as "isLikedByUser",
                EXISTS (
                  SELECT 1 FROM garage_review_likes grl 
                  WHERE grl.review_id = r.id AND grl.customer_id = $2 AND grl.vote_type = 'unlike'
                ) as "isUnlikedByUser"
         FROM garage_reviews r
         LEFT JOIN users u ON r.customer_id = u.id
         WHERE r.garage_id = $1 AND (r.is_hidden = FALSE OR r.is_hidden IS NULL)
         ORDER BY r.created_at DESC
         LIMIT $3 OFFSET $4`,
        [req.params.id, currentUserId || null, limit, offset]
      ),
      query(
        `SELECT rating, COUNT(*) as count FROM garage_reviews WHERE garage_id = $1 AND (is_hidden = FALSE OR is_hidden IS NULL) GROUP BY rating`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(*) as count FROM garage_reviews WHERE garage_id = $1 AND (is_hidden = FALSE OR is_hidden IS NULL)`,
        [req.params.id]
      )
    ]);

    const reviewIds = reviewsResult.rows.map(r => r.id);
    let repliesResult = { rows: [] as any[] };
    if (reviewIds.length > 0) {
      repliesResult = await query(
        `SELECT rr.id, rr.review_id, rr.text, rr.created_at, rr.user_id, rr.garage_id,
                COALESCE(u.name, g.name) as author_name
         FROM garage_review_replies rr
         LEFT JOIN users u ON rr.user_id = u.id
         LEFT JOIN garage_reviews r ON rr.review_id = r.id
         LEFT JOIN garages g ON rr.garage_id = g.id
         WHERE rr.review_id = ANY($1)
         ORDER BY rr.created_at ASC`,
         [reviewIds]
      );
    }
    const repliesByReviewId: Record<string, any[]> = {};
    for (const reply of repliesResult.rows) {
      if (!repliesByReviewId[reply.review_id]) repliesByReviewId[reply.review_id] = [];
      repliesByReviewId[reply.review_id].push({
        id: reply.id,
        text: reply.text,
        date: reply.created_at,
        authorName: reply.author_name,
        isGarageOwner: !!reply.garage_id
      });
    }

    const reviews = reviewsResult.rows.map(r => ({
      ...r,
      avatar: (r.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      replies: repliesByReviewId[r.id] || [],
      repliesCount: repliesByReviewId[r.id]?.length || 0
    }));

    const totalReviews = parseInt(countResult.rows[0].count, 10);
    let averageRating = 0;
    const distribution = {
      1: { count: 0, pct: '0%' },
      2: { count: 0, pct: '0%' },
      3: { count: 0, pct: '0%' },
      4: { count: 0, pct: '0%' },
      5: { count: 0, pct: '0%' }
    };

    if (totalReviews > 0) {
      let totalStars = 0;
      statsResult.rows.forEach((row: any) => {
        const star = Math.round(Number(row.rating));
        const count = Number(row.count);
        totalStars += Number(row.rating) * count;
        if (star >= 1 && star <= 5) {
          distribution[star as 1|2|3|4|5].count += count;
        }
      });
      averageRating = totalStars / totalReviews;
      
      for (let i = 1; i <= 5; i++) {
        distribution[i as 1|2|3|4|5].pct = Math.round((distribution[i as 1|2|3|4|5].count / totalReviews) * 100) + '%';
      }
    }

    return success(res, { 
      reviews, 
      stats: { totalReviews, averageRating, distribution },
      total: totalReviews,
      page,
      limit,
      totalPages: Math.ceil(totalReviews / limit)
    });
  } catch (err) {
    return error(res, 'Failed to fetch reviews', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.post('/onboarding', authenticate, (req, res) => {
  return success(
    res,
    {
      id: 'g3',
      ownerUserId: req.user?.userId,
      name: req.body.name,
      address: req.body.address,
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
    },
    201
  );
});



// PUT /api/v1/garages/my-requests/:type/:id/resubmit
garagesRouter.put('/my-requests/:type/:id/resubmit', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { type, id } = req.params;
    const { name, category, description, suggestedPrice, suggestedDuration, durationUnit, image, brand } = req.body;

    if (type !== 'service' && type !== 'product') return error(res, 'Invalid request type', 'INVALID_TYPE', 400);

    const table = type === 'service' ? 'service_requests' : 'product_requests';
    
    // Process image if provided
    let processedImage = image;
    if (image && image.startsWith('data:image')) {
      if (process.env.RENDER === 'true' || process.env.CLOUDINARY_URL) {
        try {
          const { v2: cloudinary } = require('cloudinary');
          const uploadResult = await cloudinary.uploader.upload(image, { folder: `wrectifai/requests` });
          processedImage = uploadResult.secure_url;
        } catch (err) {}
      }
    }

    let result;
    if (type === 'service') {
      result = await query(
        `UPDATE service_requests 
         SET name = COALESCE($1, name), 
             category = COALESCE($2, category), 
             description = COALESCE($3, description), 
             suggested_price = COALESCE($4, suggested_price),
             suggested_duration = COALESCE($5, suggested_duration),
             duration_unit = COALESCE($6, duration_unit),
             image = COALESCE($7, image),
             status = 'pending',
             updated_at = NOW()
         WHERE id = $8 AND garage_id = $9 AND status = 'rejected'
         RETURNING *`,
        [name, category, description, suggestedPrice, suggestedDuration, durationUnit, processedImage, id, garageId]
      );
    } else {
      result = await query(
        `UPDATE product_requests 
         SET name = COALESCE($1, name), 
             category = COALESCE($2, category), 
             description = COALESCE($3, description), 
             suggested_price = COALESCE($4, suggested_price),
             brand = COALESCE($5, brand),
             image = COALESCE($6, image),
             status = 'pending',
             updated_at = NOW()
         WHERE id = $7 AND garage_id = $8 AND status = 'rejected'
         RETURNING *`,
        [name, category, description, suggestedPrice, brand, processedImage, id, garageId]
      );
    }

    if (result.rows.length === 0) {
      return error(res, 'Request not found, not owned by this garage, or not rejected', 'BAD_REQUEST', 400);
    }

    return success(res, { success: true, request: result.rows[0] });
  } catch (err) {
    console.error('Resubmit request error:', err);
    return error(res, 'Failed to resubmit request', 'DATABASE_ERROR', 500);
  }
});

// POST /api/v1/garages/my-requests/:type/:id/add-to-catalog
garagesRouter.post('/my-requests/:type/:id/add-to-catalog', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { type, id } = req.params;
    if (type !== 'service' && type !== 'product') return error(res, 'Invalid request type', 'INVALID_TYPE', 400);

    const table = type === 'service' ? 'service_requests' : 'product_requests';
    
    // Check if the request is approved and belongs to this garage
    const reqResult = await query(`SELECT * FROM ${table} WHERE id = $1 AND garage_id = $2 AND status = 'approved'`, [id, garageId]);
    if (reqResult.rows.length === 0) {
      return error(res, 'Approved request not found', 'NOT_FOUND', 404);
    }
    const request = reqResult.rows[0];

    const client = await getDbPool().connect();
    try {
      await client.query('BEGIN');

      let result;
      if (type === 'service') {
        // Auto-backfill platform_service_id if missing (e.g. approved before migration 056)
        if (!request.platform_service_id) {
          // ON CONFLICT handles the UNIQUE(name) constraint on platform_services —
          // if the name already exists (e.g. a prior approval created it), reuse that row.
          const psRes = await client.query(
            `INSERT INTO platform_services (name, category, description, icon, base_price)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [request.name, request.category || 'General Service', request.description || '', request.icon || 'Wrench', request.suggested_price || 0]
          );
          const newPlatformServiceId = psRes.rows[0].id;
          await client.query(
            `UPDATE service_requests SET platform_service_id = $1 WHERE id = $2`,
            [newPlatformServiceId, request.id]
          );
          request.platform_service_id = newPlatformServiceId;
        }

        const { price, durationMins, durationUnit, isActive } = req.body;

        // IDEMPOTENT: if already added (added_service_id set), UPDATE the existing service row
        if (request.added_service_id) {
          result = await client.query(
            `UPDATE services
             SET price = $1, duration_mins = $2, duration_unit = $3, is_active = $4, updated_at = NOW()
             WHERE id = $5 AND garage_id = $6
             RETURNING *`,
            [price ?? request.suggested_price, durationMins ?? request.suggested_duration, durationUnit ?? request.duration_unit ?? 'Minutes', isActive ?? true, request.added_service_id, garageId]
          );
          // If the service row was deleted externally, fall through to re-insert
          if (result.rows.length === 0) request.added_service_id = null;
        }

        if (!request.added_service_id) {
          // Check if a service already exists for this garage+platform_service pair (safety net)
          const existingCheck = await client.query(
            `SELECT id FROM services WHERE garage_id = $1 AND platform_service_id = $2 LIMIT 1`,
            [garageId, request.platform_service_id]
          );
          if (existingCheck.rows.length > 0) {
            // Reuse & update the existing row
            const existingId = existingCheck.rows[0].id;
            result = await client.query(
              `UPDATE services
               SET price = $1, duration_mins = $2, duration_unit = $3, is_active = $4, updated_at = NOW()
               WHERE id = $5
               RETURNING *`,
              [price ?? request.suggested_price, durationMins ?? request.suggested_duration, durationUnit ?? request.duration_unit ?? 'Minutes', isActive ?? true, existingId]
            );
          } else {
            result = await client.query(
              `INSERT INTO services (garage_id, platform_service_id, name, category, description, price, duration_mins, duration_unit, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
              [garageId, request.platform_service_id, request.name, request.category || 'General Service', request.description || '', price ?? request.suggested_price, durationMins ?? request.suggested_duration, durationUnit ?? request.duration_unit ?? 'Minutes', isActive ?? true]
            );
          }
          // Write back the service id so subsequent calls know it was added
          await client.query(
            `UPDATE service_requests SET added_service_id = $1 WHERE id = $2`,
            [result.rows[0].id, request.id]
          );
        }
      } else {
        // Auto-backfill product_id if missing (e.g. approved before migration 056)
        if (!request.product_id) {
          const sellerRes = await client.query(`SELECT id FROM sellers WHERE seller_type = 'platform' LIMIT 1`);
          if (sellerRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return error(res, 'Platform seller not found', 'SYSTEM_ERROR', 500);
          }
          const pRes = await client.query(
            `INSERT INTO products (seller_id, name, description, category, price, is_active, image)
             VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id`,
            [sellerRes.rows[0].id, request.name, request.description || '', request.category || 'Spares', request.suggested_price || 0, request.image || null]
          );
          const newProductId = pRes.rows[0].id;
          await client.query(
            `UPDATE product_requests SET product_id = $1 WHERE id = $2`,
            [newProductId, request.id]
          );
          request.product_id = newProductId;
        }

        const { price, qtyAvailable, isActive } = req.body;

        // IDEMPOTENT: if already added (added_inventory_id set), UPDATE the existing inventory row
        if (request.added_inventory_id) {
          result = await client.query(
            `UPDATE garage_inventory
             SET price = $1, qty_available = $2, is_active = $3, updated_at = NOW()
             WHERE id = $4 AND garage_id = $5
             RETURNING *`,
            [price ?? request.suggested_price, qtyAvailable ?? 0, isActive ?? true, request.added_inventory_id, garageId]
          );
          if (result.rows.length === 0) request.added_inventory_id = null;
        }

        if (!request.added_inventory_id) {
          // Check if inventory already exists for this garage+product (safety net)
          const existingCheck = await client.query(
            `SELECT id FROM garage_inventory WHERE garage_id = $1 AND product_id = $2 LIMIT 1`,
            [garageId, request.product_id]
          );
          if (existingCheck.rows.length > 0) {
            const existingId = existingCheck.rows[0].id;
            result = await client.query(
              `UPDATE garage_inventory
               SET price = $1, qty_available = $2, is_active = $3, updated_at = NOW()
               WHERE id = $4
               RETURNING *`,
              [price ?? request.suggested_price, qtyAvailable ?? 0, isActive ?? true, existingId]
            );
          } else {
            result = await client.query(
              `INSERT INTO garage_inventory (garage_id, product_id, qty_available, price, is_active)
               VALUES ($1, $2, $3, $4, $5) RETURNING *`,
              [garageId, request.product_id, qtyAvailable ?? 0, price ?? request.suggested_price, isActive ?? true]
            );
          }
          // Write back the inventory id so subsequent calls know it was added
          await client.query(
            `UPDATE product_requests SET added_inventory_id = $1 WHERE id = $2`,
            [result.rows[0].id, request.id]
          );
        }
      }

      await client.query('COMMIT');
      return success(res, { success: true, item: result!.rows[0] });
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }

  } catch (err: any) {
    console.error('Add to catalog error:', err);
    const detail = err?.message || 'Unknown database error';
    return error(res, `Failed to add item to catalog: ${detail}`, 'DATABASE_ERROR', 500);
  }
});

// GET /api/v1/garages/refund-requests
garagesRouter.get('/refund-requests', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT r.*, b.scheduled_at, b.status as booking_status, u.name as customer_name, v.make as vehicle_make, v.model as vehicle_model 
       FROM refund_requests r
       JOIN bookings b ON r.booking_id = b.id
       JOIN users u ON r.customer_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE r.garage_id = $1
       ORDER BY r.created_at DESC`,
      [garageId]
    );

    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch refund requests', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/garages/refund-requests/:id/approve
garagesRouter.post('/refund-requests/:id/approve', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { id } = req.params;

    const reqResult = await query(`SELECT * FROM refund_requests WHERE id = $1 AND garage_id = $2`, [id, garageId]);
    if (reqResult.rows.length === 0) return error(res, 'Refund request not found', 'NOT_FOUND', 404);
    
    const request = reqResult.rows[0];
    if (request.status !== 'pending' && request.status !== 'info_requested') {
      return error(res, 'Refund request is not pending', 'BAD_REQUEST', 400);
    }

    const client = await getDbPool().connect();
    try {
      await client.query('BEGIN');

      // Update request status
      await client.query(`UPDATE refund_requests SET status = 'approved', updated_at = NOW() WHERE id = $1`, [id]);

      // Find the payment
      const paymentRes = await client.query(
        'SELECT * FROM payments WHERE booking_id = $1 AND status IN (\'paid\', \'succeeded\') FOR UPDATE',
        [request.booking_id]
      );

      if (paymentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return error(res, 'Payment not found or already refunded', 'BAD_REQUEST', 400);
      }

      const payment = paymentRes.rows[0];

      if (payment.method === 'cash') {
         // Cash refunds not handled via Razorpay
         await client.query('UPDATE payments SET status = \'refund_pending\', updated_at = NOW() WHERE id = $1', [payment.id]);
         await client.query('UPDATE bookings SET payment_status = \'REFUND_PENDING\', updated_at = NOW() WHERE id = $1', [request.booking_id]);
      } else if (payment.provider_payment_id) {
         // Razorpay refund
         const Razorpay = require('razorpay');
         const rzp = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
            key_secret: process.env.RAZORPAY_KEY_SECRET || '',
         });

         let refund;
         try {
           refund = await rzp.payments.refund(payment.provider_payment_id, {
             amount: Math.round(Number(payment.amount) * 100),
             speed: 'normal',
             notes: { reason: request.reason }
           });
         } catch (rzpErr: any) {
           await client.query('ROLLBACK');
           const errorMessage = rzpErr?.error?.description || rzpErr?.message || (typeof rzpErr === 'string' ? rzpErr : JSON.stringify(rzpErr)) || 'Unknown Razorpay Error';
           return error(res, 'Razorpay refund API failed: ' + errorMessage, 'BAD_REQUEST', 400);
         }

         const paymentRefundStatus = refund.status === 'processed' ? 'refunded' : 'refund_pending';
         const bookingRefundStatus = refund.status === 'processed' ? 'REFUNDED' : 'REFUND_PENDING';
         
         await client.query(
           'UPDATE payments SET status = $1, provider_refund_id = $2, refund_reason = $3, updated_at = NOW() WHERE id = $4',
           [paymentRefundStatus, refund.id, request.reason, payment.id]
         );

         await client.query(
           'UPDATE bookings SET payment_status = $1, updated_at = NOW() WHERE id = $2',
           [bookingRefundStatus, payment.booking_id]
         );

         if (bookingRefundStatus === 'REFUNDED') {
           // Create credit note
           const invoiceRes = await client.query('SELECT * FROM invoices WHERE booking_id = $1 AND type = \'invoice\'', [request.booking_id]);
           if (invoiceRes.rows.length > 0) {
             const origInv = invoiceRes.rows[0];
             await client.query(
               `INSERT INTO invoices (booking_id, invoice_number, subtotal, tax_amount, platform_fee, discount_amount, total_amount, currency, type, original_invoice_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'credit_note', $9)`,
               [
                 request.booking_id,
                 'CN-' + origInv.invoice_number,
                 -Math.abs(Number(origInv.subtotal)),
                 -Math.abs(Number(origInv.tax_amount)),
                 -Math.abs(Number(origInv.platform_fee)),
                 -Math.abs(Number(origInv.discount_amount)),
                 -request.calculated_refund_amount,
                 origInv.currency,
                 origInv.id
               ]
             );
           }
         }
      } else {
         // Wallet refund
         const { holdWalletBalance } = require('../wallet/wallet.service');
         await client.query('UPDATE payments SET status = \'refunded\', updated_at = NOW() WHERE id = $1', [payment.id]);
         await client.query('UPDATE bookings SET payment_status = \'REFUNDED\', updated_at = NOW() WHERE id = $1', [request.booking_id]);
         
         // Insert wallet refund transaction
         const walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [request.customer_id]);
         if (walletRes.rows.length > 0) {
            const walletId = walletRes.rows[0].id;
            await client.query(`
              INSERT INTO wallet_transactions 
              (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
              VALUES ($1, 'REFUND', $2, (SELECT balance FROM wallets WHERE id = $1), (SELECT balance FROM wallets WHERE id = $1) + $2, 'BOOKING', $3, 'COMPLETED', 'Refund for Booking')
            `, [walletId, request.calculated_refund_amount, request.booking_id]);
            await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [request.calculated_refund_amount, walletId]);
         }

         // Create credit note
         const invoiceRes = await client.query('SELECT * FROM invoices WHERE booking_id = $1 AND type = \'invoice\'', [request.booking_id]);
         if (invoiceRes.rows.length > 0) {
           const origInv = invoiceRes.rows[0];
           await client.query(
             `INSERT INTO invoices (booking_id, invoice_number, subtotal, tax_amount, platform_fee, discount_amount, total_amount, currency, type, original_invoice_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'credit_note', $9)`,
             [
               request.booking_id,
               'CN-' + origInv.invoice_number,
               -Math.abs(Number(origInv.subtotal)),
               -Math.abs(Number(origInv.tax_amount)),
               -Math.abs(Number(origInv.platform_fee)),
               -Math.abs(Number(origInv.discount_amount)),
               -request.calculated_refund_amount,
               origInv.currency,
               origInv.id
             ]
           );
         }
      }

      await client.query('COMMIT');
      return success(res, { message: 'Refund approved and processed' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Refund approval error:', err);
      return error(res, 'Failed to process refund', 'INTERNAL_SERVER_ERROR', 500);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Refund approval error:', err);
    return error(res, 'Failed to process refund', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/garages/refund-requests/:id/reject
garagesRouter.post('/refund-requests/:id/reject', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) return error(res, 'Rejection reason is required', 'BAD_REQUEST', 400);

    const result = await query(
      `UPDATE refund_requests SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2 AND garage_id = $3 AND status IN ('pending', 'info_requested') RETURNING *`,
      [rejectionReason, id, garageId]
    );

    if (result.rows.length === 0) return error(res, 'Refund request not found or not pending', 'NOT_FOUND', 404);

    return success(res, { request: result.rows[0] });
  } catch (err) {
    return error(res, 'Failed to reject refund', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/garages/refund-requests/:id/request-info
garagesRouter.post('/refund-requests/:id/request-info', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { id } = req.params;
    const { garageNotes } = req.body;

    const result = await query(
      `UPDATE refund_requests SET status = 'info_requested', garage_notes = $1, updated_at = NOW() WHERE id = $2 AND garage_id = $3 AND status = 'pending' RETURNING *`,
      [garageNotes, id, garageId]
    );

    if (result.rows.length === 0) return error(res, 'Refund request not found or not pending', 'NOT_FOUND', 404);

    return success(res, { request: result.rows[0] });
  } catch (err) {
    return error(res, 'Failed to request info', 'INTERNAL_SERVER_ERROR', 500);
  }
});

export default garagesRouter;
