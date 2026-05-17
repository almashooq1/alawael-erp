/**
 * FamilyEngagementRoutes — مسارات التواصل الأسري
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const FamilyEngagementPage = lazyWithRetry(() => import('../pages/family/FamilyEngagementPage'));

export default function FamilyEngagementRoutes() {
  return (
    <>
      <Route path="family-engagement" element={<FamilyEngagementPage />} />
      <Route path="family-engagement/*" element={<FamilyEngagementPage />} />
    </>
  );
}
