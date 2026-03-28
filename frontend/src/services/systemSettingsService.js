/**
 * ⚙️ إعدادات النظام — System Settings Service
 * AlAwael ERP — Frontend API Integration
 */
import apiClient from 'services/api.client';

const BASE = '/system-settings';

const systemSettingsService = {
  // ── Get current settings ────────────────────────────────────────────────
  get: () => apiClient.get(BASE),

  // ── Update settings (deep merge) ───────────────────────────────────────
  update: data => apiClient.put(BASE, data),

  // ── Reset a specific section ───────────────────────────────────────────
  resetSection: section => apiClient.post(`${BASE}/reset/${section}`),

  // ── Toggle maintenance mode ────────────────────────────────────────────
  toggleMaintenance: () => apiClient.post(`${BASE}/maintenance/toggle`),
};

export default systemSettingsService;
