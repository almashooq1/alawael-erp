/**
 * BI Dashboard Routes
 * مسارات لوحة التقارير والتحليلات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const BIExecutiveOverview = lazyWithRetry(() => import('../pages/BIDashboard/BIExecutiveOverview'));
const BIFinanceAnalytics = lazyWithRetry(() => import('../pages/BIDashboard/BIFinanceAnalytics'));
const BIHRAnalytics = lazyWithRetry(() => import('../pages/BIDashboard/BIHRAnalytics'));
const BIOperationsAnalytics = lazyWithRetry(
  () => import('../pages/BIDashboard/BIOperationsAnalytics')
);
const BITrendExplorer = lazyWithRetry(() => import('../pages/BIDashboard/BITrendExplorer'));
const BIReportBuilder = lazyWithRetry(() => import('../pages/BIDashboard/BIReportBuilder'));

export default function BIDashboardRoutes() {
  return (
    <>
      {/* BI Dashboard — لوحة التقارير والتحليلات */}
      <Route path="bi-dashboard" element={<BIExecutiveOverview />} />
      <Route path="bi-dashboard/finance" element={<BIFinanceAnalytics />} />
      <Route path="bi-dashboard/hr" element={<BIHRAnalytics />} />
      <Route path="bi-dashboard/operations" element={<BIOperationsAnalytics />} />
      <Route path="bi-dashboard/trends" element={<BITrendExplorer />} />
      <Route path="bi-dashboard/reports" element={<BIReportBuilder />} />
    </>
  );
}
