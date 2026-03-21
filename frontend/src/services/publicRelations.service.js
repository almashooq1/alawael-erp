/**
 * Public Relations Service — خدمة العلاقات العامة والإعلام
 */
import apiClient from './api';

export const getPRDashboard = async () => {
  try { const { data } = await apiClient.get('/api/public-relations/dashboard'); return data.data; }
  catch {
    return {
      summary: { totalMedia: 85, activeCampaigns: 3, activePartners: 12, positiveMedia: 62 },
      mediaBySentiment: [{ sentiment: 'positive', count: 62 }, { sentiment: 'neutral', count: 15 }, { sentiment: 'negative', count: 8 }],
      mediaByType: [
        { type: 'press_release', count: 25 }, { type: 'news_article', count: 20 }, { type: 'social_media', count: 18 },
        { type: 'tv_coverage', count: 10 }, { type: 'interview', count: 8 }, { type: 'report', count: 4 },
      ],
      recentMedia: [],
    };
  }
};

export const getMediaList = async (params) => {
  try { const { data } = await apiClient.get('/api/public-relations/media', { params }); return data.data; }
  catch { return []; }
};
export const createMedia = async (body) => { const { data } = await apiClient.post('/api/public-relations/media', body); return data.data; };
export const updateMedia = async (id, body) => { const { data } = await apiClient.put(`/api/public-relations/media/${id}`, body); return data.data; };
export const deleteMedia = async (id) => { const { data } = await apiClient.delete(`/api/public-relations/media/${id}`); return data.data; };

export const getCampaigns = async (params) => {
  try { const { data } = await apiClient.get('/api/public-relations/campaigns', { params }); return data.data; }
  catch { return []; }
};
export const createCampaign = async (body) => { const { data } = await apiClient.post('/api/public-relations/campaigns', body); return data.data; };
export const updateCampaign = async (id, body) => { const { data } = await apiClient.put(`/api/public-relations/campaigns/${id}`, body); return data.data; };

export const getPartnerships = async () => {
  try { const { data } = await apiClient.get('/api/public-relations/partnerships'); return data.data; }
  catch { return []; }
};
export const createPartnership = async (body) => { const { data } = await apiClient.post('/api/public-relations/partnerships', body); return data.data; };
export const updatePartnership = async (id, body) => { const { data } = await apiClient.put(`/api/public-relations/partnerships/${id}`, body); return data.data; };
