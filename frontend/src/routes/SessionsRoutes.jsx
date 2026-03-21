/**
 * Sessions Routes — مسارات الجلسات العلاجية
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const SessionsDashboard = lazyWithRetry(() => import('../pages/Sessions/SessionsDashboard'));
const SessionAnalyticsDashboard = lazyWithRetry(() => import('../pages/Sessions/SessionAnalyticsDashboard'));
const SessionsPage = lazyWithRetry(() => import('../pages/Sessions'));

export default function SessionsRoutes() {
  return (
    <>
      <Route path="sessions" element={<SessionsDashboard />} />
      <Route path="sessions/management" element={<SessionsPage />} />
      <Route path="sessions/analytics" element={<SessionAnalyticsDashboard />} />
    </>
  );
}
