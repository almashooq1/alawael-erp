/**
 * Quality & Compliance Routes — مسارات الجودة والامتثال
 * Phase 13 Commit 11 — all quality sub-modules registered
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const QualityDashboard = lazyWithRetry(() => import('../pages/Quality/QualityDashboard'));
const QualityCompliancePage = lazyWithRetry(() => import('../pages/QualityCompliance'));
const ManagementReviewAdmin = lazyWithRetry(() => import('../pages/Quality/ManagementReviewAdmin'));
const CapaAdmin = lazyWithRetry(() => import('../pages/Quality/CapaAdmin'));
const ComplianceCalendarAdmin = lazyWithRetry(
  () => import('../pages/Quality/ComplianceCalendarAdmin')
);
const EvidenceVaultAdmin = lazyWithRetry(() => import('../pages/Quality/EvidenceVaultAdmin'));
const PolicyLibraryAdmin = lazyWithRetry(() => import('../pages/Quality/PolicyLibraryAdmin'));
const PdplComplianceDashboard = lazyWithRetry(
  () => import('../pages/Quality/PdplComplianceDashboard')
);
const PdplConsentsAdmin = lazyWithRetry(() => import('../pages/Quality/PdplConsentsAdmin'));
const PdplSubjectRequestsAdmin = lazyWithRetry(
  () => import('../pages/Quality/PdplSubjectRequestsAdmin')
);
const PdplProcessingRecordsAdmin = lazyWithRetry(
  () => import('../pages/Quality/PdplProcessingRecordsAdmin')
);
const PdplBreachReportingAdmin = lazyWithRetry(
  () => import('../pages/Quality/PdplBreachReportingAdmin')
);
const PiiAccessAuditAdmin = lazyWithRetry(() => import('../pages/Quality/PiiAccessAuditAdmin'));

export default function QualityComplianceRoutes() {
  return (
    <>
      {/* Main dashboard */}
      <Route path="quality" element={<QualityDashboard />} />
      <Route path="quality/management" element={<QualityCompliancePage />} />

      {/* Quality core modules */}
      <Route path="quality/management-review" element={<ManagementReviewAdmin />} />
      <Route path="quality/capa" element={<CapaAdmin />} />
      <Route path="quality/compliance-calendar" element={<ComplianceCalendarAdmin />} />
      <Route path="quality/evidence-vault" element={<EvidenceVaultAdmin />} />
      <Route path="quality/policies" element={<PolicyLibraryAdmin />} />

      {/* PDPL & privacy */}
      <Route path="quality/pdpl" element={<PdplComplianceDashboard />} />
      <Route path="quality/pdpl/consents" element={<PdplConsentsAdmin />} />
      <Route path="quality/pdpl/subject-requests" element={<PdplSubjectRequestsAdmin />} />
      <Route path="quality/pdpl/processing-records" element={<PdplProcessingRecordsAdmin />} />
      <Route path="quality/pdpl/breach-reporting" element={<PdplBreachReportingAdmin />} />
      <Route path="quality/pdpl/pii-audit" element={<PiiAccessAuditAdmin />} />
    </>
  );
}
