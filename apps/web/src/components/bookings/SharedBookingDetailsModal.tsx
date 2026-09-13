'use client';
import { Modal } from '@/components/common/modal';
import { formatCurrency } from '@/lib/currency';
import { formatAdminStatus } from '@/utils/admin-status';
import { formatDate } from '@/lib/utils';

export interface SharedBookingDetails {
  id?: string;
  paymentStatus?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCity?: string;
  garageName?: string;
  garageCity?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  vin?: string;
  issueDescription?: string;
  remarks?: string;
  laborCost?: number;
  partsCost?: number;
  otherCost?: number;
  totalAmount?: number;
  currency?: string;
  estimatedDays?: number | string;
  scheduledAt?: string;
  createdAt?: string;
  status?: string;
}

interface Props {
  booking: SharedBookingDetails | null;
  onClose: () => void;
  actions?: React.ReactNode;
  userRole?: 'admin' | 'garage' | 'customer';
}

export function SharedBookingDetailsModal({ booking, onClose, actions, userRole = 'admin' }: Props) {
  if (!booking) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Booking Details" className="max-w-2xl">
      <div className="space-y-6 text-sm text-slate-700">
        
        {/* Parties Section */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          {(userRole === 'admin' || userRole === 'garage') && (
            <>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Customer Name</p>
                <p className="font-semibold text-slate-900">{booking.customerName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Customer Phone / Email</p>
                <p className="font-semibold text-slate-900">{booking.customerPhone || booking.customerEmail || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Customer City</p>
                <p className="font-semibold text-slate-900">{booking.customerCity || 'N/A'}</p>
              </div>
            </>
          )}

          {(userRole === 'admin' || userRole === 'customer') && (
            <>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Garage Name</p>
                <p className="font-semibold text-slate-900">{booking.garageName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Garage City</p>
                <p className="font-semibold text-slate-900">{booking.garageCity || 'N/A'}</p>
              </div>
            </>
          )}

          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Created At</p>
            <p className="font-semibold text-slate-900">{booking.createdAt ? formatDate(booking.createdAt) : 'N/A'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Status</p>
            <p className="font-semibold text-slate-900 uppercase">
               <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                 booking.status === 'confirmed' || booking.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                 booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                 booking.status === 'readyForCollection' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                 booking.status === 'collected' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                 booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                 'bg-orange-50 text-orange-700 border-orange-100'
               }`}>
                 {booking.status ? formatAdminStatus(booking.status) : 'N/A'}
               </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Payment Status</p>
            <p className="font-semibold text-slate-900 uppercase">{booking.paymentStatus || 'UNPAID'}</p>
          </div>
        </div>

        {/* Vehicle & Request Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle (VIN)</p>
            <p className="font-semibold text-slate-900">
              {booking.vehicleMake || ''} {booking.vehicleModel || ''} {booking.vehicleYear || ''} 
              {booking.vin ? ` (${booking.vin})` : ''}
              {(!booking.vehicleMake && !booking.vehicleModel) ? 'N/A' : ''}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Scheduled Date & Time</p>
            <p className="font-semibold text-slate-900">
              {booking.scheduledAt ? formatDate(booking.scheduledAt) : 'No preference'}
              {booking.scheduledAt ? ' ' + new Date(booking.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
            </p>
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-[10px] uppercase font-bold text-slate-500">Issue Description / Request</p>
            <p className="font-semibold text-slate-900 bg-slate-50 p-3 rounded border border-slate-100 mt-1">
              {booking.issueDescription || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Cost & Quote Details */}
        <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Labour Cost</p>
            <p className="font-semibold text-slate-900">{formatCurrency(booking.laborCost || 0, booking.currency || 'USD')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Parts Cost</p>
            <p className="font-semibold text-slate-900">{formatCurrency(booking.partsCost || 0, booking.currency || 'USD')}</p>
          </div>
          {(booking.otherCost ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-500">Other Charges</p>
              <p className="font-semibold text-slate-900">{formatCurrency(booking.otherCost || 0, booking.currency || 'USD')}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">Estimated Time</p>
            <p className="font-semibold text-slate-900">{booking.estimatedDays ? `${booking.estimatedDays} days` : 'N/A'}</p>
          </div>

          <div className="space-y-1 col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center mt-2">
            <p className="font-bold text-[#17307a]">Total Amount</p>
            <p className="font-bold text-2xl text-[#2451f6]">
              {formatCurrency(booking.totalAmount || 0, booking.currency || 'USD')}
            </p>
          </div>
        </div>
        
        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-4">
          <button onClick={onClose} className="px-5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">
            Close
          </button>
          {actions}
        </div>
      </div>
    </Modal>
  );
}
