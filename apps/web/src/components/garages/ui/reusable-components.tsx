import React from 'react';
import { Card } from '@/components/common/card';

export const GarageStatCard = ({title, value, icon, trend, color, href}: any) => (
  <Card className="relative p-5 flex flex-col justify-between border-l-4 hover:shadow-md transition-shadow" style={{borderLeftColor: color === 'blue' ? '#3b82f6' : color === 'orange' ? '#f97316' : color === 'purple' ? '#a855f7' : color === 'green' ? '#22c55e' : '#10b981'}}>
    {href && <a href={href} aria-label={`View ${title}`} className="absolute inset-0 rounded-lg" />}
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg bg-${color}-50`}>{icon}</div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded bg-${color}-50 text-${color}-600`}>{trend}</span>
    </div>
    <div>
      <p className="text-slate-500 text-xs font-bold mb-1">{title}</p>
      <h3 className="text-2xl font-black text-[#17307a]">{value}</h3>
      <p className="text-[10px] text-slate-400 font-medium mt-1">vs yesterday</p>
    </div>
  </Card>
);

export const GarageSummaryCard = ({title, isLive, children, actionText}: any) => (
  <Card className="p-5">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-[#17307a] text-sm">{title}</h3>
      {isLive && <span className="text-[10px] font-bold text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live Updates</span>}
      {actionText && <a href="#" className="text-[10px] font-bold text-blue-600 hover:underline">{actionText}</a>}
    </div>
    {children}
  </Card>
);

export const WorkshopCard = ({title, status, items}: any) => (
  <div className="bg-transparent rounded-xl">
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-2 h-2 rounded-full ${status === 'accepted' ? 'bg-blue-500' : status === 'inspection' ? 'bg-orange-500' : status === 'repair' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
      <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</h4>
    </div>
    <div className="space-y-4">
      {items.map((item: any, i: number) => (
        <Card key={i} className="p-4 border border-slate-100 hover:border-blue-200 transition-colors">
           <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
             <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{item.id}</span>
             <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
           </div>
           <p className="text-sm font-bold text-[#17307a] mb-1">{item.model}</p>
           <p className="text-[11px] text-slate-500 font-medium mb-4">Customer: {item.customer}</p>
           <div className="flex items-center gap-2 text-[10px] bg-slate-50 p-2 rounded-lg text-slate-600 font-bold border border-slate-100">
             <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[8px]">{item.assignedTo.substring(0,2).toUpperCase()}</div> Assigned: {item.assignedTo}
           </div>
        </Card>
      ))}
    </div>
  </div>
);

export const RequestCard = ({name, vehicle, issue, time, onView}: any) => (
  <div className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 pt-3 first:pt-0">
    <div className="w-10 h-10 rounded bg-slate-100 flex-shrink-0"></div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-bold text-[#17307a]">{name}</p>
        <span className="text-[10px] text-red-500 flex items-center gap-1 font-medium"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {time}</span>
      </div>
      <p className="text-[11px] text-slate-500 font-medium">{vehicle}</p>
      <p className="text-[11px] font-bold mt-1 text-slate-700">Issue: {issue}</p>
      {onView && (
        <button onClick={onView} className="mt-2 text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
          View
        </button>
      )}
    </div>
  </div>
);

export const KanbanBoard = () => (
  <div className="flex gap-6 flex-1 overflow-x-auto pb-4 pt-2 hide-scrollbar">
    {['Accepted', 'Vehicle Arrived', 'Inspection', 'Repair', 'Ready', 'Completed'].map((col, idx) => (
      <div key={col} className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-yellow-500' : idx === 2 ? 'bg-purple-500' : idx === 3 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
          <h3 className="font-bold text-slate-700 text-sm">{col} <span className="text-slate-400 font-normal">2</span></h3>
        </div>
        <div className="flex-1 rounded-xl">
          <Card className="p-4 mb-4 hover:border-blue-300 border-transparent border transition-colors shadow-sm cursor-pointer">
             <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">TS09HK1234</span>
               <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">HIGH</span>
             </div>
             <p className="text-sm font-bold text-[#17307a] mb-1">Toyota Fortuner</p>
             <p className="text-[11px] text-slate-500 font-medium mb-4">AC not cooling properly</p>
             <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
               <div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Customer</p>
                 <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 rounded-full"></div> Ananya Patel</p>
               </div>
               <div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Technician</p>
                 <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[6px]">AK</div> Amit K.</p>
               </div>
             </div>
          </Card>
        </div>
      </div>
    ))}
  </div>
);

export const BookingCalendar = () => (
  <div className="flex gap-6 h-[75vh]">
    <Card className="flex-1 p-0 flex flex-col overflow-hidden shadow-sm">
       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
         <div className="flex gap-2">
           <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100">Calendar View</button>
           <button className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold border border-transparent">List View</button>
         </div>
         <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold">&lt;</button>
             <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold">&gt;</button>
           </div>
           <button className="px-4 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Today</button>
           <span className="font-bold text-[#17307a]">16 May 2025, Friday</span>
         </div>
         <div className="flex gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
           <button className="px-3 py-1.5 bg-white text-slate-800 rounded-md text-sm font-bold shadow-sm">Day</button>
           <button className="px-3 py-1.5 text-slate-600 rounded-md text-sm font-bold hover:text-slate-800">Week</button>
           <button className="px-3 py-1.5 text-slate-600 rounded-md text-sm font-bold hover:text-slate-800">Month</button>
         </div>
       </div>
       <div className="flex-1 bg-white overflow-auto">
          {/* Mock Calendar Grid */}
          <table className="w-full h-full min-w-[800px]">
            <thead>
              <tr>
                <th className="w-20 border-b border-r border-slate-100 p-3 text-[11px] font-bold text-slate-400 uppercase bg-slate-50">Time</th>
                <th className="border-b border-r border-slate-100 p-3 text-sm font-bold text-[#17307a] bg-slate-50">Bay 1<div className="text-[10px] text-slate-500 font-normal mt-0.5">General Service</div></th>
                <th className="border-b border-r border-slate-100 p-3 text-sm font-bold text-[#17307a] bg-slate-50">Bay 2<div className="text-[10px] text-slate-500 font-normal mt-0.5">Mechanical Work</div></th>
                <th className="border-b border-r border-slate-100 p-3 text-sm font-bold text-[#17307a] bg-slate-50">Bay 3<div className="text-[10px] text-slate-500 font-normal mt-0.5">Diagnostics</div></th>
              </tr>
            </thead>
            <tbody>
              {[9, 10, 11, 12, 1, 2, 3, 4, 5].map(h => (
                <tr key={h}>
                  <td className="border-b border-r border-slate-100 p-2 text-[10px] font-bold text-slate-400 text-center">{h}:00 {h < 8 || h === 12 ? 'PM' : 'AM'}</td>
                  <td className="border-b border-r border-slate-100 p-1 bg-white">
                    {h === 9 && <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded-r-lg h-full shadow-sm"><p className="text-[11px] font-bold text-slate-800">Toyota Innova</p><p className="text-[9px] text-slate-500">Ananya Patel</p></div>}
                  </td>
                  <td className="border-b border-r border-slate-100 p-1 bg-white">
                    {h === 10 && <div className="bg-orange-50 border-l-4 border-orange-500 p-2 rounded-r-lg h-full shadow-sm"><p className="text-[11px] font-bold text-slate-800">Mahindra XUV700</p><p className="text-[9px] text-slate-500">Rahul Verma</p></div>}
                  </td>
                  <td className="border-b border-r border-slate-100 p-1 bg-white">
                    {h === 11 && <div className="bg-purple-50 border-l-4 border-purple-500 p-2 rounded-r-lg h-full shadow-sm"><p className="text-[11px] font-bold text-slate-800">BMW 320d</p><p className="text-[9px] text-slate-500">Sanjay Verma</p></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
       </div>
    </Card>
    
    <div className="w-80 space-y-6 flex-shrink-0">
      <GarageSummaryCard title="Today's Summary" isLive>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-500 text-xs">📅</div> <span className="text-sm font-medium">Total Bookings</span></div> <span className="font-bold text-[#17307a]">14</span></div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center text-green-500 text-xs">✓</div> <span className="text-sm font-medium">Completed</span></div> <span className="font-bold text-[#17307a]">03</span></div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-yellow-100 flex items-center justify-center text-yellow-600 text-xs">⚙</div> <span className="text-sm font-medium">In Progress</span></div> <span className="font-bold text-[#17307a]">06</span></div>
        </div>
      </GarageSummaryCard>
    </div>
  </div>
);
