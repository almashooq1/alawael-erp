/**
 * GroupTherapyRoutes — مسارات العلاج الجماعي
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const GroupTherapyPage = lazyWithRetry(() => import('../pages/group-therapy/GroupTherapyPage'));

export default function GroupTherapyRoutes() {
  return (
    <>
      <Route path="group-therapy" element={<GroupTherapyPage />} />
      <Route path="group-therapy/*" element={<GroupTherapyPage />} />
    </>
  );
}
