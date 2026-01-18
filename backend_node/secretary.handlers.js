import axios from 'axios';
import { eventBus } from './eventBus.js';

const PY_BASE = process.env.PY_BASE || 'http://localhost:8080';

// When a task is created, request suggestions and publish notifications
eventBus.subscribe('secretary.task.created', async evt => {
  try {
    const { date, appointments, tasks } = evt.data;
    const r = await axios.post(`${PY_BASE}/api/secretary/suggestions`, { date, appointments, tasks });
    eventBus.publish('secretary.notifications.push', { suggestions: r.data.suggestions }, { source: 'node' });
  } catch (e) {
    eventBus.publish('error', { message: e.message, context: 'secretary.task.created' });
  }
});

// When an appointment is created, compose a meeting invite
eventBus.subscribe('secretary.appointment.created', async evt => {
  try {
    const { appointment, organizer } = evt.data;
    const r = await axios.post(`${PY_BASE}/api/secretary/invite`, { appointment, organizer });
    eventBus.publish('secretary.notifications.push', { invite: r.data.invite }, { source: 'node' });
  } catch (e) {
    eventBus.publish('error', { message: e.message, context: 'secretary.appointment.created' });
  }
});
