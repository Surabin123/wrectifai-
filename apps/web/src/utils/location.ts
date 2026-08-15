/**
 * Centralized location configuration for WrectifAI.
 *
 * Single source of truth for:
 *  - Country definitions (dial code, currency, default city, city list)
 *  - Phone-number → country detection
 *  - Currency formatting
 *  - Cookie helpers
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CountryConfig {
  /** ISO 3166-1 alpha-2 code */
  code: string;
  name: string;
  /** E.164 dial prefix, e.g. "+91" */
  dialCode: string;
  /** ISO 4217 currency code */
  currency: string;
  /** Symbol displayed in the UI */
  currencySymbol: string;
  /** Locale used for Intl.NumberFormat */
  locale: string;
  /** City shown when no city is saved */
  defaultCity: string;
  cities: string[];
}

// ─── Country Definitions ─────────────────────────────────────────────────────

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    defaultCity: 'Bengaluru',
    cities: [
      'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
      'Kolkata', 'Pune', 'Kochi', 'Ahmedabad', 'Jaipur',
      'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Patna',
    ],
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    defaultCity: 'New York',
    cities: [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
      'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin',
      'San Jose', 'Fort Worth', 'Jacksonville', 'Columbus', 'Charlotte',
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    currency: 'AED',
    currencySymbol: 'AED',
    locale: 'ar-AE',
    defaultCity: 'Dubai',
    cities: [
      'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman',
      'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain',
    ],
  },
];

/** Fallback when country cannot be detected */
const DEFAULT_COUNTRY = COUNTRIES[0]; // India

// ─── Phone → Country Detection ────────────────────────────────────────────────

/**
 * Detect country from a raw phone number string.
 * Handles formats: +91xxx, 91xxx (10-digit Indian), +1xxx, +971xxx, etc.
 * Returns DEFAULT_COUNTRY (India) when detection fails.
 */
export function detectCountryFromPhone(phone: string | null | undefined): CountryConfig {
  if (!phone) return DEFAULT_COUNTRY;

  // Normalise: keep leading + if present, strip spaces/dashes/parens
  const raw = phone.replace(/[\s\-().]/g, '');
  const digits = raw.replace(/\D/g, ''); // strictly digits

  // Try longest-prefix first so +971 is matched before +97
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const country of sorted) {
    const dial = country.dialCode; // e.g. "+91"
    const dialDigits = dial.replace('+', ''); // e.g. "91"

    if (raw.startsWith(dial)) return country;      // "+91..."
    if (raw.startsWith(dialDigits) && raw.length > dialDigits.length) {
      // "91..." only if it's clearly a country-prefix (not just coincidence)
      // For India (2 digits) require at least 10 digit remainder; for US (1 digit) require 10
      const remainder = raw.slice(dialDigits.length);
      if (remainder.length >= 7) return country;
    }
  }

  // If no prefix matched, try to infer from length and starting digit
  if (digits.length === 10) {
    // US area codes usually start with 2-9. Indian mobile numbers start with 6-9.
    // If it starts with 2, 3, 4, or 5, it CANNOT be an Indian mobile number.
    if (digits.match(/^[2345]/)) return getCountryByDialCode('+1');
    // Otherwise fallback to India (assumed default for 6-9 starting 10-digit numbers)
    return DEFAULT_COUNTRY;
  }
  
  if (digits.length === 9) {
    // UAE mobile numbers typically start with 5 (e.g. 50 123 4567)
    if (digits.match(/^[5]/)) return getCountryByDialCode('+971');
  }

  return DEFAULT_COUNTRY;
}

/** Look up a country by its dial code string (e.g. "+91"). */
export function getCountryByDialCode(dialCode: string): CountryConfig {
  return COUNTRIES.find(c => c.dialCode === dialCode) ?? DEFAULT_COUNTRY;
}

/** Get the country whose city list includes the given city. */
export function getCountryForCity(city: string): CountryConfig {
  return COUNTRIES.find(c => c.cities.includes(city)) ?? DEFAULT_COUNTRY;
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

/**
 * Format a numeric amount using the correct locale and currency for the
 * currently selected city.
 *
 * Usage:
 *   formatCurrencyForCity(1299, 'Bengaluru')  → '₹1,299'
 *   formatCurrencyForCity(49, 'New York')     → '$49'
 *   formatCurrencyForCity(200, 'Dubai')       → 'AED 200'
 *   formatCurrencyForCity(99)                 → '₹99'  (default)
 */
export function formatCurrencyForCity(amount: number, city?: string | null): string {
  const country = city ? getCountryForCity(city) : DEFAULT_COUNTRY;
  try {
    return new Intl.NumberFormat(country.locale, {
      style: 'currency',
      currency: country.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${country.currencySymbol}${amount}`;
  }
}

/** Get the currency symbol for a city (e.g. '₹', '$', 'AED'). */
export function getCurrencySymbolForCity(city?: string | null): string {
  return city ? getCountryForCity(city).currencySymbol : DEFAULT_COUNTRY.currencySymbol;
}

/** Get the ISO currency code for a city (e.g. 'INR', 'USD', 'AED'). */
export function getCurrencyCodeForCity(city?: string | null): string {
  return city ? getCountryForCity(city).currency : DEFAULT_COUNTRY.currency;
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const COOKIE_CITY = 'wrectifai_city';
const COOKIE_DIAL = 'wrectifai_dial_code';
const MAX_AGE = 31536000; // 1 year

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

/** Read the persisted city. Returns null if nothing is saved yet. */
export function getSavedCity(): string | null {
  return readCookie(COOKIE_CITY);
}

/** Persist the selected city and (optionally) the dial code. */
export function saveCity(city: string, dialCode?: string): void {
  writeCookie(COOKIE_CITY, city);
  if (dialCode) writeCookie(COOKIE_DIAL, dialCode);
}

/** Read the persisted dial code (e.g. "+91"). */
export function getSavedDialCode(): string | null {
  return readCookie(COOKIE_DIAL);
}

/**
 * Initialise location for a freshly authenticated user.
 *
 * Rules (in priority order):
 * 1. If a city is already saved in the cookie → keep it (user already chose).
 * 2. If phone is provided → detect country → use country's default city.
 * 3. Fallback to global DEFAULT_COUNTRY default city.
 *
 * Returns the city that should be used as the current context.
 */
export function initLocationForUser(user: { mobileNumber?: string, country?: string } | null | undefined): string {
  const savedCity = getSavedCity();

  // If a user has a profile (logged in), we should detect their country.
  if (user) {
    let country = DEFAULT_COUNTRY;
    // 1. Source of truth: Explicit country from DB
    if (user.country) {
      country = COUNTRIES.find(c => c.name === user.country || c.code === user.country) || detectCountryFromPhone(user.mobileNumber);
    } else {
      // 2. Fallback: Phone number parsing
      country = detectCountryFromPhone(user.mobileNumber);
    }
    
    // If they already have a city saved that BELONGS to their country, respect it.
    if (savedCity && country.cities.includes(savedCity)) {
      return savedCity;
    }
    
    // Otherwise, their phone dictates a new default city for their actual country.
    saveCity(country.defaultCity, country.dialCode);
    return country.defaultCity;
  }

  // For guest users (no phone), respect their saved city if they manually chose one.
  if (savedCity) {
    return savedCity;
  }

  // Ultimate fallback for brand new guest users: don't save to cookie yet, just return default.
  // This prevents them from getting "stuck" with Bengaluru when they later log in.
  return DEFAULT_COUNTRY.defaultCity;
}

// ─── Legacy compatibility (keep existing callers working) ────────────────────

/** @deprecated Use getSavedCity() or saveCity() directly */
export function setLocationCookie(key: 'wrectifai_city' | 'wrectifai_country_code', value: string): void {
  if (key === 'wrectifai_city') writeCookie(COOKIE_CITY, value);
  else writeCookie('wrectifai_country_code', value); // keep old cookie name for any remaining readers
}

/** @deprecated Use getSavedCity() or getSavedDialCode() directly */
export function getLocationCookie(key: 'wrectifai_city' | 'wrectifai_country_code'): string | null {
  if (key === 'wrectifai_city') return readCookie(COOKIE_CITY);
  return readCookie('wrectifai_country_code');
}

/** @deprecated Use getCurrencyCodeForCity() instead */
export function getCurrencyForCountryCode(countryCode: string | null): string {
  return getCountryByDialCode(countryCode ?? '').currency;
}
