/**
 * Facility Routes — مسارات إدارة المرافق
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const FacilityDashboard = lazyWithRetry(() => import('../pages/facility/FacilityDashboard'));
const FacilityManagementPage = lazyWithRetry(() => import('../pages/facility/FacilityManagementPage'));

export default function FacilityRoutes() {
  return (
    <>
      <Route path="facilities" element={<FacilityDashboard />} />
      <Route path="facilities/management" element={<FacilityManagementPage />} />
    </>
  );
}
