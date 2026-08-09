'use client';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { User, Bell, Shield, CreditCard, Globe, Moon, Sun, Info, ChevronRight, MonitorSmartphone, Monitor, HelpCircle, ShieldCheck, LogOut } from 'lucide-react';
import { SupportModal } from '@/components/common/support-modal';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/modal';


export function SettingsContent() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  const basePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/garage') ? '/garage' : '';

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const roleKey = basePath === '/admin' ? 'admin' : basePath === '/garage' ? 'garage' : 'customer';
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(`theme-${roleKey}`);
    if (stored) setTheme(stored);
  }, [roleKey]);

  const displayTheme = mounted ? (theme === 'dark' ? 'Dark Mode' : 'Light Mode') : 'Light Mode';

  const handleAction = (item: any) => {
    if (item.title === 'Security Settings') {
      setIsSecurityModalOpen(true);
    } else if (item.title === 'Payment & Wallet Settings') {
      setIsPaymentModalOpen(true);
    } else if (item.link) {
      router.push(`${basePath}${item.link}`);
    } else if (item.title === 'Appearance') {
      const next = theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      localStorage.setItem(`theme-${roleKey}`, next);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { role: roleKey, theme: next }}));
    } else if (item.title === 'About WrectifAI') {
      setIsAboutModalOpen(true);
    }
  };

  const settingItems = [
    { icon: User, title: 'Profile Settings', desc: 'Update your personal information, email and phone number.', action: 'Edit Profile', link: '/profile' },
    { icon: Bell, title: 'Notification Preferences', desc: 'Choose how you want to receive updates and alerts.', action: 'Manage', link: '/notifications' },
    { icon: Shield, title: 'Security Settings', desc: 'Change your password and manage account security.', action: 'Manage' },
    { icon: CreditCard, title: 'Payment & Wallet Settings', desc: 'Manage saved cards, UPI and payment preferences.', action: 'Manage' },
    { icon: Globe, title: 'Language & Region', desc: 'Choose your preferred language and region.', actionText: 'English (India)', hasDropdown: true },
    { icon: displayTheme === 'Light Mode' ? Sun : Moon, title: 'Appearance', desc: 'Customize the look and feel of the application.', actionText: displayTheme, hasDropdown: true },
    { icon: Info, title: 'About WrectifAI', desc: 'App version, terms of service and privacy policy.', action: 'View Details' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        {settingItems.map((item, idx) => (
           <Card key={idx} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer border-slate-100 shadow-sm rounded-[16px]" onClick={() => handleAction(item)}>
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-slate-50 border flex items-center justify-center text-slate-600">
                  <item.icon className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                 <p className="text-xs text-slate-500">{item.desc}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               {item.action && (
                  <span className="text-sm font-bold text-blue-600 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg bg-white"><item.icon className="w-4 h-4"/> {item.action}</span>
               )}
               {item.actionText && (
                  <span className="text-sm font-bold text-blue-600 flex items-center gap-1">{item.actionText} {item.hasDropdown && <ChevronRight className="w-4 h-4 rotate-90" />}</span>
               )}
               <ChevronRight className="w-4 h-4 text-slate-400" />
             </div>
           </Card>
        ))}
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-6">
        <Card className="p-6 shadow-sm border-slate-100 rounded-[20px]">
          <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
          <p className="text-sm text-slate-500 mb-4">We&apos;re here to help you with any issues or questions.</p>
          <Button variant="outline" className="w-full font-bold text-blue-600 border-blue-200" onClick={() => setIsSupportModalOpen(true)}>
             <HelpCircle className="w-4 h-4 mr-2" /> Contact Support
          </Button>
        </Card>



        <Card className="p-6 shadow-sm border-slate-100 rounded-[20px]">
           <h3 className="font-bold text-slate-900 mb-2">Log Out</h3>
           <p className="text-xs text-slate-500 mb-4">Log out from your account</p>
           <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 font-bold" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" /> Log Out
           </Button>
        </Card>
      </div>

      <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="About WrectifAI">
        <div className="space-y-4">
          <h4 className="font-bold text-blue-600">What is WrectifAI?</h4>
          <p className="text-sm text-slate-600">WrectifAI is your complete ecosystem for vehicle management, providing AI-powered diagnosis, seamless service booking, quote comparison, and access to verified garages.</p>
          
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>AI-powered vehicle diagnosis</li>
            <li>Service booking</li>
            <li>Quote comparison</li>
            <li>Verified garages</li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <p>Version 1.0.0</p>
            <p>&copy; {new Date().getFullYear()} WrectifAI. All rights reserved.</p>
          </div>
          
          <Button className="w-full mt-4 bg-blue-600 text-white" onClick={() => setIsAboutModalOpen(false)}>Close</Button>
        </div>
      </Modal>
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />

      <Modal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} title="Security Settings">
        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Two-Factor Authentication</label>
              <div className="flex items-center justify-between bg-slate-50 border p-3 rounded-xl">
                <span className="text-sm font-bold text-slate-800">Authenticator App</span>
                <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">Enabled</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Active Session</label>
              <div className="bg-slate-50 border p-3 rounded-xl space-y-1">
                <p className="text-sm font-bold text-slate-800">Chrome (Windows) — Mumbai, India</p>
                <p className="text-xs text-slate-500">Active session now</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t flex flex-col gap-2">
            <Button className="w-full bg-blue-600 text-white font-bold" onClick={() => setIsSecurityModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Payment & Wallet Settings">
        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Default Payment Method</label>
              <div className="flex items-center justify-between bg-slate-50 border p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">HDFC Bank Debit Card (•••• 4242)</span>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">Primary</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Wallet Preferences</label>
              <div className="bg-slate-50 border p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">Auto-Recharge Wallet</span>
                  <span className="text-xs text-slate-500 font-bold">Inactive</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t flex flex-col gap-2">
            <Button className="w-full bg-blue-600 text-white font-bold" onClick={() => setIsPaymentModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SettingsContent;
