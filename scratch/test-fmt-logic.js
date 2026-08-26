const aiEstimate = {
  "breakup": {
    "gst": 900,
    "parts": 200,
    "labour": 4600,
    "consumables": 200
  },
  "currency": "INR",
  "maxPrice": 7000,
  "minPrice": 5900,
  "repairScope": "Wheel alignment and wheel balancing for all four wheels, including minor suspension adjustments if needed."
};

// Mock formatCurrency from apps/web/src/lib/currency.ts
function formatCurrency(amount, currencyCode) {
  return `${currencyCode === 'INR' ? '₹' : currencyCode} ${Number(amount).toFixed(0)}`;
}

// Exact code from compare-quotes-page.tsx:
const fmtAi = (val) => {
  if (val === undefined || val === null || !aiEstimate) return '—';
  const aiCurrency = aiEstimate.currency || 'INR';

  if (typeof val === 'string' && val.includes('-')) {
    return val;
  }

  const numVal = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val;
  if (isNaN(numVal)) return '—';

  const minPrice = Number(aiEstimate.minPrice || 0);
  const maxPrice = Number(aiEstimate.maxPrice || 0);

  // If minPrice === maxPrice, or no range, just format as a single value
  if (!minPrice || !maxPrice || minPrice === maxPrice) {
    return formatCurrency(numVal, aiCurrency);
  }

  // Scale the breakup value proportionally to the min/max range
  // so that parts + labour + consumables + gst = total estimate at both bounds
  const aiBreakupSum = (() => {
    if (!aiEstimate.breakup) return minPrice;
    const b = aiEstimate.breakup;
    const p = Number(b.parts ?? b.partsCost ?? aiEstimate.parts ?? 0);
    const l = Number(b.labour ?? b.labor ?? b.labourCost ?? b.laborCost ?? aiEstimate.labour ?? aiEstimate.labor ?? 0);
    const c = Number(b.consumables ?? b.consumablesCost ?? aiEstimate.consumables ?? 0);
    const g = Number(b.gst ?? b.gstCost ?? aiEstimate.gst ?? 0);
    const s = p + l + c + g;
    return s > 0 ? s : minPrice;
  })();

  const minScaled = numVal * (minPrice / aiBreakupSum);
  const maxScaled = numVal * (maxPrice / aiBreakupSum);
  return `${formatCurrency(minScaled, aiCurrency)} \u2013 ${formatCurrency(maxScaled, aiCurrency)}`;
};

const getAiRange = () => {
  if (!aiEstimate) return '—';
  if (aiEstimate.minPrice !== undefined && aiEstimate.maxPrice !== undefined) {
    const aiCurrency = aiEstimate.currency || 'INR';
    const minLocal = Number(aiEstimate.minPrice);
    const maxLocal = Number(aiEstimate.maxPrice);
    if (minLocal === maxLocal) return formatCurrency(maxLocal, aiCurrency);
    return `${formatCurrency(minLocal, aiCurrency)} \u2013 ${formatCurrency(maxLocal, aiCurrency)}`;
  }
  return '—';
};

console.log("=== UI VALUES ===");
console.log("Parts:", fmtAi(aiEstimate?.breakup?.parts ?? aiEstimate?.breakup?.partsCost ?? aiEstimate?.parts));
console.log("Labour:", fmtAi(aiEstimate?.breakup?.labour ?? aiEstimate?.breakup?.labor ?? aiEstimate?.breakup?.labourCost ?? aiEstimate?.breakup?.laborCost ?? aiEstimate?.labour ?? aiEstimate?.labor));
console.log("Consumables:", fmtAi(aiEstimate?.breakup?.consumables ?? aiEstimate?.breakup?.consumablesCost ?? aiEstimate?.consumables));
console.log("GST:", fmtAi(aiEstimate?.breakup?.gst ?? aiEstimate?.breakup?.gstCost ?? aiEstimate?.gst));
console.log("Total Estimate:", getAiRange());
