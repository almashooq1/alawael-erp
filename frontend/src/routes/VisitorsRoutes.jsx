/**
 * Visitors Routes — مسارات إدارة الزوار
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const VisitorsDashboard = lazyWithRetry(() => import('../pages/visitors/VisitorsDashboard'));
const VisitorManagementPage = lazyWithRetry(() => import('../pages/visitors/VisitorManagementPage'));

export default function VisitorsRoutes() {
  return (
    <>
      <Route path="visitors" element={<VisitorsDashboard />} />
      <Route path="visitors/management" element={<VisitorManagementPage />} />
    </>
  );
}
