import { getSavedCity, getCurrencyCodeForCity } from '@/utils/location';

export function formatCurrency(amount: string | number, currencyCode?: string, locale?: string): string {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(parsedAmount)) return String(amount);

  // ALWAYS force currency based on the currently selected region (city context).
  // Ignore whatever the backend returned (currencyCode), as we want strict regional formatting
  // based on the user's active context.
  let code = getCurrencyCodeForCity(getSavedCity());
  if (!code) code = 'INR';

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
