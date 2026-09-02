import { apiClient } from './api-client';

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description?: string;
  createdAt: string;
}

export async function fetchWalletBalance(): Promise<{ balance: number; main: number; bonus: number; pendingRefunds: number }> {
  return apiClient.get<{ balance: number; main: number; bonus: number; pendingRefunds: number }>('/wallet/balance');
}

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  return apiClient.get<WalletTransaction[]>('/wallet/transactions');
}

export async function addWalletFunds(amount: number, method: string): Promise<{ razorpayOrderId: string; amount: number; currency: string }> {
  return apiClient.post<{ razorpayOrderId: string; amount: number; currency: string }>('/wallet/add-funds', { amount, method });
}

export async function verifyWalletTopup(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount: number;
}): Promise<{ verified: boolean; balance: number }> {
  try {
    const response = await apiClient.post<{ verified: boolean; balance: number }>('/wallet/verify-topup', data);
    const result = await (response as any).json();
    return result.data;
  } catch (error) {
    console.error('Failed to verify topup:', error);
    throw error;
  }
}

export async function fetchSavedPaymentMethods() {
  return apiClient.get<any[]>('/wallet/saved-methods');
}

export async function addSavedPaymentMethod(cardDetails: { tokenId: string, cardNetwork: string, cardLast4: string, cardIssuer: string }) {
  return apiClient.post<any>('/wallet/saved-methods', cardDetails);
}

export async function removeSavedPaymentMethod(id: string) {
  return apiClient.delete<{ deleted: boolean }>(`/wallet/saved-methods/${id}`);
}

export async function setSavedPaymentMethodDefault(id: string) {
  return apiClient.put<{ success: boolean }>(`/wallet/saved-methods/${id}/default`, {});
}
