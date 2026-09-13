'use client';
import { Modal } from '@/components/common/modal';
import { Button } from '@/components/common/button';
import { formatCurrency } from '@/lib/currency';

export interface SharedInvoiceDetails {
  id?: string;
  invoiceNumber?: string;
  bookingId?: string;
  customerName?: string;
  customerPhone?: string;
  garageName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  serviceType?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  currency?: string;
  paymentStatus?: string;
  quoteDetails?: {
    laborCost?: number;
    partsCost?: number;
    consumablesCost?: number;
  };
}

interface Props {
  invoiceData: SharedInvoiceDetails | null;
  onClose: () => void;
  userRole?: 'admin' | 'garage' | 'customer';
}

export function SharedInvoiceDetailsModal({ invoiceData, onClose, userRole = 'admin' }: Props) {
  if (!invoiceData) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title="Invoice" className="max-w-2xl">
      <div className="p-2 text-sm text-slate-800">
        <div className="flex justify-between items-start border-b pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-black text-[#17307a] tracking-tight">INVOICE</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">#{invoiceData.invoiceNumber || invoiceData.id}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-slate-800">{invoiceData.garageName || 'Garage'}</p>
          </div>
        </div>
        
        <div className="flex justify-between mb-6">
          {(userRole === 'admin' || userRole === 'garage') && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
              <p className="font-bold text-slate-800 text-base">{invoiceData.customerName || 'Customer'}</p>
              <p className="text-sm text-slate-600">{invoiceData.customerPhone}</p>
            </div>
          )}
          {userRole === 'customer' && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
              <p className="font-bold text-slate-800 text-base">You</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</p>
            <p className="font-bold text-slate-800 text-base">{invoiceData.vehicleMake} {invoiceData.vehicleModel}</p>
            {invoiceData.vehicleVin && <p className="text-sm text-slate-600">VIN: {invoiceData.vehicleVin}</p>}
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
          <div className="flex justify-between mb-2 pb-2 border-b border-slate-200">
            <p className="font-bold text-slate-700">Description</p>
            <p className="font-bold text-slate-700">Amount</p>
          </div>
          <div className="flex justify-between py-2">
            <p className="text-slate-600">{invoiceData.serviceType || 'Vehicle Service'}</p>
            <p className="font-medium">{formatCurrency(invoiceData.subtotal || 0, invoiceData.currency || 'USD')}</p>
          </div>
          
          {/* Detailed Breakdown from Quote if available */}
          {invoiceData.quoteDetails && (
            <div className="ml-4 mt-2 space-y-1 text-sm">
              {invoiceData.quoteDetails.laborCost !== undefined && (
                <div className="flex justify-between text-slate-500">
                  <span>Labour Cost</span>
                  <span>{formatCurrency(invoiceData.quoteDetails.laborCost, invoiceData.currency || 'USD')}</span>
                </div>
              )}
              {invoiceData.quoteDetails.partsCost !== undefined && (
                <div className="flex justify-between text-slate-500">
                  <span>Parts Cost</span>
                  <span>{formatCurrency(invoiceData.quoteDetails.partsCost, invoiceData.currency || 'USD')}</span>
                </div>
              )}
              {invoiceData.quoteDetails.consumablesCost !== undefined && (
                <div className="flex justify-between text-slate-500">
                  <span>Consumables</span>
                  <span>{formatCurrency(invoiceData.quoteDetails.consumablesCost, invoiceData.currency || 'USD')}</span>
                </div>
              )}
            </div>
          )}

          {Number(invoiceData.discountAmount) > 0 && (
            <div className="flex justify-between py-2 text-green-600">
              <p>Discount Applied</p>
              <p>- {formatCurrency(invoiceData.discountAmount || 0, invoiceData.currency || 'USD')}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm">
              <p className="text-slate-500 font-medium">Subtotal</p>
              <p className="font-semibold">{formatCurrency(invoiceData.subtotal || 0, invoiceData.currency || 'USD')}</p>
            </div>
            {Number(invoiceData.taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <p className="text-slate-500 font-medium">Tax</p>
                <p className="font-semibold">{formatCurrency(invoiceData.taxAmount || 0, invoiceData.currency || 'USD')}</p>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3">
              <p className="font-bold text-slate-800 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-[#17307a]">{formatCurrency(invoiceData.totalAmount || 0, invoiceData.currency || 'USD')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center border-t border-slate-200 pt-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Payment Status</p>
            <span className={`inline-block px-3 py-1 font-bold text-xs rounded uppercase ${
              invoiceData.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {invoiceData.paymentStatus}
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.print()}
              variant="outline"
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Print
            </Button>
            <Button 
              onClick={async () => {
                const jsPDF = (await import('jspdf')).default;
                const autoTable = (await import('jspdf-autotable')).default;
                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text('Invoice', 14, 20);
                doc.setFontSize(10);
                doc.text(`Booking ID: ${invoiceData.bookingId || invoiceData.id || ''}`, 14, 28);
                
                const tableData: any[] = [];
                if (invoiceData.quoteDetails) {
                  if (invoiceData.quoteDetails.laborCost) tableData.push(['Labour Cost', invoiceData.quoteDetails.laborCost]);
                  if (invoiceData.quoteDetails.partsCost) tableData.push(['Parts Cost', invoiceData.quoteDetails.partsCost]);
                  if (invoiceData.quoteDetails.consumablesCost) tableData.push(['Consumables', invoiceData.quoteDetails.consumablesCost]);
                }
                if (Number(invoiceData.discountAmount) > 0) tableData.push(['Discount Applied', `- ${invoiceData.discountAmount}`]);
                tableData.push(['Subtotal', invoiceData.subtotal]);
                if (Number(invoiceData.taxAmount) > 0) tableData.push(['Tax', invoiceData.taxAmount]);
                tableData.push(['Total', invoiceData.totalAmount]);

                autoTable(doc, {
                  startY: 35,
                  head: [['Description', 'Amount']],
                  body: tableData,
                });
                
                doc.save(`Invoice_${invoiceData.bookingId || invoiceData.id || 'download'}.pdf`);
              }}
              className="bg-[#17307a] hover:bg-blue-800 text-white"
            >
              Download PDF
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="bg-slate-100 border-transparent text-slate-700 hover:bg-slate-200"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
