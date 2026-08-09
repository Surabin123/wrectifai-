'use client';
import { Card } from '@/components/common/card';
import { Search, Headset, MessageSquare, Mail, Car, CreditCard, Settings, Star, FileText, StarOff, User, ShieldCheck } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';

import { SupportModal } from '@/components/common/support-modal';

export function HelpContent() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const basePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/garage') ? '/garage' : '';

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAction = (item: any) => {
    if (item.link) {
      router.push(`${basePath}${item.link}`);
    } else if (item.title === 'Technical Support') {
      setIsSupportModalOpen(true);
    } else if (item.title === 'Policies & Legal') {
      setIsLegalModalOpen(true);
    }
  };

  const categories = [
    { icon: User, color: 'text-purple-500', bg: 'bg-purple-50', title: 'Account & Profile', desc: 'Update profile, email, phone and password.', link: '/profile' },
    { icon: Car, color: 'text-green-500', bg: 'bg-green-50', title: 'Bookings & Services', desc: 'Booking, rescheduling, cancellations and more.', link: '/bookings' },
    { icon: StarOff, color: 'text-orange-500', bg: 'bg-orange-50', title: 'Offers & Rewards', desc: 'Discounts, cashback, referral and loyalty points.', link: '/offers' },
    { icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50', title: 'Payments & Wallet', desc: 'Payment methods, transactions and refunds.', link: '/wallet-payments' },
    { icon: Settings, color: 'text-red-500', bg: 'bg-red-50', title: 'Technical Support', desc: 'App issues, troubleshooting and bug reports.' },
    { icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Garages & Mechanics', desc: 'Find garages, compare and manage services.', link: '/garages' },
    { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Policies & Legal', desc: 'Terms of service, privacy policy and more.' },
  ];

  const contacts = [
    { icon: MessageSquare, title: 'Live Chat', desc: 'Chat with our support team' },
    { icon: Mail, title: 'Email Support', desc: 'support@wrectifai.com' }
  ];

  const q = searchQuery.toLowerCase();
  const filteredCategories = categories.filter(c => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      <div className="flex-1 space-y-6">
         <Card className="p-8 bg-gradient-to-r from-blue-50 to-white shadow-sm border-blue-100 relative overflow-hidden rounded-[24px]">
           <div className="relative z-10 w-full md:w-2/3">
             <h2 className="text-xl font-bold text-slate-900 mb-2">How can we help you today?</h2>
             <p className="text-sm text-slate-600 mb-6">Search for help articles, guides and more...</p>
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
               <input type="text" placeholder="Search for help articles, topics..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
           </div>
           <div className="absolute right-0 bottom-0 h-full hidden md:block opacity-70">
              <div className="h-full w-48 bg-blue-100 rounded-tl-full flex items-center justify-center">
                 <Headset className="w-16 h-16 text-blue-500" />
              </div>
           </div>
         </Card>

         <div>
           <h3 className="font-bold text-slate-900 mb-4">Help Categories</h3>
           {filteredCategories.length === 0 ? (
             <p className="text-sm text-slate-500">No matching categories found.</p>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredCategories.map((c, i) => (
                 <Card key={i} className="p-4 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow border-slate-100 shadow-sm rounded-[16px]" onClick={() => handleAction(c)}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}>
                       <c.icon className="w-5 h-5" />
                     </div>
                     <div className="flex-1">
                       <h4 className="font-bold text-sm text-slate-900">{c.title}</h4>
                       <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
                     </div>
                  </Card>
               ))}
             </div>
           )}
         </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-6">
        <Card className="p-6 shadow-sm border-slate-100 bg-blue-50/50 rounded-[20px]">
          <h3 className="font-bold text-slate-900 mb-2">Need Immediate Help?</h3>
          <p className="text-sm text-slate-500 mb-4">Our support team is ready to assist you.</p>
          <button type="button" className="w-full py-2 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-blue-50 transition-colors mb-3" onClick={() => setIsSupportModalOpen(true)}>
             <Headset className="w-4 h-4" /> Contact Support
          </button>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-green-600">
             <div className="w-2 h-2 rounded-full bg-green-500"></div> Available 24/7
          </div>
        </Card>
      </div>

      <Modal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} title="Policies & Legal">
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h4 className="font-bold text-slate-900">Privacy Policy</h4>
            <p className="text-xs text-slate-500 mt-1">We respect your privacy and protect your data according to industry standards.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Terms of Service</h4>
            <p className="text-xs text-slate-500 mt-1">Usage of WrectifAI constitutes agreement to our platform terms.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Refund Policy</h4>
            <p className="text-xs text-slate-500 mt-1">Refunds are processed in accordance with service provider guidelines.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">User Responsibilities</h4>
            <p className="text-xs text-slate-500 mt-1">Maintain accurate vehicle and booking information.</p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900">Contact Legal Team</h4>
            <p className="text-xs font-semibold text-blue-600 mt-1">legal@wrectifai.com</p>
          </div>
          <div className="pt-4">
             <Button className="w-full bg-blue-600 text-white" onClick={() => setIsLegalModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </div>
  );
}

export default HelpContent;
