'use client';

import { CheckCircle2, X } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { formatCurrency } from '@/lib/currency';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number | string;
  paymentMethod: 'online' | 'cash' | 'wallet';
  transactionId?: string;
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  amount,
  paymentMethod,
  transactionId,
  title = 'Payment Successful!',
  description = 'Your payment has been successfully processed and verified.',
  primaryActionLabel = 'Continue',
  onPrimaryAction,
}: PaymentSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="relative flex flex-col items-center justify-center p-8 text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f7ee]">
          <CheckCircle2 className="h-10 w-10 text-[#159a5d]" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mb-8 text-sm text-slate-500 leading-relaxed">{description}</p>

        <div className="w-full space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Amount Paid</span>
            <span className="text-base font-bold text-slate-900">
              {typeof amount === 'number' ? formatCurrency(amount) : amount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Payment Method</span>
            <span className="text-sm font-semibold text-slate-700 capitalize">
              {paymentMethod === 'online' ? 'Online Payment' : paymentMethod === 'wallet' ? 'Wallet Payment' : 'Cash on Delivery'}
            </span>
          </div>
          {transactionId && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Transaction ID</span>
              <span className="text-xs font-mono font-medium text-slate-700">{transactionId}</span>
            </div>
          )}
        </div>

        <div className="w-full space-y-3">
          <Button
            onClick={() => {
              if (onPrimaryAction) {
                onPrimaryAction();
              } else {
                onClose();
              }
            }}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            {primaryActionLabel}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-12 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
