/**
 * Clinical Integration Routes
 * مسارات التكامل السريري
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ClinicalDashboard = lazyWithRetry(() => import('../pages/clinical/ClinicalDashboard'));
const IntegratedReportGenerator = lazyWithRetry(() => import('../pages/reports/IntegratedReportGenerator'));

export default function ClinicalRoutes() {
  return (
    <>
      <Route path="clinical-dashboard" element={<ClinicalDashboard />} />
      <Route path="clinical-dashboard/:beneficiaryId" element={<ClinicalDashboard />} />
      <Route path="reports/integrated" element={<IntegratedReportGenerator />} />
    </>
  );
}
