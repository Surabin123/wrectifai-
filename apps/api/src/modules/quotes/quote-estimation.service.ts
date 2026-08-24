import { query } from '../../config/database';
import { getEnv } from '../../config/env';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const dynamicImport = new Function('specifier', 'return import(specifier)');

export class QuoteEstimationService {
  static async generateLocalEstimate(quoteRequestId: string): Promise<any> {
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
    let locationContext = 'Unknown Location';
    if (data.location && typeof data.location === 'object') {
      const loc = data.location as any;
      if (loc.city && loc.country) {
        locationContext = `${loc.city}, ${loc.country}`;
      } else if (loc.address) {
        locationContext = loc.address;
      }
    }

    const issueSummary = data.issueSummary || 'Unknown Issue';

    // 2. Setup AI
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

    const systemPrompt = `You are an expert automotive repair cost estimator.
Your task is to estimate a realistic repair cost range based strictly on the EXACT diagnosed issues and required repairs. 
CRITICAL RULE: DO NOT over-weight the vehicle model. Even for a premium vehicle, a minor issue (like a punctured tyre) should only cost the price of that specific repair, NOT a generic "premium car service" price. Evaluate the severity of the issue and price only the necessary parts and labour for that specific issue.

VEHICLE: ${vehicleContext}
LOCATION: ${locationContext}
DIAGNOSED ISSUE(S): ${issueSummary}

INSTRUCTIONS:
1. Generate the estimate dynamically from the exact diagnosed issue(s) + severity + local market rates for the required repair/parts. Do not use generic vehicle-class pricing or fixed ranges.
2. Provide a realistic local market estimate for this specific vehicle and issue in the location's local currency.
3. DO NOT use a US Dollar (USD) base price and convert it using forex/PPP. Use actual local purchasing power and local automotive repair market rates.
4. If the location is in India, output in INR. If in UAE, output in AED. If in USA, output in USD.
5. Provide a sensible breakdown (Parts, Labour, Consumables, GST/Tax) where possible.
6. Output EXACTLY a valid JSON object matching the following schema, and NO markdown or other text:
{
  "minPrice": 300,
  "maxPrice": 500,
  "currency": "INR",
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

    // 3. Save to database
    await query(
      `UPDATE quote_requests SET ai_estimate = $1 WHERE id = $2`,
      [JSON.stringify(estimateObj), quoteRequestId]
    );

    return estimateObj;
  }
}
