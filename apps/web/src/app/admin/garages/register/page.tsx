'use client';
import { Card } from '@/components/common/card';
import { ShieldCheck, HeadphonesIcon, Upload, X, Check, Lock, Info, Plus } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { COUNTRIES, getCountryByCallingCode } from '@/lib/countries';
import { Modal } from '@/components/common/modal';


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
    area: '',
    address: '',
    year: '',
    description: '',
    responseMins: '30',
    ownerName: '',
    sameAsGaragePhone: true,
    ownerCountryCode: '+91',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
    otp: '',
    isPhoneVerified: false,
    businessRegDoc: null as any,
    businessLicenseDoc: null as any,
    ownerIdDoc: null as any,
    addressProofDoc: null as any,
    services: [] as string[],
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const getCitiesForCountry = (code: string): string[] => {
    switch (code) {
      case '+91': return ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];
      case '+1': return ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
      case '+971': return ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah'];
      default: return [];
    }
  };

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

  const handleNext = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!formData.name || !formData.type || !formData.phone || !formData.email || !formData.city || !formData.area || !formData.address) {
        setErrorMsg('Please fill out all required fields marked with *');
        return;
      }
      const err = getPhoneError(formData.countryCode, formData.phone);
      if (err) { setErrorMsg(err); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.ownerName) { setErrorMsg('Owner name is required.'); return; }
      if (!formData.sameAsGaragePhone) {
        const err = getPhoneError(formData.ownerCountryCode, formData.ownerPhone);
        if (err) { setErrorMsg(err); return; }
      }
      if (!formData.password || formData.password !== formData.confirmPassword) {
        setErrorMsg('Passwords do not match or are empty.');
        return;
      }
      if (!formData.isPhoneVerified) {
        setErrorMsg('Please verify the owner phone number before proceeding.');
        return;
      }
    }

    if (step === 3) {
      if (!formData.image || !formData.businessRegDoc || !formData.businessLicenseDoc || !formData.ownerIdDoc || !formData.addressProofDoc) {
        setErrorMsg('Please upload all mandatory documents including the garage image to proceed.');
        return;
      }
    }

    if (step === 4) {
      if (formData.services.length === 0) {
        setErrorMsg('Please select at least one service offered by the garage.');
        return;
      }
    }

    setStep(prev => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleVerifyOTP = () => {
    if (formData.otp === '123456') {
      setFormData(prev => ({ ...prev, isPhoneVerified: true }));
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid OTP. Please use 123456 for the demo.');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const selectedCountry = getCountryByCallingCode(formData.countryCode);
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
        chips: formData.chips,
        image: formData.image,
        description: formData.description,
        responseMins: Number(formData.responseMins),
        businessRegDoc: formData.businessRegDoc,
        businessLicenseDoc: formData.businessLicenseDoc,
        ownerIdDoc: formData.ownerIdDoc,
        addressProofDoc: formData.addressProofDoc,
        workingHours: formData.workingHours,
        country: selectedCountry?.isoCode || null,
        businessCurrency: selectedCountry?.currencyCode || 'USD',
        locale: selectedCountry?.locale || 'en-US'
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
    { num: 2, title: 'Owner Details', desc: 'Information about the owner' },
    { num: 3, title: 'Business Documents', desc: 'Upload required documents' },
    { num: 4, title: 'Services Offered', desc: 'Select services provided' },
    { num: 5, title: 'Working Hours', desc: 'Set working hours & days' },
    { num: 6, title: 'Review & Submit', desc: 'Review all details & submit' },
  ];

  const progressPercent = ((step - 1) / 5) * 100;

  const toggleService = (s: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(s) ? prev.services.filter(x => x !== s) : [...prev.services, s]
    }));
  };

  const handleUpload = (field: string, e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (field === 'image') {
        if (file.type !== 'image/png') {
          setErrorMsg('Garage Display/Profile Image must be a PNG file.');
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          setErrorMsg('Garage Display/Profile Image must be less than 2MB.');
          return;
        }
      } else {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          setErrorMsg('Only PDF, JPG, or PNG files are supported for business documents.');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setErrorMsg('Business Document must be less than 10MB.');
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
    const allServices = [
      'Oil & Filter Change', 'Periodic Maintenance', 'Brake Service', 'Battery Replacement', 'AC Service', 'Engine Service', 'Transmission Service', 'Wheel Alignment', 'Wheel Balancing', 'Tire Replacement',
      'Computer Diagnostics', 'Engine Diagnostics', 'Electrical Diagnostics', 'Battery Diagnostics', 'ECU Diagnostics',
      'Engine Repair', 'Transmission Repair', 'Suspension Repair', 'Steering Repair', 'Brake Repair', 'Electrical Repair',
      'Dent Repair', 'Painting', 'Car Washing', 'Detailing', 'Ceramic Coating', 'Windshield Replacement',
      'EV Diagnostics', 'EV Battery Service', 'EV Charging', 'EV Motor Service'
    ];
    const customServices = formData.services.filter(s => !allServices.includes(s));
    setFormData(prev => ({...prev, services: [...allServices, ...customServices]}));
  };

  const [newService, setNewService] = useState('');
  const addCustomService = () => {
    if (newService.trim() && !formData.services.includes(newService.trim())) {
      setFormData(prev => ({...prev, services: [...prev.services, newService.trim()]}));
      setNewService('');
    }
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
                     <select value={['General Service Garage', 'Specialist Workshop', 'Authorized Service Center', 'Body & Paint Shop', 'Tire & Wheel Center', 'EV Service Center', 'Multi-Brand Service Center', ''].includes(formData.type) ? formData.type : 'Other'} onChange={e => setFormData({...formData, type: e.target.value === 'Other' ? 'Other ' : e.target.value})} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700 mb-2">
                       <option value="">Select garage type</option>
                       <option value="General Service Garage">General Service Garage</option>
                       <option value="Specialist Workshop">Specialist Workshop</option>
                       <option value="Authorized Service Center">Authorized Service Center</option>
                       <option value="Body & Paint Shop">Body & Paint Shop</option>
                       <option value="Tire & Wheel Center">Tire & Wheel Center</option>
                       <option value="EV Service Center">EV Service Center</option>
                       <option value="Multi-Brand Service Center">Multi-Brand Service Center</option>
                       <option value="Other">Other</option>
                     </select>
                     {(!['General Service Garage', 'Specialist Workshop', 'Authorized Service Center', 'Body & Paint Shop', 'Tire & Wheel Center', 'EV Service Center', 'Multi-Brand Service Center', ''].includes(formData.type)) && (
                       <input type="text" value={formData.type === 'Other ' ? '' : formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="Please specify garage type" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     )}
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Registration Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                     <input type="text" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="Enter registration number" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Established Year <span className="text-red-500">*</span></label>
                     <select value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700">
                        <option value="">Select year</option>
                        {Array.from({ length: 35 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                     <div className="flex gap-2">
                       <select value={formData.countryCode} onChange={e => {
                         setFormData({...formData, countryCode: e.target.value, city: ''})
                       }} className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none w-28">
                         <option value="+91">IN (+91)</option>
                         <option value="+1">US (+1)</option>
                         <option value="+971">AE (+971)</option>
                       </select>
                       <input type="text" value={formData.phone} onChange={e => {
                         const maxLen = formData.countryCode === '+971' ? 9 : 10;
                         setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, maxLen)});
                       }} placeholder="Enter phone number" className="flex-1 border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                     <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} placeholder="autofix@gmail.com" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                     <select value={getCitiesForCountry(formData.countryCode).includes(formData.city) || formData.city === '' ? formData.city : 'Other'} onChange={e => {
                         setFormData({...formData, city: e.target.value === 'Other' ? 'Other' : e.target.value})
                       }} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700">
                         <option value="">Select city</option>
                         {getCitiesForCountry(formData.countryCode).map(c => <option key={c} value={c}>{c}</option>)}
                         <option value="Other">Other</option>
                       </select>
                     {((!getCitiesForCountry(formData.countryCode).includes(formData.city) && formData.city !== '') || formData.city === 'Other') && (
                       <input type="text" value={formData.city === 'Other' ? '' : formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Enter city name" className="w-full mt-2 border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                     )}
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Area / Locality <span className="text-red-500">*</span></label>
                     <input type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder="Example: Manhattan" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                   </div>
                </div>
                
                <div className="mb-6">
                   <label className="block text-xs font-bold text-slate-700 mb-2">Complete Address <span className="text-red-500">*</span></label>
                   <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} maxLength={200} placeholder="Example: 125 Broadway, Manhattan, New York, NY 10006" className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none h-24 focus:border-blue-500"></textarea>
                   <div className="text-right text-[10px] text-slate-400 mt-1">{formData.address.length}/200</div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Garage Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                     <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} maxLength={200} placeholder="A multi-brand automotive service center providing vehicle maintenance..." className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none h-24 focus:border-blue-500"></textarea>
                     <div className="text-right text-[10px] text-slate-400 mt-1">{formData.description.length}/200</div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Response Time (mins) <span className="text-red-500">*</span></label>
                     <input type="number" min="1" max="1440" value={formData.responseMins} onChange={e => setFormData({...formData, responseMins: e.target.value})} placeholder="e.g. 30" className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none focus:border-blue-500" />
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
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <h2 className="text-xl font-bold text-[#17307a] mb-1">Owner Details</h2>
                <p className="text-xs text-slate-500 mb-8">Enter the details of the person responsible for managing this garage.</p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Owner Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} placeholder="Example: John Smith" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-700 mb-2">Owner Phone Number <span className="text-red-500">*</span></label>
                     <label className="flex items-center gap-2 text-sm text-slate-700 mb-2 cursor-pointer">
                       <input type="checkbox" checked={formData.sameAsGaragePhone} onChange={(e) => setFormData({...formData, sameAsGaragePhone: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500"/>
                       Same as garage phone number
                     </label>
                     {!formData.sameAsGaragePhone && (
                       <div className="flex gap-2">
                         <select value={formData.ownerCountryCode} onChange={e => {
                           setFormData({...formData, ownerCountryCode: e.target.value})
                         }} className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none w-28">
                           <option value="+91">IN (+91)</option>
                           <option value="+1">US (+1)</option>
                           <option value="+971">AE (+971)</option>
                         </select>
                         <input type="text" value={formData.ownerPhone} onChange={e => {
                           const maxLen = formData.ownerCountryCode === '+971' ? 9 : 10;
                           setFormData({...formData, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, maxLen)});
                         }} placeholder="Enter owner phone" className="flex-1 border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                       </div>
                     )}
                  </div>
                </div>

                {/* Phone Verification Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#17307a] mb-2">Verify Phone Number</h3>
                  {!formData.isPhoneVerified ? (
                    <div className="flex gap-4 items-center">
                      <div className="flex gap-2 items-center">
                        <input type="text" value={formData.otp} onChange={e => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})} maxLength={6} placeholder="Enter 6-digit OTP" className="w-36 border rounded-lg px-4 py-2 text-sm text-center outline-none focus:border-blue-500" />
                        <span className="text-xs text-slate-400">Sent to {formData.sameAsGaragePhone ? `${formData.countryCode} ${formData.phone}` : `${formData.ownerCountryCode} ${formData.ownerPhone}`}</span>
                      </div>
                      <button onClick={handleVerifyOTP} className="bg-[#17307a] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors">Verify OTP</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                      <Check className="w-5 h-5" /> Phone number verified
                    </div>
                  )}
                </div>

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
                <p className="text-xs text-slate-500 mb-8">Upload the documents required to verify and maintain the garage's business records.</p>
                
                <div className="space-y-6">
                  {/* Document Box Component */}
                  {[
                    { id: 'image', label: 'Garage Display Picture / Profile Image', req: true },
                    { id: 'businessRegDoc', label: 'Business Registration Document', req: true },
                    { id: 'businessLicenseDoc', label: 'Business License / Trade License', req: true },
                    { id: 'ownerIdDoc', label: 'Owner Identity Proof', req: true },
                    { id: 'addressProofDoc', label: 'Proof of Business Address', req: true }
                  ].map(doc => {
                    const file = (formData as any)[doc.id];
                    return (
                      <div key={doc.id} className="border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-colors">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{doc.label} {doc.req && <span className="text-red-500">*</span>}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">{doc.id === 'image' ? 'PNG ONLY • Max 2 MB' : 'PDF, JPG or PNG • Max 10 MB'}</p>
                        </div>
                        {file ? (
                          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg flex items-center justify-between gap-4 w-full md:w-64">
                            <div className="flex items-center gap-2 truncate cursor-pointer hover:text-green-900 group" onClick={() => setPreviewModal({isOpen: true, url: file.data, type: file.type, name: file.name})}>
                              <Check className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs truncate font-medium group-hover:underline">{file.name}</span>
                            </div>
                            <button onClick={() => removeUpload(doc.id)} className="text-slate-400 hover:text-red-500" title="Remove Document">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input type="file" id={doc.id} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept={doc.id === 'image' ? ".png" : ".pdf,.png,.jpg,.jpeg"} onChange={(e) => handleUpload(doc.id, e)} />
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
                  {/* Category */}
                  <div>
                    <h3 className="font-bold text-sm text-[#17307a] mb-4 border-b pb-2">General Maintenance</h3>
                    <div className="space-y-3">
                      {['Oil & Filter Change', 'Periodic Maintenance', 'Brake Service', 'Battery Replacement', 'AC Service', 'Engine Service', 'Transmission Service', 'Wheel Alignment', 'Wheel Balancing', 'Tire Replacement'].map(s => (
                        <label key={s} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={formData.services.includes(s)} onChange={() => toggleService(s)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" />
                          <span className="text-sm text-slate-700 group-hover:text-blue-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#17307a] mb-4 border-b pb-2">Diagnostics</h3>
                    <div className="space-y-3 mb-10">
                      {['Computer Diagnostics', 'Engine Diagnostics', 'Electrical Diagnostics', 'Battery Diagnostics', 'ECU Diagnostics'].map(s => (
                        <label key={s} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={formData.services.includes(s)} onChange={() => toggleService(s)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" />
                          <span className="text-sm text-slate-700 group-hover:text-blue-700">{s}</span>
                        </label>
                      ))}
                    </div>
                    <h3 className="font-bold text-sm text-[#17307a] mb-4 border-b pb-2">Repair Services</h3>
                    <div className="space-y-3">
                      {['Engine Repair', 'Transmission Repair', 'Suspension Repair', 'Steering Repair', 'Brake Repair', 'Electrical Repair'].map(s => (
                        <label key={s} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={formData.services.includes(s)} onChange={() => toggleService(s)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" />
                          <span className="text-sm text-slate-700 group-hover:text-blue-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#17307a] mb-4 border-b pb-2">Body & Exterior</h3>
                    <div className="space-y-3">
                      {['Dent Repair', 'Painting', 'Car Washing', 'Detailing', 'Ceramic Coating', 'Windshield Replacement'].map(s => (
                        <label key={s} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={formData.services.includes(s)} onChange={() => toggleService(s)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" />
                          <span className="text-sm text-slate-700 group-hover:text-blue-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#17307a] mb-4 border-b pb-2">EV Services</h3>
                    <div className="space-y-3">
                      {['EV Diagnostics', 'EV Battery Service', 'EV Charging', 'EV Motor Service'].map(s => (
                        <label key={s} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={formData.services.includes(s)} onChange={() => toggleService(s)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer" />
                          <span className="text-sm text-slate-700 group-hover:text-blue-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 border-slate-200">
                  <h3 className="font-bold text-sm text-[#17307a] mb-4">Other Services</h3>
                  <div className="flex gap-2 max-w-md">
                    <input type="text" value={newService} onChange={e => setNewService(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomService()} placeholder="Type custom service name..." className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500" />
                    <button onClick={addCustomService} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> Add</button>
                  </div>
                  {formData.services.filter(s => !['Oil & Filter Change', 'Periodic Maintenance', 'Brake Service', 'Battery Replacement', 'AC Service', 'Engine Service', 'Transmission Service', 'Wheel Alignment', 'Wheel Balancing', 'Tire Replacement', 'Computer Diagnostics', 'Engine Diagnostics', 'Electrical Diagnostics', 'Battery Diagnostics', 'ECU Diagnostics', 'Engine Repair', 'Transmission Repair', 'Suspension Repair', 'Steering Repair', 'Brake Repair', 'Electrical Repair', 'Dent Repair', 'Painting', 'Car Washing', 'Detailing', 'Ceramic Coating', 'Windshield Replacement', 'EV Diagnostics', 'EV Battery Service', 'EV Charging', 'EV Motor Service'].includes(s)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {formData.services.filter(s => !['Oil & Filter Change', 'Periodic Maintenance', 'Brake Service', 'Battery Replacement', 'AC Service', 'Engine Service', 'Transmission Service', 'Wheel Alignment', 'Wheel Balancing', 'Tire Replacement', 'Computer Diagnostics', 'Engine Diagnostics', 'Electrical Diagnostics', 'Battery Diagnostics', 'ECU Diagnostics', 'Engine Repair', 'Transmission Repair', 'Suspension Repair', 'Steering Repair', 'Brake Repair', 'Electrical Repair', 'Dent Repair', 'Painting', 'Car Washing', 'Detailing', 'Ceramic Coating', 'Windshield Replacement', 'EV Diagnostics', 'EV Battery Service', 'EV Charging', 'EV Motor Service'].includes(s)).map(s => (
                        <span key={s} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                          {s} <button onClick={() => toggleService(s)} className="text-blue-400 hover:text-blue-700"><X className="w-3 h-3"/></button>
                        </span>
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
                <p className="text-xs text-slate-500 mb-8">Set the garage's operating hours and weekly availability.</p>
                
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
                                <option value="08:00 AM">08:00 AM</option>
                                <option value="09:00 AM">09:00 AM</option>
                                <option value="10:00 AM">10:00 AM</option>
                              </select>
                            </div>
                            <div className="col-span-3">
                              <select value={data.end} onChange={e => setFormData(prev => ({...prev, workingHours: {...prev.workingHours, [day]: {...data, end: e.target.value}}}))} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white outline-none">
                                <option value="05:00 PM">05:00 PM</option>
                                <option value="06:00 PM">06:00 PM</option>
                                <option value="07:00 PM">07:00 PM</option>
                                <option value="08:00 PM">08:00 PM</option>
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
                     <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-sm text-[#17307a]">Services Offered</h3>
                       <button onClick={() => setStep(4)} className="text-blue-600 text-xs font-bold hover:underline">Edit</button>
                     </div>
                     <div className="p-5">
                        <div className="flex flex-wrap gap-2">
                          {formData.services.map(s => (
                            <span key={s} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1.5 rounded-full font-medium">{s}</span>
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
            <button className="w-full border border-blue-200 rounded-lg py-2 text-blue-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50"><HeadphonesIcon className="w-4 h-4"/> Contact Support</button>
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
