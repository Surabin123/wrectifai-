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
import { fetchGarageStats, fetchGarageActiveJobs, fetchGarageQuotes, getGarageIncomingRequests } from '@/lib/quotes-api';
import { getGarageReviews } from '@/lib/reviews-api';
import { useRouter } from 'next/navigation';

export default function GarageDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState({ incoming: 0, todaysBookings: 0, activeJobs: 0, generatedQuotes: 0, completed: 0 });
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState({ averageRating: '0.0', satisfactionRate: '0%' });

  useEffect(() => {
    async function loadData() {
      if (!user?.garageId) return;
      try {
        const [statsData, jobsData, requestsData, quotesData, reviewsData] = await Promise.all([
          fetchGarageStats().catch(() => ({ incoming: 0, todaysBookings: 0, activeJobs: 0, generatedQuotes: 0, completed: 0 })),
          fetchGarageActiveJobs().catch(() => []),
          getGarageIncomingRequests().catch(() => []),
          fetchGarageQuotes().catch(() => []),
          getGarageReviews(user.garageId, user.id, 1, 1, 'recent').catch(() => ({ stats: { averageRating: 0 } }))
        ]);
        setStats(statsData as any);
        setActiveJobs(jobsData);
        setRecentRequests(requestsData);
        setRecentQuotes(quotesData);
        
        if (reviewsData?.stats) {
          const avg = Number(reviewsData.stats.averageRating || 0);
          setRatingStats({
            averageRating: avg > 0 ? avg.toFixed(1) : '0',
            satisfactionRate: avg > 0 ? `${Math.round((avg / 5) * 100)}%` : '0%'
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    }
    loadData();
  }, [user]);

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
              <Link href="/garage/incoming-requests" className="bg-[#17307a] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm hover:bg-[#12245c] transition-colors">
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
            <div className="col-span-8 space-y-6">
              
              <div className="grid grid-cols-1 gap-6">
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

            <div className="col-span-4 space-y-6">
              <GarageSummaryCard title="Today's Summary" isLive>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><Star className="w-4 h-4 text-blue-500"/> <span className="text-sm font-medium">Average Rating</span></div> <span className="font-bold">{ratingStats.averageRating} / 5.0</span></div>
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500"/> <span className="text-sm font-medium">Satisfaction Rate</span></div> <span className="font-bold">{ratingStats.satisfactionRate}</span></div>
                 </div>
              </GarageSummaryCard>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#17307a]">Pending Quote Requests</h2>
              <Link href="/garage/incoming-requests" className="text-xs text-blue-600">View All</Link>
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
                            onClick={() => router.push(`/garage/incoming-requests`)}
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
