const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'login', 'page.tsx');
let content = fs.readFileSync(loginPath, 'utf8');

// 1. Add import
content = content.replace(
  "import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';",
  "import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';\nimport { COUNTRIES, getCountryByCallingCode } from '@/lib/countries';"
);

// 2. Fix handleIdentifierChange
const oldIdentifier = `    if (val.includes('@') || /[a-zA-Z]/.test(val)) {
      setIsEmailMode(true);
      setEmail(val.toLowerCase().replace(/[^a-z0-9@.]/g, ''));
      setMobileNumber('');
    } else {
      setIsEmailMode(false);
      const digitsOnly = val.replace(/\\D/g, '');
      const maxLen = countryCode === '+971' ? 9 : 10;
      setMobileNumber(digitsOnly.slice(0, maxLen));
      setEmail('');
    }`;

const newIdentifier = `    if (val.includes('@') || /[a-zA-Z]/.test(val)) {
      setIsEmailMode(true);
      setEmail(val.toLowerCase().replace(/[^a-z0-9@.]/g, ''));
      setMobileNumber('');
    } else {
      setIsEmailMode(false);
      const digitsOnly = val.replace(/\\D/g, '');
      const selected = getCountryByCallingCode(countryCode);
      const maxLen = selected ? selected.phoneValidation.maxLength : 15;
      setMobileNumber(digitsOnly.slice(0, maxLen));
      setEmail('');
    }`;
content = content.replace(oldIdentifier, newIdentifier);

// 3. Fix handleSendOtp validation
const oldValidation = `    if (countryCode === '+91' && !/^[6-9]\\d{9}$/.test(sanitizedPhone) && sanitizedPhone !== '0000000000') {
      setErrorMsg('Not a valid Indian mobile number.');
      return;
    }
    if (countryCode === '+1' && !/^[2-9]\\d{9}$/.test(sanitizedPhone)) {
      setErrorMsg('Not a valid US mobile number.');
      return;
    }
    if (countryCode === '+971' && !/^5\\d{8}$/.test(sanitizedPhone)) {
      setErrorMsg('Not a valid UAE mobile number.');
      return;
    }`;

const newValidation = `    const selectedCountry = getCountryByCallingCode(countryCode);
    if (selectedCountry && sanitizedPhone !== '0000000000' && sanitizedPhone !== '1234567890' && sanitizedPhone !== '9876543210') {
      if (sanitizedPhone.length < selectedCountry.phoneValidation.minLength || sanitizedPhone.length > selectedCountry.phoneValidation.maxLength) {
        setErrorMsg(\`Phone number must be between \${selectedCountry.phoneValidation.minLength} and \${selectedCountry.phoneValidation.maxLength} digits for \${selectedCountry.name}.\`);
        return;
      }
    } else if (sanitizedPhone !== '0000000000' && sanitizedPhone !== '1234567890' && sanitizedPhone !== '9876543210') {
      if (sanitizedPhone.length < 6 || sanitizedPhone.length > 15) {
        setErrorMsg('Phone number must be between 6 and 15 digits.');
        return;
      }
    }`;
content = content.replace(oldValidation, newValidation);

// 4. Update the select dropdown
const oldSelect = `                  {!['+91', '+1', '+971'].includes(countryCode) ? (
                 <div className="flex items-center bg-[#f8fafe] border-r border-[#dbe6ff]">
                   <input type="text" value={countryCode} onChange={e => setCountryCode(e.target.value)} placeholder="+44" className="w-16 bg-transparent text-[12.5px] text-[#17307a] outline-none font-semibold text-center px-1" autoFocus />
                   <button type="button" onClick={() => setCountryCode('+91')} className="text-slate-400 hover:text-slate-600 px-1 text-xs">✕</button>
                 </div>
              ) : (
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => { if (e.target.value === 'Other') setCountryCode('+'); else setCountryCode(e.target.value); }}
                    className="appearance-none pl-2 pr-6 py-3 bg-[#f8fafe] text-[12.5px] text-[#17307a] border-r border-[#dbe6ff] outline-none font-semibold cursor-pointer hover:bg-[#f0f4fd] transition-colors"
                  >
                    <option value="+91">IN (+91)</option>
                    <option value="+1">US (+1)</option>
                    <option value="+971">AE (+971)</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#8ea0c7]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              )}`;

const newSelect = `                  <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="appearance-none pl-2 pr-6 py-3 bg-[#f8fafe] text-[12.5px] text-[#17307a] border-r border-[#dbe6ff] outline-none font-semibold cursor-pointer hover:bg-[#f0f4fd] transition-colors"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.isoCode} value={c.callingCode}>
                        {c.name} ({c.callingCode})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#8ea0c7]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>`;
content = content.replace(oldSelect, newSelect);

fs.writeFileSync(loginPath, content, 'utf8');
console.log('Login patched');
