/**
 * Enterprise Ultra Routes
 * مسارات الحلول المؤسسية الفائقة
 * (القانونية، الحوكمة، استمرارية الأعمال، تجربة العملاء، الاستدامة، التحول الرقمي)
 */
import { lazyWithRetry } from '../utils/lazyLoader';

// ─── Enterprise Ultra Pages ───
const LegalManagementPage = lazyWithRetry(() => import('../pages/enterprise-ultra/LegalManagementPage'));
const CorporateGovernancePage = lazyWithRetry(() => import('../pages/enterprise-ultra/CorporateGovernancePage'));
const BusinessContinuityPage = lazyWithRetry(() => import('../pages/enterprise-ultra/BusinessContinuityPage'));
const CustomerExperiencePage = lazyWithRetry(() => import('../pages/enterprise-ultra/CustomerExperiencePage'));
const SustainabilityPage = lazyWithRetry(() => import('../pages/enterprise-ultra/SustainabilityPage'));
const DigitalTransformationPage = lazyWithRetry(() => import('../pages/enterprise-ultra/DigitalTransformationPage'));

export default function EnterpriseUltraRoutes() {
  return (
    <>
      {/* الشؤون القانونية */}
      <Route path="legal-management" element={<LegalManagementPage />} />
      {/* الحوكمة المؤسسية */}
      <Route path="corporate-governance" element={<CorporateGovernancePage />} />
      {/* استمرارية الأعمال */}
      <Route path="business-continuity" element={<BusinessContinuityPage />} />
      {/* تجربة العملاء */}
      <Route path="customer-experience" element={<CustomerExperiencePage />} />
      {/* الاستدامة والطاقة */}
      <Route path="sustainability" element={<SustainabilityPage />} />
      {/* التحول الرقمي */}
      <Route path="digital-transformation" element={<DigitalTransformationPage />} />
    </>
  );
}
