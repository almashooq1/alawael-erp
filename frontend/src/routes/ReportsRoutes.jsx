/**
 * Reports Center Routes — مسارات مركز التقارير
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ReportsDashboard = lazyWithRetry(() => import('../pages/reports/ReportsDashboard'));
const AdvancedReportsPage = lazyWithRetry(() => import('../pages/reports/AdvancedReportsPage'));

export default function ReportsRoutes() {
  return (
    <>
      <Route path="reports-center" element={<ReportsDashboard />} />
      <Route path="reports-center/advanced" element={<AdvancedReportsPage />} />
    </>
  );
}
