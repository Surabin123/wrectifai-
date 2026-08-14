'use client';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';
import { GarageStatCard, GarageSummaryCard, WorkshopCard, RequestCard } from '@/components/garages/ui/reusable-components';
import { Card } from '@/components/common/card';
import { Calendar, Inbox, CheckCircle, Car, DollarSign, Plus, Calendar as CalendarIcon, Star, PenTool, Wrench, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { fetchGarageStats, fetchGarageActiveJobs, fetchGarageQuotes, getGarageIncomingBookings } from '@/lib/quotes-api';
import { useRouter } from 'next/navigation';

export default function GarageDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState({ incoming: 0, todaysBookings: 0, activeJobs: 0, generatedQuotes: 0, completed: 0 });
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, jobsData, requestsData, quotesData] = await Promise.all([
          fetchGarageStats().catch(() => ({ incoming: 0, todaysBookings: 0, activeJobs: 0, generatedQuotes: 0, completed: 0 })),
          fetchGarageActiveJobs().catch(() => []),
          getGarageIncomingBookings().catch(() => []),
          fetchGarageQuotes().catch(() => []),
        ]);
        setStats(statsData as any);
        setActiveJobs(jobsData.slice(0, 4)); // Get up to 4 for the floor
        setRecentRequests(requestsData.slice(0, 3));
        setRecentQuotes(quotesData.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    }
    loadData();
  }, []);

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActiveJobsForStatus = (status: string) => {
    // In a real app, we'd map activeJobs statuses to 'accepted', 'inspection', 'repair', 'ready'
    // For now we map them all to 'accepted' just to show them, since we don't have detailed job tracking yet
    if (status === 'accepted') {
      return activeJobs.map(job => ({
        id: job.id.substring(0, 8).toUpperCase(),
        time: formatTime(job.quoteCreatedAt || job.bookingDate),
        model: `${job.vehicleMake || ''} ${job.vehicleModel || ''}`,
        customer: job.customerName || 'Customer',
        assignedTo: 'Unassigned'
      }));
    }
    return [];
  };

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#17307a]">Welcome back, {user?.name || 'Garage'}</h1>
              <p className="text-sm text-slate-500">Here's what's happening in your garage today.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/garage/quotes" className="bg-[#17307a] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm hover:bg-[#12245c] transition-colors">
                <Plus className="w-4 h-4"/> View Requests
              </Link>
              <Link href="/garage/bookings" className="bg-white border text-[#17307a] px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm hover:bg-slate-50 transition-colors">
                <CalendarIcon className="w-4 h-4"/> View Bookings
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <GarageStatCard title="Incoming Requests" value={stats.incoming.toString()} icon={<Inbox className="w-5 h-5 text-orange-500"/>} trend="" color="orange" />
            <GarageStatCard title="Bookings" value={stats.activeJobs.toString()} icon={<Calendar className="w-5 h-5 text-blue-500"/>} trend="" color="blue" />
            <GarageStatCard title="Quotes" value={stats.generatedQuotes.toString()} icon={<FileText className="w-5 h-5 text-green-500"/>} trend="" color="green" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-9 space-y-6">
              
              <Card className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-[#17307a]">Active Workshop Floor</h2>
                  <Link href="/garage/bookings" className="text-sm text-blue-600 hover:underline">View All Jobs</Link>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <WorkshopCard title={`ACCEPTED (${getActiveJobsForStatus('accepted').length})`} status="accepted" items={getActiveJobsForStatus('accepted')} />
                  <WorkshopCard title="INSPECTION (0)" status="inspection" items={[]} />
                  <WorkshopCard title="REPAIR (0)" status="repair" items={[]} />
                  <WorkshopCard title="READY (0)" status="ready" items={[]} />
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                 <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-[#17307a]">Pending Service Requests</h3>
                      <Link href="/garage/incoming-requests" className="text-xs text-blue-600">View All</Link>
                    </div>
                    <div className="space-y-3">
                       {recentRequests.length === 0 ? (
                         <p className="text-xs text-slate-500 text-center py-4">No pending requests</p>
                       ) : (
                         recentRequests.map(req => (
                           <RequestCard key={req.id} name={req.customerName || 'Customer'} vehicle={`${req.vehicleMake || ''} ${req.vehicleModel || ''}`} issue={req.issueSummary || 'No description'} time={formatTime(req.createdAt)} onView={() => router.push('/garage/incoming-requests')} />
                         ))
                       )}
                    </div>
                 </Card>
                 <Card className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-[#17307a]">Recent Quotes</h3>
                      <Link href="/garage/quotes" className="text-xs text-blue-600">View All</Link>
                    </div>
                    <div className="space-y-3">
                      {recentQuotes.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No recent quotes</p>
                      ) : (
                        recentQuotes.map(quote => (
                          <div key={quote.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600"><PenTool className="w-4 h-4"/></div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-semibold truncate">{quote.customerName || 'Customer'}</p>
                              <p className="text-xs text-slate-500 truncate">{quote.vehicleMake} {quote.vehicleModel}</p>
                              <p className="text-xs text-slate-400 truncate">ETA: {quote.etaNote || (quote.etaDays ? `${quote.etaDays} Days` : 'N/A')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{quote.currency || 'USD'} {quote.totalCost?.toLocaleString()}</p>
                              <p className="text-[10px] text-blue-600 font-medium">{formatTime(quote.createdAt)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                 </Card>
                 
              </div>

            </div>

            <div className="col-span-3 space-y-6">
              <GarageSummaryCard title="Today's Summary" isLive>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><Star className="w-4 h-4 text-blue-500"/> <span className="text-sm font-medium">Average Rating</span></div> <span className="font-bold">0.0 / 5.0</span></div>
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500"/> <span className="text-sm font-medium">Satisfaction Rate</span></div> <span className="font-bold">0%</span></div>
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500"/> <span className="text-sm font-medium">Total Orders</span></div> <span className="font-bold">{stats.activeJobs} Active</span></div>
                 </div>
              </GarageSummaryCard>
              
              <GarageSummaryCard title="Today's Schedule" actionText="View Calendar">
                 <div className="space-y-3 relative before:absolute before:inset-0 before:ml-1 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pl-4">
                   <p className="text-xs text-slate-500 text-center py-4">No schedule for today</p>
                 </div>
              </GarageSummaryCard>
              
              <GarageSummaryCard title="Inventory Alerts" actionText="View All">
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 text-center py-4">No low stock alerts</p>
                </div>
              </GarageSummaryCard>

              <div className="bg-[#17307a] rounded-xl p-5 text-white">
                <h3 className="font-bold mb-2 text-sm flex items-center gap-2">Need Help?</h3>
                <p className="text-xs text-blue-200 mb-4">Connect with your WrectifAI Manager for priority support.</p>
                <button className="w-full bg-white text-[#17307a] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">Chat Now</button>
              </div>

            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-[#17307a]">Pending Quote Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Vehicle</th>
                    <th className="px-6 py-4 font-medium">Issue</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No pending requests found.
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{req.customerName || 'Customer'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-700">{req.vehicleMake || req.vehicle?.make || ''} {req.vehicleModel || req.vehicle?.model || ''}</div>
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate text-slate-700">
                          {req.issueSummary}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()} {formatTime(req.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => router.push(`/garage/quotes`)}
                            className="text-blue-600 hover:text-blue-800 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
