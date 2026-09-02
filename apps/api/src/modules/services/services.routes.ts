import { Router } from 'express';
import { success, error } from '../../utils/response';
import { query } from '../../config/database';

export const servicesRouter = Router();

// GET /api/v1/services - Fetch services scoped strictly by location (city/country)
servicesRouter.get('/', async (req, res) => {
  try {
    const city = req.query.city ? (req.query.city as string).toLowerCase() : null;
    const country = req.query.country ? (req.query.country as string).toLowerCase() : null;

    const params: any[] = [];
    const conditions: string[] = ["s.is_active = true", "g.approval_status IN ('active', 'approved', 'suspended')"];

    if (city && city !== 'location') {
      params.push(city);
      conditions.push(`LOWER(COALESCE(g.location->>'city', g.city)) = $${params.length}`);
    }

    if (country) {
      const countryIsoMap: Record<string, string> = {
        'india': 'in',
        'united states': 'us',
        'usa': 'us',
        'united arab emirates': 'ae',
        'uae': 'ae',
      };
      const isoCode = countryIsoMap[country] || country;
      params.push(country, isoCode);
      conditions.push(`(LOWER(COALESCE(g.location->>'country', '')) = $${params.length - 1} OR LOWER(COALESCE(g.location->>'country', '')) = $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT s.id, s.garage_id as "garageId", g.name as "garageName", 
              COALESCE(g.location->>'city', g.city) as "city",
              COALESCE(g.location->>'country', '') as "country",
              s.name, s.category, s.description, s.price, s.duration_mins as "durationMins"
       FROM services s
       JOIN garages g ON s.garage_id = g.id
       ${whereClause}
       ORDER BY s.name ASC, s.price ASC`,
      params
    );

    return success(res, result.rows);
  } catch (err) {
    console.error('Error fetching location-scoped services:', err);
    return error(res, 'Failed to fetch services', 'DATABASE_ERROR', 500);
  }
});

// GET /api/v1/services/platform - Fetch all active platform services
servicesRouter.get('/platform', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, category, description, icon, base_price as "base_price"
       FROM platform_services
       ORDER BY name ASC`
    );
    return success(res, result.rows);
  } catch (err) {
    console.error('Error fetching platform services:', err);
    return error(res, 'Failed to fetch platform services', 'DATABASE_ERROR', 500);
  }
});
