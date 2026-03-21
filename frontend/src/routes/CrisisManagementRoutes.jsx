/**
 * Crisis Management Routes — مسارات إدارة الأزمات
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const CrisisDashboard = lazyWithRetry(() => import('../pages/Crisis/CrisisDashboard'));
const CrisisIncidentsList = lazyWithRetry(() => import('../pages/Crisis/CrisisIncidentsList'));

export default function CrisisManagementRoutes() {
  return (
    <>
      <Route path="crisis" element={<CrisisDashboard />} />
      <Route path="crisis/incidents" element={<CrisisIncidentsList />} />
    </>
  );
}
