/**
 * Quality Management Routes — مسارات إدارة الجودة
 * Phase 20 — ISO / CBAHI
 */

import { lazyWithRetry } from '../utils/lazyLoader';

const QualityManagement = lazyWithRetry(() =>
  import('../pages/quality-management/QualityManagement'),
);

export default function QualityManagementRoutes() {
  return (
    <>
      <Route path="/quality-management" element={<QualityManagement />} />
    </>
  );
}
