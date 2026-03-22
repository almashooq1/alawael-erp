/**
 * Internal Audit Routes — مسارات التدقيق الداخلي
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const AuditDashboard = lazyWithRetry(() => import('../pages/InternalAudit/AuditDashboard'));
const AuditPlansList = lazyWithRetry(() => import('../pages/InternalAudit/AuditPlansList'));
const AuditFindings = lazyWithRetry(() => import('../pages/InternalAudit/AuditFindings'));

export default function InternalAuditRoutes() {
  return (
    <>
      <Route path="internal-audit" element={<AuditDashboard />} />
      <Route path="internal-audit/plans" element={<AuditPlansList />} />
      <Route path="internal-audit/findings" element={<AuditFindings />} />
    </>
  );
}
