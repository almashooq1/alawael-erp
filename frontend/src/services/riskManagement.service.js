/**
 * Risk Management Service — خدمة إدارة المخاطر المؤسسية
 */
import apiClient from './api';

export const getRiskDashboard = async () => {
  try {
    const { data } = await apiClient.get('/api/enterprise-risk/dashboard');
    return data.data;
  } catch {
    return {
      summary: { totalRisks: 34, criticalRisks: 5, mitigating: 8, totalAssessments: 12 },
      risksByCategory: [
        { category: 'operational', count: 10 },
        { category: 'financial', count: 7 },
        { category: 'strategic', count: 5 },
        { category: 'compliance', count: 4 },
        { category: 'technology', count: 4 },
        { category: 'reputational', count: 2 },
        { category: 'safety', count: 2 },
      ],
      risksByStatus: [
        { status: 'identified', count: 8 },
        { status: 'assessed', count: 6 },
        { status: 'mitigating', count: 8 },
        { status: 'monitoring', count: 5 },
        { status: 'resolved', count: 4 },
        { status: 'accepted', count: 3 },
      ],
      risksByPriority: [
        { priority: 'critical', count: 5 },
        { priority: 'high', count: 9 },
        { priority: 'medium', count: 12 },
        { priority: 'low', count: 8 },
      ],
      topRisks: [],
    };
  }
};

export const getRisks = async params => {
  try {
    const { data } = await apiClient.get('/api/enterprise-risk/risks', { params });
    return data.data;
  } catch {
    return [];
  }
};
export const createRisk = async body => {
  const { data } = await apiClient.post('/api/enterprise-risk/risks', body);
  return data.data;
};
export const updateRisk = async (id, body) => {
  const { data } = await apiClient.put(`/api/enterprise-risk/risks/${id}`, body);
  return data.data;
};
export const deleteRisk = async id => {
  const { data } = await apiClient.delete(`/api/enterprise-risk/risks/${id}`);
  return data.data;
};
export const addMitigation = async (riskId, body) => {
  const { data } = await apiClient.post(`/api/enterprise-risk/risks/${riskId}/mitigations`, body);
  return data.data;
};

export const getAssessments = async () => {
  try {
    const { data } = await apiClient.get('/api/enterprise-risk/assessments');
    return data.data;
  } catch {
    return [];
  }
};
export const createAssessment = async body => {
  const { data } = await apiClient.post('/api/enterprise-risk/assessments', body);
  return data.data;
};
export const updateAssessment = async (id, body) => {
  const { data } = await apiClient.put(`/api/enterprise-risk/assessments/${id}`, body);
  return data.data;
};
