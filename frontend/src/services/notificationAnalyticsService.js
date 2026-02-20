import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const notificationAnalyticsService = {
  async getSummary() {
    const res = await axios.get(`${API_BASE}/notifications/analytics/summary`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return res.data;
  },
};

export default notificationAnalyticsService;
