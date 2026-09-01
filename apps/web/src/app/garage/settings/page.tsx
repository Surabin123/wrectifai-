'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Settings, Building2, Users, Bell, Globe, Shield, CreditCard, CheckCircle2, Folder, Download, Activity, Key, ChevronRight, MessageCircle, Mail } from 'lucide-react';

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <div>
               <h1 className="text-2xl font-bold text-[#17307a] mb-1">Settings</h1>
               <p className="text-sm text-slate-500">Manage your garage, application preferences and system settings.</p>
            </div>
            
            <div className="flex gap-6 border-b border-slate-200">
               <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold text-sm px-2 flex items-center gap-2"><Settings className="w-4 h-4"/> General</button>
               <button className="pb-3 text-slate-500 font-bold text-sm px-2 flex items-center gap-2"><Building2 className="w-4 h-4"/> Business Settings</button>
               <button className="pb-3 text-slate-500 font-bold text-sm px-2 flex items-center gap-2"><Users className="w-4 h-4"/> Team & Permissions</button>
               <button className="pb-3 text-slate-500 font-bold text-sm px-2 flex items-center gap-2"><Bell className="w-4 h-4"/> Notifications</button>
               <button className="pb-3 text-slate-500 font-bold text-sm px-2 flex items-center gap-2"><Globe className="w-4 h-4"/> Integrations</button>
               <button className="pb-3 text-slate-500 font-bold text-sm px-2 flex items-center gap-2"><Shield className="w-4 h-4"/> Security</button>
               <button className="pb-3 text-slate-500 font-bold text-sm px-2 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Billing</button>
            </div>

            <Card className="p-6">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-bold text-[#17307a] text-lg">General Settings</h3>
                    <p className="text-xs text-slate-500">Manage your basic application preferences.</p>
                 </div>
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">Save Changes</button>
               </div>
               
               <div className="flex gap-10">
                  <div className="flex-1 grid grid-cols-2 gap-6">
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2">Garage Name</label>
                       <input type="text" value="Metro Auto Bay" readOnly className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2">Date Format</label>
                       <select className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none"><option>DD MMM YYYY (16 May 2025)</option></select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2">Language</label>
                       <select className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none"><option>English</option></select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2">Time Format</label>
                       <select className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none"><option>12 Hour (10:30 AM)</option></select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2">Timezone</label>
                       <select className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none"><option>(GMT+05:30) Asia/Kolkata</option></select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 mb-2">Currency</label>
                       <select className="w-full border rounded-lg px-4 py-2.5 text-sm bg-white outline-none"><option>INR (₹)</option></select>
                     </div>
                  </div>
                  <div className="w-64 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4"><Settings className="w-10 h-10"/></div>
                    <p className="text-xs text-slate-500 font-medium">Customize your application preferences and default behaviors.</p>
                  </div>
               </div>
            </Card>

            <Card className="p-6">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-bold text-[#17307a] text-lg">Notification Preferences</h3>
                    <p className="text-xs text-slate-500">Choose how you want to receive notifications.</p>
                 </div>
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">Save Preferences</button>
               </div>
               
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Mail className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">Email Notifications</p>
                              <p className="text-[10px] text-slate-500">Receive important updates via email</p>
                           </div>
                        </div>
                        <div className="w-10 h-5 bg-blue-600 rounded-full relative flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full absolute right-1"></div></div>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><MessageCircle className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">SMS Notifications</p>
                              <p className="text-[10px] text-slate-500">Receive SMS for important alerts</p>
                           </div>
                        </div>
                        <div className="w-10 h-5 bg-blue-600 rounded-full relative flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full absolute right-1"></div></div>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Bell className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">Push Notifications</p>
                              <p className="text-[10px] text-slate-500">Receive push notifications in browser</p>
                           </div>
                        </div>
                        <div className="w-10 h-5 bg-blue-600 rounded-full relative flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full absolute right-1"></div></div>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Activity className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">Marketing & Offers</p>
                              <p className="text-[10px] text-slate-500">Receive offers and promotional updates</p>
                           </div>
                        </div>
                        <div className="w-10 h-5 bg-slate-200 rounded-full relative flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full absolute left-1"></div></div>
                     </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-4">Notify me about</p>
                    <div className="space-y-3">
                       <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 border-slate-300"/> New job requests</label>
                       <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 border-slate-300"/> Job status updates</label>
                       <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 border-slate-300"/> Customer messages</label>
                       <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 border-slate-300"/> Payments and invoices</label>
                       <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 border-slate-300"/> Low stock alerts</label>
                       <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300"/> System updates & announcements</label>
                    </div>
                  </div>
               </div>
            </Card>

            <Card className="p-6">
               <div className="mb-6">
                  <h3 className="font-bold text-[#17307a] text-lg">Appearance Settings</h3>
                  <p className="text-xs text-slate-500">Customize the look and feel of the application.</p>
               </div>
               <div className="grid grid-cols-3 gap-10 items-center">
                 <div>
                   <p className="text-xs font-bold text-slate-700 mb-3">Theme</p>
                   <div className="flex gap-4">
                     <button className="flex-1 border-2 border-blue-600 bg-blue-50 text-blue-600 py-3 rounded-lg font-bold text-sm flex flex-col items-center gap-2"><span className="text-xl">☀️</span> Light</button>
                     <button className="flex-1 border-2 border-slate-100 bg-white text-slate-600 py-3 rounded-lg font-bold text-sm flex flex-col items-center gap-2"><span className="text-xl">🌙</span> Dark</button>
                     <button className="flex-1 border-2 border-slate-100 bg-white text-slate-600 py-3 rounded-lg font-bold text-sm flex flex-col items-center gap-2"><span className="text-xl">🖥️</span> System</button>
                   </div>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 mb-3">Primary Color</p>
                   <div className="flex gap-3">
                     <button className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><CheckCircle2 className="w-4 h-4"/></button>
                     <button className="w-8 h-8 rounded-full bg-green-500"></button>
                     <button className="w-8 h-8 rounded-full bg-purple-500"></button>
                     <button className="w-8 h-8 rounded-full bg-orange-500"></button>
                     <button className="w-8 h-8 rounded-full bg-red-500"></button>
                     <button className="w-8 h-8 rounded-full bg-slate-600"></button>
                   </div>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-700 mb-3">Preview</p>
                   <div className="border rounded-lg p-3 bg-slate-50 shadow-sm">
                      <div className="h-4 bg-blue-600 rounded w-full mb-3"></div>
                      <div className="h-2 bg-slate-200 rounded w-2/3 mb-1"></div>
                      <div className="h-2 bg-slate-200 rounded w-1/2 mb-4"></div>
                      <div className="flex gap-2">
                         <div className="flex-1 h-6 bg-slate-200 rounded-md"></div>
                         <div className="flex-1 h-6 bg-slate-200 rounded-md"></div>
                      </div>
                   </div>
                 </div>
               </div>
            </Card>
          </div>
          
          <div className="w-72 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <h3 className="font-bold text-[#17307a] mb-4">System Status</h3>
               <div className="bg-green-50 text-green-600 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 border border-green-100 mb-3"><CheckCircle2 className="w-4 h-4"/> All Systems Operational</div>
               <p className="text-xs text-slate-700 font-medium mb-1">All systems are running smoothly</p>
               <p className="text-[10px] text-slate-400 mb-4">Last checked: 16 May 2025, 10:20 AM</p>
               <button className="w-full border border-slate-200 rounded-lg py-2 text-blue-600 text-xs font-bold flex items-center justify-center gap-2"><Activity className="w-3.5 h-3.5"/> View System Health</button>
             </Card>
             <Card className="p-5">
               <h3 className="font-bold text-[#17307a] mb-4">Storage Usage</h3>
               <div className="mb-4">
                 <div className="flex justify-between text-xs font-bold text-slate-700 mb-2"><span>45.6 GB of 100 GB used</span><span>45%</span></div>
                 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500 w-[25%]"></div>
                    <div className="h-full bg-green-500 w-[15%]"></div>
                    <div className="h-full bg-yellow-500 w-[5%]"></div>
                 </div>
               </div>
               <div className="space-y-3 text-[10px] font-bold text-slate-600 mb-6">
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Jobs & Documents</span><span>25.2 GB</span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Images & Videos</span><span>15.7 GB</span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Database</span><span>4.7 GB</span></div>
               </div>
               <button className="border border-slate-200 rounded-lg px-4 py-2 text-blue-600 text-xs font-bold flex items-center gap-2"><Folder className="w-4 h-4"/> Manage Storage</button>
             </Card>
             <Card className="p-5">
               <h3 className="font-bold text-[#17307a] mb-4">Quick Actions</h3>
               <div className="space-y-3 text-xs font-bold text-slate-600">
                  <a href="#" className="flex items-center justify-between hover:text-blue-600"><span className="flex items-center gap-2"><span className="text-slate-400">🔒</span> Backup Data</span> <ChevronRight className="w-4 h-4 text-slate-400"/></a>
                  <a href="#" className="flex items-center justify-between hover:text-blue-600"><span className="flex items-center gap-2"><Download className="w-4 h-4 text-slate-400"/> Export Data</span> <ChevronRight className="w-4 h-4 text-slate-400"/></a>
                  <a href="#" className="flex items-center justify-between hover:text-blue-600"><span className="flex items-center gap-2"><span className="text-slate-400">🧹</span> Clear Cache</span> <ChevronRight className="w-4 h-4 text-slate-400"/></a>
                  <a href="#" className="flex items-center justify-between hover:text-blue-600"><span className="flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400"/> Activity Logs</span> <ChevronRight className="w-4 h-4 text-slate-400"/></a>
                  <a href="#" className="flex items-center justify-between hover:text-blue-600"><span className="flex items-center gap-2"><Key className="w-4 h-4 text-slate-400"/> API Keys</span> <ChevronRight className="w-4 h-4 text-slate-400"/></a>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
