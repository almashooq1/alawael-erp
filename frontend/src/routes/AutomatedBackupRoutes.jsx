/**
 * AL-AWAEL ERP — Automated Backup Routes
 * Phase 23 — مسارات النسخ الاحتياطي التلقائي
 */


import { lazyWithRetry } from '../utils/lazyLoader';

const AutomatedBackup = lazyWithRetry(() =>
  import('../pages/automated-backup/AutomatedBackup')
);

const AutomatedBackupRoutes = () => (
  <>
    <Route path="/automated-backup" element={
      <React.Suspense fallback={<div>جارٍ التحميل...</div>}>
        <AutomatedBackup />
      </React.Suspense>
    } />
  </>
);

export default AutomatedBackupRoutes;
