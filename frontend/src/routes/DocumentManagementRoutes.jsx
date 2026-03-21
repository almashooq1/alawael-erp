/**
 * Document Management Routes — مسارات إدارة الوثائق
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const DocumentsDashboard = lazyWithRetry(() => import('../pages/documents/DocumentsDashboard'));
const DocumentsMgmt = lazyWithRetry(() => import('../pages/DocumentsMgmt'));
const SmartDocumentsPage = lazyWithRetry(() => import('../pages/documents/SmartDocumentsPage'));
const DocumentAdvancedPage = lazyWithRetry(() => import('../pages/documents/DocumentAdvancedPage'));
const ElectronicArchiving = lazyWithRetry(() => import('../pages/documents/ElectronicArchiving'));
const DocumentsReports = lazyWithRetry(() => import('../pages/documents/DocumentsReports'));

export default function DocumentManagementRoutes() {
  return (
    <>
      <Route path="document-management" element={<DocumentsDashboard />} />
      <Route path="document-management/list" element={<DocumentsMgmt />} />
      <Route path="document-management/smart" element={<SmartDocumentsPage />} />
      <Route path="document-management/advanced" element={<DocumentAdvancedPage />} />
      <Route path="document-management/archive" element={<ElectronicArchiving />} />
      <Route path="document-management/reports" element={<DocumentsReports />} />
    </>
  );
}
