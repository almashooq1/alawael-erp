/**
 * CEO Executive Dashboard Routes — مسارات لوحة تحكم الإدارة التنفيذية
 * Phase 19
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const CEODashboard = lazyWithRetry(() => import('../pages/ceo-dashboard/CEODashboard'));

export default function CEODashboardRoutes() {
  return (
    <>
      <Route path="/ceo-dashboard" element={<CEODashboard />} />
    </>
  );
}
