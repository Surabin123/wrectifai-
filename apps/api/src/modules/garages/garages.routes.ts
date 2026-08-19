import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

export const garagesRouter = Router();

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
      condition += ` AND (LOWER(g.location->>'city') = $${params.length + 1} OR LOWER(g.city) = $${params.length + 1})`;
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
        LOWER(g.location->>'country') = $${params.length + 1}
        OR LOWER(g.location->>'country') = $${params.length + 2}
      )`;
      params.push(isoCode, country.toLowerCase());
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
    return success(res, mapped);
  } catch (err) {
    console.error('Error fetching garages:', err);
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
                g.starting_price as "startingPrice", NULL::NUMERIC as "distanceKm",
                g.image, g.response_mins as "responseMins",
                g.location, g.description, g.business_hours
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
