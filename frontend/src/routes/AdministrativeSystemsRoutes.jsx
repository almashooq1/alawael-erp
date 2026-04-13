/**
 * Administrative Systems Routes — مسارات الأنظمة الإدارية المكملة
 * Strategic Planning, Meetings, Visitors, Knowledge Center,
 * Complaints, Org Structure, Succession Planning, Facility Management
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

// Pages
const StrategicPlanningPage = lazyWithRetry(() => import('../pages/strategic-planning/StrategicPlanningPage'));
const MeetingManagementPage = lazyWithRetry(() => import('../pages/meetings/MeetingManagementPage'));
const VisitorManagementPage = lazyWithRetry(() => import('../pages/visitors/VisitorManagementPage'));
const KnowledgeCenterPage = lazyWithRetry(() => import('../pages/knowledge/KnowledgeCenterPage'));
const ComplaintsManagementPage = lazyWithRetry(() => import('../pages/complaints/ComplaintsManagementPage'));
const OrgStructurePage = lazyWithRetry(() => import('../pages/org-structure/OrgStructurePage'));
const SuccessionPlanningPage = lazyWithRetry(() => import('../pages/succession/SuccessionPlanningPage'));
const FacilityManagementPage = lazyWithRetry(() => import('../pages/facility/FacilityManagementPage'));

export default function AdministrativeSystemsRoutes() {
  return (
    <>
      {/* التخطيط الاستراتيجي */}
      <Route path="strategic-planning" element={<StrategicPlanningPage />} />

      {/* إدارة الاجتماعات */}
      <Route path="meetings" element={<MeetingManagementPage />} />

      {/* إدارة الزوار */}
      <Route path="visitors" element={<VisitorManagementPage />} />

      {/* مركز المعرفة */}
      <Route path="knowledge-center" element={<KnowledgeCenterPage />} />

      {/* إدارة الشكاوى والمقترحات */}
      <Route path="complaints" element={<ComplaintsManagementPage />} />

      {/* الهيكل التنظيمي */}
      <Route path="org-structure" element={<OrgStructurePage />} />

      {/* تخطيط التعاقب الوظيفي */}
      <Route path="succession-planning" element={<SuccessionPlanningPage />} />

      {/* إدارة المرافق */}
      <Route path="facility-management" element={<FacilityManagementPage />} />
    </>
  );
}
