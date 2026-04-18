/**
 * therapistWorkbench.ts — typed client for /api/therapist-workbench/*.
 */

import api from '../ApiService';
import type { SessionStatus } from './parentPortal';

export interface MyEmployee {
  _id: string;
  firstName?: string;
  firstName_ar?: string;
  lastName?: string;
  lastName_ar?: string;
  email: string;
  scfhs_number?: string;
  scfhs_classification?: string;
  status: string;
}

export interface WorkbenchSession {
  _id: string;
  title?: string;
  sessionType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: SessionStatus;
  beneficiary?: { _id: string; firstName_ar?: string; lastName_ar?: string; beneficiaryNumber?: string };
  room?: { name?: string };
  attendance?: { isPresent?: boolean; arrivalTime?: string; lateMinutes?: number };
  notes?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
  rating?: number;
}

export interface CaseloadRow {
  beneficiary: {
    _id: string;
    firstName_ar?: string;
    lastName_ar?: string;
    beneficiaryNumber?: string;
    status?: string;
    disability?: { primaryType?: string };
  } | null;
  sessionCount: number;
  completed: number;
  upcoming: number;
  lastSession?: string;
}

const WB = '/therapist-workbench';

export const therapistWorkbench = {
  async me() {
    const res = await api.get<{ success: boolean; data: MyEmployee }>(`${WB}/me`);
    return res.data;
  },

  async today() {
    const res = await api.get<{
      success: boolean;
      items: WorkbenchSession[];
      totals: { total: number; completed: number; inProgress: number; upcoming: number };
    }>(`${WB}/today`);
    return { items: res.items || [], totals: res.totals || {} };
  },

  async week() {
    const res = await api.get<{
      success: boolean;
      items: WorkbenchSession[];
      grouped: Record<string, WorkbenchSession[]>;
      weekStart: string;
      weekEnd: string;
    }>(`${WB}/week`);
    return res;
  },

  async caseload() {
    const res = await api.get<{ success: boolean; items: CaseloadRow[]; total: number }>(
      `${WB}/caseload`
    );
    return res.items || [];
  },

  async session(id: string) {
    const res = await api.get<{ success: boolean; data: WorkbenchSession }>(`${WB}/session/${id}`);
    return res.data;
  },

  async checkIn(id: string, arrivalTime?: string, lateMinutes = 0) {
    const res = await api.post<{ success: boolean; data: WorkbenchSession }>(
      `${WB}/session/${id}/check-in`,
      { arrivalTime, lateMinutes }
    );
    return res.data;
  },

  async saveNotes(
    id: string,
    payload: {
      notes?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
      rating?: number;
      goalsProgress?: Array<{ goalId: string; achieved: number; notes?: string }>;
    }
  ) {
    const res = await api.post<{ success: boolean; data: WorkbenchSession }>(
      `${WB}/session/${id}/notes`,
      payload
    );
    return res.data;
  },

  async complete(
    id: string,
    payload: {
      notes?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
      rating?: number;
      goalsProgress?: Array<{ goalId: string; achieved: number; notes?: string }>;
      departureTime?: string;
    }
  ) {
    const res = await api.post<{ success: boolean; data: WorkbenchSession }>(
      `${WB}/session/${id}/complete`,
      payload
    );
    return res.data;
  },
};

export default therapistWorkbench;
