export function formatCurrency(amount: string | number, currencyCode: string = 'USD', locale?: string): string {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(parsedAmount)) return String(amount);

  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parsedAmount);
  } catch (err) {
    return `${currencyCode} ${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}
