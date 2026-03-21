/**
 * Research Center Routes — مسارات مركز الأبحاث
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ResearchDashboard = lazyWithRetry(() => import('../pages/research/ResearchDashboard'));

export default function ResearchRoutes() {
  return (
    <>
      <Route path="research" element={<ResearchDashboard />} />
    </>
  );
}
