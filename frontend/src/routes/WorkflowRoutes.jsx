/**
 * Workflow, Operations & Business Routes
 * مسارات سير العمل والعمليات والأعمال
 */
import { lazyWithRetry } from '../utils/lazyLoader';

// Workflow System
const WorkflowDashboard = lazyWithRetry(() => import('../pages/workflow/WorkflowDashboard'));
const WorkflowBuilder = lazyWithRetry(() => import('../pages/workflow/WorkflowBuilder'));
const WorkflowMyTasks = lazyWithRetry(() => import('../pages/workflow/WorkflowMyTasks'));
const WorkflowInstanceDetail = lazyWithRetry(() => import('../pages/workflow/WorkflowInstanceDetail'));
const WorkflowInstances = lazyWithRetry(() => import('../pages/workflow/WorkflowInstances'));
const WorkflowTemplates = lazyWithRetry(() => import('../pages/workflow/WorkflowTemplates'));
const WorkflowAnalytics = lazyWithRetry(() => import('../pages/workflow/WorkflowAnalytics'));

// Workflow Enhanced Features — الميزات المتقدمة
const WorkflowCalendar = lazyWithRetry(() => import('../pages/workflow/WorkflowCalendar'));
const WorkflowDelegation = lazyWithRetry(() => import('../pages/workflow/WorkflowDelegation'));
const WorkflowReports = lazyWithRetry(() => import('../pages/workflow/WorkflowReports'));
const WorkflowTags = lazyWithRetry(() => import('../pages/workflow/WorkflowTags'));
const WorkflowExtendedTemplates = lazyWithRetry(
  () => import('../pages/workflow/WorkflowExtendedTemplates')
);
const WorkflowSearch = lazyWithRetry(() => import('../pages/workflow/WorkflowSearch'));
const WorkflowWebhooks = lazyWithRetry(() => import('../pages/workflow/WorkflowWebhooks'));
const WorkflowNotificationPrefs = lazyWithRetry(
  () => import('../pages/workflow/WorkflowNotificationPrefs')
);

// Workflow Pro Features — الميزات الاحترافية
const WorkflowFormBuilder = lazyWithRetry(() => import('../pages/workflow/WorkflowFormBuilder'));
const WorkflowEscalations = lazyWithRetry(() => import('../pages/workflow/WorkflowEscalations'));
const WorkflowSLAPolicies = lazyWithRetry(() => import('../pages/workflow/WorkflowSLAPolicies'));
const WorkflowKPIDashboard = lazyWithRetry(() => import('../pages/workflow/WorkflowKPIDashboard'));
const WorkflowApprovalChains = lazyWithRetry(() => import('../pages/workflow/WorkflowApprovalChains'));
const WorkflowAutomations = lazyWithRetry(() => import('../pages/workflow/WorkflowAutomations'));

// Operations & Assets
const OperationsDashboard = lazyWithRetry(() => import('../pages/Operations/OperationsDashboard'));
const OperationsManagement = lazyWithRetry(() => import('../pages/Operations'));
const InventoryManagement = lazyWithRetry(() => import('../pages/supply-chain/InventoryManagement'));
const PurchasingManagement = lazyWithRetry(() => import('../pages/supply-chain/PurchasingManagement'));
const EquipmentManagement = lazyWithRetry(() => import('../pages/Operations/EquipmentManagement'));
const InternalAuditPage = lazyWithRetry(() => import('../pages/Operations/InternalAuditPage'));
const IncidentManagement = lazyWithRetry(() => import('../pages/Operations/IncidentManagement'));
const LicenseManagement = lazyWithRetry(() => import('../pages/Operations/LicenseManagement'));
const RehabCenterLicenses = lazyWithRetry(() => import('../pages/Operations/RehabCenterLicenses'));

// Branch Warehouse & Purchasing
const BranchWarehouseManagement = lazyWithRetry(
  () => import('../pages/supply-chain/BranchWarehouseManagement')
);
const StockTransfers = lazyWithRetry(() => import('../pages/supply-chain/StockTransfers'));
const BranchPurchasing = lazyWithRetry(() => import('../pages/supply-chain/BranchPurchasing'));
const BranchReports = lazyWithRetry(() => import('../pages/supply-chain/BranchReports'));

// Fleet & Transport
const FleetDashboard = lazyWithRetry(() => import('../pages/Fleet/FleetDashboard'));
const FleetManagement = lazyWithRetry(() => import('../pages/Fleet/FleetManagement'));
const VehicleManagement = lazyWithRetry(() => import('../pages/Fleet/VehicleManagement'));
const InsuranceManagement = lazyWithRetry(() => import('../pages/hr/InsuranceManagement'));
const TransportManagement = lazyWithRetry(() => import('../pages/Fleet/TransportManagement'));

// Quality & Compliance
const QualityDashboard = lazyWithRetry(() => import('../pages/common/QualityDashboard'));
const QualityCompliance = lazyWithRetry(() => import('../pages/QualityCompliance'));

// Contracts
const ContractsDashboard = lazyWithRetry(() => import('../pages/supply-chain/ContractsDashboard'));
const ContractsManagement = lazyWithRetry(() => import('../pages/supply-chain/ContractsManagement'));

// CRM
const CRMDashboard = lazyWithRetry(() => import('../pages/crm/CRMDashboard'));
const ContactsManagement = lazyWithRetry(() => import('../pages/crm/ContactsManagement'));
const LeadsManagement = lazyWithRetry(() => import('../pages/crm/LeadsManagement'));
const CRMReports = lazyWithRetry(() => import('../pages/crm/CRMReports'));

// E-Signature & E-Stamp
const ESignature = lazyWithRetry(() => import('../pages/e-signature/ESignature'));
const ESignatureCreate = lazyWithRetry(() => import('../pages/e-signature/ESignatureCreate'));
const ESignatureSigning = lazyWithRetry(() => import('../pages/e-signature/ESignatureSigning'));
const ESignatureVerify = lazyWithRetry(() => import('../pages/e-signature/ESignatureVerify'));
const ESignatureTemplates = lazyWithRetry(() => import('../pages/e-signature/ESignatureTemplates'));
const EStamp = lazyWithRetry(() => import('../pages/e-signature/EStamp'));
const EStampCreate = lazyWithRetry(() => import('../pages/e-signature/EStampCreate'));
const EStampDetail = lazyWithRetry(() => import('../pages/e-signature/EStampDetail'));
const EStampApply = lazyWithRetry(() => import('../pages/e-signature/EStampApply'));
const EStampVerify = lazyWithRetry(() => import('../pages/e-signature/EStampVerify'));

// Phase 21 Features
const SmartNotificationCenter = lazyWithRetry(() => import('../pages/common/SmartNotificationCenter'));
const AdvancedTickets = lazyWithRetry(() => import('../pages/common/AdvancedTickets'));
const EInvoicing = lazyWithRetry(() => import('../pages/finance/EInvoicing'));
const MeetingsManagement = lazyWithRetry(() => import('../pages/common/MeetingsManagement'));
const VisitorRegistry = lazyWithRetry(() => import('../pages/Operations/VisitorRegistry'));
const FormTemplates = lazyWithRetry(() => import('../pages/common/FormTemplates'));

// Phase 23 Modules
const MaintenanceDashboard = lazyWithRetry(() => import('../pages/Operations/MaintenanceDashboard'));
const VendorManagement = lazyWithRetry(() => import('../pages/supply-chain/VendorManagement'));
const DonationsDashboard = lazyWithRetry(() => import('../pages/finance/DonationsDashboard'));
const ComplaintsManagement = lazyWithRetry(() => import('../pages/common/ComplaintsManagement'));
const TaskManagement = lazyWithRetry(() => import('../pages/common/TaskManagement'));
const KnowledgeCenter = lazyWithRetry(() => import('../pages/common/KnowledgeCenter'));
const RiskAssessment = lazyWithRetry(() => import('../pages/Operations/RiskAssessment'));
const ProjectManagementDashboard = lazyWithRetry(
  () => import('../pages/common/ProjectManagementDashboard')
);

export default function WorkflowRoutes() {
  return (
    <>
      {/* Workflow System */}
      <Route path="workflow" element={<WorkflowDashboard />} />
      <Route path="workflow/builder" element={<WorkflowBuilder />} />
      <Route path="workflow/builder/:id" element={<WorkflowBuilder />} />
      <Route path="workflow/my-tasks" element={<WorkflowMyTasks />} />
      <Route path="workflow/instances" element={<WorkflowInstances />} />
      <Route path="workflow/instances/:id" element={<WorkflowInstanceDetail />} />
      <Route path="workflow/templates" element={<WorkflowTemplates />} />
      <Route path="workflow/analytics" element={<WorkflowAnalytics />} />

      {/* Workflow Enhanced Features — الميزات المتقدمة */}
      <Route path="workflow/calendar" element={<WorkflowCalendar />} />
      <Route path="workflow/delegation" element={<WorkflowDelegation />} />
      <Route path="workflow/reports" element={<WorkflowReports />} />
      <Route path="workflow/tags" element={<WorkflowTags />} />
      <Route path="workflow/extended-templates" element={<WorkflowExtendedTemplates />} />
      <Route path="workflow/search" element={<WorkflowSearch />} />
      <Route path="workflow/webhooks" element={<WorkflowWebhooks />} />
      <Route path="workflow/notification-prefs" element={<WorkflowNotificationPrefs />} />

      {/* Workflow Pro Features — الميزات الاحترافية */}
      <Route path="workflow/form-builder" element={<WorkflowFormBuilder />} />
      <Route path="workflow/escalations" element={<WorkflowEscalations />} />
      <Route path="workflow/sla-policies" element={<WorkflowSLAPolicies />} />
      <Route path="workflow/kpi-dashboard" element={<WorkflowKPIDashboard />} />
      <Route path="workflow/approval-chains" element={<WorkflowApprovalChains />} />
      <Route path="workflow/automations" element={<WorkflowAutomations />} />

      {/* CRM System */}
      <Route path="crm" element={<CRMDashboard />} />
      <Route path="crm/contacts" element={<ContactsManagement />} />
      <Route path="crm/leads" element={<LeadsManagement />} />
      <Route path="crm/reports" element={<CRMReports />} />

      {/* Operations & Assets */}
      <Route path="operations-dashboard" element={<OperationsDashboard />} />
      <Route path="operations" element={<OperationsManagement />} />
      <Route path="inventory" element={<InventoryManagement />} />
      <Route path="purchasing" element={<PurchasingManagement />} />
      <Route path="procurement" element={<Navigate to="/purchasing" replace />} />
      <Route path="equipment" element={<EquipmentManagement />} />
      <Route path="internal-audit" element={<InternalAuditPage />} />
      <Route path="incidents" element={<IncidentManagement />} />
      <Route path="licenses" element={<LicenseManagement />} />
      <Route path="rehab-licenses" element={<RehabCenterLicenses />} />

      {/* Branch Warehouse & Purchasing */}
      <Route path="branch-warehouses" element={<BranchWarehouseManagement />} />
      <Route path="stock-transfers" element={<StockTransfers />} />
      <Route path="branch-purchasing" element={<BranchPurchasing />} />
      <Route path="branch-reports" element={<BranchReports />} />

      {/* Fleet & Transport */}
      <Route path="fleet-dashboard" element={<FleetDashboard />} />
      <Route path="fleet" element={<FleetManagement />} />
      <Route path="vehicle-management" element={<VehicleManagement />} />
      <Route path="insurance-management" element={<InsuranceManagement />} />
      <Route path="transport-management" element={<TransportManagement />} />

      {/* Quality & Compliance */}
      <Route path="quality-dashboard" element={<QualityDashboard />} />
      <Route path="quality" element={<QualityCompliance />} />

      {/* Contracts */}
      <Route path="contracts-dashboard" element={<ContractsDashboard />} />
      <Route path="contracts" element={<ContractsManagement />} />

      {/* E-Signature */}
      <Route path="e-signature" element={<ESignature />} />
      <Route path="e-signature/create" element={<ESignatureCreate />} />
      <Route path="e-signature/sign/:id" element={<ESignatureSigning />} />
      <Route path="e-signature/verify" element={<ESignatureVerify />} />
      <Route path="e-signature/verify/:id" element={<ESignatureVerify />} />
      <Route path="e-signature/templates" element={<ESignatureTemplates />} />

      {/* E-Stamp */}
      <Route path="e-stamp" element={<EStamp />} />
      <Route path="e-stamp/create" element={<EStampCreate />} />
      <Route path="e-stamp/:id" element={<EStampDetail />} />
      <Route path="e-stamp/apply/:id" element={<EStampApply />} />
      <Route path="e-stamp/verify" element={<EStampVerify />} />

      {/* E-Invoicing */}
      <Route path="e-invoicing" element={<EInvoicing />} />

      {/* Notifications, Tickets, Meetings, Visitors */}
      <Route path="smart-notifications" element={<SmartNotificationCenter />} />
      <Route path="advanced-tickets" element={<AdvancedTickets />} />
      <Route path="meetings" element={<MeetingsManagement />} />
      <Route path="visitors" element={<VisitorRegistry />} />
      <Route path="form-templates" element={<FormTemplates />} />

      {/* Projects & Tasks */}
      <Route path="projects" element={<ProjectManagementDashboard />} />
      <Route path="tasks" element={<TaskManagement />} />

      {/* Phase 23: ERP Modules */}
      <Route path="maintenance" element={<MaintenanceDashboard />} />
      <Route path="vendors" element={<VendorManagement />} />
      <Route path="donations" element={<DonationsDashboard />} />
      <Route path="complaints" element={<ComplaintsManagement />} />
      <Route path="knowledge-center" element={<KnowledgeCenter />} />
      <Route path="risk-assessment" element={<RiskAssessment />} />
    </>
  );
}
