const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'admin', 'garages', 'register', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
content = content.replace(
  "import { useRouter } from 'next/navigation';",
  "import { useRouter } from 'next/navigation';\nimport { COUNTRIES, getCountryByCallingCode } from '@/lib/countries';"
);

// Remove hardcoded cities arrays
content = content.replace(/const IN_CITIES = \[.*?\];\n/s, '');
content = content.replace(/const US_CITIES = \[.*?\];\n/s, '');
content = content.replace(/const AE_CITIES = \[.*?\];\n/s, '');

// Update getPhoneError
const oldGetPhoneError = `  const getPhoneError = (code: string, phone: string) => {
    if (code === '+91' && phone.length !== 10) return 'Indian phone numbers must be 10 digits.';
    if (code === '+1' && phone.length !== 10) return 'US phone numbers must be 10 digits.';
    if (code === '+971' && phone.length !== 9) return 'UAE phone numbers must be 9 digits.';
    if (phone.length < 6 || phone.length > 15) return 'Phone number must be between 6 and 15 digits.';
    return null;
  };`;

const newGetPhoneError = `  const getPhoneError = (code: string, phone: string) => {
    const selectedCountry = getCountryByCallingCode(code);
    if (selectedCountry) {
      if (phone.length < selectedCountry.phoneValidation.minLength || phone.length > selectedCountry.phoneValidation.maxLength) {
        return \`Phone number must be between \${selectedCountry.phoneValidation.minLength} and \${selectedCountry.phoneValidation.maxLength} digits for \${selectedCountry.name}.\`;
      }
    } else {
      if (phone.length < 6 || phone.length > 15) return 'Phone number must be between 6 and 15 digits.';
    }
    return null;
  };`;
content = content.replace(oldGetPhoneError, newGetPhoneError);

// Replace getCitiesForCountry to just return empty array since we can't fetch them statically anymore, users will just type the city or we allow free text for now, but city input was a free text input if not matching? Wait, let's see how city is rendered.
// Actually, earlier city might be a text input. We'll leave `getCitiesForCountry` as returning empty or we can just replace it to empty array.
const oldGetCitiesForCountry = `  const getCitiesForCountry = (code: string) => {
    if (code === '+91') return IN_CITIES;
    if (code === '+1') return US_CITIES;
    if (code === '+971') return AE_CITIES;
    return [];
  };`;
const newGetCitiesForCountry = `  const getCitiesForCountry = (code: string) => {
    // Cities can be dynamic or fetched from API, return empty for free text
    return [];
  };`;
content = content.replace(oldGetCitiesForCountry, newGetCitiesForCountry);

// Update handleSubmit API call
const oldSubmit = `      await apiClient.post('/admin/onboarding/garages', {
        name: formData.name,
        type: formData.type,
        registrationNumber: formData.registrationNumber,
        phone: formData.countryCode + formData.phone,
        email: formData.email,
        city: formData.city,
        address: formData.address + ', ' + formData.area,
        ownerName: formData.ownerName,
        ownerPhone: formData.sameAsGaragePhone ? (formData.countryCode + formData.phone) : (formData.ownerCountryCode + formData.ownerPhone),
        password: formData.password,
        services: formData.services,
        workingHours: formData.workingHours
      });`;

const newSubmit = `      const selectedCountry = getCountryByCallingCode(formData.countryCode);
      await apiClient.post('/admin/onboarding/garages', {
        name: formData.name,
        type: formData.type,
        registrationNumber: formData.registrationNumber,
        phone: formData.countryCode + formData.phone,
        email: formData.email,
        city: formData.city,
        address: formData.address + ', ' + formData.area,
        ownerName: formData.ownerName,
        ownerPhone: formData.sameAsGaragePhone ? (formData.countryCode + formData.phone) : (formData.ownerCountryCode + formData.ownerPhone),
        password: formData.password,
        services: formData.services,
        workingHours: formData.workingHours,
        country: selectedCountry?.isoCode || null,
        businessCurrency: selectedCountry?.currencyCode || 'USD',
        locale: selectedCountry?.locale || 'en-US'
      });`;
content = content.replace(oldSubmit, newSubmit);

// Replace phone dropdown
const oldDropdown = `                   <div className="flex border rounded-lg bg-white overflow-hidden focus-within:border-blue-500">
                     <select value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 border-r outline-none font-semibold text-slate-700">
                       <option value="+91">IN (+91)</option>
                       <option value="+1">US (+1)</option>
                       <option value="+971">AE (+971)</option>
                     </select>`;

const newDropdown = `                   <div className="flex border rounded-lg bg-white overflow-hidden focus-within:border-blue-500">
                     <select value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 border-r outline-none font-semibold text-slate-700">
                       {COUNTRIES.map(c => (
                         <option key={c.isoCode} value={c.callingCode}>{c.isoCode} ({c.callingCode})</option>
                       ))}
                     </select>`;
content = content.replace(oldDropdown, newDropdown);

// Replace owner phone dropdown
const oldOwnerDropdown = `                     <div className="flex border rounded-lg bg-white overflow-hidden focus-within:border-blue-500">
                       <select value={formData.ownerCountryCode} onChange={e => setFormData({...formData, ownerCountryCode: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 border-r outline-none font-semibold text-slate-700">
                         <option value="+91">IN (+91)</option>
                         <option value="+1">US (+1)</option>
                         <option value="+971">AE (+971)</option>
                       </select>`;

const newOwnerDropdown = `                     <div className="flex border rounded-lg bg-white overflow-hidden focus-within:border-blue-500">
                       <select value={formData.ownerCountryCode} onChange={e => setFormData({...formData, ownerCountryCode: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 border-r outline-none font-semibold text-slate-700">
                         {COUNTRIES.map(c => (
                           <option key={c.isoCode} value={c.callingCode}>{c.isoCode} ({c.callingCode})</option>
                         ))}
                       </select>`;
content = content.replace(oldOwnerDropdown, newOwnerDropdown);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Admin garage register patched');
