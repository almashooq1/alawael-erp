/**
 * Enterprise Pro Routes
 * مسارات الميزات المؤسسية الاحترافية
 * (التدقيق، التقارير، التقويم، CRM، المستودعات، المشاريع)
 */
import { lazyWithRetry } from '../utils/lazyLoader';

// ─── Enterprise Pro Pages ───
const AuditComplianceHub = lazyWithRetry(() => import('../pages/enterprise/AuditComplianceHub'));
const ReportBuilderPage = lazyWithRetry(() => import('../pages/enterprise/ReportBuilderPage'));
const CalendarHubPage = lazyWithRetry(() => import('../pages/enterprise/CalendarHubPage'));
const CRMProPage = lazyWithRetry(() => import('../pages/enterprise/CRMProPage'));
const WarehouseIntelPage = lazyWithRetry(() => import('../pages/enterprise/WarehouseIntelPage'));
const ProjectProPage = lazyWithRetry(() => import('../pages/enterprise/ProjectProPage'));
const ImportExportHub = lazyWithRetry(() => import('../pages/enterprise/ImportExportHub'));

export default function EnterpriseRoutes() {
  return (
    <>
      {/* مركز التدقيق والامتثال */}
      <Route path="audit-compliance" element={<AuditComplianceHub />} />
      {/* مولد التقارير المتقدم */}
      <Route path="report-builder" element={<ReportBuilderPage />} />
      {/* التقويم الموحد */}
      <Route path="calendar-hub" element={<CalendarHubPage />} />
      {/* إدارة العلاقات المتقدمة */}
      <Route path="crm-pro" element={<CRMProPage />} />
      {/* المستودعات الذكية */}
      <Route path="warehouse-intelligence" element={<WarehouseIntelPage />} />
      {/* إدارة المشاريع الاحترافية */}
      <Route path="project-management" element={<ProjectProPage />} />
      {/* مركز الاستيراد والتصدير الاحترافي */}
      <Route path="import-export" element={<ImportExportHub />} />
    </>
  );
}
