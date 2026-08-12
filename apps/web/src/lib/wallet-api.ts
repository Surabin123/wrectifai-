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

export async function fetchWalletBalance(): Promise<{ balance: number }> {
  return apiClient.get<{ balance: number }>('/wallet/balance');
}

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  return apiClient.get<WalletTransaction[]>('/wallet/transactions');
}

export async function addWalletFunds(amount: number, method: string): Promise<{ balance: number }> {
  return apiClient.post<{ balance: number }>('/wallet/add-funds', { amount, method });
}
