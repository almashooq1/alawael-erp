/**
 * MDT Coordination Routes
 * مسارات التنسيق متعدد التخصصات
 * لوحة التحكم + الاجتماعات + خطط التأهيل + الإحالات
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const MDTCoordinationDashboard = lazyWithRetry(
  () => import('../pages/mdt/MDTCoordinationDashboard')
);
const MDTMeetingsPage = lazyWithRetry(
  () => import('../pages/mdt/MDTMeetingsPage')
);
const MDTPlansPage = lazyWithRetry(
  () => import('../pages/mdt/MDTPlansPage')
);
const MDTReferralsPage = lazyWithRetry(
  () => import('../pages/mdt/MDTReferralsPage')
);

export default function MDTCoordinationRoutes() {
  return (
    <>
      <Route path="mdt-coordination" element={<MDTCoordinationDashboard />} />
      <Route path="mdt-coordination/meetings" element={<MDTMeetingsPage />} />
      <Route path="mdt-coordination/plans" element={<MDTPlansPage />} />
      <Route path="mdt-coordination/referrals" element={<MDTReferralsPage />} />
    </>
  );
}
