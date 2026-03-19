import api from './api.client';

const orgBrandingService = {
  // جلب الهوية المؤسسية من السيرفر
  async fetch(orgId) {
    return api.get(`/org-branding/${orgId}`);
  },
  // تحديث الهوية المؤسسية (يتطلب صلاحية مسؤول)
  async update(orgId, data) {
    return api.post(`/org-branding/${orgId}`, data);
  },
  // رفع شعار جديد
  async uploadLogo(orgId, file) {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post(`/org-branding/${orgId}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // رفع أيقونة الموقع
  async uploadFavicon(orgId, file) {
    const formData = new FormData();
    formData.append('favicon', file);
    return api.post(`/org-branding/${orgId}/favicon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // حذف الشعار (رجوع للافتراضي)
  async deleteLogo(orgId) {
    return api.delete(`/org-branding/${orgId}/logo`);
  },
  // جلب ثيمات معدة مسبقاً
  async getPresetThemes() {
    return api.get('/org-branding/themes/presets');
  },
  // تطبيق ثيم معدّ مسبقاً
  async applyTheme(orgId, themeId) {
    return api.post(`/org-branding/${orgId}/apply-theme`, { themeId });
  },
  // تصدير إعدادات الهوية
  async exportSettings(orgId) {
    return api.get(`/org-branding/${orgId}/export`);
  },
  // استيراد إعدادات الهوية
  async importSettings(orgId, settings) {
    return api.post(`/org-branding/${orgId}/import`, settings);
  },
};

export default orgBrandingService;
