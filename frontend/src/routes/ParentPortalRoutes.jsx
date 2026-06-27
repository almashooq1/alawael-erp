/**
 * Parent Portal Routes
 * مسارات بوابة أولياء الأمور
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ParentPortal = lazyWithRetry(() => import('../pages/parent-portal/ParentPortal'));

export default function ParentPortalRoutes() {
  return (
    <>
      <Route path="parent-portal/:beneficiaryId" element={<ParentPortal />} />
    </>
  );
}
