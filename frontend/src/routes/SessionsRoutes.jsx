/**
 * Sessions Routes — مسارات الجلسات العلاجية
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const SessionsDashboard = lazyWithRetry(() => import('../pages/Sessions/SessionsDashboard'));
const SessionAnalyticsDashboard = lazyWithRetry(
  () => import('../pages/Sessions/SessionAnalyticsDashboard')
);
const SessionsPage = lazyWithRetry(() => import('../pages/Sessions'));
// BC-04: amendment audit trail
const SessionAmendmentAudit = lazyWithRetry(
  () => import('../pages/Sessions/SessionAmendmentAudit')
);
const SessionCenterPage = lazyWithRetry(() => import('../pages/sessions/SessionCenterPage'));

export default function SessionsRoutes() {
  return (
    <>
      <Route path="sessions" element={<SessionsDashboard />} />
      <Route path="sessions/management" element={<SessionsPage />} />
      <Route path="sessions/analytics" element={<SessionAnalyticsDashboard />} />
      {/* BC-04: سجل تعديلات السجلات السريرية (CARF‑MH 3.A) */}
      <Route path="sessions/amendment-audit" element={<SessionAmendmentAudit />} />
      {/* Session Center — تحليلات موحدة */}
      <Route path="session-center" element={<SessionCenterPage />} />
    </>
  );
}
