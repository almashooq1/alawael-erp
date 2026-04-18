/**
 * nafath.ts — typed client for /api/auth/nafath/*.
 *
 * Flow:
 *   1. initiate({ nationalId }) → receive requestId + randomNumber
 *   2. Display randomNumber to user; they pick it in Nafath app
 *   3. Poll pollStatus(requestId) until status !== 'PENDING'
 *   4. On APPROVED, persist data.token via SecureStore and navigate.
 */

import api from '../ApiService';

export type NafathStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'ERROR';

export interface NafathInitResponse {
  success: boolean;
  requestId: string;
  transactionId: string;
  randomNumber: string;
  expiresAt: string;
  mode: 'mock' | 'live';
  message?: string;
}

export interface NafathStatusResponse {
  success: boolean;
  status: NafathStatus;
  requestId: string;
  attributes?: {
    fullName?: string;
    firstName_ar?: string;
    lastName_ar?: string;
    dateOfBirth?: string;
    phone?: string;
    email?: string;
  };
  token?: string;
  user?: { id: string; email: string; role: string; name?: string };
  needsOnboarding?: boolean;
  message?: string;
}

const N = '/auth/nafath';

export const nafath = {
  async initiate(nationalId: string, purpose: 'login' | 'register_guardian' | 'e_sign' | 'consent' = 'login') {
    return api.post<NafathInitResponse>(`${N}/initiate`, { nationalId, purpose });
  },

  async pollStatus(requestId: string) {
    return api.get<NafathStatusResponse>(`${N}/status/${requestId}`);
  },

  async cancel(requestId: string) {
    return api.post<{ success: boolean; status: NafathStatus }>(`${N}/cancel/${requestId}`, {});
  },
};

export default nafath;
