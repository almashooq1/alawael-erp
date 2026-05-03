/**
 * Quality Management Routes — مسارات إدارة الجودة
 * Phase 20 — ISO / CBAHI
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const QualityManagement = lazyWithRetry(
  () => import('../pages/quality-management/QualityManagement')
);

const ManagementReviewAdmin = lazyWithRetry(() => import('../pages/Quality/ManagementReviewAdmin'));

const EvidenceVaultAdmin = lazyWithRetry(() => import('../pages/Quality/EvidenceVaultAdmin'));

const ComplianceCalendarAdmin = lazyWithRetry(
  () => import('../pages/Quality/ComplianceCalendarAdmin')
);

const PdplSubjectRequestsAdmin = lazyWithRetry(
  () => import('../pages/Quality/PdplSubjectRequestsAdmin')
);

const PdplConsentsAdmin = lazyWithRetry(() => import('../pages/Quality/PdplConsentsAdmin'));

const PdplBreachReportingAdmin = lazyWithRetry(
  () => import('../pages/Quality/PdplBreachReportingAdmin')
);

const PdplProcessingRecordsAdmin = lazyWithRetry(
  () => import('../pages/Quality/PdplProcessingRecordsAdmin')
);

const PdplComplianceDashboard = lazyWithRetry(
  () => import('../pages/Quality/PdplComplianceDashboard')
);

const PiiAccessAuditAdmin = lazyWithRetry(() => import('../pages/Quality/PiiAccessAuditAdmin'));

export default function QualityManagementRoutes() {
  return (
    <>
      <Route path="/quality-management" element={<QualityManagement />} />

      {/* ISO 9001 §9.3 — مراجعات الإدارة الدورية (CBAHI) */}
      <Route path="/quality/management-review" element={<ManagementReviewAdmin />} />

      {/* خزنة الأدلة — hash + retention + chain-of-custody (CBAHI) */}
      <Route path="/quality/evidence" element={<EvidenceVaultAdmin />} />

      {/* تقويم الامتثال — تجديد التراخيص + مواعيد CBAHI/MOH */}
      <Route path="/quality/compliance-calendar" element={<ComplianceCalendarAdmin />} />

      {/* PDPL مادة 4 — طلبات أصحاب البيانات بمهلة 30 يوم */}
      <Route path="/quality/pdpl/subject-requests" element={<PdplSubjectRequestsAdmin />} />

      {/* PDPL مادة 6 — إدارة الموافقات لكل مستخدم */}
      <Route path="/quality/pdpl/consents" element={<PdplConsentsAdmin />} />

      {/* PDPL مادة 20 — الإبلاغ عن خرق البيانات (مهلة 72 ساعة لـ SDAIA) */}
      <Route path="/quality/pdpl/breaches" element={<PdplBreachReportingAdmin />} />

      {/* PDPL مادة 32 — سجل أنشطة المعالجة (للتفتيش من SDAIA) */}
      <Route path="/quality/pdpl/processing-records" element={<PdplProcessingRecordsAdmin />} />

      {/* PDPL — لوحة الامتثال الموحّدة (نقطة دخول DPO) */}
      <Route path="/quality/pdpl" element={<PdplComplianceDashboard />} />

      {/* PDPL مادة 13 — سجل وصول البيانات الشخصية (مَن نظر إلى ماذا؟) */}
      <Route path="/quality/pdpl/access-audit" element={<PiiAccessAuditAdmin />} />
    </>
  );
}
