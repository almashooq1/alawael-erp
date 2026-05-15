/**
 * nationalAddress.ts — typed client for the Saudi National Address
 * (وَصِل / SPL) verification endpoints exposed at
 * /api/v1/wasel/address/*.
 *
 * Backend reference: backend/routes/wasel-address.routes.js.
 *
 * Usage:
 *   import { nationalAddress } from '@/services/modules';
 *   const r = await nationalAddress.verifyAndStamp({ shortCode: 'RFYA1234' });
 *   if (r.verified) form.nationalAddress = r.address;
 */

import api from '../ApiService';

export type NationalAddressVerificationStatus = 'unverified' | 'match' | 'not_found' | 'invalid_format' | 'unknown';

export interface NationalAddressVerification {
  verified: boolean;
  status?: NationalAddressVerificationStatus;
  mode?: 'mock' | 'live';
  verifiedAt?: string;
  verifiedBy?: string;
  message?: string;
}

export interface NationalAddress {
  shortCode?: string;
  buildingNumber?: string;
  additionalNumber?: string;
  postalCode?: string;
  street?: string;
  district?: string;
  city?: string;
  region?: string;
  country?: string;
  fullAddress?: string;
  geo?: { lat?: number; lng?: number };
  isDeliverable?: boolean;
  verification?: NationalAddressVerification;
}

export interface VerifyAndStampResponse {
  success: boolean;
  verified: boolean;
  address: NationalAddress;
}

export interface SearchByIdResponse {
  success: boolean;
  status: string;
  addresses: NationalAddress[];
}

async function verifyAndStamp(payload: { shortCode: string; nationalId?: string }): Promise<VerifyAndStampResponse> {
  const res = await api.post('/api/v1/wasel/address/verify-and-stamp', payload);
  return (res && (res.data || res)) as VerifyAndStampResponse;
}

async function searchByNationalId(nationalId: string): Promise<SearchByIdResponse> {
  const res = await api.post('/api/v1/wasel/address/search-by-id', { nationalId });
  return (res && (res.data || res)) as SearchByIdResponse;
}

const nationalAddress = { verifyAndStamp, searchByNationalId };
export default nationalAddress;
