export function formatCurrency(amount: string | number, phone?: string): string {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(parsedAmount)) return String(amount);

  // Future-proofing: We can expand this to check a garage's country code later.
  // For now, relies on user phone number country code.
  if (phone && phone.startsWith('+91')) {
    // India
    return `₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (phone && (phone.startsWith('+971') || phone.startsWith('00971'))) {
    // UAE
    return `AED ${parsedAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    // Default to USA / Dollar
    return `$${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
