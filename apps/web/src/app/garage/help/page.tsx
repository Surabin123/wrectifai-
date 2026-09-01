'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, ChevronRight, MessageSquare, Mail, Phone, BookOpen, FileText, Package, CreditCard, Shield, HelpCircle } from 'lucide-react';

export default function HelpPage() {
  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <div>
               <h1 className="text-2xl font-bold text-[#17307a] mb-1">Help & Support</h1>
               <p className="text-sm text-slate-500">We're here to help you. Find answers or get in touch with our support team.</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 relative">
               <Search className="w-5 h-5 absolute left-5 top-5 text-slate-400" />
               <input type="text" placeholder="Search help articles..." className="w-full pl-12 pr-4 py-3 text-sm bg-transparent outline-none font-medium" />
            </div>

            <div>
               <h3 className="font-bold text-[#17307a] mb-4">How can we help you today?</h3>
               <div className="grid grid-cols-5 gap-4">
                 <Card className="p-5 flex flex-col items-start gap-4 hover:border-blue-300 cursor-pointer transition-colors group">
                   <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><BookOpen className="w-5 h-5"/></div>
                   <div>
                     <h4 className="font-bold text-sm text-[#17307a]">Getting Started</h4>
                     <p className="text-[10px] text-slate-500 mt-1">Learn the basics and set up your garage.</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mt-auto"/>
                 </Card>
                 <Card className="p-5 flex flex-col items-start gap-4 hover:border-green-300 cursor-pointer transition-colors group">
                   <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><FileText className="w-5 h-5"/></div>
                   <div>
                     <h4 className="font-bold text-sm text-[#17307a]">Manage Jobs</h4>
                     <p className="text-[10px] text-slate-500 mt-1">Learn how to manage jobs, bookings and requests.</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-500 mt-auto"/>
                 </Card>
                 <Card className="p-5 flex flex-col items-start gap-4 hover:border-yellow-300 cursor-pointer transition-colors group">
                   <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center"><Package className="w-5 h-5"/></div>
                   <div>
                     <h4 className="font-bold text-sm text-[#17307a]">Inventory Help</h4>
                     <p className="text-[10px] text-slate-500 mt-1">Add, update and manage parts & inventory.</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-yellow-500 mt-auto"/>
                 </Card>
                 <Card className="p-5 flex flex-col items-start gap-4 hover:border-purple-300 cursor-pointer transition-colors group">
                   <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><CreditCard className="w-5 h-5"/></div>
                   <div>
                     <h4 className="font-bold text-sm text-[#17307a]">Billing & Payments</h4>
                     <p className="text-[10px] text-slate-500 mt-1">Invoices, payments and subscription help.</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 mt-auto"/>
                 </Card>
                 <Card className="p-5 flex flex-col items-start gap-4 hover:border-teal-300 cursor-pointer transition-colors group">
                   <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center"><Shield className="w-5 h-5"/></div>
                   <div>
                     <h4 className="font-bold text-sm text-[#17307a]">Account & Settings</h4>
                     <p className="text-[10px] text-slate-500 mt-1">Manage your account, team and preferences.</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 mt-auto"/>
                 </Card>
               </div>
            </div>

            <Card className="p-6">
               <h3 className="font-bold text-[#17307a] mb-6">Popular Help Articles</h3>
               <div className="divide-y divide-slate-100">
                  <a href="#" className="flex items-center justify-between py-4 group hover:bg-slate-50 -mx-6 px-6 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                        <div><p className="font-bold text-sm text-slate-700">How to create and manage a new job?</p><p className="text-[10px] text-slate-500">Step-by-step guide to create, assign and track jobs.</p></div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500"/>
                  </a>
                  <a href="#" className="flex items-center justify-between py-4 group hover:bg-slate-50 -mx-6 px-6 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                        <div><p className="font-bold text-sm text-slate-700">How to add parts to inventory?</p><p className="text-[10px] text-slate-500">Learn how to add, edit and organize your inventory.</p></div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500"/>
                  </a>
                  <a href="#" className="flex items-center justify-between py-4 group hover:bg-slate-50 -mx-6 px-6 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                        <div><p className="font-bold text-sm text-slate-700">How do I generate and share an invoice?</p><p className="text-[10px] text-slate-500">Create invoices and share with your customers.</p></div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500"/>
                  </a>
                  <a href="#" className="flex items-center justify-between py-4 group hover:bg-slate-50 -mx-6 px-6 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                        <div><p className="font-bold text-sm text-slate-700">How to add team members to your garage?</p><p className="text-[10px] text-slate-500">Invite team members and set their roles & permissions.</p></div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500"/>
                  </a>
                  <a href="#" className="flex items-center justify-between py-4 group hover:bg-slate-50 -mx-6 px-6 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                        <div><p className="font-bold text-sm text-slate-700">Troubleshooting: Common issues and solutions</p><p className="text-[10px] text-slate-500">Find solutions to common problems.</p></div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500"/>
                  </a>
               </div>
               <div className="mt-4 text-center border-t border-slate-100 pt-6">
                 <button className="border border-slate-200 text-blue-600 px-6 py-2 rounded-lg text-xs font-bold shadow-sm">View All Help Articles</button>
               </div>
            </Card>
          </div>
          
          <div className="w-80 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <h3 className="font-bold text-[#17307a] mb-2">Contact Support</h3>
               <p className="text-xs text-slate-500 mb-6">Still need help? Reach out to our support team.</p>
               
               <div className="space-y-4">
                  <div className="border border-slate-100 rounded-lg p-4">
                     <div className="flex gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0"><MessageSquare className="w-4 h-4"/></div>
                        <div>
                           <div className="flex justify-between items-center mb-1"><h4 className="font-bold text-sm text-slate-700">Live Chat</h4><span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[9px] font-bold">Available</span></div>
                           <p className="text-[10px] text-slate-500">Chat with our support team in real-time.</p>
                        </div>
                     </div>
                     <button className="w-full text-center py-1.5 border border-slate-200 rounded text-green-600 text-xs font-bold hover:bg-green-50">Start Chat</button>
                  </div>
                  
                  <div className="border border-slate-100 rounded-lg p-4">
                     <div className="flex gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4"/></div>
                        <div>
                           <h4 className="font-bold text-sm text-slate-700 mb-1">Email Support</h4>
                           <p className="text-[10px] text-slate-500">We usually respond within 24 hours.</p>
                        </div>
                     </div>
                     <button className="w-full text-center py-1.5 border border-slate-200 rounded text-blue-600 text-xs font-bold hover:bg-blue-50">Email Us</button>
                  </div>
                  
                  <div className="border border-slate-100 rounded-lg p-4 flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4"/></div>
                     <div>
                        <h4 className="font-bold text-sm text-slate-700 mb-1">Call Support</h4>
                        <p className="text-[10px] text-slate-500 mb-1">Mon - Sat, 9:00 AM - 7:00 PM</p>
                        <p className="font-bold text-sm text-[#17307a]">+91 98765 43210</p>
                     </div>
                  </div>
               </div>
             </Card>
             <Card className="p-5">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-[#17307a]">Frequently Asked Questions</h3>
                 <span className="text-[10px] text-blue-600 font-bold">View All</span>
               </div>
               <div className="space-y-0 divide-y divide-slate-100">
                  <div className="py-3 flex justify-between items-center cursor-pointer group"><span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">How can I reset my password?</span><ChevronRight className="w-4 h-4 text-slate-300"/></div>
                  <div className="py-3 flex justify-between items-center cursor-pointer group"><span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Can I change my plan later?</span><ChevronRight className="w-4 h-4 text-slate-300"/></div>
                  <div className="py-3 flex justify-between items-center cursor-pointer group"><span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">How do I cancel my subscription?</span><ChevronRight className="w-4 h-4 text-slate-300"/></div>
                  <div className="py-3 flex justify-between items-center cursor-pointer group"><span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Is my data secure?</span><ChevronRight className="w-4 h-4 text-slate-300"/></div>
                  <div className="py-3 flex justify-between items-center cursor-pointer group"><span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">How do I export my reports?</span><ChevronRight className="w-4 h-4 text-slate-300"/></div>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
