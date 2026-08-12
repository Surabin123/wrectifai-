export function formatCurrency(amount: string | number, phone?: string): string {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(parsedAmount)) return String(amount);

  // 1. Try to format based on explicit phone country code
  if (phone) {
    if (phone.startsWith('+91')) {
      return `₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    if (phone.startsWith('+971') || phone.startsWith('00971')) {
      return `AED ${parsedAmount.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    if (phone.startsWith('+1')) {
      return `$${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
  }

  // 2. Try to format based on location cookie
  let countryCode = null;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )wrectifai_country_code=([^;]+)'));
    if (match) {
      countryCode = decodeURIComponent(match[2]);
    }
  }

  if (countryCode === '+91') {
    return `₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (countryCode === '+971') {
    return `AED ${parsedAmount.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (countryCode === '+1') {
    return `$${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  // 3. Fallback to INR (as it's a Bengaluru-based app by default)
  return `₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
