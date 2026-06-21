/**
 * assessments.ts — typed client for disability/rehab assessment endpoints.
 */

import api from '../ApiService';

export interface ScaleSummary {
  key: string;
  name: string;
  nameEn?: string;
  maxScore?: number;
  domainsCount?: number;
}

export interface ScaleDefinition {
  id: string;
  name: string;
  nameEn?: string;
  maxScore: number;
  minScore?: number;
  domains: { key: string; name: string; nameEn?: string; maxScore: number }[];
  interpretation?: { min: number; max: number; label: string; level: string; color?: string }[];
}

export interface AssessmentResult {
  _id?: string;
  beneficiaryId: string;
  scaleId: string;
  scaleName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  level?: string;
  levelColor?: string;
  date: string;
}

export const assessments = {
  async listAvailableScales(): Promise<ScaleSummary[]> {
    const res = await api.get('/api/v1/disability/assessment/scales');
    const payload = res?.data || res;
    return payload?.data || payload || [];
  },

  async getScaleDetails(scaleKey: string): Promise<ScaleDefinition | null> {
    const res = await api.get(`/api/v1/disability/assessment/scales/${scaleKey}`);
    const payload = res?.data || res;
    return payload?.data || payload || null;
  },

  async listScaleResults(filters: { beneficiaryId?: string; scaleId?: string } = {}): Promise<AssessmentResult[]> {
    const res = await api.get('/api/v1/disability/assessment/scale-results', { params: filters });
    const payload = res?.data || res;
    return payload?.data || payload || [];
  },

  async submitScaleResult(payload: Partial<AssessmentResult> & { domainScores: Record<string, number> }) {
    return api.post('/api/v1/disability/assessment/scale-results', payload);
  },
};

export default assessments;
