/**
 * Audit Logs Routes — مسارات سجلات التدقيق
 * Enhanced Audit Trail — تتبع جميع عمليات النظام
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const AuditLogsPage = lazyWithRetry(
  () => import('../pages/AuditLogs/AuditLogsPage')
);

export default function AuditLogsRoutes() {
  return (
    <>
      {/* سجلات التدقيق المحسّنة */}
      <Route path="audit-logs" element={<AuditLogsPage />} />
      <Route path="audit-logs/*" element={<AuditLogsPage />} />

      {/* مسارات بديلة */}
      <Route path="audit-trail" element={<AuditLogsPage />} />
      <Route path="activity-logs" element={<AuditLogsPage />} />
      <Route path="system-logs" element={<AuditLogsPage />} />
    </>
  );
}
