/**
 * OCR Document Routes — مسارات الواجهة الأمامية لمعالجة المستندات
 * Phase 18
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const OCRDashboard = lazyWithRetry(() => import('../pages/ocr-documents/OCRDashboard'));
const DocumentProcessor = lazyWithRetry(() => import('../pages/ocr-documents/DocumentProcessor'));

export default function OCRDocumentRoutes() {
  return (
    <>
      <Route path="/ocr-documents" element={<OCRDashboard />} />
      <Route path="/ocr-documents/process" element={<DocumentProcessor />} />
    </>
  );
}
