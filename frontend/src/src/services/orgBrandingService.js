import api from '../utils/api';

const orgBrandingService = {
  // جلب الهوية المؤسسية من السيرفر
  async fetch(orgId) {
    const res = await api.get(`/org-branding/${orgId}`);
    return res.data;
  },
  // تحديث الهوية المؤسسية (يتطلب صلاحية مسؤول)
  async update(orgId, data) {
    const res = await api.post(`/org-branding/${orgId}`, data);
    return res.data;
  },
};

export default orgBrandingService;
