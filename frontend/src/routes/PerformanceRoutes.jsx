/**
 * Performance Routes — مسارات تقييم الأداء
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const PerformanceDashboard = lazyWithRetry(() => import('../pages/Performance/PerformanceDashboard'));
const PerformancePage = lazyWithRetry(() => import('../pages/Performance'));

export default function PerformanceRoutes() {
  return (
    <>
      <Route path="performance" element={<PerformanceDashboard />} />
      <Route path="performance/evaluations" element={<PerformancePage />} />
    </>
  );
}
