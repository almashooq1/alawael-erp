/**
 * Media Service — خدمة إدارة الوسائط
 *
 * Client-side API for the media library system:
 * uploads, CRUD, albums, tags, favorites, bulk ops, trash, stats
 */

import apiClient from './api.client';
import logger from 'utils/logger';

const BASE = '/media';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatFileSize = bytes => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getMediaTypeIcon = type => {
  const map = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
    archive: '📦',
    other: '📎',
  };
  return map[type] || '📎';
};

const getMediaTypeLabel = type => {
  const map = {
    image: 'صورة',
    video: 'فيديو',
    audio: 'صوت',
    document: 'مستند',
    archive: 'أرشيف',
    other: 'أخرى',
  };
  return map[type] || 'أخرى';
};

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_DASHBOARD = {
  stats: {
    totalFiles: 247,
    totalSize: 1_340_000_000,
    totalSizeFormatted: '1.2 GB',
    quota: 5_368_709_120,
    quotaFormatted: '5.0 GB',
    usagePercent: 25,
    byType: [
      { type: 'image', count: 128, size: 450_000_000, sizeFormatted: '429.2 MB' },
      { type: 'video', count: 34, size: 620_000_000, sizeFormatted: '591.3 MB' },
      { type: 'audio', count: 18, size: 85_000_000, sizeFormatted: '81.1 MB' },
      { type: 'document', count: 52, size: 160_000_000, sizeFormatted: '152.6 MB' },
      { type: 'archive', count: 8, size: 20_000_000, sizeFormatted: '19.1 MB' },
      { type: 'other', count: 7, size: 5_000_000, sizeFormatted: '4.8 MB' },
    ],
  },
  recent: [
    {
      _id: 'm1',
      title: 'شعار المؤسسة',
      originalName: 'logo.png',
      mediaType: 'image',
      fileSize: 245000,
      formattedSize: '239.3 KB',
      createdAt: '2026-03-12',
      uploadedBy: { name: 'أحمد' },
    },
    {
      _id: 'm2',
      title: 'فيديو تعريفي',
      originalName: 'intro.mp4',
      mediaType: 'video',
      fileSize: 52000000,
      formattedSize: '49.6 MB',
      createdAt: '2026-03-11',
      uploadedBy: { name: 'سارة' },
    },
    {
      _id: 'm3',
      title: 'تقرير سنوي',
      originalName: 'annual-report.pdf',
      mediaType: 'document',
      fileSize: 3200000,
      formattedSize: '3.1 MB',
      createdAt: '2026-03-10',
      uploadedBy: { name: 'خالد' },
    },
    {
      _id: 'm4',
      title: 'صورة الفعالية',
      originalName: 'event-photo.jpg',
      mediaType: 'image',
      fileSize: 1800000,
      formattedSize: '1.7 MB',
      createdAt: '2026-03-09',
      uploadedBy: { name: 'نورة' },
    },
  ],
  albums: [
    { _id: 'a1', name: 'صور المؤسسة', mediaCount: 45, color: '#1976d2' },
    { _id: 'a2', name: 'فعاليات 2026', mediaCount: 32, color: '#388e3c' },
    { _id: 'a3', name: 'فيديوهات تعليمية', mediaCount: 12, color: '#f57c00' },
    { _id: 'a4', name: 'مستندات رسمية', mediaCount: 28, color: '#7b1fa2' },
  ],
  favorites: [],
};

const MOCK_STATS = {
  overall: {
    count: 247,
    size: 1_340_000_000,
    byType: [
      { type: 'image', count: 128, size: 450_000_000, sizeFormatted: '429.2 MB' },
      { type: 'video', count: 34, size: 620_000_000, sizeFormatted: '591.3 MB' },
      { type: 'audio', count: 18, size: 85_000_000, sizeFormatted: '81.1 MB' },
      { type: 'document', count: 52, size: 160_000_000, sizeFormatted: '152.6 MB' },
      { type: 'archive', count: 8, size: 20_000_000, sizeFormatted: '19.1 MB' },
      { type: 'other', count: 7, size: 5_000_000, sizeFormatted: '4.8 MB' },
    ],
  },
  monthly: [
    { month: '2026-03', count: 42, size: 280_000_000, sizeFormatted: '267.0 MB' },
    { month: '2026-02', count: 38, size: 210_000_000, sizeFormatted: '200.3 MB' },
    { month: '2026-01', count: 51, size: 320_000_000, sizeFormatted: '305.2 MB' },
    { month: '2025-12', count: 35, size: 180_000_000, sizeFormatted: '171.7 MB' },
    { month: '2025-11', count: 44, size: 200_000_000, sizeFormatted: '190.7 MB' },
    { month: '2025-10', count: 37, size: 150_000_000, sizeFormatted: '143.1 MB' },
  ],
  topUploaders: [
    { name: 'أحمد محمد', count: 68, sizeFormatted: '350.2 MB' },
    { name: 'سارة الأحمد', count: 52, sizeFormatted: '280.5 MB' },
    { name: 'خالد العتيبي', count: 41, sizeFormatted: '220.8 MB' },
  ],
};

// ─── Service ─────────────────────────────────────────────────────────────────
const mediaService = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  async getDashboard() {
    try {
      const res = await apiClient.get(BASE);
      return res?.data?.data || res?.data || MOCK_DASHBOARD;
    } catch (err) {
      logger.warn('mediaService.getDashboard:', err);
      return MOCK_DASHBOARD;
    }
  },

  async getStats() {
    try {
      const res = await apiClient.get(`${BASE}/stats`);
      return res?.data?.data || res?.data || MOCK_STATS;
    } catch (err) {
      logger.warn('mediaService.getStats:', err);
      return MOCK_STATS;
    }
  },

  // ── Upload ───────────────────────────────────────────────────────────────
  async upload(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([k, v]) => {
      if (v !== undefined && v !== null)
        formData.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
    });

    const res = await apiClient.post(`${BASE}/upload`, formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: metadata.onProgress,
    });
    return res?.data?.data || res?.data;
  },

  async uploadBulk(files, metadata = {}) {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    Object.entries(metadata).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'onProgress')
        formData.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
    });

    const res = await apiClient.post(`${BASE}/upload-bulk`, formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: metadata.onProgress,
    });
    return res?.data?.data || res?.data;
  },

  // ── List / Search ────────────────────────────────────────────────────────
  async list(params = {}) {
    try {
      const res = await apiClient.get(`${BASE}/list`, { params });
      return res?.data || { data: [], pagination: { total: 0, page: 1, pages: 0 } };
    } catch (err) {
      logger.warn('mediaService.list:', err);
      return { data: [], pagination: { total: 0, page: 1, pages: 0 } };
    }
  },

  // ── Single Item ──────────────────────────────────────────────────────────
  async getById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res?.data?.data || res?.data;
  },

  async update(id, data) {
    const res = await apiClient.put(`${BASE}/${id}`, data);
    return res?.data?.data || res?.data;
  },

  async delete(id) {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res?.data;
  },

  async deletePermanent(id) {
    const res = await apiClient.delete(`${BASE}/${id}/permanent`);
    return res?.data;
  },

  async restore(id) {
    const res = await apiClient.post(`${BASE}/${id}/restore`);
    return res?.data;
  },

  // ── Favorites & Pins ────────────────────────────────────────────────────
  async toggleFavorite(id) {
    const res = await apiClient.post(`${BASE}/${id}/favorite`);
    return res?.data;
  },

  async togglePin(id) {
    const res = await apiClient.post(`${BASE}/${id}/pin`);
    return res?.data;
  },

  // ── Bulk Ops ─────────────────────────────────────────────────────────────
  async bulkDelete(ids) {
    const res = await apiClient.post(`${BASE}/bulk-delete`, { ids });
    return res?.data;
  },

  async bulkMove(ids, album) {
    const res = await apiClient.post(`${BASE}/bulk-move`, { ids, album });
    return res?.data;
  },

  async bulkTag(ids, tags) {
    const res = await apiClient.post(`${BASE}/bulk-tag`, { ids, tags });
    return res?.data;
  },

  // ── Albums ───────────────────────────────────────────────────────────────
  async getAlbums(params = {}) {
    try {
      const res = await apiClient.get(`${BASE}/albums`, { params });
      return res?.data?.data || [];
    } catch (err) {
      logger.warn('mediaService.getAlbums:', err);
      return MOCK_DASHBOARD.albums;
    }
  },

  async createAlbum(data) {
    const res = await apiClient.post(`${BASE}/albums`, data);
    return res?.data?.data || res?.data;
  },

  async updateAlbum(id, data) {
    const res = await apiClient.put(`${BASE}/albums/${id}`, data);
    return res?.data?.data || res?.data;
  },

  async deleteAlbum(id) {
    const res = await apiClient.delete(`${BASE}/albums/${id}`);
    return res?.data;
  },

  // ── Tags ─────────────────────────────────────────────────────────────────
  async getTags() {
    try {
      const res = await apiClient.get(`${BASE}/tags`);
      return res?.data?.data || [];
    } catch (err) {
      logger.warn('mediaService.getTags:', err);
      return [];
    }
  },

  // ── Trash ────────────────────────────────────────────────────────────────
  async getTrash() {
    try {
      const res = await apiClient.get(`${BASE}/trash`);
      return res?.data?.data || [];
    } catch (err) {
      logger.warn('mediaService.getTrash:', err);
      return [];
    }
  },

  async emptyTrash() {
    const res = await apiClient.post(`${BASE}/trash/empty`);
    return res?.data;
  },

  // ── Download ─────────────────────────────────────────────────────────────
  getDownloadUrl(id) {
    return `${apiClient.defaults.baseURL}${BASE}/${id}/download`;
  },

  getFileUrl(fileName) {
    return `${apiClient.defaults.baseURL}${BASE}/file/${fileName}`;
  },

  // ── Utilities ────────────────────────────────────────────────────────────
  formatFileSize,
  getMediaTypeIcon,
  getMediaTypeLabel,

  isImage(mimeOrType) {
    return mimeOrType === 'image' || (mimeOrType && mimeOrType.startsWith('image/'));
  },
  isVideo(mimeOrType) {
    return mimeOrType === 'video' || (mimeOrType && mimeOrType.startsWith('video/'));
  },
  isAudio(mimeOrType) {
    return mimeOrType === 'audio' || (mimeOrType && mimeOrType.startsWith('audio/'));
  },

  getAcceptedTypes(mediaType) {
    const map = {
      image: 'image/*',
      video: 'video/*',
      audio: 'audio/*',
      document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
      all: 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z',
    };
    return map[mediaType] || map.all;
  },
};

export default mediaService;
