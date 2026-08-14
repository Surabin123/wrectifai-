const fs = require('fs');
const path = require('path');

const signupPath = path.join(__dirname, 'apps', 'web', 'src', 'app', 'signup', 'page.tsx');
let content = fs.readFileSync(signupPath, 'utf8');

// 1. Add import
content = content.replace(
  "import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';",
  "import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';\nimport { COUNTRIES, getCountryByCallingCode } from '@/lib/countries';"
);

// 2. Fix handleSignup validation
const oldValidation = `    if (countryCode === '+91' && !/^[6-9]\\d{9}$/.test(sanitizedPhone)) {
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
    }
    if (!['+91', '+1', '+971'].includes(countryCode) && (sanitizedPhone.length < 6 || sanitizedPhone.length > 15)) {
      setErrorMsg('Phone number must be between 6 and 15 digits.');
      return;
    }`;

const newValidation = `    const selectedCountry = getCountryByCallingCode(countryCode);
    if (selectedCountry) {
      if (sanitizedPhone.length < selectedCountry.phoneValidation.minLength || sanitizedPhone.length > selectedCountry.phoneValidation.maxLength) {
        setErrorMsg(\`Phone number must be between \${selectedCountry.phoneValidation.minLength} and \${selectedCountry.phoneValidation.maxLength} digits for \${selectedCountry.name}.\`);
        return;
      }
    } else {
      if (sanitizedPhone.length < 6 || sanitizedPhone.length > 15) {
        setErrorMsg('Phone number must be between 6 and 15 digits.');
        return;
      }
    }`;
content = content.replace(oldValidation, newValidation);

// 3. Update API call to include country
const oldApiCall = `      const data = await apiClient.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        mobileNumber: sanitizedPhone,
        role: 'customer'
      });`;

const newApiCall = `      const data = await apiClient.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        mobileNumber: sanitizedPhone,
        country: selectedCountry?.isoCode || null,
        role: 'customer'
      });`;
content = content.replace(oldApiCall, newApiCall);

// 4. Update the select dropdown
const oldSelect = `              {!['+91', '+1', '+971'].includes(countryCode) ? (
                 <div className="flex items-center bg-[#f8fafe] border-r border-[#dbe6ff]">
                   <input type="text" value={countryCode} onChange={e => setCountryCode(e.target.value)} placeholder="+44" className="w-16 bg-transparent text-[12.5px] text-[#17307a] outline-none font-semibold text-center px-1" autoFocus />
                   <button type="button" onClick={() => setCountryCode('+91')} className="text-slate-400 hover:text-slate-600 px-1 text-xs">✕</button>
                 </div>
              ) : (
                <select
                  value={countryCode}
                  onChange={(e) => {
                    if (e.target.value === 'Other') setCountryCode('+');
                    else setCountryCode(e.target.value);
                  }}
                  className="pl-2 pr-0 py-3 bg-[#f8fafe] text-[12.5px] text-[#17307a] border-r border-[#dbe6ff] outline-none font-semibold cursor-pointer hover:bg-[#f0f4fd] transition-colors"
                >
                  <option value="+91">IN (+91)</option>
                  <option value="+1">US (+1)</option>
                  <option value="+971">AE (+971)</option>
                  <option value="Other">Other</option>
                </select>
              )}`;

const newSelect = `              <div className="relative">
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

// 5. Update the input field maxlen logic
const oldInput = `                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\\D/g, '');
                  const maxLen = countryCode === '+971' ? 9 : (['+91', '+1'].includes(countryCode) ? 10 : 15);
                  setMobileNumber(digitsOnly.slice(0, maxLen));
                }}`;
                
const newInput = `                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\\D/g, '');
                  const selected = getCountryByCallingCode(countryCode);
                  const maxLen = selected ? selected.phoneValidation.maxLength : 15;
                  setMobileNumber(digitsOnly.slice(0, maxLen));
                }}`;
content = content.replace(oldInput, newInput);

fs.writeFileSync(signupPath, content, 'utf8');
console.log('Signup patched');
