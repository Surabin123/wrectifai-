/**
 * Shared user-phone / currency utilities.
 *
 * getUserPhone()  – reads the cached user from localStorage once.
 * getCurrencyCode() – derives ISO currency code from the phone prefix.
 * useUserPhone()  – React hook that returns the phone string reactively.
 */

'use client';
import { useState, useEffect } from 'react';

/** Read phone from localStorage (safe in SSR – returns '' server-side). */
export function getUserPhone(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('wrectifai-user');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return user?.mobile_number || user?.phone || '';
  } catch {
    return '';
  }
}

/** Map a phone prefix to an ISO 4217 currency code. */
export function getCurrencyCode(phone?: string): string {
  const p = phone || getUserPhone();
  if (p.startsWith('+971') || p.startsWith('00971')) return 'AED';
  if (p.startsWith('+1')) return 'USD';
  return 'INR'; // default / +91
}

/** React hook – returns the user's phone number from localStorage. */
export function useUserPhone(): string {
  const [phone, setPhone] = useState<string>('');

  useEffect(() => {
    setPhone(getUserPhone());
    // Keep in sync if the user logs in / out in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'wrectifai-user') setPhone(getUserPhone());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return phone;
}
