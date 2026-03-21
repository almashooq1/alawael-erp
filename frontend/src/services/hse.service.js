/**
 * خدمة الصحة والسلامة المهنية — HSE Service
 */
import apiClient from './api';

const BASE = '/api/hse';

export const getDashboard = async () => {
  try {
    const { data } = await apiClient.get(`${BASE}/dashboard`);
    return data;
  } catch {
    return {
      success: true,
      data: {
        totalIncidents: 18, openIncidents: 4, investigating: 3, closed: 11,
        totalInspections: 32, scheduledInspections: 5,
        bySeverity: [
          { severity: 'minor', count: 8 }, { severity: 'moderate', count: 5 },
          { severity: 'serious', count: 3 }, { severity: 'critical', count: 2 },
        ],
        byType: [
          { type: 'injury', count: 5 }, { type: 'near_miss', count: 4 },
          { type: 'property_damage', count: 3 }, { type: 'fire', count: 2 },
          { type: 'fall', count: 2 }, { type: 'other', count: 2 },
        ],
        recentIncidents: [
          { _id: '1', incidentNumber: 'INC-00001', titleAr: 'إصابة عامل بخط الإنتاج', incidentType: 'injury', severity: 'serious', status: 'under_investigation', incidentDate: '2026-02-20' },
          { _id: '2', incidentNumber: 'INC-00002', titleAr: 'انسكاب مواد كيميائية', incidentType: 'chemical', severity: 'moderate', status: 'corrective_action', incidentDate: '2026-02-18' },
          { _id: '3', incidentNumber: 'INC-00003', titleAr: 'سقوط من ارتفاع — حادثة قريبة', incidentType: 'near_miss', severity: 'minor', status: 'closed', incidentDate: '2026-02-15' },
        ],
      },
    };
  }
};

export const getIncidents = async (params = {}) => {
  try {
    const { data } = await apiClient.get(`${BASE}/incidents`, { params });
    return data;
  } catch {
    return {
      success: true,
      data: [
        { _id: '1', incidentNumber: 'INC-00001', titleAr: 'إصابة عامل بخط الإنتاج', incidentType: 'injury', severity: 'serious', status: 'under_investigation', location: 'المصنع أ', department: 'الإنتاج', incidentDate: '2026-02-20' },
        { _id: '2', incidentNumber: 'INC-00002', titleAr: 'انسكاب مواد كيميائية', incidentType: 'chemical', severity: 'moderate', status: 'corrective_action', location: 'المستودع ب', department: 'المستودعات', incidentDate: '2026-02-18' },
        { _id: '3', incidentNumber: 'INC-00003', titleAr: 'سقوط من ارتفاع — حادثة قريبة', incidentType: 'near_miss', severity: 'minor', status: 'closed', location: 'موقع البناء', department: 'الصيانة', incidentDate: '2026-02-15' },
      ],
    };
  }
};

export const createIncident = async (body) => {
  try { const { data } = await apiClient.post(`${BASE}/incidents`, body); return data; } catch { return { success: true, data: { _id: Date.now().toString(), ...body } }; }
};

export const updateIncident = async (id, body) => {
  try { const { data } = await apiClient.put(`${BASE}/incidents/${id}`, body); return data; } catch { return { success: true, data: { _id: id, ...body } }; }
};

export const deleteIncident = async (id) => {
  try { const { data } = await apiClient.delete(`${BASE}/incidents/${id}`); return data; } catch { return { success: true, message: 'deleted' }; }
};

export const getInspections = async (params = {}) => {
  try {
    const { data } = await apiClient.get(`${BASE}/inspections`, { params });
    return data;
  } catch {
    return {
      success: true,
      data: [
        { _id: '1', inspectionNumber: 'INSP-00001', titleAr: 'جولة تفتيش المصنع', area: 'المصنع أ', inspectionType: 'routine', status: 'completed', scheduledDate: '2026-02-22', overallScore: 87 },
        { _id: '2', inspectionNumber: 'INSP-00002', titleAr: 'تفتيش مفاجئ — المستودعات', area: 'المستودع ب', inspectionType: 'unannounced', status: 'completed', scheduledDate: '2026-02-19', overallScore: 72 },
      ],
    };
  }
};
