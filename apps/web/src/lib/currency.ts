import { getLocationCookie, getCurrencyForCountryCode } from '@/utils/location';

export function formatCurrency(amount: string | number, currencyCode?: string, locale?: string): string {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(parsedAmount)) return String(amount);

  let code = currencyCode;
  if (!code) {
    code = getCurrencyForCountryCode(getLocationCookie('wrectifai_country_code'));
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
