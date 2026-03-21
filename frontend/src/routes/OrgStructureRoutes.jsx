/**
 * Org Structure Routes — مسارات الهيكل التنظيمي
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const OrgDashboard = lazyWithRetry(() => import('../pages/org-structure/OrgDashboard'));
const OrgStructurePage = lazyWithRetry(() => import('../pages/org-structure/OrgStructurePage'));

export default function OrgStructureRoutes() {
  return (
    <>
      <Route path="org-structure" element={<OrgDashboard />} />
      <Route path="org-structure/chart" element={<OrgStructurePage />} />
    </>
  );
}
