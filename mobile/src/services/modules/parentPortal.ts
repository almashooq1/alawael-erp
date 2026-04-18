/**
 * parentPortal.ts — typed client for /api/parent-v2/* endpoints.
 *
 * Matches the backend surface in backend/routes/parent-portal-v2.routes.js.
 * All methods return the unwrapped `data` payload — error handling is
 * delegated to ApiService's interceptors (401/refresh/offline queue).
 */

import api from '../ApiService';

export type SessionStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_PATIENT'
  | 'CANCELLED_BY_CENTER'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type GoalStatus = 'PENDING' | 'IN_PROGRESS' | 'ACHIEVED' | 'DISCONTINUED';
export type AssessmentInterpretation =
  | 'within_normal'
  | 'borderline'
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'profound'
  | 'not_applicable';

export interface Guardian {
  _id: string;
  firstName_ar?: string;
  firstName_en?: string;
  lastName_ar?: string;
  lastName_en?: string;
  email: string;
  phone?: string;
  accountStatus: string;
}

export interface ChildSummary {
  _id: string;
  firstName?: string;
  firstName_ar?: string;
  lastName?: string;
  lastName_ar?: string;
  beneficiaryNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  status?: string;
  disability?: { primaryType?: string };
  contact?: { primaryPhone?: string };
  enrollmentDate?: string;
  profilePhoto?: string;
}

export interface ChildOverview {
  child: ChildSummary;
  summary: {
    sessionsTotal: number;
    sessionsUpcomingWeek: number;
    activeCarePlans: number;
    totalAssessments: number;
    lastAssessment?: {
      tool: string;
      score?: number;
      assessmentDate: string;
      interpretation?: AssessmentInterpretation;
    };
  };
}

export interface TherapySessionSummary {
  _id: string;
  title?: string;
  sessionType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: SessionStatus;
  therapist?: { firstName?: string; firstName_ar?: string; lastName?: string; lastName_ar?: string };
  room?: { name?: string };
  attendance?: { isPresent?: boolean; lateMinutes?: number };
  notes?: { assessment?: string };
}

export interface CarePlanGoal {
  section: 'educational' | 'therapeutic' | 'lifeSkills';
  domain: string;
  title: string;
  type?: string;
  status: GoalStatus;
  progress: number;
  target?: string;
  criteria?: string;
  targetDate?: string;
}

export interface CarePlanSnapshot {
  planNumber: string;
  startDate: string;
  reviewDate?: string;
  status: string;
  sections: {
    educational: boolean;
    therapeutic: boolean;
    lifeSkills: boolean;
  };
  goals: CarePlanGoal[];
  totalGoals: number;
  achievedGoals: number;
}

export interface AssessmentSummary {
  _id: string;
  tool: string;
  toolVersion?: string;
  category?: string;
  assessmentDate: string;
  score?: number;
  rawScore?: number;
  maxRawScore?: number;
  interpretation?: AssessmentInterpretation;
  scoreChange?: number;
  improvement?: boolean;
  observations?: string;
  strengths?: string[];
  concerns?: string[];
  recommendations?: string[];
}

export interface AttendanceStats {
  windowDays: number;
  stats: {
    total: number;
    completed: number;
    noShow: number;
    cancelled: number;
    late: number;
    attendanceRate: number | null;
  };
}

const PARENT = '/parent-v2';

export const parentPortal = {
  async me() {
    const res = await api.get<{ success: boolean; data: Guardian }>(`${PARENT}/me`);
    return res.data;
  },

  async myChildren() {
    const res = await api.get<{ success: boolean; items: ChildSummary[] }>(`${PARENT}/children`);
    return res.items || [];
  },

  async childOverview(childId: string) {
    const res = await api.get<{ success: boolean } & ChildOverview>(
      `${PARENT}/children/${childId}/overview`
    );
    return res as ChildOverview;
  },

  async childSessions(childId: string, scope: 'upcoming' | 'past' | 'all' = 'all', limit = 50) {
    const res = await api.get<{ success: boolean; items: TherapySessionSummary[] }>(
      `${PARENT}/children/${childId}/sessions`,
      { scope, limit }
    );
    return res.items || [];
  },

  async childCarePlan(childId: string): Promise<CarePlanSnapshot | null> {
    const res = await api.get<{ success: boolean; data: CarePlanSnapshot | null }>(
      `${PARENT}/children/${childId}/care-plan`
    );
    return res.data;
  },

  async childAssessments(childId: string) {
    const res = await api.get<{
      success: boolean;
      items: AssessmentSummary[];
      byTool: Record<string, Array<{ date: string; score?: number; interpretation?: string }>>;
    }>(`${PARENT}/children/${childId}/assessments`);
    return { items: res.items || [], byTool: res.byTool || {} };
  },

  async childAttendance(childId: string) {
    const res = await api.get<{ success: boolean } & AttendanceStats>(
      `${PARENT}/children/${childId}/attendance`
    );
    return res as AttendanceStats;
  },
};

export default parentPortal;
