/**
 * Quality & Compliance Routes — مسارات الجودة والامتثال
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const QualityDashboard = lazyWithRetry(() => import('../pages/Quality/QualityDashboard'));
const QualityCompliancePage = lazyWithRetry(() => import('../pages/QualityCompliance'));

export default function QualityComplianceRoutes() {
  return (
    <>
      <Route path="quality" element={<QualityDashboard />} />
      <Route path="quality/management" element={<QualityCompliancePage />} />
    </>
  );
}
