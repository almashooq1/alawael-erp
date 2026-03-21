/**
 * Enterprise Pro Plus Routes
 * مسارات الميزات المؤسسية الاحترافية المتقدمة
 * (التوظيف، المرافق، الموردين، ITSM، السلامة، التخطيط الاستراتيجي)
 */
import { lazyWithRetry } from '../utils/lazyLoader';

// ─── Enterprise Pro Plus Pages ───
const TalentAcquisitionPage = lazyWithRetry(() => import('../pages/enterprise-plus/TalentAcquisitionPage'));
const FacilityManagementPage = lazyWithRetry(() => import('../pages/enterprise-plus/FacilityManagementPage'));
const VendorManagementPage = lazyWithRetry(() => import('../pages/enterprise-plus/VendorManagementPage'));
const ITSMPage = lazyWithRetry(() => import('../pages/enterprise-plus/ITSMPage'));
const EHSSafetyPage = lazyWithRetry(() => import('../pages/enterprise-plus/EHSSafetyPage'));
const StrategicPlanningPage = lazyWithRetry(() => import('../pages/enterprise-plus/StrategicPlanningPage'));

export default function EnterpriseProPlusRoutes() {
  return (
    <>
      {/* التوظيف واستقطاب المواهب */}
      <Route path="talent-acquisition" element={<TalentAcquisitionPage />} />
      {/* إدارة المرافق والعقارات */}
      <Route path="facility-management" element={<FacilityManagementPage />} />
      {/* إدارة علاقات الموردين */}
      <Route path="vendor-management" element={<VendorManagementPage />} />
      {/* إدارة خدمات تقنية المعلومات */}
      <Route path="itsm" element={<ITSMPage />} />
      {/* السلامة والصحة المهنية */}
      <Route path="ehs-safety" element={<EHSSafetyPage />} />
      {/* التخطيط الاستراتيجي */}
      <Route path="strategic-planning" element={<StrategicPlanningPage />} />
    </>
  );
}
