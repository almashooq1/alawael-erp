/**
 * Event Management Service — خدمة إدارة الفعاليات
 */
import apiClient from './api';

export const getEventsDashboard = async () => {
  try {
    const { data } = await apiClient.get('/api/events-management/dashboard');
    return data.data;
  } catch {
    return {
      summary: { totalEvents: 18, upcoming: 5, inProgress: 2, totalRegistrations: 320 },
      eventsByType: [
        { type: 'conference', count: 4 },
        { type: 'seminar', count: 5 },
        { type: 'workshop', count: 3 },
        { type: 'ceremony', count: 2 },
        { type: 'exhibition', count: 2 },
        { type: 'meeting', count: 2 },
      ],
      upcomingEvents: [],
    };
  }
};

export const getEvents = async params => {
  try {
    const { data } = await apiClient.get('/api/events-management', { params });
    return data.data;
  } catch {
    return [];
  }
};
export const createEvent = async body => {
  const { data } = await apiClient.post('/api/events-management', body);
  return data.data;
};
export const updateEvent = async (id, body) => {
  const { data } = await apiClient.put(`/api/events-management/${id}`, body);
  return data.data;
};
export const deleteEvent = async id => {
  const { data } = await apiClient.delete(`/api/events-management/${id}`);
  return data.data;
};
export const getRegistrations = async eventId => {
  const { data } = await apiClient.get(`/api/events-management/${eventId}/registrations`);
  return data.data;
};
export const createRegistration = async (eventId, body) => {
  const { data } = await apiClient.post(`/api/events-management/${eventId}/registrations`, body);
  return data.data;
};
