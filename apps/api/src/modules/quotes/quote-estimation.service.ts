import { query } from '../../config/database';
import { getEnv } from '../../config/env';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const dynamicImport = new Function('specifier', 'return import(specifier)');

/**
 * Maps known cities to their country and currency.
 * Mirrors the COUNTRIES array in the frontend's location.ts — single source of truth
 * for the city→country relationship used to tell the AI which local currency to use.
 */
const CITY_TO_COUNTRY: Record<string, { country: string; currency: string }> = {
  // India
  Bengaluru: { country: 'India', currency: 'INR' },
  Mumbai: { country: 'India', currency: 'INR' },
  Delhi: { country: 'India', currency: 'INR' },
  Hyderabad: { country: 'India', currency: 'INR' },
  Chennai: { country: 'India', currency: 'INR' },
  Kolkata: { country: 'India', currency: 'INR' },
  Pune: { country: 'India', currency: 'INR' },
  Kochi: { country: 'India', currency: 'INR' },
  Ahmedabad: { country: 'India', currency: 'INR' },
  Jaipur: { country: 'India', currency: 'INR' },
  Surat: { country: 'India', currency: 'INR' },
  Lucknow: { country: 'India', currency: 'INR' },
  Kanpur: { country: 'India', currency: 'INR' },
  Nagpur: { country: 'India', currency: 'INR' },
  Patna: { country: 'India', currency: 'INR' },
  // United States
  'New York': { country: 'United States', currency: 'USD' },
  'Los Angeles': { country: 'United States', currency: 'USD' },
  Chicago: { country: 'United States', currency: 'USD' },
  Houston: { country: 'United States', currency: 'USD' },
  Phoenix: { country: 'United States', currency: 'USD' },
  Philadelphia: { country: 'United States', currency: 'USD' },
  'San Antonio': { country: 'United States', currency: 'USD' },
  'San Diego': { country: 'United States', currency: 'USD' },
  Dallas: { country: 'United States', currency: 'USD' },
  Austin: { country: 'United States', currency: 'USD' },
  'San Jose': { country: 'United States', currency: 'USD' },
  'Fort Worth': { country: 'United States', currency: 'USD' },
  Jacksonville: { country: 'United States', currency: 'USD' },
  Columbus: { country: 'United States', currency: 'USD' },
  Charlotte: { country: 'United States', currency: 'USD' },
  // United Arab Emirates
  Dubai: { country: 'United Arab Emirates', currency: 'AED' },
  'Abu Dhabi': { country: 'United Arab Emirates', currency: 'AED' },
  Sharjah: { country: 'United Arab Emirates', currency: 'AED' },
  Ajman: { country: 'United Arab Emirates', currency: 'AED' },
  'Ras Al Khaimah': { country: 'United Arab Emirates', currency: 'AED' },
  Fujairah: { country: 'United Arab Emirates', currency: 'AED' },
  'Umm Al Quwain': { country: 'United Arab Emirates', currency: 'AED' },
  'Al Ain': { country: 'United Arab Emirates', currency: 'AED' },
};

export class QuoteEstimationService {
  /**
   * @param quoteRequestId - the quote request to estimate
   * @param city - the user's currently selected city (from wrectifai_city cookie),
   *               used to determine the correct local currency for the AI estimate.
   *               If omitted, falls back to users.location from the DB.
   */
  static async generateLocalEstimate(quoteRequestId: string, city?: string): Promise<any> {
    const env = getEnv();

    // 1. Fetch Quote Request, Vehicle, and Location context
    const reqRes = await query(
      `SELECT qr.issue_summary as "issueSummary", 
              v.make, v.model, v.year, v.fuel_type as "fuelType", v.mileage,
              u.location
       FROM quote_requests qr
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       WHERE qr.id = $1`,
      [quoteRequestId]
    );

    if (reqRes.rows.length === 0) {
      throw new Error('Quote request not found');
    }

    const data = reqRes.rows[0];
    const vehicleContext = `${data.year || ''} ${data.make || ''} ${data.model || ''} (${data.fuelType || 'Unknown Fuel'}, ${data.mileage || 'Unknown'} km)`.trim();

    // 2. Build locationContext — priority:
    //    a) city passed from frontend (wrectifai_city cookie) → most reliable
    //    b) users.location from DB (JSONB object with .city / .country)
    //    c) fallback: 'Unknown Location'
    let locationContext = 'Unknown Location';

    if (city && CITY_TO_COUNTRY[city]) {
      // Path A: city was passed from the frontend cookie — use the mapping directly
      const { country } = CITY_TO_COUNTRY[city];
      locationContext = `${city}, ${country}`;
    } else if (data.location && typeof data.location === 'object') {
      // Path B: users.location is a JSONB object (future-proof if it ever gets populated)
      const loc = data.location as any;
      if (loc.city && loc.country) {
        locationContext = `${loc.city}, ${loc.country}`;
      } else if (loc.address) {
        locationContext = loc.address;
      }
    }
    // Path C: locationContext stays 'Unknown Location'

    const issueSummary = data.issueSummary || 'Unknown Issue';

    // 3. Setup AI
    const { createOpenAI } = await dynamicImport('@ai-sdk/openai');
    const { generateText } = await dynamicImport('ai');

    let aiProvider;
    if (env.llmProvider === 'groq') {
      if (!env.groqApiKey) throw new Error('GROQ_API_KEY is not defined');
      aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
    } else {
      if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY is not defined');
      aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
    }
    const modelInstance = aiProvider(env.llmModel);

    // Step 2a. Determine relevant search terms to query the services table
    const searchPrompt = `Given the reported symptom: "${data.issueSummary}", list 3 to 5 very short keyword phrases (1-2 words max each) representing the most likely automotive services or parts required.
Output ONLY a comma-separated list of keywords. Example: brake pads, rotor, brake fluid`;
    
    const searchRaw = await generateText({
      model: modelInstance,
      system: "You are an automotive diagnostician.",
      messages: [{ role: 'user', content: searchPrompt }],
    });
    
    const searchTerms = searchRaw.text.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    
    // Query DB for these terms using ILIKE
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    for (const term of searchTerms) {
      if (term.length > 2) {
        conditions.push(`name ILIKE $${paramIndex} OR category ILIKE $${paramIndex}`);
        params.push(`%${term}%`);
        paramIndex++;
      }
    }
    
    let pricingContext = 'No specific local pricing data found. Fall back to your training data for local market prices.';
    if (conditions.length > 0) {
      const servicesRes = await query(`
        SELECT name, category, AVG(price) as avg_price
        FROM services
        WHERE ${conditions.join(' OR ')}
        GROUP BY name, category
        ORDER BY count(*) DESC, avg_price ASC
        LIMIT 10
      `, params);
      
      if (servicesRes.rows.length > 0) {
        pricingContext = servicesRes.rows.map((r: any) => `- ${r.name} (${r.category}): ~${Number(r.avg_price).toFixed(2)}`).join('\n');
      }
    }
    
    console.log(`[QuoteEstimationService] Diagnosis: ${data.issueSummary}`);
    console.log(`[QuoteEstimationService] AI Extracted Terms:`, searchTerms);
    console.log(`[QuoteEstimationService] Matched Services Pricing Context:\n${pricingContext}`);

    const systemPrompt = `You are an expert automotive repair cost estimator.
Your task is to estimate a realistic repair cost range based strictly on the likely repair scope for the reported symptom.

CRITICAL RULES FOR SCOPE:
1. Distinguish between reported symptom -> likely diagnosis -> likely repair scope.
2. DO NOT treat every possible cause as a confirmed repair. For example, for "grinding noise from brakes", base the estimate on the most likely repair scope (e.g., brake pads), do NOT automatically add pads + rotors + calipers + shims together unless explicitly stated.
3. Do not inflate the estimate by assuming every possible repair is required. Price only the necessary parts and labour for the most probable specific issue.
4. DO NOT over-weight the vehicle model. A minor issue costs the price of that specific repair, not a generic "premium car service" price.

CRITICAL RULES FOR PRICING & LOCATION:
1. Generate the estimate dynamically from the exact vehicle, year, mileage, symptom, severity, and the user's actual location.
2. Use realistic repair pricing for that specific country's automotive market.
3. DO NOT convert between USD, INR, and AED. DO NOT use PPP (Purchasing Power Parity). DO NOT apply a fixed multiplier. DO NOT simply change the currency symbol. DO NOT use one global price range for all countries. 
4. The same repair legitimately has very different numerical prices in India, UAE, and USA based on local parts, labour, and garage/service pricing.
5. If the location is in India: generate an INR estimate based on typical Indian pricing.
6. If the location is in UAE: generate an AED estimate based on typical UAE pricing.
7. If the location is in USA: generate a USD estimate based on typical US pricing.

AVAILABLE LOCAL PRICING DATA:
Below are real average prices from local garages for services matching this issue. Use these as a strong baseline for your estimate if they seem relevant to the scope:
${pricingContext}

VEHICLE: ${vehicleContext}
LOCATION: ${locationContext}
DIAGNOSED ISSUE(S) / SYMPTOM: ${issueSummary}

INSTRUCTIONS:
1. Provide a realistic, specific, sensible local market estimate. Do not give vague generic ranges.
2. The AI must explain the likely repair scope in the 'repairScope' field, detailing what is probably needed (e.g., pads only, or pads + rotor skimming) based on the exact issue and severity.
3. Provide an appropriate breakdown (Parts, Labour, Consumables, GST or applicable local taxes) based on the local market context. The breakdown must be mathematically consistent with the estimate.
4. Output EXACTLY a valid JSON object matching the following schema, and NO markdown or other text:
{
  "minPrice": 300,
  "maxPrice": 500,
  "currency": "INR",
  "repairScope": "Likely replacing the front brake pads. Rotors may require minor skimming.",
  "breakup": {
    "parts": 100,
    "labour": 150,
    "consumables": 50,
    "gst": 54
  }
}`;

    const llmRaw = await generateText({
      model: modelInstance,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the cost estimate.' }],
    });

    let text = llmRaw.text.trim();
    text = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    
    let estimateObj;
    try {
      estimateObj = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse estimate JSON:', text);
      throw new Error('Failed to generate a valid estimate');
    }

    if (typeof estimateObj.minPrice !== 'number' || typeof estimateObj.maxPrice !== 'number') {
      throw new Error('Invalid estimate format returned by AI');
    }

    // 4. Save to database
    await query(
      `UPDATE quote_requests SET ai_estimate = $1 WHERE id = $2`,
      [JSON.stringify(estimateObj), quoteRequestId]
    );

    return estimateObj;
  }
}
