const CALLING_CODES = ['+971', '+81', '+91', '+1'];

/** Safe display-only phone formatter. Never use this for storage or auth. */
export function formatPhoneForDisplay(value?: string | null): string {
  if (!value) return 'not provided';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 3) return 'provided';
  const match = CALLING_CODES.find(code => digits.startsWith(code.slice(1)));
  const callingCode = match || (value.trim().startsWith('+') ? `+${digits.slice(0, Math.min(3, digits.length - 2))}` : '');
  const local = callingCode ? digits.slice(callingCode.length - 1) : digits;
  if (local.length < 2) return 'provided';
  return `${callingCode || ''}${callingCode ? ' ' : ''}${'*'.repeat(Math.max(0, local.length - 2))}${local.slice(-2)}`;
}
