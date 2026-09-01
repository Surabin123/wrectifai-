'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Filter, MessageSquare, MoreVertical, Star, Calendar as CalendarIcon, Send } from 'lucide-react';

export default function ReviewsPage() {
  const reviews = [
    { id: '1', customer: 'Ananya Patel', vehicle: 'Toyota Innova', inv: 'INV-2025-1248', rating: 5.0, verified: true, text: 'Excellent service! The AC issue was diagnosed quickly and fixed perfectly. Very professional staff and timely delivery. Highly recommended!', tags: ['AC Repair', 'AC Gas Refill', 'Performance Check'], date: '16 May 2025', time: '10:20 AM' },
    { id: '2', customer: 'Rahul Verma', vehicle: 'Mahindra XUV700', inv: 'INV-2025-1247', rating: 5.0, verified: true, text: 'Clutch replacement was done very smoothly. No issues after service. Great experience overall.', tags: ['Clutch Replacement', 'Clutch Kit', 'Clutch Bearing'], date: '15 May 2025', time: '04:15 PM' },
    { id: '3', customer: 'Sanjay Verma', vehicle: 'BMW 320d', inv: 'INV-2025-1246', rating: 4.5, verified: true, text: 'Oil leakage fixed properly. They explained everything clearly. Good service and friendly staff.', tags: ['Oil Leakage Repair', 'Engine Oil Change', 'Oil Seal Replacement'], date: '15 May 2025', time: '02:45 PM' },
    { id: '4', customer: 'Priya Reddy', vehicle: 'Hyundai i20', inv: 'INV-2025-1245', rating: 4.0, verified: true, text: 'Brake service was done well. Braking is much smoother now. Took a bit longer than expected but overall good.', tags: ['Brake Service', 'Brake Pad Replacement', 'Brake Cleaning'], date: '15 May 2025', time: '11:30 AM' },
    { id: '5', customer: 'Karthik R.', vehicle: 'Volkswagen Polo', inv: 'INV-2025-1244', rating: 3.0, verified: true, text: 'Tyre rotation and balancing were okay, but waiting time was too long. Please improve on time management.', tags: ['Tyre Rotation & Balancing'], date: '14 May 2025', time: '06:20 PM' },
  ];

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Reviews</h1>
                 <p className="text-sm text-slate-500">Manage customer reviews and feedback about your services.</p>
               </div>
               <div className="flex gap-3">
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Send className="w-4 h-4"/> Request Review</button>
                 <button className="bg-white text-slate-600 border px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</button>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2">
               <button className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><div className="w-4 h-4 rounded bg-white text-blue-600 flex items-center justify-center text-[10px]">★</div> All Reviews <span className="bg-white text-blue-600 text-[10px] px-1.5 rounded-full">128</span></button>
               <button className="bg-white text-slate-600 border px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"><span className="text-green-500">👍</span> Positive <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 rounded-full">96</span></button>
               <button className="bg-white text-slate-600 border px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"><span className="text-yellow-500">🤝</span> Neutral <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 rounded-full">18</span></button>
               <button className="bg-white text-slate-600 border px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"><span className="text-red-500">👎</span> Negative <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 rounded-full">14</span></button>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input type="text" placeholder="Search by customer name or service..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <div className="flex gap-3">
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Ratings</option></select>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>All Services</option></select>
                 <button className="border rounded-lg px-4 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600 flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> 01 May 2025 - 16 May 2025</button>
                 <select className="border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 font-medium text-slate-600"><option>Sort by: Newest</option></select>
               </div>
             </div>
             <div className="flex-1 overflow-auto bg-slate-50 p-4 space-y-4">
                 {reviews.map(r => (
                   <Card key={r.id} className="p-5 flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {r.customer === 'Karthik R.' ? <span className="text-blue-600 font-bold">KR</span> : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.customer}`} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-[#17307a] text-sm">{r.customer}</h3>
                            <p className="text-[11px] text-slate-600 font-medium">{r.vehicle}</p>
                            <p className="text-[10px] text-blue-500 font-bold">{r.inv}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[11px] font-bold text-slate-600">{r.date}</p>
                             <p className="text-[10px] text-slate-400">{r.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                           <div className="flex text-yellow-400"><Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/><Star className="w-3.5 h-3.5 fill-current"/><Star className={`w-3.5 h-3.5 ${r.rating === 5 ? 'fill-current' : 'text-slate-300'}`}/></div>
                           <span className="font-bold text-slate-700 text-sm">{r.rating.toFixed(1)}</span>
                           {r.verified && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><span className="w-2.5 h-2.5 bg-green-500 text-white rounded-full flex items-center justify-center text-[6px]">✓</span> Verified</span>}
                        </div>
                        <p className="text-sm text-slate-700 mb-4">{r.text}</p>
                        <div className="flex gap-2">
                           {r.tags.map(t => <span key={t} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">{t}</span>)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 border-l border-slate-100 pl-4 justify-center items-center">
                         <button className="p-2 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50"><MessageSquare className="w-4 h-4"/></button>
                         <button className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"><MoreVertical className="w-4 h-4"/></button>
                      </div>
                   </Card>
                 ))}
             </div>
          </div>
          
          <div className="w-72 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#17307a]">Reviews Summary</h3>
                 <span className="text-[10px] font-bold text-slate-500 border px-2 py-1 rounded bg-slate-50">This Month</span>
               </div>
               <div className="flex flex-col items-center justify-center mb-6">
                 <h1 className="text-5xl font-black text-[#17307a] mb-2">4.6</h1>
                 <div className="flex text-yellow-400 mb-1"><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current"/><Star className="w-4 h-4 fill-current opacity-50"/></div>
                 <p className="text-[10px] font-bold text-slate-400">Based on 128 reviews</p>
               </div>
               <div className="space-y-3 text-xs font-bold text-slate-600 border-t border-slate-100 pt-4">
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="text-green-500 text-base">👍</span> Positive</span> <span>96 <span className="text-[10px] text-slate-400 font-normal">(75%)</span></span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="text-yellow-500 text-base">🤝</span> Neutral</span> <span>18 <span className="text-[10px] text-slate-400 font-normal">(14%)</span></span></div>
                 <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="text-red-500 text-base">👎</span> Negative</span> <span>14 <span className="text-[10px] text-slate-400 font-normal">(11%)</span></span></div>
               </div>
               <a href="#" className="block text-[11px] text-blue-600 font-bold mt-4 border-t border-slate-100 pt-4">View Full Report &rarr;</a>
             </Card>
             <Card className="p-5">
               <h3 className="font-bold text-[#17307a] mb-6">Rating Breakdown</h3>
               <div className="space-y-3 text-[10px] font-bold text-slate-600">
                  <div className="flex items-center gap-2"><span>5 Stars</span> <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[56%]"></div></div> <span>72 <span className="text-slate-400 font-normal">(56%)</span></span></div>
                  <div className="flex items-center gap-2"><span>4 Stars</span> <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-400 w-[27%]"></div></div> <span>34 <span className="text-slate-400 font-normal">(27%)</span></span></div>
                  <div className="flex items-center gap-2"><span>3 Stars</span> <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 w-[9%]"></div></div> <span>12 <span className="text-slate-400 font-normal">(9%)</span></span></div>
                  <div className="flex items-center gap-2"><span>2 Stars</span> <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 w-[5%]"></div></div> <span>6 <span className="text-slate-400 font-normal">(5%)</span></span></div>
                  <div className="flex items-center gap-2"><span>1 Star</span> <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 w-[3%]"></div></div> <span>4 <span className="text-slate-400 font-normal">(3%)</span></span></div>
               </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
