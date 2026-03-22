/**
 * Community Integration Routes — مسارات الاندماج المجتمعي
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CommunityDashboard = lazyWithRetry(() => import('../pages/community/CommunityDashboard'));

export default function CommunityRoutes() {
  return (
    <>
      <Route path="community" element={<CommunityDashboard />} />
    </>
  );
}
