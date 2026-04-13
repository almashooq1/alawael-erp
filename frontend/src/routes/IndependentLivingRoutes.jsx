/**
 * Independent Living Routes — مسارات العيش المستقل
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const IndependentLivingDashboard = lazyWithRetry(() => import('../pages/independent-living/IndependentLivingDashboard'));

export default function IndependentLivingRoutes() {
  return (
    <>
      <Route path="independent-living" element={<IndependentLivingDashboard />} />
    </>
  );
}
