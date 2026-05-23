/**
 * Risk Management Routes — مسارات إدارة المخاطر
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const RiskDashboard = lazyWithRetry(() => import('../pages/RiskManagement/RiskDashboard'));
const RiskRegister = lazyWithRetry(() => import('../pages/RiskManagement/RiskRegister'));
// W301
const TriggeredReviewsPage = lazyWithRetry(() =>
  import('../pages/RiskManagement/TriggeredReviewsPage')
);
// W310
const CronStatusPage = lazyWithRetry(() => import('../pages/RiskManagement/CronStatusPage'));
// W314
const GovMetricsPage = lazyWithRetry(() => import('../pages/RiskManagement/GovMetricsPage'));

export default function RiskManagementRoutes() {
  return (
    <>
      <Route path="risk-management" element={<RiskDashboard />} />
      <Route path="risk-management/register" element={<RiskRegister />} />
      <Route path="risk-management/triggered-reviews" element={<TriggeredReviewsPage />} />
      <Route path="risk-management/cron-status" element={<CronStatusPage />} />
      <Route path="risk-management/gov-metrics" element={<GovMetricsPage />} />
    </>
  );
}
