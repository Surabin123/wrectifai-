import { getEnv } from '../../config/env';
const dynamicImport = new Function('specifier', 'return import(specifier)');

async function testEstimate(locationContext: string) {
    const env = getEnv();
    const vehicleContext = '2022 Toyota Fortuner (Diesel, 72450 km)';
    const issueSummary = 'Grinding noise coming from the front brakes.';
    
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
Your task is to estimate a realistic repair cost range based strictly on the likely repair scope for the reported symptom.

CRITICAL RULES FOR SCOPE:
1. Distinguish between reported symptom → likely diagnosis → likely repair scope.
2. DO NOT treat every possible cause as a confirmed repair. For example, for "grinding noise from brakes", base the estimate on the most likely repair scope (e.g., brake pads), do NOT automatically add pads + rotors + calipers + shims together unless explicitly stated.
3. Do not inflate the estimate by assuming every possible repair is required. Price only the necessary parts and labour for the most probable specific issue.
4. Price the repair based on the exact vehicle make, model, and year provided. Luxury vehicles (e.g., Mercedes, BMW, Audi) will have significantly higher parts and labor costs than economy vehicles (e.g., Maruti Suzuki, Hyundai, Kia). Provide a genuine market price for the specified vehicle.
5. Overlapping & Consolidated Repairs: If multiple related issues are reported (e.g., "Head Gasket Failure", "Cracked Cylinder Head", and "Coolant Leak"), recognize that these are overlapping repairs. Do not add their individual estimates together. Group them into a single consolidated repair scope (e.g., Cylinder Head replacement includes head gasket replacement and coolant refill) and price the combined job realistically to avoid duplicate labor or overlapping parts cost.

CRITICAL RULES FOR PRICING & LOCATION:
1. Generate the estimate dynamically from the exact vehicle, year, mileage, symptom, severity, and the user's actual location.
2. Use realistic repair pricing for that specific country's automotive market.
3. DO NOT convert between USD, INR, and AED. DO NOT use PPP (Purchasing Power Parity). DO NOT apply a fixed multiplier. DO NOT simply change the currency symbol. DO NOT use one global price range for all countries. 
4. The same repair legitimately has very different numerical prices in India, UAE, and USA based on local parts, labour, and garage/service pricing.
5. If the location is in India: generate an INR estimate based on typical Indian pricing.
6. If the location is in UAE: generate an AED estimate based on typical UAE pricing.
7. If the location is in USA: generate a USD estimate based on typical US pricing.
8. Under no circumstances should you generate USD-appropriate price values and label them as INR (e.g., returning 500 INR for a cylinder head replacement, which is only $6). Ensure the price values are numerically appropriate for the target currency (e.g., a cylinder head replacement in India should be in the tens of thousands of INR, not hundreds).

VEHICLE: ${vehicleContext}
LOCATION: ${locationContext}
DIAGNOSED ISSUE(S) / SYMPTOM: ${issueSummary}

INSTRUCTIONS:
1. Provide a realistic, specific, sensible local market estimate. Do not give vague generic ranges.
2. The AI must explain the likely repair scope in the 'repairScope' field, detailing what is probably needed (e.g., pads only, or pads + rotor skimming) based on the exact issue and severity.
3. Provide an appropriate breakdown (Parts, Labour, Consumables, GST or applicable local taxes) based on the local market context. The sum of parts + labour + consumables + gst MUST exactly equal minPrice. Adjust the GST or labour component slightly to ensure perfect mathematical consistency.
4. Output EXACTLY a valid JSON object matching the following schema, and NO markdown or other text:
{
  "minPrice": 300,
  "maxPrice": 500,
  "currency": "INR",
  "repairScope": "Likely replacing the front brake pads. Rotors may require minor skimming.",
  "breakup": {
    "parts": 100,
    "labour": 120,
    "consumables": 30,
    "gst": 50
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
    
    console.log(`\nLocation: ${locationContext}`);
    console.log(`Estimate: ${text}`);
}

async function runTests() {
    require('dotenv').config();
    console.log("Running India test...");
    await testEstimate('Bengaluru, India');
    console.log("Running UAE test...");
    await testEstimate('Dubai, UAE');
    console.log("Running USA test...");
    await testEstimate('Los Angeles, USA');
}

runTests().catch(console.error);
