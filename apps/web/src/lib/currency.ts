import { getSavedCity, getCurrencyCodeForCity } from '@/utils/location';

export function formatCurrency(amount: string | number, currencyCode?: string, locale?: string): string {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(parsedAmount)) return String(amount);

  let code = currencyCode;
  
  // Guard against legacy calls passing userPhone (e.g. "+14155552671") as the second argument
  if (code && (code.startsWith('+') || /\d/.test(code) || code.length > 3)) {
    code = undefined;
  }

  // Fallback to strict regional formatting based on the user's active context
  if (!code) {
    code = getCurrencyCodeForCity(getSavedCity());
    if (!code) code = 'INR';
  }

  try {
    return new Intl.NumberFormat(locale || (code === 'INR' ? 'en-IN' : code === 'AED' ? 'en-AE' : 'en-US'), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parsedAmount);
  } catch (err) {
    return `${code} ${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}
