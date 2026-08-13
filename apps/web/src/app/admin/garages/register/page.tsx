'use client';
import { Card } from '@/components/common/card';
import { Check, ShieldCheck, HeadphonesIcon } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function RegisterGaragePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    registrationNumber: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    ownerName: '' // Will just pass a default for now if empty
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!formData.name || !formData.phone || !formData.email || !formData.city || !formData.address) {
       setErrorMsg('Please fill out all required fields marked with *');
       return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/admin/onboarding/garages', {
        ...formData,
        state: 'State', // Mock
        pincode: '000000', // Mock
        ownerName: 'Garage Admin'
      });
      router.push('/admin/garages');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to register garage. It may already exist.');
      setIsSubmitting(false);
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
          <div className="bg-white rounded-t-xl border-b border-slate-100 p-6 flex justify-between relative shadow-sm">
             <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
             
             <div className="flex flex-col items-center gap-2 relative z-10">
               <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white]">1</div>
               <span className="text-[11px] font-bold text-blue-600">Garage Details</span>
             </div>
             <div className="flex flex-col items-center gap-2 relative z-10">
               <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white]">2</div>
               <span className="text-[11px] font-bold text-slate-500">Owner Details</span>
             </div>
             <div className="flex flex-col items-center gap-2 relative z-10">
               <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white]">3</div>
               <span className="text-[11px] font-bold text-slate-500">Business Documents</span>
             </div>
             <div className="flex flex-col items-center gap-2 relative z-10">
               <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white]">4</div>
               <span className="text-[11px] font-bold text-slate-500">Services Offered</span>
             </div>
             <div className="flex flex-col items-center gap-2 relative z-10">
               <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white]">5</div>
               <span className="text-[11px] font-bold text-slate-500">Working Hours</span>
             </div>
             <div className="flex flex-col items-center gap-2 relative z-10">
               <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_white]">6</div>
               <span className="text-[11px] font-bold text-slate-500">Review & Submit</span>
             </div>
          </div>

          <div className="bg-white rounded-b-xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold text-[#17307a] mb-1">Garage Details</h2>
            <p className="text-xs text-slate-500 mb-8">Enter basic information about the garage.</p>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Garage Name <span className="text-red-500">*</span></label>
                 <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter garage or business name" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Garage Type <span className="text-red-500">*</span></label>
                 <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700">
                   <option value="">Select garage type</option>
                   <option value="authorized">Authorized Service Center</option>
                   <option value="independent">Independent Garage</option>
                   <option value="multi-brand">Multi-Brand Workshop</option>
                   <option value="specialist">Specialist Workshop</option>
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Registration Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                 <input type="text" value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="Enter registration number" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Established Year</label>
                 <div className="relative">
                    <select className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700 appearance-none">
                      <option value="">Select year</option>
                      {Array.from({ length: 35 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-2.5">📅</div>
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                 <div className="flex gap-2">
                   <select className="border rounded-lg px-3 py-2.5 text-sm bg-white outline-none w-24"><option>+91</option></select>
                   <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Enter phone number" className="flex-1 border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                 <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Enter email address" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                 <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500 text-slate-700">
                   <option value="">Select city</option>
                   <option value="Bangalore">Bangalore</option>
                   <option value="Hyderabad">Hyderabad</option>
                   <option value="Pune">Pune</option>
                   <option value="Mumbai">Mumbai</option>
                   <option value="Delhi">Delhi</option>
                   <option value="Tiruchirappalli">Tiruchirappalli</option>
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 mb-2">Area / Locality</label>
                 <input type="text" placeholder="Enter area or locality" className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-500" />
               </div>
            </div>
            
            <div className="mb-6">
               <label className="block text-xs font-bold text-slate-700 mb-2">Complete Address <span className="text-red-500">*</span></label>
               <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Enter complete address" className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none h-24 focus:border-blue-500"></textarea>
               <div className="text-right text-[10px] text-slate-400 mt-1">{formData.address.length}/200</div>
            </div>
            
            <div className="mb-8">
               <label className="block text-xs font-bold text-slate-700 mb-2">Garage Description <span className="text-slate-400 font-normal">(Optional)</span></label>
               <textarea placeholder="Briefly describe your garage, experience, and services..." className="w-full border rounded-lg px-4 py-3 text-sm bg-white outline-none h-24 focus:border-blue-500"></textarea>
               <div className="text-right text-[10px] text-slate-400 mt-1">0/300</div>
            </div>
            
            {errorMsg && <p className="text-red-500 text-xs font-bold mb-4">{errorMsg}</p>}
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
               <button onClick={() => router.push('/admin/garages')} className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50">Cancel</button>
               <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md disabled:opacity-50">
                 {isSubmitting ? 'Saving...' : 'Save & Continue'} &rarr;
               </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex gap-4 items-start border border-blue-100">
             <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><ShieldCheck className="w-5 h-5"/></div>
             <div>
               <h4 className="font-bold text-[#17307a] text-sm">Your Information is Safe</h4>
               <p className="text-xs text-slate-600 mt-1">We ensure the security of your data. All documents and information are encrypted and safe with us.</p>
             </div>
          </div>
        </div>

        <div className="w-80 flex-shrink-0 flex flex-col gap-6">
          <Card className="p-6">
             <h3 className="font-bold text-[#17307a] mb-1">Registration Progress</h3>
             <p className="text-[10px] text-slate-500 mb-4">Step 1 of 6</p>
             <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="w-[16%] h-full bg-blue-600 rounded-full"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500">16%</span>
             </div>
             
             <div className="space-y-4">
               <div className="flex gap-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                 <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</div>
                 <div>
                   <p className="text-xs font-bold text-blue-800 leading-tight">Garage Details</p>
                   <p className="text-[10px] text-blue-600/80 mt-0.5">Basic information about the garage</p>
                 </div>
               </div>
               <div className="flex gap-4 p-2 pl-3">
                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 leading-tight">Owner Details</p>
                   <p className="text-[10px] text-slate-400 mt-0.5">Information about the owner</p>
                 </div>
               </div>
               <div className="flex gap-4 p-2 pl-3">
                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 leading-tight">Business Documents</p>
                   <p className="text-[10px] text-slate-400 mt-0.5">Upload required documents</p>
                 </div>
               </div>
               <div className="flex gap-4 p-2 pl-3">
                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">4</div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 leading-tight">Services Offered</p>
                   <p className="text-[10px] text-slate-400 mt-0.5">Select services provided</p>
                 </div>
               </div>
               <div className="flex gap-4 p-2 pl-3">
                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">5</div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 leading-tight">Working Hours</p>
                   <p className="text-[10px] text-slate-400 mt-0.5">Set working hours & days</p>
                 </div>
               </div>
               <div className="flex gap-4 p-2 pl-3">
                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">6</div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 leading-tight">Review & Submit</p>
                   <p className="text-[10px] text-slate-400 mt-0.5">Review all details & submit</p>
                 </div>
               </div>
             </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-bold text-[#17307a] mb-2">Need Help?</h3>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">If you need any assistance while registering your garage, our support team is here to help you.</p>
            <button className="w-full border border-blue-200 rounded-lg py-2.5 text-blue-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50"><HeadphonesIcon className="w-4 h-4"/> Contact Support</button>
          </Card>
        </div>
      </div>
    </div>
  );
}
