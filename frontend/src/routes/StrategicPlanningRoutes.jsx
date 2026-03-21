/**
 * Strategic Planning Routes — مسارات التخطيط الاستراتيجي
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const StrategicDashboard = lazyWithRetry(() => import('../pages/StrategicPlanning/StrategicDashboard'));
const StrategicPlanningPage = lazyWithRetry(() => import('../pages/strategic-planning/StrategicPlanningPage'));

export default function StrategicPlanningRoutes() {
  return (
    <>
      <Route path="strategic-planning" element={<StrategicDashboard />} />
      <Route path="strategic-planning/manage" element={<StrategicPlanningPage />} />
    </>
  );
}
