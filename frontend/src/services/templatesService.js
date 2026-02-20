// خدمة إدارة القوالب الذكية (API)
import axios from 'axios';

const API = '/api/templates';

const templatesService = {
  async getAll(params = {}) {
    const res = await axios.get(API, { params });
    return res.data;
  },
  async create(template) {
    const res = await axios.post(API, template);
    return res.data;
  },
  async update(id, template) {
    const res = await axios.put(`${API}/${id}`, template);
    return res.data;
  },
  async remove(id) {
    const res = await axios.delete(`${API}/${id}`);
    return res.data;
  },
  async incrementUsage(id) {
    await axios.post(`${API}/${id}/use`);
  },
  async approve(id) {
    const res = await axios.post(`${API}/${id}/approve`);
    return res.data;
  },
  async reject(id, reason) {
    const res = await axios.post(`${API}/${id}/reject`, { reason });
    return res.data;
  },
};

export default templatesService;
