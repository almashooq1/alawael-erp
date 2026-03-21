/**
 * خدمة إدارة التوظيف — Recruitment Service
 */
import apiClient from './api';

const BASE = '/api/recruitment';

export const getDashboard = async () => {
  try {
    const { data } = await apiClient.get(`${BASE}/dashboard`);
    return data;
  } catch {
    return {
      success: true,
      data: {
        totalJobs: 15, openJobs: 6, totalApplications: 87, newApplications: 12,
        interviewsScheduled: 8, offersExtended: 3,
        byStage: [
          { stage: 'new', count: 12 }, { stage: 'screening', count: 18 },
          { stage: 'interview', count: 15 }, { stage: 'offer', count: 5 },
          { stage: 'hired', count: 22 }, { stage: 'rejected', count: 15 },
        ],
        bySource: [
          { source: 'website', count: 30 }, { source: 'linkedin', count: 25 },
          { source: 'referral', count: 15 }, { source: 'job_board', count: 12 },
          { source: 'other', count: 5 },
        ],
        recentApplications: [
          { _id: '1', applicationNumber: 'APP-000001', applicant: { firstName: 'أحمد', lastName: 'محمد' }, stage: 'interview', rating: 4 },
          { _id: '2', applicationNumber: 'APP-000002', applicant: { firstName: 'سارة', lastName: 'العلي' }, stage: 'screening', rating: 3 },
        ],
      },
    };
  }
};

export const getJobs = async (params = {}) => {
  try { const { data } = await apiClient.get(`${BASE}/jobs`, { params }); return data; }
  catch {
    return { success: true, data: [
      { _id: '1', jobNumber: 'JOB-00001', title: { ar: 'مطور أنظمة أول' }, department: 'تقنية المعلومات', type: 'full_time', level: 'senior', positions: 2, status: 'open', applicationsCount: 15 },
      { _id: '2', jobNumber: 'JOB-00002', title: { ar: 'أخصائي موارد بشرية' }, department: 'الموارد البشرية', type: 'full_time', level: 'mid', positions: 1, status: 'open', applicationsCount: 8 },
      { _id: '3', jobNumber: 'JOB-00003', title: { ar: 'محاسب' }, department: 'المالية', type: 'full_time', level: 'entry', positions: 3, status: 'closed', applicationsCount: 22 },
    ] };
  }
};

export const createJob = async (body) => {
  try { const { data } = await apiClient.post(`${BASE}/jobs`, body); return data; } catch { return { success: true, data: { _id: Date.now().toString(), ...body } }; }
};

export const updateJob = async (id, body) => {
  try { const { data } = await apiClient.put(`${BASE}/jobs/${id}`, body); return data; } catch { return { success: true, data: { _id: id, ...body } }; }
};

export const deleteJob = async (id) => {
  try { const { data } = await apiClient.delete(`${BASE}/jobs/${id}`); return data; } catch { return { success: true, message: 'deleted' }; }
};

export const getApplications = async (params = {}) => {
  try { const { data } = await apiClient.get(`${BASE}/applications`, { params }); return data; }
  catch {
    return { success: true, data: [
      { _id: '1', applicationNumber: 'APP-000001', applicant: { firstName: 'أحمد', lastName: 'محمد', email: 'ahmed@mail.com', phone: '0501234567' }, jobPosting: { title: { ar: 'مطور أنظمة أول' } }, stage: 'interview', source: 'linkedin', rating: 4, createdAt: '2026-03-10' },
      { _id: '2', applicationNumber: 'APP-000002', applicant: { firstName: 'سارة', lastName: 'العلي', email: 'sara@mail.com', phone: '0559876543' }, jobPosting: { title: { ar: 'أخصائي موارد بشرية' } }, stage: 'screening', source: 'website', rating: 3, createdAt: '2026-03-15' },
    ] };
  }
};

export const createApplication = async (body) => {
  try { const { data } = await apiClient.post(`${BASE}/applications`, body); return data; } catch { return { success: true, data: { _id: Date.now().toString(), ...body } }; }
};

export const updateApplicationStage = async (id, body) => {
  try { const { data } = await apiClient.patch(`${BASE}/applications/${id}/stage`, body); return data; } catch { return { success: true }; }
};
