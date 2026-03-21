/**
 * Legal Affairs Routes — مسارات الشؤون القانونية
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const LegalDashboard = lazyWithRetry(() => import('../pages/LegalAffairs/LegalDashboard'));
const LegalCases = lazyWithRetry(() => import('../pages/LegalAffairs/LegalCases'));
const LegalConsultations = lazyWithRetry(() => import('../pages/LegalAffairs/LegalConsultations'));

export default function LegalAffairsRoutes() {
  return (
    <>
      <Route path="legal-affairs" element={<LegalDashboard />} />
      <Route path="legal-affairs/cases" element={<LegalCases />} />
      <Route path="legal-affairs/consultations" element={<LegalConsultations />} />
    </>
  );
}
