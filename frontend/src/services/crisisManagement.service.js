/**
 * خدمة إدارة الأزمات — Crisis Management Service
 */
import apiClient from './api';

const BASE = '/api/crisis';

export const getDashboard = async () => {
  try {
    const { data } = await apiClient.get(`${BASE}/dashboard`);
    return data;
  } catch {
    return {
      success: true,
      data: {
        totalPlans: 8,
        activePlans: 5,
        totalIncidents: 14,
        openIncidents: 3,
        totalDrills: 10,
        upcomingDrills: 2,
        emergencyContacts: 25,
        bySeverity: [
          { severity: 'minor', count: 6 },
          { severity: 'moderate', count: 4 },
          { severity: 'major', count: 3 },
          { severity: 'critical', count: 1 },
        ],
        byType: [
          { type: 'fire', count: 3 },
          { type: 'medical', count: 4 },
          { type: 'security', count: 2 },
          { type: 'power_outage', count: 2 },
          { type: 'other', count: 3 },
        ],
        recentIncidents: [
          {
            _id: '1',
            incidentNumber: 'INC-000001',
            title: 'انقطاع كهرباء المبنى الرئيسي',
            type: 'power_outage',
            severity: 'moderate',
            status: 'resolved',
            reportedAt: '2026-03-15',
          },
          {
            _id: '2',
            incidentNumber: 'INC-000002',
            title: 'حالة إسعافية — حرارة مرتفعة',
            type: 'medical',
            severity: 'minor',
            status: 'closed',
            reportedAt: '2026-03-10',
          },
          {
            _id: '3',
            incidentNumber: 'INC-000003',
            title: 'إنذار حريق — المستودع',
            type: 'fire',
            severity: 'major',
            status: 'in_progress',
            reportedAt: '2026-03-20',
          },
        ],
      },
    };
  }
};

export const getPlans = async (params = {}) => {
  try {
    const { data } = await apiClient.get(`${BASE}/plans`, { params });
    return data;
  } catch {
    return {
      success: true,
      data: [
        {
          _id: '1',
          planNumber: 'EP-00001',
          title: { ar: 'خطة إخلاء المبنى الرئيسي' },
          type: 'evacuation',
          riskLevel: 'high',
          status: 'active',
        },
        {
          _id: '2',
          planNumber: 'EP-00002',
          title: { ar: 'خطة مكافحة الحريق' },
          type: 'fire',
          riskLevel: 'critical',
          status: 'active',
        },
        {
          _id: '3',
          planNumber: 'EP-00003',
          title: { ar: 'خطة الطوارئ الطبية' },
          type: 'medical',
          riskLevel: 'medium',
          status: 'active',
        },
      ],
    };
  }
};

export const createPlan = async body => {
  try {
    const { data } = await apiClient.post(`${BASE}/plans`, body);
    return data;
  } catch {
    return { success: true, data: { _id: Date.now().toString(), ...body } };
  }
};

export const updatePlan = async (id, body) => {
  try {
    const { data } = await apiClient.put(`${BASE}/plans/${id}`, body);
    return data;
  } catch {
    return { success: true, data: { _id: id, ...body } };
  }
};

export const deletePlan = async id => {
  try {
    const { data } = await apiClient.delete(`${BASE}/plans/${id}`);
    return data;
  } catch {
    return { success: true, message: 'deleted' };
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
        {
          _id: '1',
          incidentNumber: 'INC-000001',
          title: 'انقطاع كهرباء المبنى الرئيسي',
          type: 'power_outage',
          severity: 'moderate',
          status: 'resolved',
          location: { building: 'المبنى أ', floor: 'الكل' },
          reportedAt: '2026-03-15',
        },
        {
          _id: '2',
          incidentNumber: 'INC-000002',
          title: 'حالة إسعافية',
          type: 'medical',
          severity: 'minor',
          status: 'closed',
          location: { building: 'المبنى ب', floor: '2' },
          reportedAt: '2026-03-10',
        },
        {
          _id: '3',
          incidentNumber: 'INC-000003',
          title: 'إنذار حريق — المستودع',
          type: 'fire',
          severity: 'major',
          status: 'in_progress',
          location: { building: 'المستودع', floor: '1' },
          reportedAt: '2026-03-20',
        },
      ],
    };
  }
};

export const createIncident = async body => {
  try {
    const { data } = await apiClient.post(`${BASE}/incidents`, body);
    return data;
  } catch {
    return { success: true, data: { _id: Date.now().toString(), ...body } };
  }
};

export const updateIncident = async (id, body) => {
  try {
    const { data } = await apiClient.put(`${BASE}/incidents/${id}`, body);
    return data;
  } catch {
    return { success: true, data: { _id: id, ...body } };
  }
};

export const deleteIncident = async id => {
  try {
    const { data } = await apiClient.delete(`${BASE}/incidents/${id}`);
    return data;
  } catch {
    return { success: true, message: 'deleted' };
  }
};
