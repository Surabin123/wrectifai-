
'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { Card } from '@/components/common/card';
import { Search, Plus, Eye, Download, MoreVertical, FileEdit, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchGarageQuotes, GarageQuote } from '@/lib/quotes-api';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<GarageQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchGarageQuotes();
        setQuotes(data || []);
      } catch (err) {
        console.error('Failed to load quotes', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalQuotes = quotes.length;
  const draftQuotes = quotes.filter(q => q.quoteStatus === 'draft').length;
  const sentQuotes = quotes.filter(q => q.quoteStatus === 'sent').length;
  const acceptedQuotes = quotes.filter(q => q.quoteStatus === 'accepted').length;
  const rejectedQuotes = quotes.filter(q => q.quoteStatus === 'rejected').length;
  
  const totalValue = quotes.reduce((acc, q) => acc + (Number(q.totalCost) || 0), 0);
  const acceptedValue = quotes.filter(q => q.quoteStatus === 'accepted').reduce((acc, q) => acc + (Number(q.totalCost) || 0), 0);
  const avgValue = totalQuotes > 0 ? (totalValue / totalQuotes).toFixed(0) : 0;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  const filteredQuotes = quotes.filter(q => {
     if (filter === 'all') return true;
     return q.quoteStatus === filter;
  });

  const formatTime = (isoString: string) => {
    if (!isoString) return { date: '', time: '' };
    const date = new Date(isoString);
    return {
       date: date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
       time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 bg-slate-50 min-h-screen flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-[#17307a] mb-1">Quotes</h1>
                 <p className="text-sm text-slate-500">Manage all service quotations and customer approvals.</p>
               </div>
               <div className="flex gap-3">
                 <button className="bg-[#17307a] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Create Quote</button>
               </div>
             </div>
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2">
               <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>All Quotes <span className={`text-[10px] px-1.5 rounded-full ml-1 ${filter === 'all' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>{totalQuotes}</span></button>
               <button onClick={() => setFilter('draft')} className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 ${filter === 'draft' ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-600 border'}`}><div className="w-2 h-2 rounded-full bg-slate-400"></div> Draft <span className="text-slate-400 text-[10px] ml-1">{draftQuotes}</span></button>
               <button onClick={() => setFilter('sent')} className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 ${filter === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-white text-slate-600 border'}`}><div className="w-2 h-2 rounded-full bg-blue-500"></div> Sent <span className="text-slate-400 text-[10px] ml-1">{sentQuotes}</span></button>
               <button onClick={() => setFilter('accepted')} className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 ${filter === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-white text-slate-600 border'}`}><div className="w-2 h-2 rounded-full bg-green-500"></div> Accepted <span className="text-slate-400 text-[10px] ml-1">{acceptedQuotes}</span></button>
               <button onClick={() => setFilter('rejected')} className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 ${filter === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-white text-slate-600 border'}`}><div className="w-2 h-2 rounded-full bg-red-500"></div> Rejected <span className="text-slate-400 text-[10px] ml-1">{rejectedQuotes}</span></button>
             </div>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
               <div className="relative w-80">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                 <input type="text" placeholder="Search by customer, vehicle or quote ID..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50">
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Quote ID</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Customer & Vehicle</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Service Details</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Amount (₹)</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Status</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b">Created On</th>
                     <th className="p-4 text-xs font-bold text-slate-500 border-b text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {loading ? (
                       <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">Loading quotes...</td>
                       </tr>
                   ) : filteredQuotes.length === 0 ? (
                       <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">No quotes found.</td>
                       </tr>
                   ) : filteredQuotes.map(q => (
                     <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                       <td className="p-4"><div className="flex items-center gap-2"><FileEdit className="w-4 h-4 text-blue-500"/><span className="text-sm font-bold text-blue-600">Q-{q.id.substring(0,8).toUpperCase()}</span></div></td>
                       <td className="p-4"><p className="text-sm font-bold text-[#17307a]">{q.customerName}</p><p className="text-[11px] text-slate-500">{q.vehicleMake} {q.vehicleModel}</p></td>
                       <td className="p-4"><p className="text-sm font-bold text-slate-700">{q.issueSummary}</p><p className="text-[11px] text-slate-500">{q.details?.remarks || ''}</p></td>
                       <td className="p-4"><p className="text-sm font-bold text-[#17307a]">₹{q.totalCost}</p><p className="text-[10px] text-slate-500">Labour: ₹{q.laborCost} <br/> Parts: ₹{q.partsCost}</p></td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${q.quoteStatus === 'accepted' ? 'bg-green-50 text-green-600' : q.quoteStatus === 'sent' ? 'bg-blue-50 text-blue-600' : q.quoteStatus === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{q.quoteStatus ? q.quoteStatus.toUpperCase() : 'UNKNOWN'}</span>
                       </td>
                       <td className="p-4"><p className="text-[11px] font-bold text-slate-600">{formatTime(q.createdAt).date}</p><p className="text-[10px] text-slate-400">{formatTime(q.createdAt).time}</p></td>
                       <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                           {q.quoteStatus === 'draft' ? (
                             <><button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-600"><FileEdit className="w-4 h-4"/></button><button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-600"><Send className="w-4 h-4"/></button></>
                           ) : (
                             <><button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-600"><Eye className="w-4 h-4"/></button><button className="p-1.5 rounded-md hover:bg-slate-200 text-blue-600"><Download className="w-4 h-4"/></button></>
                           )}
                           <button className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400"><MoreVertical className="w-4 h-4"/></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
          
          <div className="w-80 flex flex-col gap-6 flex-shrink-0">
             <Card className="p-5">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-[#17307a]">Quotes Summary</h3>
                 <span className="text-xs text-slate-500">All Time</span>
               </div>
               <div className="flex items-center gap-4">
                 <div className="w-24 h-24 rounded-full border-[10px] border-r-blue-500 border-t-slate-200 border-l-green-500 border-b-red-500 flex items-center justify-center font-bold text-xl text-slate-700">
                   <div className="text-center">{totalQuotes}<div className="text-[10px] font-medium text-slate-400 -mt-1">Total</div></div>
                 </div>
                 <div className="space-y-2 text-xs font-bold text-slate-600 flex-1">
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Draft</span> <span>{draftQuotes}</span></div>
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Sent</span> <span>{sentQuotes}</span></div>
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Accepted</span> <span>{acceptedQuotes}</span></div>
                   <div className="flex items-center justify-between"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Rejected</span> <span>{rejectedQuotes}</span></div>
                 </div>
               </div>
             </Card>
             <Card className="p-5">
                <h3 className="font-bold text-[#17307a] mb-4">Quote Value Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Total Quote Value</span>
                    <span className="text-lg font-black text-[#17307a]">₹{totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-green-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Accepted Value</span>
                    <span className="text-md font-bold text-green-600">₹{acceptedValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Conversion Rate</span>
                    <span className="text-md font-bold text-slate-800">{conversionRate}%</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-sm font-bold text-red-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Avg Quote Value</span>
                    <span className="text-md font-bold text-slate-800">₹{Number(avgValue).toLocaleString()}</span>
                  </div>
                </div>
             </Card>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
