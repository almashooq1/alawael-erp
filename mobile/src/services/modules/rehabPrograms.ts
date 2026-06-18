/**
 * rehabPrograms.ts — typed client for rehab program + metrics endpoints.
 */

import api from '../ApiService';

export interface RehabProgram {
  _id: string;
  name?: string;
  name_en?: string;
  name_ar?: string;
  program_type?: string;
  status?: string;
  targetDisabilities?: string[];
  max_participants?: number;
}

export interface ProgramEnrollment {
  _id: string;
  beneficiary_id: string;
  program_id: string;
  status: string;
  enrollment_date?: string;
}

export const rehabPrograms = {
  async listPrograms(params: { branchId?: string; status?: string } = {}): Promise<RehabProgram[]> {
    const res = await api.get('/api/v1/programs', { params });
    const payload = res?.data || res;
    return payload?.data || payload || [];
  },

  async listEnrollments(params: { beneficiaryId?: string; programId?: string } = {}): Promise<ProgramEnrollment[]> {
    const res = await api.get('/api/v1/disability-rehab/programs/enrollments', { params });
    const payload = res?.data || res;
    return payload?.data || payload || [];
  },

  async getDashboardStats(branchId?: string): Promise<Record<string, unknown>> {
    const res = await api.get('/api/v1/dashboard/stats', { params: branchId ? { branchId } : undefined });
    const payload = res?.data || res;
    return payload?.data || payload || {};
  },

  async getKpiDashboard(branchId?: string, dashboardId = 'clinical'): Promise<Record<string, unknown>> {
    const res = await api.get(`/api/v1/dashboards/${dashboardId}`, {
      params: branchId ? { branch: branchId } : undefined,
    });
    const payload = res?.data || res;
    return payload?.data || payload || {};
  },
};

export default rehabPrograms;
