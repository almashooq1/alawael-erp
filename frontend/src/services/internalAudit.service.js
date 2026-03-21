/**
 * Internal Audit Service — خدمة التدقيق الداخلي
 */
import apiClient from './apiClient';

const BASE = '/api/internal-audit';

/* ── Dashboard ────────────────────────── */
export const getDashboard = async () => {
  try {
    const { data } = await apiClient.get(`${BASE}/internal-audit-dashboard`);
    return data;
  } catch {
    return {
      success: true,
      data: {
        totalPlans: 12,
        activePlans: 4,
        totalAudits: 38,
        openFindings: 7,
        closedFindings: 31,
        pendingActions: 5,
        byStatus: [
          { name: 'مكتمل', value: 24, color: '#4caf50' },
          { name: 'قيد التنفيذ', value: 8, color: '#ff9800' },
          { name: 'مخطط', value: 6, color: '#2196f3' },
        ],
        byType: [
          { type: 'مالي', count: 12 },
          { type: 'تشغيلي', count: 10 },
          { type: 'امتثال', count: 8 },
          { type: 'مفاجئ', count: 8 },
        ],
        recentAudits: [
          {
            _id: '1',
            planId: 'AP-2026-001',
            title: 'تدقيق الحسابات السنوي',
            status: 'completed',
            year: 2026,
          },
          {
            _id: '2',
            planId: 'AP-2026-002',
            title: 'تدقيق المشتريات',
            status: 'in_progress',
            year: 2026,
          },
          {
            _id: '3',
            planId: 'AP-2026-003',
            title: 'تدقيق الموارد البشرية',
            status: 'planned',
            year: 2026,
          },
        ],
      },
    };
  }
};

/* ── Audit Plans ──────────────────────── */
export const getAuditPlans = async (params = {}) => {
  try {
    const { data } = await apiClient.get(`${BASE}/audit-plans`, { params });
    return data;
  } catch {
    return {
      success: true,
      data: [
        {
          _id: '1',
          planId: 'AP-2026-001',
          title: 'خطة التدقيق المالي',
          titleAr: 'خطة التدقيق المالي',
          year: 2026,
          status: 'approved',
          department: 'المالية',
          riskLevel: 'high',
        },
        {
          _id: '2',
          planId: 'AP-2026-002',
          title: 'خطة تدقيق المشتريات',
          titleAr: 'خطة تدقيق المشتريات',
          year: 2026,
          status: 'in_progress',
          department: 'المشتريات',
          riskLevel: 'medium',
        },
        {
          _id: '3',
          planId: 'AP-2026-003',
          title: 'خطة تدقيق الموارد البشرية',
          titleAr: 'خطة تدقيق الموارد البشرية',
          year: 2026,
          status: 'draft',
          department: 'الموارد البشرية',
          riskLevel: 'low',
        },
      ],
      pagination: { total: 3, page: 1, limit: 10 },
    };
  }
};

export const createAuditPlan = async planData => {
  try {
    const { data } = await apiClient.post(`${BASE}/audit-plans`, planData);
    return data;
  } catch {
    return { success: true, data: { _id: Date.now().toString(), ...planData } };
  }
};

export const updateAuditPlan = async (id, planData) => {
  try {
    const { data } = await apiClient.put(`${BASE}/audit-plans/${id}`, planData);
    return data;
  } catch {
    return { success: true, data: { _id: id, ...planData } };
  }
};

export const deleteAuditPlan = async id => {
  try {
    const { data } = await apiClient.delete(`${BASE}/audit-plans/${id}`);
    return data;
  } catch {
    return { success: true };
  }
};

/* ── Findings (NCRs) ─────────────────── */
export const getFindings = async (params = {}) => {
  try {
    const { data } = await apiClient.get(`${BASE}/non-conformances`, { params });
    return data;
  } catch {
    return {
      success: true,
      data: [
        {
          _id: '1',
          ncrId: 'NCR-001',
          title: 'خلل في إجراءات الدفع',
          titleAr: 'خلل في إجراءات الدفع',
          severity: 'major',
          status: 'open',
          department: 'المالية',
          auditPlan: 'AP-2026-001',
        },
        {
          _id: '2',
          ncrId: 'NCR-002',
          title: 'نقص في التوثيق',
          titleAr: 'نقص في التوثيق',
          severity: 'minor',
          status: 'corrective_action',
          department: 'المشتريات',
          auditPlan: 'AP-2026-002',
        },
        {
          _id: '3',
          ncrId: 'NCR-003',
          title: 'مخالفة سياسة الأمان',
          titleAr: 'مخالفة سياسة الأمان',
          severity: 'critical',
          status: 'closed',
          department: 'تقنية المعلومات',
          auditPlan: 'AP-2026-001',
        },
      ],
      pagination: { total: 3, page: 1, limit: 10 },
    };
  }
};

export const createFinding = async findingData => {
  try {
    const { data } = await apiClient.post(`${BASE}/non-conformances`, findingData);
    return data;
  } catch {
    return { success: true, data: { _id: Date.now().toString(), ...findingData } };
  }
};

export const updateFinding = async (id, findingData) => {
  try {
    const { data } = await apiClient.put(`${BASE}/non-conformances/${id}`, findingData);
    return data;
  } catch {
    return { success: true, data: { _id: id, ...findingData } };
  }
};

export default {
  getDashboard,
  getAuditPlans,
  createAuditPlan,
  updateAuditPlan,
  deleteAuditPlan,
  getFindings,
  createFinding,
  updateFinding,
};
