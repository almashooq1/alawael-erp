/**
 * Event Management Routes — مسارات إدارة الفعاليات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const EventsDashboard = lazyWithRetry(() => import('../pages/Events/EventsDashboard'));
const EventsList = lazyWithRetry(() => import('../pages/Events/EventsList'));

export default function EventManagementRoutes() {
  return (
    <>
      <Route path="events" element={<EventsDashboard />} />
      <Route path="events/list" element={<EventsList />} />
    </>
  );
}
