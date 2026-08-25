'use client';
import { useState, useEffect } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { formatCurrency } from '@/lib/currency';
import { fetchWalletBalance } from '@/lib/wallet-api';
import { validateOfferCode } from '@/lib/offers-api';
import { apiClient } from '@/lib/api-client';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  bookingPayload: any; // The payload to send to createBooking
  onSubmit: (finalPayload: any) => Promise<{ razorpayOrderId?: string | null, status: string }>;
  onSuccess: () => void;
}

export function CheckoutModal({ isOpen, onClose, subtotal, bookingPayload, onSubmit, onSuccess }: CheckoutModalProps) {
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(true);
  const [offerCode, setOfferCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchWalletBalance().then(res => setWalletBalance(res.balance)).catch(console.error);
      
      // Load Razorpay SDK
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, [isOpen]);

  const handleApplyOffer = async () => {
    setOfferError('');
    setOfferSuccess('');
    if (!offerCode.trim()) return;

    try {
      const res = await validateOfferCode(offerCode, subtotal);
      if (res.valid) {
        setDiscount(res.discount);
        setOfferSuccess(`Offer applied! You saved ${formatCurrency(res.discount)}`);
      } else {
        setDiscount(0);
        setOfferError(res.message || 'Invalid offer code');
      }
    } catch (err: any) {
      setDiscount(0);
      setOfferError(err.message || 'Failed to validate offer');
    }
  };

  const finalAmountAfterDiscount = Math.max(0, subtotal - discount);
  const walletAmountToUse = useWallet ? Math.min(walletBalance, finalAmountAfterDiscount) : 0;
  const finalAmountToPay = finalAmountAfterDiscount - walletAmountToUse;

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      const finalPayload = {
        ...bookingPayload,
        offerCode: discount > 0 ? offerCode : undefined,
        walletAmountToUse
      };

      const result = await onSubmit(finalPayload);

      if (result.razorpayOrderId && finalAmountToPay > 0) {
        // Open Razorpay Popup
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock123',
          amount: Math.round(finalAmountToPay * 100),
          currency: 'INR',
          name: 'WrectifAI Services',
          description: 'Payment for Booking',
          order_id: result.razorpayOrderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await apiClient.post<{verified: boolean}>('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              if (verifyRes.verified) {
                onSuccess();
              } else {
                setOfferError('Payment verification failed.');
                setIsProcessing(false);
              }
            } catch (err) {
              setOfferError('Payment verification failed. Please contact support.');
              setIsProcessing(false);
            }
          },
          prefill: {
            name: 'Customer',
            email: 'customer@wrectifai.com',
            contact: '9999999999'
          },
          theme: {
            color: '#2563EB'
          },
          modal: {
            ondismiss: function() {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          console.error(response.error);
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        // Fully paid via wallet or free
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Your Payment" className="max-w-md">
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-600">Offer Discount</span>
            <span className="font-bold text-green-600">-{formatCurrency(discount)}</span>
          </div>

          {walletBalance > 0 && (
            <div className="flex justify-between items-center py-2 border-t border-slate-200 mt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-slate-700 font-medium">Use Wallet Balance ({formatCurrency(walletBalance)})</span>
              </label>
              <span className="font-bold text-slate-800">-{formatCurrency(walletAmountToUse)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-slate-900 font-bold text-base">Final Amount</span>
            <span className="font-bold text-blue-700 text-lg">{formatCurrency(finalAmountToPay)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Have a promo code?</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={offerCode} 
              onChange={(e) => setOfferCode(e.target.value)} 
              placeholder="Enter code" 
              className="flex-1 p-2 border rounded"
            />
            <Button variant="outline" onClick={handleApplyOffer}>Apply</Button>
          </div>
          {offerError && <p className="text-red-500 text-xs mt-1">{offerError}</p>}
          {offerSuccess && <p className="text-green-600 text-xs mt-1">{offerSuccess}</p>}
        </div>

        <Button 
          className="w-full bg-[#1a56db] hover:bg-blue-700 text-white font-bold py-3"
          onClick={handlePay}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : finalAmountToPay > 0 ? `Pay ${formatCurrency(finalAmountToPay)} with Razorpay` : 'Confirm Booking'}
        </Button>
      </div>
    </Modal>
  );
}
