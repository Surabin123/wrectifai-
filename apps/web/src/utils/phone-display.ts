import { COUNTRIES } from '@/lib/countries';

export function formatPhoneForDisplay(value?: string | null): string {
  if (!value) return 'N/A';
  const digits = value.replace(/\D/g, '');
  const country = [...COUNTRIES].sort((a, b) => b.callingCode.length - a.callingCode.length)
    .find(item => digits.startsWith(item.callingCode.slice(1)));
  const local = country ? digits.slice(country.callingCode.length - 1) : digits;
  if (local.length < 2) return 'provided';
  return `${country ? `${country.callingCode} ` : ''}${'*'.repeat(Math.max(0, local.length - 2))}${local.slice(-2)}`;
}
