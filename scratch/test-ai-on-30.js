const { Client } = require('pg');
const dns = require('dns');
const dotenv = require('dotenv');

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

const client = new Client({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});

const CITY_TO_COUNTRY = {
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
  Dubai: { country: 'United Arab Emirates', currency: 'AED' },
  'Abu Dhabi': { country: 'United Arab Emirates', currency: 'AED' },
  Sharjah: { country: 'United Arab Emirates', currency: 'AED' },
  Ajman: { country: 'United Arab Emirates', currency: 'AED' },
  'Ras Al Khaimah': { country: 'United Arab Emirates', currency: 'AED' },
  Fujairah: { country: 'United Arab Emirates', currency: 'AED' },
  'Umm Al Quwain': { country: 'United Arab Emirates', currency: 'AED' },
  'Al Ain': { country: 'United Arab Emirates', currency: 'AED' },
};

async function main() {
  await client.connect();
  try {
    const quoteRequestId = '00000000-0000-0000-0000-000000000030';
    const city = 'Bengaluru';

    const reqRes = await client.query(
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
      console.error('Request not found');
      return;
    }

    const data = reqRes.rows[0];
    const vehicleContext = `${data.year || ''} ${data.make || ''} ${data.model || ''} (${data.fuelType || 'Unknown Fuel'}, ${data.mileage || 'Unknown'} km)`.trim();
    
    let locationContext = 'Unknown Location';
    if (city && CITY_TO_COUNTRY[city]) {
      const { country } = CITY_TO_COUNTRY[city];
      locationContext = `${city}, ${country}`;
    }

    const issueSummary = data.issueSummary || 'Unknown Issue';

    console.log("=== VEHICLE CONTEXT ===");
    console.log(vehicleContext);
    console.log("=== LOCATION CONTEXT ===");
    console.log(locationContext);
    console.log("=== ISSUE SUMMARY ===");
    console.log(issueSummary);

    const systemPrompt = `You are an expert automotive repair cost estimator.
Your task is to estimate a realistic repair cost range based strictly on the likely repair scope for the reported symptom.

CRITICAL RULES FOR SCOPE:
1. Distinguish between reported symptom → likely diagnosis → likely repair scope.
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

    console.log("=== SYSTEM PROMPT ===");
    console.log(systemPrompt);

    // Call dynamic import to import openai library and execute
    const { createOpenAI } = await import('@ai-sdk/openai');
    const { generateText } = await import('ai');

    const env = {
      llmProvider: process.env.LLM_PROVIDER,
      llmModel: process.env.LLM_MODEL,
      groqApiKey: process.env.GROQ_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY
    };

    let aiProvider;
    if (env.llmProvider === 'groq') {
      if (!env.groqApiKey) throw new Error('GROQ_API_KEY is not defined');
      aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
    } else {
      if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY is not defined');
      aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
    }
    const modelInstance = aiProvider(env.llmModel);

    console.log("\nCalling AI API...");
    const llmRaw = await generateText({
      model: modelInstance,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the cost estimate.' }],
    });

    let text = llmRaw.text.trim();
    console.log("\n=== RAW LLM RESPONSE ===");
    console.log(text);

    let cleanText = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    
    console.log("\n=== CLEANED RESPONSE ===");
    console.log(cleanText);

    try {
      const parsed = JSON.parse(cleanText);
      console.log("\n=== PARSED SUCCESSFULLY ===");
      console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error("\n=== PARSE ERROR ===");
      console.error(err.message);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
