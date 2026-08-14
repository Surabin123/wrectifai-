'use client';
import { Modal } from '@/components/common/modal';

interface BookingDetailsModalProps {
  booking: any;
  onClose: () => void;
  actions?: React.ReactNode;
}

export function BookingDetailsModal({ booking, onClose, actions }: BookingDetailsModalProps) {
  if (!booking) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Booking Details" className="max-w-lg">
      <div className="space-y-4 text-sm">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-bold text-slate-600">Booking ID:</span>
            <p className="text-slate-800 uppercase font-mono">{booking.id.substring(0, 8)}</p>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-600">Status:</span>
            <p className="text-slate-800 capitalize font-bold text-blue-700">
              {booking.status === 'pendingPayment' ? 'Pending' : booking.status.replace('_', ' ')}
            </p>
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-600">Customer:</span>
          <p className="text-slate-800">{booking.customerName}</p>
        </div>

        <div>
          <span className="font-bold text-slate-600">Vehicle:</span>
          <p className="text-slate-800">
            {booking.vehicleMake} {booking.vehicleModel} {booking.vehicleYear}
            {booking.vehicleVin && ` (VIN: ${booking.vehicleVin})`}
          </p>
        </div>

        <div>
          <span className="font-bold text-slate-600">Diagnosis / Issues:</span>
          <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">
            {booking.issueSummary}
          </p>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Service Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {booking.laborCost != null && (
              <div>
                <span className="font-bold text-slate-600">Labour Cost:</span>
                <p className="text-slate-800">{booking.currency || 'USD'} {booking.laborCost}</p>
              </div>
            )}
            {booking.partsCost != null && (
              <div>
                <span className="font-bold text-slate-600">Parts Cost:</span>
                <p className="text-slate-800">{booking.currency || 'USD'} {booking.partsCost}</p>
              </div>
            )}
            {booking.estimatedDays != null && (
              <div>
                <span className="font-bold text-slate-600">Estimated Time:</span>
                <p className="text-slate-800">
                  {booking.estimatedDays} Days
                </p>
              </div>
            )}
            {booking.totalCost != null && (
              <div>
                <span className="font-bold text-slate-600">Total Cost:</span>
                <p className="text-slate-800 font-bold text-lg text-[#17307a]">
                  {booking.currency || 'USD'} {booking.totalCost}
                </p>
              </div>
            )}
            <div>
              <span className="font-bold text-slate-600">Scheduled Date:</span>
              <p className="text-slate-800">
                {new Date(booking.scheduledAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {booking.remarks && (
          <div>
            <span className="font-bold text-slate-600">Notes / Warranty:</span>
            <p className="text-slate-800 bg-slate-50 p-3 mt-1 rounded border border-slate-200">
              {booking.remarks}
            </p>
          </div>
        )}
        
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          {actions}
        </div>
      </div>
    </Modal>
  );
}
