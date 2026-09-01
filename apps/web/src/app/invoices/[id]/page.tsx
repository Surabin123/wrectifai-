'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { formatCurrency } from '@/lib/currency';
import { apiClient } from '@/lib/api-client';

export default function InvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get('type');
  
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        // We use the new endpoint for orders, or default logic for bookings
        const endpoint = type === 'order' ? `/invoices/by-order/${id}` : `/invoices/by-order/${id}`; // Adjust as needed if booking has a different route
        const data = await apiClient.get<any>(endpoint);
        setInvoiceData(data);
      } catch (err: any) {
        console.error('Failed to fetch invoice:', err);
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoice();
  }, [id, type]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Invoice...</div>;
  }

  if (error || !invoiceData) {
    return <div className="p-8 text-center text-red-500 font-bold">{error || 'Invoice not found'}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 mt-8">
      <Card className="p-6 md:p-10 bg-white text-slate-800 shadow-lg border-slate-200">
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">INVOICE</h2>
            <p className="text-sm font-bold text-slate-500 mt-2">#{invoiceData.invoiceNumber || invoiceData.id}</p>
          </div>
          <div className="text-right">
            <p className="font-extrabold text-lg text-slate-800">{invoiceData.garageName || 'Garage'}</p>
            {invoiceData.garageAddress && <p className="text-sm text-slate-600 mt-1">{invoiceData.garageAddress}</p>}
            {invoiceData.garageCity && <p className="text-sm text-slate-600">{invoiceData.garageCity}</p>}
          </div>
        </div>
        
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
            <p className="font-bold text-slate-800 text-lg">{invoiceData.customerName || 'Customer'}</p>
            {invoiceData.customerPhone && <p className="text-sm text-slate-600 mt-1">{invoiceData.customerPhone}</p>}
          </div>
          {invoiceData.vehicleMake && (
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle</p>
              <p className="font-bold text-slate-800 text-lg">{invoiceData.vehicleMake} {invoiceData.vehicleModel}</p>
              {invoiceData.vehicleVin && <p className="text-sm text-slate-600 mt-1">VIN: {invoiceData.vehicleVin}</p>}
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100">
          <div className="flex justify-between mb-3 pb-3 border-b border-slate-200">
            <p className="font-bold text-slate-700">Description</p>
            <p className="font-bold text-slate-700">Amount</p>
          </div>
          
          <div className="flex justify-between py-2 items-center">
            <p className="text-slate-700 font-semibold">{invoiceData.serviceType || (type === 'order' ? 'Shop Order Parts' : 'Vehicle Service')}</p>
            <p className="font-bold text-slate-900">{formatCurrency(invoiceData.subtotal, invoiceData.currency || 'INR')}</p>
          </div>
          
          {/* Detailed Breakdown if available */}
          {invoiceData.items && invoiceData.items.length > 0 && (
            <div className="ml-4 mt-3 space-y-2 text-sm border-t border-slate-200 pt-3">
              {invoiceData.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-slate-600">
                  <span>{item.quantity}x {item.name || 'Item'}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity, invoiceData.currency || 'INR')}</span>
                </div>
              ))}
            </div>
          )}

          {Number(invoiceData.discountAmount) > 0 && (
            <div className="flex justify-between py-2 text-green-600 mt-2 border-t border-slate-200 pt-2">
              <p className="font-bold">Discount Applied</p>
              <p className="font-bold">- {formatCurrency(invoiceData.discountAmount, invoiceData.currency || 'INR')}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <div className="flex justify-between text-sm">
              <p className="text-slate-500 font-bold">Subtotal</p>
              <p className="font-bold text-slate-800">{formatCurrency(invoiceData.subtotal, invoiceData.currency || 'INR')}</p>
            </div>
            {Number(invoiceData.taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <p className="text-slate-500 font-bold">Tax</p>
                <p className="font-bold text-slate-800">{formatCurrency(invoiceData.taxAmount, invoiceData.currency || 'INR')}</p>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3">
              <p className="font-black text-slate-900 uppercase tracking-wider text-sm">Total</p>
              <p className="text-2xl font-black text-blue-700">{formatCurrency(invoiceData.totalAmount, invoiceData.currency || 'INR')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-200 pt-6 gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Status</p>
            <span className={`inline-block px-4 py-1.5 font-bold text-xs rounded-md uppercase tracking-wide ${
              invoiceData.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
            }`}>
              {invoiceData.paymentStatus || 'PENDING'}
            </span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              onClick={() => window.print()}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Print PDF
            </Button>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1 sm:flex-none bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-bold"
            >
              Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
