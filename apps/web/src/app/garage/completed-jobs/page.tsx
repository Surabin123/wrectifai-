'use client';

import { useState, useEffect } from 'react';
import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { Card } from '@/components/common/card';
import { garageNavItems } from '@/lib/garage-config';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { fetchGarageCompletedJobs, GarageCompletedJob } from '@/lib/quotes-api';
import { formatCurrency } from '@/lib/currency';

export default function CompletedJobsPage() {
  const [jobs, setJobs] = useState<GarageCompletedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchGarageCompletedJobs();
        setJobs(data);
      } catch (err) {
        console.error('Failed to load completed jobs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader />}>
        <div className="space-y-6 p-4 max-w-6xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-[#17307a]">Completed Jobs</h1>
            <p className="text-sm text-gray-500">Service history for your completed requests</p>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a56db]"></div>
            </div>
          ) : jobs.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-gray-200">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#17307a] mb-2">No Completed Jobs</h3>
              <p className="text-sm text-gray-500">You haven't completed any jobs yet.</p>
            </Card>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#e4ecff] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#f2f6ff] text-[#17307a] text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Vehicle</th>
                      <th className="px-6 py-4">Service Performed</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Completion Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4ecff]">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-[#fcfdff] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden shrink-0">
                              {job.customerAvatar ? (
                                <img src={job.customerAvatar} alt={job.customerName} className="w-full h-full object-cover" />
                              ) : (
                                job.customerName?.charAt(0).toUpperCase() || 'C'
                              )}
                            </div>
                            <div>
                              <span className="block font-semibold text-[#17307a] whitespace-nowrap">{job.customerName}</span>
                              {job.customerContact && <span className="block text-xs text-gray-500">{job.customerContact}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                          {job.vehicleMake} {job.vehicleModel}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          <p className="line-clamp-2" title={job.issueSummary}>{job.issueSummary}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-right text-[#17307a] whitespace-nowrap">{formatCurrency(job.quoteAmount || 0, job.currency)}</td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(job.completionDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap bg-teal-100 text-teal-700">
                            {job.bookingStatus === 'pendingPayment' ? 'Pending' : job.bookingStatus === 'in_progress' ? 'In Progress' : job.bookingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
