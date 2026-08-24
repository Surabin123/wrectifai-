export function formatAdminStatus(status: string | undefined | null): string {
  if (!status) return 'N/A';
  const statusMap: Record<string, string> = {
    pendingpayment: 'Payment Pending',
    inservice: 'In Service',
    inprogress: 'In Progress',
    completed: 'Completed',
    pending: 'Pending',
    confirmed: 'Confirmed',
    quoted: 'Quoted',
    cancelled: 'Cancelled',
    suspended: 'Suspended',
    active: 'Active',
    rejected: 'Rejected',
    accepted: 'Accepted',
    ready: 'Ready',
    approved: 'Approved',
    pendingverification: 'Pending Verification',
    readyforcollection: 'Ready for Collection',
    collected: 'Collected'
  };
  const lower = status.toLowerCase();
  return statusMap[lower] || status.charAt(0).toUpperCase() + status.slice(1);
}