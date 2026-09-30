'use client';
import { Card } from '@/components/common/card';
import { ShieldCheck, HeadphonesIcon, Upload, X, Check, Lock, Info, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { COUNTRIES, getCountryByCallingCode } from '@/lib/countries';
import { Modal } from '@/components/common/modal';
import { toast } from 'sonner';

const GARAGE_TYPES = [
  'General Automotive Repair Workshop', 'Multi-Brand Car Service Centre',
  'Authorized Dealership Service Centre', 'Specialized Automotive Repair Workshop',
  'Auto Electrical & Diagnostics Workshop', 'Body Shop & Collision Repair Centre',
  'Tyre & Wheel Service Centre', 'Car Detailing & Accessories Centre',
  'Motorcycle Repair Workshop', 'Commercial Vehicle Repair Workshop', 'Other'
];
const CITY_OPTIONS_BY_COUNTRY: Record<string, string[]> = {
  '+91': ['Bengaluru', 'Hyderabad', 'Mumbai', 'Chennai', 'Pune'],
  '+1': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
  '+971': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah'],
};
const registrationLabelByCountry: Record<string, string> = {
  '+91': 'Business Registration / Applicable Government Identification Number',
  '+1': 'State Business Registration Number / Applicable Business Identification Number',
  '+971': 'Trade Licence Number / Commercial Registration Number',
};
const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
});


export default function RegisterGaragePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', type: '', name: '' });
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    registrationNumber: '',
    countryCode: '+91',
    phone: '',
    email: '',
    city: '',
    customCity: '',
    area: '',
    address: '',
    stateRegion: '',
    postalCode: '',
    year: '',
    description: '',
    responseMins: '30',
    ownerName: '',
    ownerDesignation: '',
    sameAsGaragePhone: true,
    ownerCountryCode: '+91',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
    otp: '',
    isPhoneVerified: false,
    ownerPhoneVerificationToken: '',
    businessRegDoc: null as any,
    businessLicenseDoc: null as any,
    taxRegistrationDoc: null as any,
    ownerIdDoc: null as any,
    addressProofDoc: null as any,
    insuranceDoc: null as any,
    certificationsDoc: null as any,
    authorizationDoc: null as any,
    supportingDoc: null as any,
    services: [] as string[],
    servicePrices: {} as Record<string, string>,
    servicePricingTypes: {} as Record<string, string>,
    customServices: [] as string[],
    customServicePrices: {} as Record<string, string>,
    customServiceDescriptions: {} as Record<string, string>,
    customServicePricingTypes: {} as Record<string, string>,
    chips: [] as string[],
    image: null as any,
    workingHours: {
      monday: { open: true, start: '09:00 AM', end: '07:00 PM', hasBreak: false, breakStart: '', breakEnd: '' },
      tuesday: { open: true, start: '09:00 AM', end: '07:00 PM', hasBreak: false, breakStart: '', breakEnd: '' },
      wednesday: { open: true, start: '09:00 AM', end: '07:00 PM', hasBreak: false, breakStart: '', breakEnd: '' },
      thursday: { open: true, start: '09:00 AM', end: '07:00 PM', hasBreak: false, breakStart: '', breakEnd: '' },
      friday: { open: true, start: '09:00 AM', end: '07:00 PM', hasBreak: false, breakStart: '', breakEnd: '' },
      saturday: { open: true, start: '09:00 AM', end: '05:00 PM', hasBreak: false, breakStart: '', breakEnd: '' },
      sunday: { open: false, start: '', end: '', hasBreak: false, breakStart: '', breakEnd: '' }
    }
  });
  const [otherGarageType, setOtherGarageType] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [platformServices, setPlatformServices] = useState<Array<{ id: string; name: string; category?: string; description?: string; base_price?: number }>>([]);
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [areaSearchTimer, setAreaSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [ownerOtpStatus, setOwnerOtpStatus] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [ownerOtpModalOpen, setOwnerOtpModalOpen] = useState(false);
  const [ownerOtpBusy, setOwnerOtpBusy] = useState(false);
  const [invalidServicePrices, setInvalidServicePrices] = useState<string[]>([]);
  const [invalidCustomServicePrices, setInvalidCustomServicePrices] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');


  const handleAreaSearch = (query: string) => {
    setFormData(prev => ({ ...prev, area: query }));
    if (areaSearchTimer) clearTimeout(areaSearchTimer);
    if (query.length < 2) {
      setAreaSuggestions([]);
      return;
    }
    setAreaSearchTimer(setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`;
        const res = await fetch(url, { headers: { 'User-Agent': 'WrectifAI/1.0 (admin@wrectifai.com)' } });
        if (res.ok) {
          const data = await res.json();
          const localityOsmValues = new Set(['suburb', 'neighbourhood', 'district', 'quarter', 'locality', 'residential', 'village', 'hamlet']);
          const seen = new Set<string>();
          const localities: string[] = [];
          for (const feature of data.features) {
            const p = feature.properties;
            if (p.name && (localityOsmValues.has(p.osm_value) || p.type === 'locality') && !seen.has(p.name)) {
              seen.add(p.name);
              localities.push(p.name);
            }
          }
          setAreaSuggestions(localities.slice(0, 6));
        }
      } catch (e) {
        console.warn(e);
      }
    }, 400));
  };

  useEffect(() => {
    apiClient.get<typeof platformServices>('/services/platform')
      .then(setPlatformServices)
      .catch(() => setErrorMsg('Failed to load the platform service catalog. Please try again.'));
  }, []);
  
  const getPhoneError = (code: string, phone: string) => {
    if (code === '+91' && phone.length !== 10) return 'Phone number must be exactly 10 digits for India.';
    if (code === '+1' && phone.length !== 10) return 'Phone number must be exactly 10 digits for USA.';
    if (code === '+971' && phone.length !== 9) return 'Phone number must be exactly 9 digits for UAE.';
    return null;
  };

  const calculatePasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Medium';
    return 'Strong';
  };

  const isValidEmail = (email: string) => {
    const value = email.trim();
    return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value)
      && !value.includes('..');
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 1) {
      const garageType = formData.type.trim();
      const resolvedGarageType = garageType === 'Other' ? otherGarageType.trim() : garageType;
      if (!resolvedGarageType) {
        setErrorMsg('Please specify a valid garage type before continuing.');
        return;
      }
      const establishedYear = formData.year.trim();
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(establishedYear) || Number(establishedYear) < 1800 || Number(establishedYear) > currentYear) {
        setErrorMsg(`Please enter a valid 4-digit established year between 1800 and ${currentYear}.`);
        return;
      }
      if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim() || !(formData.city === 'Other' ? formData.customCity.trim() : formData.city.trim()) || !formData.area.trim() || !formData.address.trim() || !formData.stateRegion.trim() || !formData.postalCode.trim() || !formData.registrationNumber.trim() || !formData.description.trim()) {
        setErrorMsg('Please fill out all required fields marked with *');
        return;
      }
      if (formData.chips.length === 0) {
        setErrorMsg('Please select at least one highlight (chip) for the garage.');
        return;
      }
      const err = getPhoneError(formData.countryCode, formData.phone);
      if (err) { setErrorMsg(err); return; }
      if (!isValidEmail(formData.email)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.ownerName.trim() || !formData.ownerDesignation.trim()) { setErrorMsg('Authorized representative name and designation are required.'); return; }
      if (!formData.sameAsGaragePhone) {
        const err = getPhoneError(formData.ownerCountryCode, formData.ownerPhone);
        if (err) { setErrorMsg(err); return; }
      }
      if (!formData.password || formData.password !== formData.confirmPassword) {
        setErrorMsg('Passwords do not match or are empty.');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,15}$/.test(formData.password)) {
        setErrorMsg('Password must be 8–15 characters and include uppercase, lowercase, number, and special character.');
        return;
      }
      if (!formData.isPhoneVerified) {
        setErrorMsg('Please verify the owner phone number before proceeding.');
        return;
      }
    }

    if (step === 3) {
      if (!formData.image || !formData.businessRegDoc || !formData.businessLicenseDoc || !formData.taxRegistrationDoc || !formData.ownerIdDoc || !formData.addressProofDoc) {
        setErrorMsg('Please upload all mandatory documents including the garage image to proceed.');
        return;
      }
    }

    if (step === 4) {
      if (formData.services.length === 0 && formData.customServices.length === 0) {
        setErrorMsg('Please select at least one service offered by the garage.');
        return;
      }
      const hasValidPrice = (price: string | undefined) => price !== undefined && price.trim() !== '' && Number.isFinite(Number(price)) && Number(price) >= 0;
      const invalidPlatform = formData.services.filter(serviceId => !hasValidPrice(formData.servicePrices[serviceId]));
      const invalidCustom = formData.customServices.filter(serviceName => !hasValidPrice(formData.customServicePrices[serviceName]));
      setInvalidServicePrices(invalidPlatform);
      setInvalidCustomServicePrices(invalidCustom);
      if (invalidPlatform.length > 0 || invalidCustom.length > 0) {
        setErrorMsg('Please enter a valid price for all selected services.');
        return;
      }
    }

    if (step === 5) {
      const toMinutes = (value: string) => {
        const match = value.match(/^(\d{2}):(\d{2}) (AM|PM)$/);
        if (!match) return -1;
        let hour = Number(match[1]) % 12;
        if (match[3] === 'PM') hour += 12;
        return hour * 60 + Number(match[2]);
      };
      const invalidDay = Object.entries(formData.workingHours).find(([, value]) => {
        const hours = value as {open: boolean; start: string; end: string};
        return hours.open && (toMinutes(hours.start) < 0 || toMinutes(hours.end) <= toMinutes(hours.start));
      });
      if (invalidDay) { setErrorMsg(`Closing time must be after opening time for ${invalidDay[0]}.`); return; }
    }

    setStep(prev => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSendOwnerOtp = async () => {
    const ownerCallingCode = formData.sameAsGaragePhone ? formData.countryCode : formData.ownerCountryCode;
    const ownerPhone = formData.sameAsGaragePhone ? formData.phone : formData.ownerPhone;
    const phoneError = getPhoneError(ownerCallingCode, ownerPhone);
    if (phoneError) { setErrorMsg('Enter a valid authorized representative phone number first.'); return; }
    const ownerCountry = getCountryByCallingCode(ownerCallingCode);
    if (!ownerCountry) { setErrorMsg('Select a valid country calling code first.'); return; }
    setOwnerOtpBusy(true);
    try {
      const result = await apiClient<{ challengeId: string }>('/admin/onboarding/garages/phone-otp/initiate', {
        method: 'POST',
        body: JSON.stringify({ country: ownerCountry.isoCode, phone: `${ownerCallingCode}${ownerPhone}` }),
      });
      setFormData(prev => ({ ...prev, otp: '', isPhoneVerified: false, ownerPhoneVerificationToken: result.challengeId }));
      setOwnerOtpStatus('sent');
      setOwnerOtpModalOpen(true);
      setErrorMsg('');
      toast.success('OTP sent. Use the temporary development code 123456.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setOwnerOtpBusy(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (ownerOtpStatus !== 'sent' || !formData.ownerPhoneVerificationToken) {
      setErrorMsg('Send an OTP before verifying.');
      return;
    }
    setOwnerOtpBusy(true);
    try {
      await apiClient('/admin/onboarding/garages/phone-otp/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId: formData.ownerPhoneVerificationToken, otp: formData.otp }),
      });
      setFormData(prev => ({ ...prev, isPhoneVerified: true }));
      setOwnerOtpStatus('verified');
      setOwnerOtpModalOpen(false);
      setErrorMsg('');
      toast.success('OTP verified.');
    } catch (err: any) {
      setErrorMsg(err.message || 'The OTP could not be verified.');
    } finally {
      setOwnerOtpBusy(false);
    }
  };

  const resetOwnerPhoneVerification = () => {
    setFormData(prev => ({ ...prev, otp: '', isPhoneVerified: false, ownerPhoneVerificationToken: '' }));
    setOwnerOtpStatus('idle');
    setOwnerOtpModalOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const selectedCountry = getCountryByCallingCode(formData.countryCode);
      await apiClient.post('/admin/onboarding/garages', {
        name: formData.name,
        type: formData.type.trim(),
        otherGarageType: otherGarageType.trim(),
        registrationNumber: formData.registrationNumber,
        phone: formData.countryCode + formData.phone,
        email: formData.email,
        city: formData.city,
        customCity: formData.customCity,
        address: formData.address,
        area: formData.area,
        stateRegion: formData.stateRegion,
        postalCode: formData.postalCode,
        ownerName: formData.ownerName,
        ownerDesignation: formData.ownerDesignation,
        ownerPhone: formData.sameAsGaragePhone ? (formData.countryCode + formData.phone) : (formData.ownerCountryCode + formData.ownerPhone),
        ownerCountry: (formData.sameAsGaragePhone ? getCountryByCallingCode(formData.countryCode) : getCountryByCallingCode(formData.ownerCountryCode))?.isoCode,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        services: formData.services,
        servicePrices: formData.servicePrices,
        servicePricingTypes: formData.servicePricingTypes,
        customServices: formData.customServices,
        customServicePrices: formData.customServicePrices,
        customServiceDescriptions: formData.customServiceDescriptions,
        customServicePricingTypes: formData.customServicePricingTypes,
        chips: formData.chips,
        image: formData.image,
        description: formData.description,
        responseMins: Number(formData.responseMins),
        businessRegDoc: formData.businessRegDoc,
        businessLicenseDoc: formData.businessLicenseDoc,
        taxRegistrationDoc: formData.taxRegistrationDoc,
        ownerIdDoc: formData.ownerIdDoc,
        addressProofDoc: formData.addressProofDoc,
        additionalDocuments: [
          { type: 'Business Insurance', file: formData.insuranceDoc },
          { type: 'Professional Certifications', file: formData.certificationsDoc },
          { type: 'Authorization Documents', file: formData.authorizationDoc },
          { type: 'Other Supporting Documents', file: formData.supportingDoc },
        ].filter(document => Boolean(document.file)),
        workingHours: formData.workingHours,
        country: selectedCountry?.isoCode || null,
        businessCurrency: selectedCountry?.currencyCode || 'USD',
        locale: selectedCountry?.locale || 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: formData.year,
        otp: formData.otp,
        ownerPhoneVerificationToken: formData.ownerPhoneVerificationToken,
        contactPhone: formData.countryCode + formData.phone
      });
      router.push('/admin/garages');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to register garage. It may already exist.');
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Garage Details', desc: 'Basic information about the garage' },
    { num: 2, title: 'Authorized Person Details', desc: 'Information about the authorized person' },
    { num: 3, title: 'Business Documents', desc: 'Upload required documents' },
    { num: 4, title: 'Services Offered', desc: 'Select services provided' },
    { num: 5, title: 'Working Hours', desc: 'Set working hours & days' },
    { num: 6, title: 'Review & Submit', desc: 'Review all details & submit' },
  ];

  const progressPercent = ((step - 1) / 5) * 100;

  const toggleService = (s: string) => {
    setFormData(prev => {
      const isSelected = prev.services.includes(s);
      if (isSelected) {
        return { ...prev, services: prev.services.filter(x => x !== s) };
      } else {
        return { 
          ...prev, 
          services: [...prev.services, s],
          servicePrices: { ...prev.servicePrices, [s]: '' },
          servicePricingTypes: { ...prev.servicePricingTypes, [s]: 'fixed' }
        };
      }
    });
  };

  const handleUpload = (field: string, e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (field === 'image') {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          setErrorMsg('Garage Display/Profile Image must be JPG, PNG, or WEBP.');
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          setErrorMsg('Garage Display/Profile Image must be less than 2MB.');
          return;
        }
      } else {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!validTypes.includes(file.type)) {
          setErrorMsg('Only PDF, JPG, or PNG files are supported for business documents.');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setErrorMsg('Business Document must be less than 5MB.');
          return;
        }
      }
      
      setErrorMsg('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          [field]: { name: file.name, type: file.type, size: file.size, data: reader.result as string } 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUpload = (field: string) => {
    setFormData(prev => ({ ...prev, [field]: null }));
  };

  const handleSelectAllServices = () => {
    const allIds = platformServices.filter(service => service.name !== 'More Services').map(service => service.id);
    if (formData.services.length === allIds.length) {
      setFormData(prev => ({ ...prev, services: [], servicePrices: {} }));
      setInvalidServicePrices([]);
      return;
    }
    const newPrices = { ...formData.servicePrices };
    platformServices.forEach(service => {
      if (!newPrices[service.id]) {
        newPrices[service.id] = '';
      }
    });
    setFormData(prev => ({ ...prev, services: allIds, servicePrices: newPrices }));
  };

  const [newService, setNewService] = useState('');

  const copyMondayHours = (weekendsOnly = false) => {
    setFormData(prev => {
      const monday = prev.workingHours.monday;
      const days = weekendsOnly ? ['saturday', 'sunday'] : ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const workingHours = { ...prev.workingHours } as any;
      days.forEach(day => { workingHours[day] = { ...monday }; });
      return { ...prev, workingHours };
    });
    setErrorMsg('');
  };
  const addCustomService = () => {
    const normalized = newService.trim().toLowerCase();
    const existsInCatalog = platformServices.some(service => service.name.trim().toLowerCase() === normalized);
    const existsInCustom = formData.customServices.some(service => service.trim().toLowerCase() === normalized);
    if (normalized && !existsInCatalog && !existsInCustom) {
      setFormData(prev => ({
        ...prev,
        customServices: [...prev.customServices, newService.trim()],
        customServicePrices: {...prev.customServicePrices, [newService.trim()]: ''},
        customServiceDescriptions: {...prev.customServiceDescriptions, [newService.trim()]: ''},
        customServicePricingTypes: {...prev.customServicePricingTypes, [newService.trim()]: 'fixed'},
      }));
      setNewService('');
    } else if (normalized) {
      setErrorMsg('That service is already in the garage service catalogue.');
    }
  };

  const addCustomHighlight = () => {
    const value = newHighlight.trim();
    if (!value) { setErrorMsg('Enter a highlight before adding it.'); return; }
    if (formData.chips.some(chip => chip.toLowerCase() === value.toLowerCase())) { setErrorMsg('That highlight has already been selected.'); return; }
    setFormData(prev => ({ ...prev, chips: [...prev.chips, value] }));
    setNewHighlight('');
    setErrorMsg('');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
         <h1 className="text-2xl font-bold text-[#17307a] mb-1">Register Garage</h1>
         <p className="text-sm text-slate-500">Dashboard &gt; Garage Management &gt; Register Garage</p>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-t-xl border-b border-slate-100 p-6 flex justify-between relative shadow-sm overflow-hidden">
             <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
             
             {stepsList.map(s => (
               <div key={s.num} className="flex flex-col items-center gap-2 relative z-10 bg-white px-2">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white] transition-colors ${
                   step >= s.num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                 }`}>
                   {step > s.num ? '✓' : s.num}
                 </div>
                 <span className={`text-[11px] font-bold ${step >= s.num ? 'text-blue-600' : 'text-slate-500'}`}>{s.title}</span>
               </div>
             ))}
          </div>

          <div className="bg-white rounded-b-xl shadow-sm p-8 mb-6">
            
            {/* STEP 1 */}
            {step === 1 && (
              <>
                <h2 className="text-xl font-bold text-[#17307a] mb-1">Garage Details</h2>
                <p className="text-xs text-slate-500 mb-8">Enter basic information about the garage.</p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Garage Name <span className="text-red-500">*</span></label>
                     <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Example: AutoFix Pro New York" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Garage Type <span className="text-red-500">*</span></label>
                       <select value={GARAGE_TYPES.includes(formData.type) || !formData.type ? formData.type : 'Other'} onChange={e => {
                         const value = e.target.value;
                         setFormData({...formData, type: value});
                         if (value !== 'Other') setOtherGarageType('');
                       }} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700 mb-2">
                       <option value="">Select garage type</option>
                       {GARAGE_TYPES.map(garageType => <option key={garageType} value={garageType}>{garageType}</option>)}
                     </select>
                     {formData.type === 'Other' && (
                       <input type="text" value={otherGarageType} onChange={e => setOtherGarageType(e.target.value)} placeholder="Please specify garage type" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     )}
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">{registrationLabelByCountry[formData.countryCode]} <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="Enter registration number" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                    </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Established Year <span className="text-red-500">*</span></label>
                     <input type="number" min="1800" max={new Date().getFullYear()} value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="e.g. 2015" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                   </div>
                   {formData.city === 'Other' && (
                     <div>
                       <label className="block text-xs font-bold text-slate-700 mb-2">Specify City <span className="text-red-500">*</span></label>
                       <input type="text" value={formData.customCity} onChange={e => setFormData({...formData, customCity: e.target.value})} placeholder="Enter city" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     </div>
                   )}
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                     <div className="flex gap-2">
                       <select value={formData.countryCode} onChange={e => {
                         setFormData({...formData, countryCode: e.target.value, city: '', isPhoneVerified: false, otp: '', ownerPhoneVerificationToken: ''}); setOwnerOtpStatus('idle'); setOwnerOtpModalOpen(false);
                       }} className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none w-28">
                         <option value="+91">IN (+91)</option>
                         <option value="+1">US (+1)</option>
                         <option value="+971">AE (+971)</option>
                       </select>
                       <input type="text" value={formData.phone} onChange={e => {
                         const maxLen = formData.countryCode === '+971' ? 9 : 10;
                         setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, maxLen), isPhoneVerified: false, otp: '', ownerPhoneVerificationToken: ''}); setOwnerOtpStatus('idle'); setOwnerOtpModalOpen(false);
                       }} placeholder="Enter phone number" className="flex-1 border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                     <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} placeholder="autofix@gmail.com" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                     <select value={formData.city} onChange={e => { setFormData({...formData, city: e.target.value, customCity: '', area: ''}); setAreaSuggestions([]); }} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700">
                       <option value="">Select city</option>
                       {(CITY_OPTIONS_BY_COUNTRY[formData.countryCode] || []).map(city => <option key={city} value={city}>{city}</option>)}
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <div className="relative">
                     <label className="block text-xs font-bold text-slate-700 mb-2">Area / Locality <span className="text-red-500">*</span></label>
                     <input type="text" value={formData.area} onChange={e => handleAreaSearch(e.target.value)} placeholder="e.g. Koramangala, Bandra, Jumeirah" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     {areaSuggestions.length > 0 && (
                       <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-lg">
                         {areaSuggestions.map((suggestion, idx) => (
                           <div key={idx} onClick={() => { setFormData(prev => ({...prev, area: suggestion})); setAreaSuggestions([]); }} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer">
                             {suggestion}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                </div>
                
                <div className="mb-6">
                   <label className="block text-xs font-bold text-slate-700 mb-2">Complete Address <span className="text-red-500">*</span></label>
                   <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} maxLength={200} placeholder="Example: 125 Broadway, Manhattan, New York, NY 10006" className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none h-24 focus:border-blue-500"></textarea>
                   <div className="text-right text-[10px] text-slate-400 mt-1">{formData.address.length}/200</div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div><label className="block text-xs font-bold text-slate-700 mb-2">State / Province / Emirate <span className="text-red-500">*</span></label><input required type="text" value={formData.stateRegion} onChange={e => setFormData({...formData, stateRegion: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-2">Postal Code <span className="text-red-500">*</span></label><input required type="text" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Garage Description <span className="text-red-500">*</span></label>
                     <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} maxLength={200} placeholder="A multi-brand automotive service center providing vehicle maintenance..." className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none h-24 focus:border-blue-500"></textarea>
                     <div className="text-right text-[10px] text-slate-400 mt-1">{formData.description.length}/200</div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Response Time <span className="text-red-500">*</span></label>
                     <div className="flex items-center gap-2"><input type="number" min="1" max="1440" value={formData.responseMins} onChange={e => setFormData({...formData, responseMins: e.target.value})} placeholder="e.g. 30" className="flex-1 border rounded-lg px-4 py-3 text-sm bg-white outline-none focus:border-blue-500" /><span className="text-xs text-slate-500">minutes</span></div>
                   </div>
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Highlights (Chips)</label>
                  <p className="text-xs text-slate-500 mb-3">Select features to highlight on your garage card.</p>
                  <div className="flex flex-wrap gap-2">
                    {['Free Pickup & Drop', 'Genuine Parts', 'Warranty', 'Expert Mechanics', 'AC Lounge'].map(chip => (
                      <button
                        key={chip}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            chips: prev.chips.includes(chip) ? prev.chips.filter(c => c !== chip) : [...prev.chips, chip]
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                          formData.chips.includes(chip) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 max-w-md"><input value={newHighlight} onChange={e => setNewHighlight(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomHighlight()} placeholder="Add custom highlight" className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" /><button type="button" onClick={addCustomHighlight} className="border border-blue-200 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold">Add</button></div>
                  <div className="flex flex-wrap gap-2 mt-2">{formData.chips.filter(chip => !['Free Pickup & Drop', 'Genuine Parts', 'Warranty', 'Expert Mechanics', 'AC Lounge'].includes(chip)).map(chip => <span key={chip} className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full">{chip}<button type="button" aria-label={`Remove ${chip}`} onClick={() => setFormData(prev => ({...prev, chips: prev.chips.filter(value => value !== chip)}))} className="ml-2 text-blue-500">×</button></span>)}</div>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <h2 className="text-xl font-bold text-[#17307a] mb-1">Authorized Person Details</h2>
                <p className="text-xs text-slate-500 mb-8">Enter the details of the person responsible for managing this garage.</p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} placeholder="Example: John Smith" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Designation <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.ownerDesignation} onChange={e => setFormData({...formData, ownerDesignation: e.target.value})} placeholder="Example: Operations Manager" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Owner Phone Number <span className="text-red-500">*</span></label>
                     <label className="flex items-center gap-2 text-sm text-slate-700 mb-2 cursor-pointer">
                       <input type="checkbox" checked={formData.sameAsGaragePhone} onChange={(e) => { setFormData({...formData, sameAsGaragePhone: e.target.checked, isPhoneVerified: false, otp: '', ownerPhoneVerificationToken: ''}); setOwnerOtpStatus('idle'); setOwnerOtpModalOpen(false); }} className="rounded text-blue-600 focus:ring-blue-500"/>
                       Same as garage phone number
                     </label>
                     {!formData.sameAsGaragePhone && (
                       <div className="flex gap-2">
                         <select value={formData.ownerCountryCode} onChange={e => {
                           setFormData({...formData, ownerCountryCode: e.target.value, isPhoneVerified: false, otp: '', ownerPhoneVerificationToken: ''}); setOwnerOtpStatus('idle'); setOwnerOtpModalOpen(false);
                         }} className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none w-28">
                           <option value="+91">IN (+91)</option>
                           <option value="+1">US (+1)</option>
                           <option value="+971">AE (+971)</option>
                         </select>
                         <input type="text" value={formData.ownerPhone} onChange={e => {
                           const maxLen = formData.ownerCountryCode === '+971' ? 9 : 10;
                           setFormData({...formData, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, maxLen), isPhoneVerified: false, otp: '', ownerPhoneVerificationToken: ''}); setOwnerOtpStatus('idle'); setOwnerOtpModalOpen(false);
                         }} placeholder="Enter owner phone" className="flex-1 border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                       </div>
                     )}
                  </div>
                </div>

                {/* Phone Verification Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#17307a] mb-2">Verify Phone Number</h3>
                  {!formData.isPhoneVerified ? (
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-xs text-slate-500">{ownerOtpStatus === 'sent' ? 'OTP sent to ' : 'Verify '} {formData.sameAsGaragePhone ? `${formData.countryCode} ${formData.phone || 'the garage number'}` : `${formData.ownerCountryCode} ${formData.ownerPhone || 'the owner number'}`}</span>
                      <button type="button" onClick={handleSendOwnerOtp} disabled={ownerOtpBusy} className="border border-[#17307a] text-[#17307a] px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 disabled:opacity-50 transition-colors">{ownerOtpBusy ? 'Sending…' : ownerOtpStatus === 'sent' ? 'Resend OTP' : 'Send OTP'}</button>
                      {ownerOtpStatus === 'sent' && <button type="button" onClick={() => setOwnerOtpModalOpen(true)} className="bg-[#17307a] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors">Enter OTP</button>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                      <Check className="w-5 h-5" /> Phone Number Verified Successfully
                    </div>
                  )}
                </div>

                <Modal isOpen={ownerOtpModalOpen} onClose={() => setOwnerOtpModalOpen(false)} title="Verify phone number">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">Enter the six-digit OTP sent to <span className="font-semibold text-slate-800">{formData.sameAsGaragePhone ? `${formData.countryCode} ${formData.phone}` : `${formData.ownerCountryCode} ${formData.ownerPhone}`}</span>.</p>
                    <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Development mode is active. Use OTP <strong>123456</strong>.</p>
                    <input autoFocus inputMode="numeric" value={formData.otp} onChange={e => setFormData(prev => ({...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6)}))} maxLength={6} placeholder="Enter 6-digit OTP" className="w-full border rounded-lg px-4 py-3 text-center tracking-[0.4em] text-lg outline-none focus:border-blue-500" />
                    <div className="flex items-center justify-between gap-3">
                      <button type="button" onClick={resetOwnerPhoneVerification} className="text-sm font-semibold text-slate-600 hover:text-[#17307a]">Change number</button>
                      <div className="flex gap-2"><button type="button" onClick={handleSendOwnerOtp} disabled={ownerOtpBusy} className="border border-[#17307a] px-3 py-2 rounded-lg text-xs font-bold text-[#17307a] disabled:opacity-50">Resend OTP</button><button type="button" onClick={handleVerifyOTP} disabled={ownerOtpBusy || formData.otp.length !== 6} className="bg-[#17307a] text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">{ownerOtpBusy ? 'Verifying…' : 'Verify & Continue'}</button></div>
                    </div>
                  </div>
                </Modal>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-md font-bold text-[#17307a] mb-4">Login Credentials</h3>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Login Email</label>
                      <div className="w-full border rounded-lg px-4 py-2.5 text-sm bg-slate-100 text-slate-500 flex items-center justify-between cursor-not-allowed">
                        {formData.email || 'Email not provided'}
                        <Lock className="w-4 h-4 text-slate-400"/>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Using the email provided in Garage Details.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Create Password <span className="text-red-500">*</span></label>
                      <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••••" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                      {formData.password && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`h-1 flex-1 rounded-full ${calculatePasswordStrength(formData.password) === 'Weak' ? 'bg-red-500' : calculatePasswordStrength(formData.password) === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                          <span className={`text-[10px] font-bold ${calculatePasswordStrength(formData.password) === 'Weak' ? 'text-red-500' : calculatePasswordStrength(formData.password) === 'Medium' ? 'text-yellow-500' : 'text-green-500'}`}>{calculatePasswordStrength(formData.password)}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                      <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••••" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <h2 className="text-xl font-bold text-[#17307a] mb-1">Business Documents</h2>
                <p className="text-xs text-slate-500 mb-8">Upload the documents required to verify and maintain the garage&apos;s business records.</p>
                
                <div className="space-y-6">
                  {/* Document Box Component */}
                  {[
                    { id: 'image', label: 'Garage Display Picture / Profile Image', req: true },
                    { id: 'businessRegDoc', label: 'Business Registration Certificate', req: true },
                    { id: 'businessLicenseDoc', label: 'Business License / Trade License', req: true },
                    { id: 'taxRegistrationDoc', label: 'Tax Registration / Tax Identification Document', req: true },
                    { id: 'ownerIdDoc', label: 'Owner Identity Proof', req: true },
                    { id: 'addressProofDoc', label: 'Proof of Business Address', req: true },
                    { id: 'insuranceDoc', label: 'Business Insurance', req: false },
                    { id: 'certificationsDoc', label: 'Professional Certifications', req: false },
                    { id: 'authorizationDoc', label: 'Authorization Documents', req: false },
                    { id: 'supportingDoc', label: 'Other Supporting Documents', req: false }
                  ].map(doc => {
                    const file = (formData as any)[doc.id];
                    return (
                      <div key={doc.id} className="border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-colors">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{doc.label} {doc.req ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">{doc.id === 'image' ? 'JPG, PNG or WEBP • Max 2 MB' : 'PDF, JPG or PNG • Max 5 MB'}</p>
                        </div>
                        {file ? (
                          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg flex items-center justify-between gap-4 w-full md:w-64">
                            <div className="flex items-center gap-2 truncate cursor-pointer hover:text-green-900 group" onClick={() => setPreviewModal({isOpen: true, url: file.data, type: file.type, name: file.name})}>
                              <Check className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs truncate font-medium group-hover:underline">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB · Uploaded</span>
                            </div>
                            <button onClick={() => removeUpload(doc.id)} className="text-slate-400 hover:text-red-500" title="Remove Document">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input type="file" id={doc.id} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept={doc.id === 'image' ? ".png,.jpg,.jpeg,.webp" : ".pdf,.png,.jpg,.jpeg"} onChange={(e) => handleUpload(doc.id, e)} />
                            <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600 font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors pointer-events-none w-full md:w-64 justify-center">
                              <Upload className="w-4 h-4" /> Upload Document
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-[#17307a] mb-1">Services Offered</h2>
                    <p className="text-xs text-slate-500">Select the services available at this garage.</p>
                  </div>
                  <button onClick={handleSelectAllServices} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">Select All Services</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 mb-8">
                  {['Maintenance & General Service', 'Mechanical Repairs', 'Electrical & Diagnostics', 'Tyres & Wheel Care', 'AC & Climate Control', 'Bodywork & Appearance', 'Additional Services'].map(category => (
                    <div key={category}>
                      <h3 className="font-bold text-sm text-[#17307a] mb-4 border-b pb-2">{category}</h3>
                      <div className="space-y-3">
                        {platformServices.filter(service => service.category === category && service.name !== 'More Services').map(service => {
                          const selected = formData.services.includes(service.id);
                          const pricingType = formData.servicePricingTypes[service.id] || 'fixed';
                          const hasInvalidPrice = invalidServicePrices.includes(service.id);
                          return <div key={service.id} className={`flex flex-col gap-2 rounded-md ${hasInvalidPrice ? 'bg-red-50 p-2 ring-1 ring-red-300' : ''}`}>
                            <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={selected} onChange={() => { toggleService(service.id); setInvalidServicePrices(prev => prev.filter(id => id !== service.id)); }} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" /><span className="text-sm text-slate-700 group-hover:text-blue-700">{service.name}</span></label>
                            {selected && <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select value={pricingType} onChange={e => setFormData(prev => ({...prev, servicePricingTypes: {...prev.servicePricingTypes, [service.id]: e.target.value}}))} className="border rounded px-2 py-1 text-xs"><option value="fixed">Fixed Price</option><option value="starting_from">Starting From</option><option value="inspection_required">Inspection Required</option><option value="custom_quote">Custom Quote</option></select>
                              <input type="number" min="0" value={formData.servicePrices[service.id] || ''} onChange={e => { setFormData(prev => ({...prev, servicePrices: {...prev.servicePrices, [service.id]: e.target.value}})); setInvalidServicePrices(prev => prev.filter(id => id !== service.id)); }} placeholder={`${getCountryByCallingCode(formData.countryCode)?.currencyCode} price`} aria-invalid={hasInvalidPrice} className={`border rounded px-2 py-1 text-xs ${hasInvalidPrice ? 'border-red-500 bg-white' : ''}`} />
                            </div>}
                          </div>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6 border-slate-200">
                  <h3 className="font-bold text-sm text-[#17307a] mb-4">Add Custom Service</h3>
                  <div className="flex gap-2 max-w-md">
                    <input type="text" value={newService} onChange={e => setNewService(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomService()} placeholder="Type custom service name..." className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500" />
                    <button onClick={addCustomService} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> Add</button>
                  </div>
                  {formData.customServices.length > 0 && (
                    <div className="flex flex-col gap-3 mt-4 max-w-md">
                      {formData.customServices.map(s => (
                        <div key={s} className={`bg-blue-50 border px-3 py-3 rounded-lg space-y-2 ${invalidCustomServicePrices.includes(s) ? 'border-red-500 ring-1 ring-red-300' : 'border-blue-100'}`}>
                          <div className="flex items-center justify-between"><span className="text-sm text-blue-700 font-medium">{s}</span><button onClick={() => { setFormData(prev => ({ ...prev, customServices: prev.customServices.filter(service => service !== s) })); setInvalidCustomServicePrices(prev => prev.filter(service => service !== s)); }} className="text-blue-400 hover:text-blue-700"><X className="w-4 h-4"/></button></div>
                          <textarea value={formData.customServiceDescriptions[s] || ''} onChange={e => setFormData(prev => ({...prev, customServiceDescriptions: {...prev.customServiceDescriptions, [s]: e.target.value}}))} placeholder="Service description (optional)" className="w-full border border-blue-200 rounded px-2 py-1 text-xs" />
                          <div className="grid grid-cols-2 gap-2"><select value={formData.customServicePricingTypes[s] || 'fixed'} onChange={e => setFormData(prev => ({...prev, customServicePricingTypes: {...prev.customServicePricingTypes, [s]: e.target.value}}))} className="border border-blue-200 rounded px-2 py-1 text-xs"><option value="fixed">Fixed Price</option><option value="starting_from">Starting From</option><option value="inspection_required">Inspection Required</option><option value="custom_quote">Custom Quote</option></select><input type="number" min="0" value={formData.customServicePrices[s] || ''} onChange={e => { setFormData(prev => ({...prev, customServicePrices: {...prev.customServicePrices, [s]: e.target.value}})); setInvalidCustomServicePrices(prev => prev.filter(service => service !== s)); }} placeholder={`${getCountryByCallingCode(formData.countryCode)?.currencyCode} price`} aria-invalid={invalidCustomServicePrices.includes(s)} className={`border rounded px-2 py-1 text-xs ${invalidCustomServicePrices.includes(s) ? 'border-red-500 bg-white' : 'border-blue-200'}`} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <>
                <h2 className="text-xl font-bold text-[#17307a] mb-1">Working Hours</h2>
                <p className="text-xs text-slate-500 mb-8">Set the garage&apos;s operating hours and weekly availability.</p>
                <div className="flex gap-2 mb-4"><button type="button" onClick={() => copyMondayHours(false)} className="px-3 py-2 text-xs font-bold border rounded-lg text-blue-700 hover:bg-blue-50">Copy Monday to Other Days</button><button type="button" onClick={() => copyMondayHours(true)} className="px-3 py-2 text-xs font-bold border rounded-lg text-blue-700 hover:bg-blue-50">Copy Monday to Weekends</button></div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-6 py-3 grid grid-cols-12 gap-4 border-b text-xs font-bold text-slate-600">
                    <div className="col-span-3">Day</div>
                    <div className="col-span-2 text-center">Open</div>
                    <div className="col-span-3 text-center">Opening</div>
                    <div className="col-span-3 text-center">Closing</div>
                  </div>
                  
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    const data = (formData.workingHours as any)[day];
                    return (
                      <div key={day} className="px-6 py-4 grid grid-cols-12 gap-4 border-b last:border-0 items-center">
                        <div className="col-span-3 font-bold text-sm text-slate-800 capitalize">{day}</div>
                        <div className="col-span-2 flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={data.open}
                            onChange={(e) => setFormData(prev => ({...prev, workingHours: {...prev.workingHours, [day]: {...data, open: e.target.checked}}}))}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        {data.open ? (
                          <>
                            <div className="col-span-3">
                              <select value={data.start} onChange={e => setFormData(prev => ({...prev, workingHours: {...prev.workingHours, [day]: {...data, start: e.target.value}}}))} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white outline-none">
                                {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                              </select>
                            </div>
                            <div className="col-span-3">
                              <select value={data.end} onChange={e => setFormData(prev => ({...prev, workingHours: {...prev.workingHours, [day]: {...data, end: e.target.value}}}))} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white outline-none">
                                {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                              </select>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-6 text-center text-xs text-slate-400 font-medium">Closed</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* STEP 6 */}
            {step === 6 && (
              <div className="py-6">
                 <h2 className="text-xl font-bold text-[#17307a] mb-2">Review & Register Garage</h2>
                 <p className="text-sm text-slate-500 mb-8">Please review all information before creating the garage account.</p>

                 <div className="space-y-6">
                   {/* Garage Details */}
                   <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-sm text-[#17307a]">Garage Details</h3>
                       <button onClick={() => setStep(1)} className="text-blue-600 text-xs font-bold hover:underline">Edit</button>
                     </div>
                     <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-8 text-sm">
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Garage Name</p><p className="font-bold break-words">{formData.name}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Garage Type</p><p className="font-bold break-words">{formData.type}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Established Year</p><p className="font-bold">{formData.year}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Phone</p><p className="font-bold">{formData.countryCode} {formData.phone}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Email</p><p className="font-bold break-all">{formData.email}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Location</p><p className="font-bold break-words">{formData.city}, {formData.area}</p></div>
                       <div className="col-span-2 min-w-0"><p className="text-slate-500 text-xs mb-1">Address</p><p className="font-bold break-words">{formData.address}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Highlights</p><p className="font-bold break-words">{formData.chips.length > 0 ? formData.chips.join(', ') : 'None'}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Garage Image</p><p className="font-bold text-green-600">{formData.image ? 'Uploaded' : 'Missing'}</p></div>
                     </div>
                   </div>

                   {/* Owner Details */}
                   <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-sm text-[#17307a]">Owner Details</h3>
                       <button onClick={() => setStep(2)} className="text-blue-600 text-xs font-bold hover:underline">Edit</button>
                     </div>
                     <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-8 text-sm">
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Owner Name</p><p className="font-bold break-words">{formData.ownerName}</p></div>
                       <div className="min-w-0">
                         <p className="text-slate-500 text-xs mb-1">Owner Phone</p>
                         <p className="font-bold flex items-center gap-2">
                           {formData.sameAsGaragePhone ? `${formData.countryCode} ${formData.phone}` : `${formData.ownerCountryCode} ${formData.ownerPhone}`}
                           {formData.isPhoneVerified && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                         </p>
                       </div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Login Email</p><p className="font-bold break-all">{formData.email}</p></div>
                       <div className="min-w-0"><p className="text-slate-500 text-xs mb-1">Password</p><p className="font-bold">••••••••</p></div>
                     </div>
                   </div>

                   {/* Services */}
                   <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-sm text-[#17307a]">Business Documents</h3><button onClick={() => setStep(3)} className="text-blue-600 text-xs font-bold hover:underline">Edit</button></div>
                     <div className="p-5 text-sm text-slate-700 space-y-1">
                       {[['Business Registration Certificate', formData.businessRegDoc], ['Business / Trade License', formData.businessLicenseDoc], ['Tax Registration / Tax Identification', formData.taxRegistrationDoc], ['Owner Identity Proof', formData.ownerIdDoc], ['Business Address Proof', formData.addressProofDoc]].map(([label, file]: any) => <p key={label}>{label}: <span className="font-medium">{file?.name || 'Missing'}</span></p>)}
                     </div>
                   </div>

                   <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-sm text-[#17307a]">Services Offered</h3>
                       <button onClick={() => setStep(4)} className="text-blue-600 text-xs font-bold hover:underline">Edit</button>
                     </div>
                     <div className="p-5">
                        <div className="flex flex-wrap gap-2">
                          {formData.services.map(id => (
                            <span key={id} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1.5 rounded-full font-medium">{platformServices.find(s => s.id === id)?.name || id} · {getCountryByCallingCode(formData.countryCode)?.currencyCode} {formData.servicePrices[id]}</span>
                          ))}
                          {formData.customServices.map(name => (
                            <span key={name} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1.5 rounded-full font-medium">{name} · {getCountryByCallingCode(formData.countryCode)?.currencyCode} {formData.customServicePrices[name]}</span>
                          ))}
                        </div>
                     </div>
                   </div>

                 </div>

                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-8">
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Account Creation</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">A garage account will be created using the registered email address. The garage will be activated immediately after successful registration and will be available to customers.</p>
                 </div>
              </div>
            )}
            
            {errorMsg && <p className="text-red-500 text-xs font-bold mb-4">{errorMsg}</p>}
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-6">
               {step === 1 ? (
                 <button onClick={() => router.push('/admin/garages')} className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">Cancel</button>
               ) : (
                 <button onClick={handleBack} className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">&larr; Back</button>
               )}
               
               {step < 6 ? (
                 <button onClick={handleNext} className="bg-[#17307a] text-white px-8 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-900 shadow-md transition-colors">
                   Next Step &rarr;
                 </button>
               ) : (
                 <button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 shadow-md disabled:opacity-50 transition-colors">
                   {isSubmitting ? 'Registering...' : 'Register Garage'}
                 </button>
               )}
            </div>
          </div>
        </div>

        <div className="w-80 flex-shrink-0 flex flex-col gap-6">
          <Card className="p-6">
             <h3 className="font-bold text-[#17307a] mb-1">Registration Progress</h3>
             <p className="text-[10px] text-slate-500 mb-4">Step {step} of 6</p>
             <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500">{Math.round(progressPercent)}%</span>
             </div>
             
             <div className="space-y-4">
               {stepsList.map(s => (
                 <div key={s.num} className={`flex gap-4 p-2 rounded-lg transition-colors ${step === s.num ? 'bg-blue-50 border border-blue-100' : 'pl-3'}`}>
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 ${
                     step >= s.num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                   }`}>
                     {step > s.num ? '✓' : s.num}
                   </div>
                   <div>
                     <p className={`text-xs font-bold leading-tight ${step >= s.num ? (step === s.num ? 'text-blue-800' : 'text-slate-800') : 'text-slate-500'}`}>{s.title}</p>
                     <p className={`text-[10px] mt-0.5 ${step === s.num ? 'text-blue-600/80' : 'text-slate-400'}`}>{s.desc}</p>
                   </div>
                 </div>
               ))}
             </div>
          </Card>
          
          <Card className="p-6 bg-[#f4f7ff] border border-blue-100">
             <div className="bg-blue-100 text-blue-600 p-2 rounded-full w-fit mb-3"><ShieldCheck className="w-5 h-5"/></div>
             <h4 className="font-bold text-[#17307a] text-sm mb-2">Secure Registration</h4>
             <p className="text-xs text-slate-600">All data entered is encrypted and stored securely according to our privacy policy.</p>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-[#17307a] mb-2">Need Help?</h3>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">If you need any assistance while registering your garage, our support team is here to help you.</p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText('+91 98765 43210');
                toast.success('Support number copied to clipboard!');
              }}
              className="w-full border border-blue-200 rounded-lg py-2 text-blue-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50"
            >
              <HeadphonesIcon className="w-4 h-4"/> +91 98765 43210
            </button>
          </Card>
        </div>
      </div>

      <Modal isOpen={previewModal.isOpen} onClose={() => setPreviewModal({isOpen: false, url: '', type: '', name: ''})} title={previewModal.name} className="max-w-4xl max-h-[90vh]">
        <div className="w-full h-[70vh] flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
          {previewModal.type.startsWith('image/') ? (
            <img src={previewModal.url} alt={previewModal.name} className="max-w-full max-h-full object-contain" />
          ) : previewModal.type === 'application/pdf' ? (
            <object data={previewModal.url} type="application/pdf" className="w-full h-full">
               <iframe src={previewModal.url} className="w-full h-full border-none">
                 <p>This browser does not support PDFs. Please download the PDF to view it.</p>
               </iframe>
            </object>
          ) : (
            <p className="text-slate-500 text-sm">Cannot preview this file type.</p>
          )}
        </div>
      </Modal>

    </div>
  );
}
