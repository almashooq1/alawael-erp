/**
 * Volunteer Routes — مسارات إدارة المتطوعين
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const VolunteerDashboard = lazyWithRetry(() => import('../pages/volunteer/VolunteerDashboard'));

export default function VolunteerRoutes() {
  return (
    <>
      <Route path="volunteers" element={<VolunteerDashboard />} />
    </>
  );
}
