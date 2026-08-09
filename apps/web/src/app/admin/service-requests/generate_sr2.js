const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, content.trim() + '\n', 'utf8');
};

const adminSRDir = 'd:/WRECTIFIAI/wrectifai/apps/web/src/app/admin/service-requests';

// 4. Completed Requests
write(`${adminSRDir}/completed/page.tsx`, `
'use client';
import { Card } from '@/components/common/card';
import { Search, Filter, MoreVertical, Calendar, Clock, Download, CheckCircle2, Star, CalendarDays, Eye, CreditCard } from 'lucide-react';

export default function CompletedRequestsPage() {
  const requests = [
    { id: 'REQ-1145', sr: '#SR1145', title: 'Engine oil change\\nand general checkup', customer: { initials: 'RS', name: 'Rahul Sharma', phone: '98765 43210', email: 'rahul.sharma@gmail.com' }, garage: { name: 'SpeedFix Auto Care', location: 'Hyderabad, TS', rating: '4.6 (128 reviews)' }, ai: { service: 'Engine Oil Change', diagnosis: 'AI Diagnosis: Engine oil\\nwas aged. Replaced with\\n5W-30 synthetic oil.' }, completed: '30 Jul, 2024\\n06:15 PM', duration: '2h 15m', amount: '$2,450', rating: 5.0, ratingText: 'Excellent' },
    { id: 'REQ-1144', sr: '#SR1144', title: 'AC not cooling properly', customer: { initials: 'PS', name: 'Priya Singh', phone: '91234 56780', email: 'priya.singh@gmail.com' }, garage: { name: 'QuickPit Service Center', location: 'Secunderabad, TS', rating: '4.4 (96 reviews)' }, ai: { service: 'AC System Check', diagnosis: 'AI Diagnosis: Low\\nrefrigerant level and\\nclogged filter.' }, completed: '30 Jul, 2024\\n03:40 PM', duration: '1h 50m', amount: '$1,850', rating: 4.8, ratingText: 'Very Good' },
    { id: 'REQ-1143', sr: '#SR1143', title: 'Brake noise when\\napplying brakes', customer: { initials: 'AK', name: 'Arjun Kumar', phone: '90123 45678', email: 'arjun.kumar@gmail.com' }, garage: { name: 'DriveWell Garage', location: 'Hyderabad, TS', rating: '4.5 (73 reviews)' }, ai: { service: 'Brake Inspection', diagnosis: 'AI Diagnosis: Front brake\\npads worn out. Replaced\\nboth front pads.' }, completed: '30 Jul, 2024\\n01:10 PM', duration: '2h 05m', amount: '$2,100', rating: 5.0, ratingText: 'Excellent' },
    { id: 'REQ-1142', sr: '#SR1142', title: 'Battery draining\\novernight', customer: { initials: 'SN', name: 'Sneha Nair', phone: '93456 78901', email: 'sneha.nair@gmail.com' }, garage: { name: 'AutoWorks Garage', location: 'Kukatpally, TS', rating: '4.3 (58 reviews)' }, ai: { service: 'Battery Check', diagnosis: 'AI Diagnosis: Battery\\nhealth low. Replaced with\\nnew Amaron battery.' }, completed: '20 Jul, 2024\\n07:30 PM', duration: '1h 35m', amount: '$4,250', rating: 4.9, ratingText: 'Excellent' },
    { id: 'REQ-1141', sr: '#SR1141', title: 'Suspension making\\nnoise on bumps', customer: { initials: 'RK', name: 'Rohit Kapoor', phone: '77770 01122', email: 'rohit.kapoor@gmail.com' }, garage: { name: 'GearUp Garage', location: 'Dilsukhnagar, TS', rating: '4.2 (64 reviews)' }, ai: { service: 'Suspension Check', diagnosis: 'AI Diagnosis: Worn out\\nbushes. Replaced front\\nsuspension bushes.' }, completed: '29 Jul, 2024\\n05:20 PM', duration: '2h 40m', amount: '$3,600', rating: 4.7, ratingText: 'Very Good' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Completed Requests</h1>
          <p className="text-sm text-slate-500">Dashboard &gt; Service Requests &gt; Completed Requests</p>
        </div>
        <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Completed</p>
            <h3 className="text-2xl font-bold text-slate-800">478</h3>
            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">↑ 15% vs last month</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><CalendarDays className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Completed This Month</p>
            <h3 className="text-2xl font-bold text-slate-800">142</h3>
            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">↑ 18% vs last month</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><Star className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Customer Satisfaction</p>
            <h3 className="text-2xl font-bold text-slate-800">4.7 / 5</h3>
            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">↑ 0.2 vs last month</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CreditCard className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800">$18,45,230</h3>
            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">↑ 22% vs last month</p>
          </div>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by request ID, customer, vehicle or service..." className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-3">
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Services</option>
            </select>
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Garages</option>
            </select>
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Cities</option>
            </select>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50">
              <Calendar className="w-4 h-4" /> Date Range
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50">
              <Filter className="w-4 h-4" /> More Filters
            </button>
            <div className="border-l border-slate-200 pl-3">
               <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                 Sort by<br/>Completed On (Newest) <Filter className="w-4 h-4 ml-1" />
               </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 border-b border-slate-100 uppercase">
                <th className="p-4">Request Details</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Garage</th>
                <th className="p-4">Service & Diagnosis</th>
                <th className="p-4">Completed On</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Rating</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 min-w-[160px]">
                    <p className="text-[13px] font-bold text-slate-900">{r.id}</p>
                    <p className="text-[10px] text-slate-400 mb-1">{r.sr}</p>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line mt-1">{r.title}</p>
                    <button className="text-[10px] text-blue-600 font-medium mt-1 flex items-center gap-0.5">View More <span>⌄</span></button>
                  </td>
                  <td className="p-4 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{r.customer.initials}</div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.customer.name}</p>
                        <p className="text-[11px] text-slate-500">{r.customer.phone}</p>
                        <p className="text-[10px] text-slate-400">{r.customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 min-w-[150px]">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5 text-sm">🏪</span>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">{r.garage.name}</p>
                        <p className="text-[11px] text-slate-500"><span className="text-[10px]">📍</span> {r.garage.location}</p>
                        <p className="text-[10px] text-green-600 mt-0.5 flex items-center gap-0.5">⭐ {r.garage.rating}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 min-w-[180px]">
                    <p className="text-[12px] font-bold text-slate-900">{r.ai.service}</p>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line mt-1">{r.ai.diagnosis}</p>
                    <button className="text-[10px] text-blue-600 font-medium mt-1">View Report</button>
                  </td>
                  <td className="p-4 min-w-[120px]">
                    <div className="flex items-start gap-1.5">
                       <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                       <p className="text-[11px] text-slate-700 whitespace-pre-line">{r.completed}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                       <p className="text-[12px] font-medium text-slate-700">{r.duration}</p>
                    </div>
                  </td>
                  <td className="p-4">
                     <p className="text-[14px] font-bold text-slate-900">{r.amount}</p>
                  </td>
                  <td className="p-4 min-w-[100px]">
                    <div className="flex items-center gap-1 text-green-500 mb-1">
                       <Star className="w-4 h-4 fill-current" />
                       <span className="text-[12px] font-bold">{r.rating}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{r.ratingText}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-center">
                       <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"><Eye className="w-3.5 h-3.5" /> View Details</button>
                       <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing 1 to 10 of 478 completed requests</p>
          <div className="flex items-center gap-2">
            <select className="px-2 py-1 text-sm border border-slate-200 rounded text-slate-600 bg-white">
              <option>10 per page</option>
            </select>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-50">&lt;</button>
              <button className="w-8 h-8 rounded flex items-center justify-center bg-blue-600 text-white font-medium">1</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">2</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">3</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">4</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">5</button>
              <span className="text-slate-400">...</span>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">48</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">&gt;</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
`);

// 5. Cancelled Requests
write(`${adminSRDir}/cancelled/page.tsx`, `
'use client';
import { Card } from '@/components/common/card';
import { Search, Filter, MoreVertical, Calendar, Download, XSquare, CalendarX, UserX, Building2, Eye } from 'lucide-react';

export default function CancelledRequestsPage() {
  const requests = [
    { id: 'REQ-1187', sr: '#SR1187', title: 'AC not cooling', customer: { initials: 'RS', name: 'Rahul Sharma', phone: '98765 43210', email: 'rahul.sharma@gmail.com' }, garage: { name: 'SpeedFix Auto Care', location: 'Hyderabad, TS', rating: '4.6 (128 reviews)' }, service: 'AC System Check', diagnosis: 'AC performance\\ndiagnosis and gas\\npressure check.', vehicle: { reg: 'TS09 AB 1234', model: 'Hyundai i20 (2020)', fuel: 'Petrol' }, cancelledBy: 'Customer', cancelledColor: 'text-red-600 bg-red-50', reason: 'Found issue\\nresolved\\nelsewhere', refund: 'No Refund', refundColor: 'text-green-600', cancelledOn: '30 Jul, 2024\\n06:20 PM' },
    { id: 'REQ-1165', sr: '#SR1165', title: 'Brake noise', customer: { initials: 'PS', name: 'Priya Singh', phone: '91234 56780', email: 'priya.singh@gmail.com' }, garage: { name: 'QuickPit Service Center', location: 'Secunderabad, TS', rating: '4.4 (96 reviews)' }, service: 'Brake Inspection', diagnosis: 'Brake pads and disc\\ninspection', vehicle: { reg: 'TS09 CD 5678', model: 'Maruti Swift (2019)', fuel: 'Petrol' }, cancelledBy: 'Garage', cancelledColor: 'text-orange-600 bg-orange-50', reason: 'Technician\\nnot available', refund: 'No Refund', refundColor: 'text-green-600', cancelledOn: '30 Jul, 2024\\n03:40 PM' },
    { id: 'REQ-1153', sr: '#SR1153', title: 'Battery draining', customer: { initials: 'AK', name: 'Arjun Kumar', phone: '90123 45678', email: 'arjun.kumar@gmail.com' }, garage: { name: 'DriveWell Garage', location: 'Hyderabad, TS', rating: '4.5 (73 reviews)' }, service: 'Battery Check', diagnosis: 'Battery health and\\ncharging system\\ncheck', vehicle: { reg: 'TS09 EF 9012', model: 'Honda City (2021)', fuel: 'Petrol' }, cancelledBy: 'Customer', cancelledColor: 'text-red-600 bg-red-50', reason: 'No longer\\nrequired', refund: 'No Refund', refundColor: 'text-green-600', cancelledOn: '29 Jul, 2024\\n09:15 PM' },
    { id: 'REQ-1139', sr: '#SR1139', title: 'Engine oil change', customer: { initials: 'SN', name: 'Sneha Nair', phone: '93456 78901', email: 'sneha.nair@gmail.com' }, garage: { name: 'AutoWorks Garage', location: 'Kukatpally, TS', rating: '4.3 (58 reviews)' }, service: 'Engine Oil Change', diagnosis: 'Full synthetic oil\\nchange', vehicle: { reg: 'TS09 GH 3456', model: 'Tata Nexon (2020)', fuel: 'Diesel' }, cancelledBy: 'Garage', cancelledColor: 'text-orange-600 bg-orange-50', reason: 'Parts not\\navailable', refund: 'No Refund', refundColor: 'text-green-600', cancelledOn: '29 Jul, 2024\\n06:10 PM' },
    { id: 'REQ-1120', sr: '#SR1120', title: 'Suspension noise', customer: { initials: 'RK', name: 'Rohit Kapoor', phone: '77770 01122', email: 'rohit.kapoor@gmail.com' }, garage: { name: 'GearUp Garage', location: 'Dilsukhnagar, TS', rating: '4.2 (64 reviews)' }, service: 'Suspension Check', diagnosis: 'Suspension and\\nbushing inspection', vehicle: { reg: 'TS09 MN 9876', model: 'Kia Seltos (2021)', fuel: 'Diesel' }, cancelledBy: 'Customer', cancelledColor: 'text-red-600 bg-red-50', reason: 'Too expensive', refund: 'No Refund', refundColor: 'text-green-600', cancelledOn: '28 Jul, 2024\\n07:45 PM' },
    { id: 'REQ-1105', sr: '#SR1105', title: 'Clutch slipping', customer: { initials: 'LG', name: 'Lavanya Goud', phone: '90000 33445', email: 'lavanya.goud@gmail.com' }, garage: { name: 'QuickFix Hub', location: 'Banjara Hills, TS', rating: '4.4 (112 reviews)' }, service: 'Clutch Inspection', diagnosis: 'Clutch plate and\\npressure plate check', vehicle: { reg: 'TS09 OP 1122', model: 'Maruti Baleno (2020)', fuel: 'Petrol' }, cancelledBy: 'Garage', cancelledColor: 'text-orange-600 bg-orange-50', reason: 'Customer didn\\'t\\nrespond', refund: 'No Refund', refundColor: 'text-green-600', cancelledOn: '28 Jul, 2024\\n05:30 PM' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cancelled Requests</h1>
          <p className="text-sm text-slate-500">Dashboard &gt; Service Requests &gt; Cancelled Requests</p>
        </div>
        <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><XSquare className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Cancelled</p>
            <h3 className="text-2xl font-bold text-slate-800">40</h3>
            <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">↓ 8 vs last month</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><CalendarX className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Cancelled This Month</p>
            <h3 className="text-2xl font-bold text-slate-800">12</h3>
            <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">↓ 5 vs last month</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><UserX className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Cancelled by Customers</p>
            <h3 className="text-2xl font-bold text-slate-800">28</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">70% of total</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 shadow-sm border-slate-200">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Building2 className="w-6 h-6"/></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Cancelled by Garages</p>
            <h3 className="text-2xl font-bold text-slate-800">12</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">30% of total</p>
          </div>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search by request ID, customer, vehicle or service..." className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-3">
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Services</option>
            </select>
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Garages</option>
            </select>
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Cancellation Reasons</option>
            </select>
            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white">
              <option>All Cities</option>
            </select>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50">
              <Calendar className="w-4 h-4" /> Date Range
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50">
              <Filter className="w-4 h-4" /> More Filters
            </button>
            <div className="border-l border-slate-200 pl-3">
               <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                 Sort by<br/>Cancelled On (Newest) <Filter className="w-4 h-4 ml-1" />
               </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 border-b border-slate-100 uppercase">
                <th className="p-4">Request Details</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Garage</th>
                <th className="p-4">Service</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Cancelled By</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Refund</th>
                <th className="p-4">Cancelled On</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 min-w-[140px]">
                    <p className="text-[13px] font-bold text-slate-900">{r.id}</p>
                    <p className="text-[10px] text-slate-400 mb-1">{r.sr}</p>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line mt-1">{r.title}</p>
                    <button className="text-[10px] text-blue-600 font-medium mt-1 flex items-center gap-0.5">View More <span>⌄</span></button>
                  </td>
                  <td className="p-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{r.customer.initials}</div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.customer.name}</p>
                        <p className="text-[11px] text-slate-500">{r.customer.phone}</p>
                        <p className="text-[10px] text-slate-400">{r.customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 min-w-[140px]">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5 text-sm">🏪</span>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">{r.garage.name}</p>
                        <p className="text-[11px] text-slate-500"><span className="text-[10px]">📍</span> {r.garage.location}</p>
                        <p className="text-[10px] text-green-600 mt-0.5 flex items-center gap-0.5">⭐ {r.garage.rating}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 min-w-[150px]">
                    <p className="text-[12px] font-bold text-slate-900">{r.service}</p>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line mt-1">{r.diagnosis}</p>
                  </td>
                  <td className="p-4 min-w-[130px]">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5 text-sm">🚗</span>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">{r.vehicle.reg}</p>
                        <p className="text-[11px] text-slate-500">{r.vehicle.model}</p>
                        <p className="text-[10px] text-slate-400">{r.vehicle.fuel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <span className={\`px-2 py-0.5 rounded text-[11px] font-semibold \${r.cancelledColor}\`}>{r.cancelledBy}</span>
                  </td>
                  <td className="p-4 min-w-[120px]">
                     <p className="text-[11px] text-slate-700 whitespace-pre-line">{r.reason}</p>
                  </td>
                  <td className="p-4">
                     <span className={\`text-[12px] font-bold \${r.refundColor}\`}>{r.refund}</span>
                  </td>
                  <td className="p-4 min-w-[120px]">
                    <div className="flex items-start gap-1.5">
                       <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                       <p className="text-[11px] text-slate-700 whitespace-pre-line">{r.cancelledOn}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-center">
                       <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"><Eye className="w-3.5 h-3.5" /> View Details</button>
                       <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing 1 to 10 of 40 cancelled requests</p>
          <div className="flex items-center gap-2">
            <select className="px-2 py-1 text-sm border border-slate-200 rounded text-slate-600 bg-white">
              <option>10 per page</option>
            </select>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-50">&lt;</button>
              <button className="w-8 h-8 rounded flex items-center justify-center bg-blue-600 text-white font-medium">1</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">2</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">3</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">4</button>
              <button className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-50">&gt;</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
`);
