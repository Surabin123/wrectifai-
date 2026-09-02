'use client';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { User, Bell, Shield, CreditCard, Globe, Moon, Sun, Info, ChevronRight, MonitorSmartphone, Monitor, HelpCircle, ShieldCheck, LogOut } from 'lucide-react';
import { SupportModal } from '@/components/common/support-modal';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/modal';
import { apiClient } from '@/lib/api-client';


export function SettingsContent() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  const basePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/garage') ? '/garage' : '';

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ enabled: true, inApp: true, email: true, sms: false });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
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
    if (item.link) {
      router.push(`${basePath}${item.link}`);
    } else if (item.title === 'Appearance') {
      const next = theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      localStorage.setItem(`theme-${roleKey}`, next);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { role: roleKey, theme: next }}));
    } else if (item.targetModal === 'about') {
      setIsAboutModalOpen(true);
    } else if (item.targetModal === 'notif') {
      setIsNotifModalOpen(true);
    }
  };

  useEffect(() => {
    if (isNotifModalOpen) {
      apiClient.get<any>('/users/preferences/notifications')
        .then(res => {
          if (!res.error) setNotifPrefs(res);
        })
        .catch(console.error);
    }
  }, [isNotifModalOpen]);

  const handleSaveNotifPrefs = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await apiClient.put<any>('/users/preferences/notifications', notifPrefs);
      if (!res.error) {
        alert('Notification preferences saved');
        setIsNotifModalOpen(false);
      } else {
        alert('Failed to save preferences');
      }
    } catch (err) {
      alert('Failed to save preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const settingItems = [
    { icon: User, title: 'Profile Settings', desc: 'Update your personal information.', action: 'Edit Profile', link: '/profile' },
    { icon: Bell, title: 'Notification Preferences', desc: 'Choose how you want to receive updates and alerts.', action: 'Manage', actionType: 'modal', targetModal: 'notif' },
    { icon: Globe, title: 'Language', desc: 'Choose your preferred language.', actionText: 'English', hasDropdown: false },
    { icon: displayTheme === 'Light Mode' ? Sun : Moon, title: 'Appearance', desc: 'Customize the look and feel of the application.', actionText: displayTheme, hasDropdown: true },
    { icon: Info, title: 'About WrectifAI', desc: 'App version, terms of service and privacy policy.', action: 'View Details', actionType: 'modal', targetModal: 'about' },
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

      <Modal isOpen={isNotifModalOpen} onClose={() => setIsNotifModalOpen(false)} title="Notification Preferences">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900">Enable Notifications</h4>
              <p className="text-xs text-slate-500">Receive alerts and updates.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notifPrefs.enabled} onChange={(e) => setNotifPrefs(prev => ({...prev, enabled: e.target.checked}))} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className={`space-y-4 pt-4 border-t border-slate-100 ${!notifPrefs.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-900 text-sm">Notification Channels</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">In-App Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notifPrefs.inApp} onChange={(e) => setNotifPrefs(prev => ({...prev, inApp: e.target.checked}))} />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Email Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notifPrefs.email} onChange={(e) => setNotifPrefs(prev => ({...prev, email: e.target.checked}))} />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsNotifModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveNotifPrefs} disabled={isSavingPrefs}>Save Preferences</Button>
          </div>
        </div>
      </Modal>
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </div>
  );
}

export default SettingsContent;
