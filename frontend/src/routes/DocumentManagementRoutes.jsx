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
const DocumentsProDashboard = lazyWithRetry(() => import('../pages/documents/DocumentsProDashboard'));
const DocumentsProExtended = lazyWithRetry(() => import('../pages/documents/DocumentsProExtended'));
const DocumentsProPhase3 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase3'));
const DocumentsProPhase4 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase4'));
const DocumentsProPhase5 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase5'));
const DocumentsProPhase6 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase6'));
const DocumentsProPhase7 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase7'));
const DocumentsProPhase8 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase8'));
const DocumentsProPhase9 = lazyWithRetry(() => import('../pages/documents/DocumentsProPhase9'));

export default function DocumentManagementRoutes() {
  return (
    <>
      <Route path="document-management" element={<DocumentsDashboard />} />
      <Route path="document-management/list" element={<DocumentsMgmt />} />
      <Route path="document-management/smart" element={<SmartDocumentsPage />} />
      <Route path="document-management/advanced" element={<DocumentAdvancedPage />} />
      <Route path="document-management/archive" element={<ElectronicArchiving />} />
      <Route path="document-management/reports" element={<DocumentsReports />} />
      <Route path="document-management/pro" element={<DocumentsProDashboard />} />
      <Route path="document-management/pro-extended" element={<DocumentsProExtended />} />
      <Route path="document-management/pro-v3" element={<DocumentsProPhase3 />} />
      <Route path="document-management/pro-v4" element={<DocumentsProPhase4 />} />
      <Route path="document-management/pro-v5" element={<DocumentsProPhase5 />} />
      <Route path="document-management/pro-v6" element={<DocumentsProPhase6 />} />
      <Route path="document-management/pro-v7" element={<DocumentsProPhase7 />} />
      <Route path="document-management/pro-v8" element={<DocumentsProPhase8 />} />
      <Route path="document-management/pro-v9" element={<DocumentsProPhase9 />} />
    </>
  );
}
