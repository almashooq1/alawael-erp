import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const scheduledNotificationsService = {
  async schedule({ userId, title, message, channels, scheduleTime, metadata }) {
    const res = await axios.post(
      `${API_BASE}/notifications/schedule`,
      { userId, title, message, channels, scheduleTime, metadata },
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
    return res.data;
  },
  async getMyScheduled() {
    const res = await axios.get(`${API_BASE}/notifications/scheduled`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return res.data;
  },
};

export default scheduledNotificationsService;
