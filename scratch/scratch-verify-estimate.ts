import { QuoteEstimationService } from '../apps/api/src/modules/quotes/quote-estimation.service';
import { query } from '../apps/api/src/config/database';

async function runTest() {
  const quoteRequestId = 'b5a34dc8-3361-4f14-83a6-dd901e4cda38';
  const city = 'Bengaluru';
  
  console.log(`Running QuoteEstimationService.generateLocalEstimate for request ${quoteRequestId} and city "${city}"...`);
  
  try {
    const estimate = await QuoteEstimationService.generateLocalEstimate(quoteRequestId, city);
    console.log("\n=== ESTIMATE GENERATION RESULT ===");
    console.log(JSON.stringify(estimate, null, 2));
    
    // Verify values
    console.log("\n=== VERIFICATION CHECKLIST ===");
    console.log("1. Currency is INR:", estimate.currency === 'INR' ? "✅ PASS" : "❌ FAIL");
    console.log("2. minPrice is a number:", typeof estimate.minPrice === 'number' ? `✅ PASS (${estimate.minPrice})` : "❌ FAIL");
    console.log("3. maxPrice is a number:", typeof estimate.maxPrice === 'number' ? `✅ PASS (${estimate.maxPrice})` : "❌ FAIL");
    console.log("4. Breakup exists:", typeof estimate.breakup === 'object' && estimate.breakup !== null ? "✅ PASS" : "❌ FAIL");
    
    if (estimate.breakup) {
      const b = estimate.breakup;
      const parts = Number(b.parts ?? b.partsCost ?? 0);
      const labour = Number(b.labour ?? b.labor ?? b.labourCost ?? b.laborCost ?? 0);
      const consumables = Number(b.consumables ?? b.consumablesCost ?? 0);
      const gst = Number(b.gst ?? b.gstCost ?? 0);
      const sum = parts + labour + consumables + gst;
      console.log(`   - Parts: ${parts}`);
      console.log(`   - Labour: ${labour}`);
      console.log(`   - Consumables: ${consumables}`);
      console.log(`   - GST/Taxes: ${gst}`);
      console.log(`   - Sum of breakup: ${sum}`);
      console.log(`   - Matches minPrice (${estimate.minPrice}):`, sum === estimate.minPrice ? "✅ PASS" : "⚠️ WARNING: Does not equal minPrice (Scaling will run in frontend)");
    }
  } catch (err) {
    console.error("Error running estimation service:", err);
  }
}

runTest().then(() => process.exit(0));
