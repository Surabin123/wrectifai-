export interface CountryConfig {
  isoCode: string;
  name: string;
  callingCode: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  phoneValidation: {
    minLength: number;
    maxLength: number;
  };
}

export const COUNTRIES: CountryConfig[] = [
  {
    isoCode: 'IN',
    name: 'India',
    callingCode: '+91',
    currencyCode: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    phoneValidation: {
      minLength: 10,
      maxLength: 10
    }
  },
  {
    isoCode: 'US',
    name: 'United States',
    callingCode: '+1',
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    phoneValidation: {
      minLength: 10,
      maxLength: 10
    }
  },
  {
    isoCode: 'AE',
    name: 'United Arab Emirates',
    callingCode: '+971',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    locale: 'ar-AE',
    phoneValidation: {
      minLength: 9,
      maxLength: 9
    }
  }
];

export const getCountryByIso = (isoCode: string): CountryConfig | undefined => {
  return COUNTRIES.find(c => c.isoCode === isoCode);
};

export const getCountryByCallingCode = (callingCode: string): CountryConfig | undefined => {
  return COUNTRIES.find(c => c.callingCode === callingCode);
};
