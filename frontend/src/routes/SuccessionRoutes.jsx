/**
 * Succession Planning Routes — مسارات تخطيط التعاقب
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const SuccessionDashboard = lazyWithRetry(() => import('../pages/succession/SuccessionDashboard'));
const SuccessionPlanningPage = lazyWithRetry(() => import('../pages/succession/SuccessionPlanningPage'));

export default function SuccessionRoutes() {
  return (
    <>
      <Route path="succession" element={<SuccessionDashboard />} />
      <Route path="succession/planning" element={<SuccessionPlanningPage />} />
    </>
  );
}
