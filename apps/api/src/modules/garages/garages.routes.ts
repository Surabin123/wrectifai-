import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

export const garagesRouter = Router();

const badgeMap: Record<string, string> = {
  topRated: 'Top Rated',
  budgetFriendly: 'Best Value',
  mostTrusted: 'Most Trusted',
  evSpecialist: 'EV Specialist'
};

function mapGarageDbRow(g: any) {
  return {
    id: g.id,
    name: g.name,
    location: g.address || '',
    rating: g.ratingAvg !== null && g.ratingAvg !== undefined ? Number(g.ratingAvg) : 0,
    reviews: Number(g.ratingCount || 0),
    distance: g.distanceKm || null,
    price: g.startingPrice || null,
    badge: g.badge ? (badgeMap[g.badge] || g.badge) : null,
    image: g.image || null,
    chips: g.specializations || [],
    verified: g.approval_status === 'active',
    responseMins: g.responseMins !== null && g.responseMins !== undefined ? Number(g.responseMins) : 30,
  };
}

garagesRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.id, g.name, g.address, g.specializations, g.approval_status, 
              g.rating_avg as "ratingAvg", g.rating_count as "ratingCount",
              g.starting_price as "startingPrice", g.distance_km as "distanceKm",
              g.image, g.response_mins as "responseMins",
              (SELECT badge_key FROM garage_badges gb WHERE gb.garage_id = g.id AND gb.active = true LIMIT 1) as badge
       FROM garages g
       WHERE g.approval_status = 'active'`
    );
    const mapped = result.rows.map(mapGarageDbRow);
    return success(res, mapped);
  } catch (err) {
    return error(res, 'Failed to fetch garages', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/my-customers', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    // Get unique customers who have bookings with this garage
    const result = await query(
      `SELECT DISTINCT u.id, u.name, u.email, u.mobile_number as "mobileNumber", NULL as "avatarUrl", b.created_at as "firstBookingDate"
       FROM users u
       JOIN bookings b ON u.id = b.customer_id
       WHERE b.garage_id = $1
       ORDER BY b.created_at DESC`,
      [garageId]
    );

    const customers = result.rows.map(row => ({
      id: row.id,
      name: row.name || 'Unknown',
      email: row.email,
      phone: row.mobileNumber,
      avatar: row.avatarUrl,
      joinDate: row.firstBookingDate
    }));

    return success(res, customers);
  } catch (err) {
    return error(res, 'Failed to fetch customers', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/my-inventory', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT id, name, category, quantity, min_stock as "minStock", price, location, last_restocked as "lastRestocked"
       FROM inventory
       WHERE garage_id = $1
       ORDER BY name ASC`,
      [garageId]
    ).catch(e => ({ rows: [] })); // Catch if inventory table doesn't exist yet

    return success(res, result.rows);
  } catch (err) {
    return error(res, 'Failed to fetch inventory', 'DATABASE_ERROR', 500);
  }
});

garagesRouter.get('/search', async (req, res) => {
  try {
    const { rating, specialization, price_range, lat, lng, distance, city } = req.query;

    const conditions: string[] = ["g.approval_status = 'active'"];
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
      conditions.push(`g.city = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT g.id, g.name, g.address, g.specializations, g.approval_status, 
              g.rating_avg as "ratingAvg", g.rating_count as "ratingCount",
              g.starting_price as "startingPrice", g.distance_km as "distanceKm",
              g.image, g.response_mins as "responseMins",
              (SELECT badge_key FROM garage_badges gb WHERE gb.garage_id = g.id AND gb.active = true LIMIT 1) as badge
       FROM garages g
       ${whereClause}`,
      params
    );

    const mapped = result.rows.map(mapGarageDbRow);
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

garagesRouter.get('/:id', async (req, res) => {
  try {
    const [result, servicesResult] = await Promise.all([
      query(
        `SELECT g.id, g.name, g.address, g.specializations, g.approval_status, 
                g.rating_avg as "ratingAvg", g.rating_count as "ratingCount",
                g.starting_price as "startingPrice", g.distance_km as "distanceKm",
                g.image, g.response_mins as "responseMins",
                (SELECT badge_key FROM garage_badges gb WHERE gb.garage_id = g.id AND gb.active = true LIMIT 1) as badge
         FROM garages g
         WHERE g.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT * FROM services WHERE garage_id = $1`,
        [req.params.id]
      )
    ]);
    
    if (result.rows.length === 0) {
      return error(res, 'Garage not found', 'NOT_FOUND', 404);
    }
    const mapped = mapGarageDbRow(result.rows[0]);
    
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
