import { apiClient } from './api-client';

export interface OfferValidationResult {
  valid: boolean;
  offerId?: string;
  discount: number;
  message: string;
}

export async function validateOfferCode(code: string, subtotal: number): Promise<OfferValidationResult> {
  return apiClient.post<OfferValidationResult>('/offers/validate', { code, subtotal });
}
