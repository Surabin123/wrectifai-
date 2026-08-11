// Utility to manage location and country state via document.cookie

export function setLocationCookie(key: 'wrectifai_city' | 'wrectifai_country_code', value: string) {
  if (typeof document === 'undefined') return;
  // Expire in 1 year
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getLocationCookie(key: 'wrectifai_city' | 'wrectifai_country_code'): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
  if (match) {
    return decodeURIComponent(match[2]);
  }
  return null;
}

export function getCurrencyForCountryCode(countryCode: string | null): string {
  switch (countryCode) {
    case '+91':
      return 'INR';
    case '+1':
      return 'USD';
    case '+971':
      return 'AED';
    default:
      return 'INR'; // Default to INR based on CITIES logic
  }
}

export function formatCurrency(amount: number, countryCode: string | null = null): string {
  const code = getCurrencyForCountryCode(countryCode || getLocationCookie('wrectifai_country_code'));
  if (code === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }
  if (code === 'AED') {
    return `AED ${amount.toLocaleString('en-AE')}`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}
