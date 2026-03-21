/**
 * Complaints Routes — مسارات الشكاوى والمقترحات
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const ComplaintsDashboard = lazyWithRetry(() => import('../pages/complaints/ComplaintsDashboard'));
const ComplaintsManagementPage = lazyWithRetry(() => import('../pages/complaints/ComplaintsManagementPage'));

export default function ComplaintsRoutes() {
  return (
    <>
      <Route path="complaints" element={<ComplaintsDashboard />} />
      <Route path="complaints/management" element={<ComplaintsManagementPage />} />
    </>
  );
}
