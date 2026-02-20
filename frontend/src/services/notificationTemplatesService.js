import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;

export async function fetchTemplateAudit(templateId) {
  const res = await apiClient.get(`/notification-templates/${templateId}/audit`);
  return res.data.data;
}
