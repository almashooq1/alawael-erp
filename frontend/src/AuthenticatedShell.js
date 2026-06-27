/**
 * AuthenticatedShell — Heavy providers + all routes.
 * Only loaded AFTER successful login (lazy import from App.js).
 * This keeps the login page fast and lightweight.
 */
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SessionTimeoutGuard } from './components/guards/RouteGuards';
import { DashboardSkeleton } from './components/ui/LoadingSkeleton';
import { ToastProvider } from './components/ui/NotificationToast';
import { lazyWithRetry } from './utils/lazyLoader';
import ProLayout from './components/Layout/ProLayout';
import SafeRouteWrapper from './components/SafeRouteWrapper';
import logger from './utils/logger';

// Route Modules
const FinanceRoutes = lazyWithRetry(() => import('./routes/FinanceRoutes'));
const HRRoutes = lazyWithRetry(() => import('./routes/HRRoutes'));
const AdminRoutes = lazyWithRetry(() => import('./routes/AdminRoutes'));
const RehabRoutes = lazyWithRetry(() => import('./routes/RehabRoutes'));
const EducationRoutes = lazyWithRetry(() => import('./routes/EducationRoutes'));
const WorkflowRoutes = lazyWithRetry(() => import('./routes/WorkflowRoutes'));
const PortalRoutes = lazyWithRetry(() => import('./routes/PortalRoutes'));
const EnterpriseRoutes = lazyWithRetry(() => import('./routes/EnterpriseRoutes'));
const EnterpriseProPlusRoutes = lazyWithRetry(() => import('./routes/EnterpriseProPlusRoutes'));
const EnterpriseUltraRoutes = lazyWithRetry(() => import('./routes/EnterpriseUltraRoutes'));
const GovernmentIntegrationRoutes = lazyWithRetry(() => import('./routes/GovernmentIntegrationRoutes'));
const AdministrativeSystemsRoutes = lazyWithRetry(() => import('./routes/AdministrativeSystemsRoutes'));
const BIDashboardRoutes = lazyWithRetry(() => import('./routes/BIDashboardRoutes'));
const BIAnalyticsRoutes = lazyWithRetry(() => import('./routes/BIAnalyticsRoutes'));
const WarehouseRoutes = lazyWithRetry(() => import('./routes/WarehouseRoutes'));
const LegalAffairsRoutes = lazyWithRetry(() => import('./routes/LegalAffairsRoutes'));
const TrainingRoutes = lazyWithRetry(() => import('./routes/TrainingRoutes'));
const EventManagementRoutes = lazyWithRetry(() => import('./routes/EventManagementRoutes'));
const PublicRelationsRoutes = lazyWithRetry(() => import('./routes/PublicRelationsRoutes'));
const RiskManagementRoutes = lazyWithRetry(() => import('./routes/RiskManagementRoutes'));
const InternalAuditRoutes = lazyWithRetry(() => import('./routes/InternalAuditRoutes'));
const AssetManagementRoutes = lazyWithRetry(() => import('./routes/AssetManagementRoutes'));
const HelpDeskRoutes = lazyWithRetry(() => import('./routes/HelpDeskRoutes'));
const HSERoutes = lazyWithRetry(() => import('./routes/HSERoutes'));
const ProjectManagementRoutes = lazyWithRetry(() => import('./routes/ProjectManagementRoutes'));
const ContractManagementRoutes = lazyWithRetry(() => import('./routes/ContractManagementRoutes'));
const ProcurementRoutes = lazyWithRetry(() => import('./routes/ProcurementRoutes'));
const RecruitmentRoutes = lazyWithRetry(() => import('./routes/RecruitmentRoutes'));
const FleetRoutes = lazyWithRetry(() => import('./routes/FleetRoutes'));
const CrisisManagementRoutes = lazyWithRetry(() => import('./routes/CrisisManagementRoutes'));
const PayrollRoutes = lazyWithRetry(() => import('./routes/PayrollRoutes'));
const EmployeeAffairsRoutes = lazyWithRetry(() => import('./routes/EmployeeAffairsRoutes'));
const AttendanceRoutes = lazyWithRetry(() => import('./routes/AttendanceRoutes'));
const MessagingRoutes = lazyWithRetry(() => import('./routes/MessagingRoutes'));
const QualityComplianceRoutes = lazyWithRetry(() => import('./routes/QualityComplianceRoutes'));
const StrategicPlanningRoutes = lazyWithRetry(() => import('./routes/StrategicPlanningRoutes'));
const DocumentManagementRoutes = lazyWithRetry(() => import('./routes/DocumentManagementRoutes'));
const MeetingsRoutes = lazyWithRetry(() => import('./routes/MeetingsRoutes'));
const SupplyChainRoutes = lazyWithRetry(() => import('./routes/SupplyChainRoutes'));
const PerformanceRoutes = lazyWithRetry(() => import('./routes/PerformanceRoutes'));
const StudentManagementRoutes = lazyWithRetry(() => import('./routes/StudentManagementRoutes'));
const DisabilityRoutes = lazyWithRetry(() => import('./routes/DisabilityRoutes'));
const VisitorsRoutes = lazyWithRetry(() => import('./routes/VisitorsRoutes'));
const ComplaintsRoutes = lazyWithRetry(() => import('./routes/ComplaintsRoutes'));
const FacilityRoutes = lazyWithRetry(() => import('./routes/FacilityRoutes'));
const KnowledgeCenterRoutes = lazyWithRetry(() => import('./routes/KnowledgeCenterRoutes'));
const IntegratedCareRoutes = lazyWithRetry(() => import('./routes/IntegratedCareRoutes'));
const SessionsRoutes = lazyWithRetry(() => import('./routes/SessionsRoutes'));
const ESignatureRoutes = lazyWithRetry(() => import('./routes/ESignatureRoutes'));
const TreatmentAuthRoutes = lazyWithRetry(() => import('./routes/TreatmentAuthRoutes'));
const FamilySatisfactionRoutes = lazyWithRetry(() => import('./routes/FamilySatisfactionRoutes'));
const SuccessionRoutes = lazyWithRetry(() => import('./routes/SuccessionRoutes'));
const MontessoriRoutes = lazyWithRetry(() => import('./routes/MontessoriRoutes'));
const BeneficiaryRoutes = lazyWithRetry(() => import('./routes/BeneficiaryRoutes'));
const LeaveManagementRoutes = lazyWithRetry(() => import('./routes/LeaveManagementRoutes'));
const HRInsuranceRoutes = lazyWithRetry(() => import('./routes/HRInsuranceRoutes'));
const OrgStructureRoutes = lazyWithRetry(() => import('./routes/OrgStructureRoutes'));
const ReportsRoutes = lazyWithRetry(() => import('./routes/ReportsRoutes'));
const CRMRoutes = lazyWithRetry(() => import('./routes/CRMRoutes'));
const OperationsRoutes = lazyWithRetry(() => import('./routes/OperationsRoutes'));
const MedicalFilesRoutes = lazyWithRetry(() => import('./routes/MedicalFilesRoutes'));
const EMRRoutes = lazyWithRetry(() => import('./routes/EMRRoutes'));
const KitchenRoutes = lazyWithRetry(() => import('./routes/KitchenRoutes'));
const LaundryRoutes = lazyWithRetry(() => import('./routes/LaundryRoutes'));
const CommunityRoutes = lazyWithRetry(() => import('./routes/CommunityRoutes'));
const VolunteerRoutes = lazyWithRetry(() => import('./routes/VolunteerRoutes'));
const MHPSSRoutes = lazyWithRetry(() => import('./routes/MHPSSRoutes'));
const IndependentLivingRoutes = lazyWithRetry(() => import('./routes/IndependentLivingRoutes'));
const ResearchRoutes = lazyWithRetry(() => import('./routes/ResearchRoutes'));
const ECommerceRoutes = lazyWithRetry(() => import('./routes/ECommerceRoutes'));
const CMSRoutes = lazyWithRetry(() => import('./routes/CMSRoutes'));
const WaitlistRoutes = lazyWithRetry(() => import('./routes/WaitlistRoutes'));
const GPSTrackingRoutes = lazyWithRetry(() => import('./routes/GPSTrackingRoutes'));
const IoTRoutes = lazyWithRetry(() => import('./routes/IoTRoutes'));
const SSOAdminRoutes = lazyWithRetry(() => import('./routes/SSOAdminRoutes'));
const BlockchainRoutes = lazyWithRetry(() => import('./routes/BlockchainRoutes'));
const ICFAssessmentRoutes = lazyWithRetry(() => import('./routes/ICFAssessmentRoutes'));
const ClinicalRoutes = lazyWithRetry(() => import('./routes/ClinicalRoutes'));
const SessionICFRoutes = lazyWithRetry(() => import('./routes/SessionICFRoutes'));
const MDTCoordinationRoutes = lazyWithRetry(() => import('./routes/MDTCoordinationRoutes'));
const ARRehabRoutes = lazyWithRetry(() => import('./routes/ARRehabRoutes'));
const TelehealthRoutes = lazyWithRetry(() => import('./routes/TelehealthRoutes'));
const BusTrackingRoutes = lazyWithRetry(() => import('./routes/BusTrackingRoutes'));
const ReportBuilderRoutes = lazyWithRetry(() => import('./routes/ReportBuilderRoutes'));
const LibraryRoutes = lazyWithRetry(() => import('./routes/LibraryRoutes'));
const ChatRoutes = lazyWithRetry(() => import('./routes/ChatRoutes'));
const AIDiagnosticRoutes = lazyWithRetry(() => import('./routes/AIDiagnosticRoutes'));
const AIPredictiveRoutes = lazyWithRetry(() => import('./routes/AIPredictiveRoutes'));
const ComplianceRoutes = lazyWithRetry(() => import('./routes/ComplianceRoutes'));
const OCRDocumentRoutes = lazyWithRetry(() => import('./routes/OCRDocumentRoutes'));
const CEODashboardRoutes = lazyWithRetry(() => import('./routes/CEODashboardRoutes'));
const ExecutiveRoutes = lazyWithRetry(() => import('./routes/ExecutiveRoutes'));
const QualityManagementRoutes = lazyWithRetry(() => import('./routes/QualityManagementRoutes'));
const WorkforceAnalyticsRoutes = lazyWithRetry(() => import('./routes/WorkforceAnalyticsRoutes'));
const LearningDevelopmentRoutes = lazyWithRetry(() => import('./routes/LearningDevelopmentRoutes'));
const AutomatedBackupRoutes = lazyWithRetry(() => import('./routes/AutomatedBackupRoutes'));
const WafRateLimitRoutes = lazyWithRetry(() => import('./routes/WafRateLimitRoutes'));
const PrintCenterRoutes = lazyWithRetry(() => import('./routes/PrintCenterRoutes'));
const CarePlanRoutes = lazyWithRetry(() => import('./routes/CarePlanRoutes'));
const MuqeemRoutes = lazyWithRetry(() => import('./routes/MuqeemRoutes'));
const ZatcaPhase2Routes = lazyWithRetry(() => import('./routes/ZatcaPhase2Routes'));
const NphiesRoutes = lazyWithRetry(() => import('./routes/NphiesRoutes'));
const AuditLogsRoutes = lazyWithRetry(() => import('./routes/AuditLogsRoutes'));
const EpisodesRoutes = lazyWithRetry(() => import('./routes/EpisodesRoutes'));
const Beneficiary360Routes = lazyWithRetry(() => import('./routes/Beneficiary360Routes'));
const MeasuresLibraryRoutes = lazyWithRetry(() => import('./routes/MeasuresLibraryRoutes'));
const DDDRoutes = lazyWithRetry(() => import('./routes/DDDRoutes'));
const TeleRehabRoutes = lazyWithRetry(() => import('./routes/TeleRehabRoutes'));
const EquipmentLifecycleRoutes = lazyWithRetry(() => import('./routes/EquipmentLifecycleRoutes'));
const SocialMediaRoutes = lazyWithRetry(() => import('./routes/SocialMediaRoutes'));
const CDSSRoutes = lazyWithRetry(() => import('./routes/CDSSRoutes'));
const WhatsAppChatbotRoutes = lazyWithRetry(() => import('./routes/WhatsAppChatbotRoutes'));
const GroupTherapyRoutes = lazyWithRetry(() => import('./routes/GroupTherapyRoutes'));
const FamilyEngagementRoutes = lazyWithRetry(() => import('./routes/FamilyEngagementRoutes'));
const PostRehabRoutes = lazyWithRetry(() => import('./routes/PostRehabRoutes'));
const ParentPortalRoutes = lazyWithRetry(() => import('./routes/ParentPortalRoutes'));
const GamificationRoutes = lazyWithRetry(() => import('./routes/GamificationRoutes'));
const CCTVRoutes = lazyWithRetry(() => import('./routes/CCTVRoutes'));
const MobileAppRoutes = lazyWithRetry(() => import('./routes/MobileAppRoutes'));

// Pages
const Home = lazyWithRetry(() => import('./pages/common/Home'));
const NotFound = lazyWithRetry(() => import('./pages/common/NotFound'));
const EntityFormPage = lazyWithRetry(() => import('./pages/common/EntityFormPage'));
const EntityDetailPage = lazyWithRetry(() => import('./pages/common/EntityDetailPage'));
const FileUploadPage = lazyWithRetry(() => import('./pages/common/FileUploadPage'));

// Registry objects (must be static — not React components)
import CREATE_FORMS from './pages/createForms/registry';
import DETAIL_VIEWS from './pages/createForms/detailViews';
import EDIT_FORMS from './pages/createForms/editForms';
import UPLOAD_FORMS from './pages/createForms/uploadForms';

// Lazy pages
const Dashboard = lazyWithRetry(() => import('./pages/common/SimpleDashboard'));
const AdvancedDashboard = lazyWithRetry(() => import('./components/dashboard/AdvancedDashboard'));
const AdvancedDashboardUI = lazyWithRetry(() => import('./pages/Dashboard/AdvancedDashboardUI'));
const ProDashboard = lazyWithRetry(
  () => import('./components/dashboard/AdvancedDashboard/ProDashboardLayout')
);
const AdvancedReportsPage = lazyWithRetry(() => import('./pages/Reports/AdvancedReportsPage'));
const AdminBookings = lazyWithRetry(() => import('./pages/Admin/AdminBookings'));
const AdminApplications = lazyWithRetry(() => import('./pages/Admin/AdminApplications'));
const AdminBranches = lazyWithRetry(() => import('./pages/Admin/AdminBranches'));
const AdminBeneficiaries = lazyWithRetry(() => import('./pages/Admin/AdminBeneficiaries'));
const AdminTherapySessions = lazyWithRetry(() => import('./pages/Admin/AdminTherapySessions'));
const AdminAssessments = lazyWithRetry(() => import('./pages/Admin/AdminAssessments'));
const AdminCarePlans = lazyWithRetry(() => import('./pages/Admin/AdminCarePlans'));
const AdminBIAnalytics = lazyWithRetry(() => import('./pages/Admin/AdminBIAnalytics'));
const AdminInvoices = lazyWithRetry(() => import('./pages/Admin/AdminInvoices'));
const AdminClinicalDocs = lazyWithRetry(() => import('./pages/Admin/AdminClinicalDocs'));
const AdminHRCompliance = lazyWithRetry(() => import('./pages/Admin/AdminHRCompliance'));
const AdminCpeCredits = lazyWithRetry(() => import('./pages/Admin/AdminCpeCredits'));
const AdminAttendance = lazyWithRetry(() => import('./pages/Admin/AdminAttendance'));
const AdminOutcomes = lazyWithRetry(() => import('./pages/Admin/AdminOutcomes'));
const AdminNps = lazyWithRetry(() => import('./pages/Admin/AdminNps'));
const AdminGoalProgress = lazyWithRetry(() => import('./pages/Admin/AdminGoalProgress'));
const AdminUtilization = lazyWithRetry(() => import('./pages/Admin/AdminUtilization'));
const AdminWaitlist = lazyWithRetry(() => import('./pages/Admin/AdminWaitlist'));
const AdminReferrals = lazyWithRetry(() => import('./pages/Admin/AdminReferrals'));
const AdminRevenue = lazyWithRetry(() => import('./pages/Admin/AdminRevenue'));
const AdminClaimsAnalytics = lazyWithRetry(() => import('./pages/Admin/AdminClaimsAnalytics'));
const AdminRevenueForecast = lazyWithRetry(() => import('./pages/Admin/AdminRevenueForecast'));
const AdminRetention = lazyWithRetry(() => import('./pages/Admin/AdminRetention'));
const AdminComplaintsAnalytics = lazyWithRetry(
  () => import('./pages/Admin/AdminComplaintsAnalytics')
);
const AdminDocumentExpiry = lazyWithRetry(() => import('./pages/Admin/AdminDocumentExpiry'));
const AdminIncidentsAnalytics = lazyWithRetry(
  () => import('./pages/Admin/AdminIncidentsAnalytics')
);
const AdminSaudization = lazyWithRetry(() => import('./pages/Admin/AdminSaudization'));
const AdminOnboarding = lazyWithRetry(() => import('./pages/Admin/AdminOnboarding'));
const AdminGovIntegrations = lazyWithRetry(() => import('./pages/Admin/AdminGovIntegrations'));
const AdminIntegrationsOps = lazyWithRetry(() => import('./pages/Admin/AdminIntegrationsOps'));
const AdminRateLimits = lazyWithRetry(() => import('./pages/Admin/AdminRateLimits'));
const AdminAdapterAudit = lazyWithRetry(() => import('./pages/Admin/AdminAdapterAudit'));
const AdminNphiesClaims = lazyWithRetry(() => import('./pages/Admin/AdminNphiesClaims'));
const AdminNotifications = lazyWithRetry(() => import('./pages/Admin/AdminNotifications'));
const RedFlagAdmin = lazyWithRetry(() => import('./pages/Admin/RedFlagAdmin'));
const RehabDisciplinesTaxonomy = lazyWithRetry(
  () => import('./pages/rehab/RehabDisciplinesTaxonomy')
);
const RehabGoalSuggestions = lazyWithRetry(() => import('./pages/rehab/RehabGoalSuggestions'));
const BeneficiaryConsentAdmin = lazyWithRetry(
  () => import('./pages/Beneficiaries/BeneficiaryConsentAdmin')
);
const BeneficiaryTransferAdmin = lazyWithRetry(
  () => import('./pages/Beneficiaries/BeneficiaryTransferAdmin')
);
const BranchLicenseExpiryAdmin = lazyWithRetry(
  () => import('./pages/branches/BranchLicenseExpiryAdmin')
);
const CapaAdmin = lazyWithRetry(() => import('./pages/Quality/CapaAdmin'));
const PdplConsentsAdmin = lazyWithRetry(() => import('./pages/Quality/PdplConsentsAdmin'));
const SessionAmendmentAudit = lazyWithRetry(() => import('./pages/Sessions/SessionAmendmentAudit'));
const AlertsCenter = lazyWithRetry(() => import('./pages/AlertsCenter'));
const ApprovalInbox = lazyWithRetry(() => import('./pages/ApprovalInbox'));
const BranchAnalytics = lazyWithRetry(() => import('./pages/BranchAnalytics'));
const BranchDashboard = lazyWithRetry(() => import('./pages/BranchDashboard'));
const BreakGlassActivation = lazyWithRetry(() => import('./pages/BreakGlassActivation'));
const ExecutiveSnapshot = lazyWithRetry(() => import('./pages/ExecutiveSnapshot'));
const HQDashboard = lazyWithRetry(() => import('./pages/HQDashboard'));
const ArticleList = lazyWithRetry(() => import('./pages/Articles/ArticleList'));
const ArticleDetail = lazyWithRetry(() => import('./pages/Articles/ArticleDetail'));
const ParentPortalManagement = lazyWithRetry(
  () => import('./pages/ParentPortal/ParentPortalManagement')
);
const ReferralPortal = lazyWithRetry(() => import('./pages/referral/ReferralPortal'));
const InsuranceTariffsAdmin = lazyWithRetry(() => import('./pages/finance/InsuranceTariffsAdmin'));
const ZatcaCredentialsAdmin = lazyWithRetry(() => import('./pages/finance/ZatcaCredentialsAdmin'));
const MyChildrenPortal = lazyWithRetry(() => import('./pages/ParentPortal/MyChildrenPortal'));
const TherapistWorkbench = lazyWithRetry(() => import('./pages/Therapist/TherapistWorkbench'));
const ChatV2 = lazyWithRetry(() => import('./pages/chat/ChatV2'));
const TelehealthList = lazyWithRetry(() => import('./pages/telehealth/TelehealthList'));
const TelehealthRoom = lazyWithRetry(() => import('./pages/telehealth/TelehealthRoom'));
const AnalyticsDashboard = lazyWithRetry(() => import('./components/analytics/AnalyticsDashboard'));
const AdvancedReports = lazyWithRetry(() => import('./components/reports/AdvancedReports'));
const ExportImportManager = lazyWithRetry(() => import('./components/ExportImportManager'));
const MonitoringDashboard = lazyWithRetry(() => import('./pages/common/MonitoringDashboard'));
const Activity = lazyWithRetry(() => import('./pages/common/Activity'));
const Profile = lazyWithRetry(() => import('./pages/common/Profile'));
const Groups = lazyWithRetry(() => import('./pages/common/Groups'));
const GroupDetail = lazyWithRetry(() => import('./pages/common/GroupDetail'));
const Friends = lazyWithRetry(() => import('./pages/common/Friends'));
const Communications = lazyWithRetry(() => import('./pages/communications/Communications'));
const CommunicationsSystem = lazyWithRetry(
  () => import('./pages/communications/CommunicationsSystem')
);
const MessagingPage = lazyWithRetry(() => import('./pages/communications/MessagingPage'));
const WhatsAppDashboard = lazyWithRetry(() => import('./pages/whatsapp/WhatsAppDashboard'));
const Documents = lazyWithRetry(() => import('./pages/documents/Documents'));
const DocumentsPage = lazyWithRetry(() => import('./pages/documents/DocumentsMgmt'));
const SmartDocumentsPage = lazyWithRetry(() => import('./pages/documents/SmartDocumentsPage'));
const ArchivingDashboard = lazyWithRetry(() => import('./pages/documents/ElectronicArchiving'));
const DocumentAdvancedPage = lazyWithRetry(() => import('./pages/documents/DocumentAdvancedPage'));
const AIAnalyticsDashboard = lazyWithRetry(() => import('./pages/AI/AiAnalyticsDashboard'));
const MediaLibrary = lazyWithRetry(() => import('./pages/Media/MediaLibrary'));
const BudgetManagement = lazyWithRetry(() => import('./pages/finance/BudgetManagement'));
const AccountingDashboard = lazyWithRetry(() => import('./pages/finance/AccountingDashboard'));
const ExpenseManagement = lazyWithRetry(() => import('./pages/finance/ExpenseManagement'));

// Premium Dashboards
const PremiumHub = lazyWithRetry(() => import('./pages/PremiumHub'));
const TherapistProDashboard = lazyWithRetry(() => import('./pages/TherapistProDashboard'));
const KPIProDashboard = lazyWithRetry(() => import('./pages/KPIProDashboard'));
const RehabProDashboard = lazyWithRetry(() => import('./pages/RehabProDashboard'));
const AdminExecutiveDashboard = lazyWithRetry(() => import('./pages/AdminExecutiveDashboard'));
const PharmacyProDashboard = lazyWithRetry(() => import('./pages/PharmacyProDashboard'));
const LabProDashboard = lazyWithRetry(() => import('./pages/LabProDashboard'));
const InsuranceProDashboard = lazyWithRetry(() => import('./pages/InsuranceProDashboard'));
const QualityProDashboard = lazyWithRetry(() => import('./pages/QualityProDashboard'));
const TrainingProDashboard2 = lazyWithRetry(() => import('./pages/TrainingProDashboard'));
const CRMProDashboard = lazyWithRetry(() => import('./pages/CRMProDashboard'));
const OperationsProDashboard = lazyWithRetry(() => import('./pages/OperationsProDashboard'));
const NursingProDashboard = lazyWithRetry(() => import('./pages/NursingProDashboard'));
const ProcurementProDashboard = lazyWithRetry(() => import('./pages/ProcurementProDashboard'));
const RadiologyProDashboard = lazyWithRetry(() => import('./pages/RadiologyProDashboard'));
const EmergencyProDashboard = lazyWithRetry(() => import('./pages/EmergencyProDashboard'));
const RiskProDashboard = lazyWithRetry(() => import('./pages/RiskProDashboard'));
const NutritionProDashboard = lazyWithRetry(() => import('./pages/NutritionProDashboard'));
const InfectionControlProDashboard = lazyWithRetry(
  () => import('./pages/InfectionControlProDashboard')
);
const SocialWorkProDashboard = lazyWithRetry(() => import('./pages/SocialWorkProDashboard'));
const MaintenanceProDashboard = lazyWithRetry(() => import('./pages/MaintenanceProDashboard'));
const BloodBankProDashboard = lazyWithRetry(() => import('./pages/BloodBankProDashboard'));
const MedicalRecordsProDashboard = lazyWithRetry(
  () => import('./pages/MedicalRecordsProDashboard')
);
const TransportProDashboard = lazyWithRetry(() => import('./pages/TransportProDashboard'));
const ComplianceProDashboard = lazyWithRetry(() => import('./pages/ComplianceProDashboard'));
const WasteManagementProDashboard = lazyWithRetry(
  () => import('./pages/WasteManagementProDashboard')
);
const TelemedicineProDashboard = lazyWithRetry(() => import('./pages/TelemedicineProDashboard'));
const ClinicalTrialsProDashboard = lazyWithRetry(
  () => import('./pages/ClinicalTrialsProDashboard')
);
const PatientSafetyProDashboard = lazyWithRetry(() => import('./pages/PatientSafetyProDashboard'));
const CEODashboardPro = lazyWithRetry(() => import('./pages/CEODashboard'));
const HRAdvancedDashboard = lazyWithRetry(() => import('./pages/HRAdvancedDashboard'));
const FinanceDashboardPro = lazyWithRetry(() => import('./pages/FinanceDashboard'));
const PatientsDashboardPro = lazyWithRetry(() => import('./pages/PatientsDashboard'));
const ScheduleDashboardPro = lazyWithRetry(() => import('./pages/ScheduleDashboard'));
const ReportsDashboardPro = lazyWithRetry(() => import('./pages/ReportsDashboard'));
const InventoryDashboardPro = lazyWithRetry(() => import('./pages/InventoryDashboard'));
const NotificationsDashboardPro = lazyWithRetry(() => import('./pages/NotificationsDashboard'));
const SecurityDashboardPro = lazyWithRetry(() => import('./pages/SecurityDashboard'));
const AnalyticsDashboardPro = lazyWithRetry(() => import('./pages/AnalyticsDashboard'));
const SettingsDashboardPro = lazyWithRetry(() => import('./pages/SettingsDashboard'));

// Safe wrapper
function safeRoutes(fn, name) {
  try {
    return fn();
  } catch (err) {
    logger.error('[Route Error] ' + name + ':', err);
    return null;
  }
}

export default function AuthenticatedShell() {
  return (
    <SessionTimeoutGuard timeoutMs={30 * 60 * 1000} warningMs={5 * 60 * 1000}>
      <SocketProvider>
        <NotificationProvider>
          <ToastProvider>
            <Suspense fallback={<DashboardSkeleton />}>
              <Routes>
                <Route path="/" element={<SafeRouteWrapper><ProLayout /></SafeRouteWrapper>}>
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="home" element={<SafeRouteWrapper><Home /></SafeRouteWrapper>} />
                  <Route path="dashboard" element={<SafeRouteWrapper><AdvancedDashboard /></SafeRouteWrapper>} />
                  <Route path="dashboard/simple" element={<SafeRouteWrapper><Dashboard /></SafeRouteWrapper>} />
                  <Route path="monitoring" element={<SafeRouteWrapper><MonitoringDashboard /></SafeRouteWrapper>} />
                  <Route path="dashboard/advanced" element={<SafeRouteWrapper><AdvancedDashboardUI /></SafeRouteWrapper>} />
                  <Route path="dashboard/pro" element={<SafeRouteWrapper><ProDashboard /></SafeRouteWrapper>} />
                  <Route path="activity" element={<SafeRouteWrapper><Activity /></SafeRouteWrapper>} />
                  <Route path="reports" element={<SafeRouteWrapper><AdvancedReportsPage /></SafeRouteWrapper>} />
                  <Route path="admin/bookings" element={<SafeRouteWrapper><AdminBookings /></SafeRouteWrapper>} />
                  <Route path="admin/applications" element={<SafeRouteWrapper><AdminApplications /></SafeRouteWrapper>} />
                  <Route path="admin/branches" element={<SafeRouteWrapper><AdminBranches /></SafeRouteWrapper>} />
                  <Route path="admin/beneficiaries" element={<SafeRouteWrapper><AdminBeneficiaries /></SafeRouteWrapper>} />
                  <Route path="admin/therapy-sessions" element={<SafeRouteWrapper><AdminTherapySessions /></SafeRouteWrapper>} />
                  <Route path="admin/assessments" element={<SafeRouteWrapper><AdminAssessments /></SafeRouteWrapper>} />
                  <Route path="admin/care-plans" element={<SafeRouteWrapper><AdminCarePlans /></SafeRouteWrapper>} />
                  <Route path="admin/analytics" element={<SafeRouteWrapper><AdminBIAnalytics /></SafeRouteWrapper>} />
                  <Route path="admin/invoices" element={<SafeRouteWrapper><AdminInvoices /></SafeRouteWrapper>} />
                  <Route path="admin/clinical-docs" element={<SafeRouteWrapper><AdminClinicalDocs /></SafeRouteWrapper>} />
                  <Route path="admin/hr/compliance" element={<SafeRouteWrapper><AdminHRCompliance /></SafeRouteWrapper>} />
                  <Route path="admin/hr/cpe" element={<SafeRouteWrapper><AdminCpeCredits /></SafeRouteWrapper>} />
                  <Route path="admin/attendance" element={<SafeRouteWrapper><AdminAttendance /></SafeRouteWrapper>} />
                  <Route path="admin/outcomes" element={<SafeRouteWrapper><AdminOutcomes /></SafeRouteWrapper>} />
                  <Route path="admin/nps" element={<SafeRouteWrapper><AdminNps /></SafeRouteWrapper>} />
                  <Route path="admin/goal-progress" element={<SafeRouteWrapper><AdminGoalProgress /></SafeRouteWrapper>} />
                  <Route path="admin/utilization" element={<SafeRouteWrapper><AdminUtilization /></SafeRouteWrapper>} />
                  <Route path="admin/waitlist" element={<SafeRouteWrapper><AdminWaitlist /></SafeRouteWrapper>} />
                  <Route path="admin/referrals" element={<SafeRouteWrapper><AdminReferrals /></SafeRouteWrapper>} />
                  <Route path="admin/revenue" element={<SafeRouteWrapper><AdminRevenue /></SafeRouteWrapper>} />
                  <Route path="admin/claims-analytics" element={<SafeRouteWrapper><AdminClaimsAnalytics /></SafeRouteWrapper>} />
                  <Route path="admin/revenue-forecast" element={<SafeRouteWrapper><AdminRevenueForecast /></SafeRouteWrapper>} />
                  <Route path="admin/retention" element={<SafeRouteWrapper><AdminRetention /></SafeRouteWrapper>} />
                  <Route path="admin/complaints-analytics" element={<SafeRouteWrapper><AdminComplaintsAnalytics /></SafeRouteWrapper>} />
                  <Route path="admin/document-expiry" element={<SafeRouteWrapper><AdminDocumentExpiry /></SafeRouteWrapper>} />
                  <Route path="admin/incidents-analytics" element={<SafeRouteWrapper><AdminIncidentsAnalytics /></SafeRouteWrapper>} />
                  <Route path="admin/saudization" element={<SafeRouteWrapper><AdminSaudization /></SafeRouteWrapper>} />
                  <Route path="admin/onboarding" element={<SafeRouteWrapper><AdminOnboarding /></SafeRouteWrapper>} />
                  <Route path="admin/gov-integrations" element={<SafeRouteWrapper><AdminGovIntegrations /></SafeRouteWrapper>} />
                  <Route path="admin/integrations-ops" element={<SafeRouteWrapper><AdminIntegrationsOps /></SafeRouteWrapper>} />
                  <Route path="admin/rate-limits" element={<SafeRouteWrapper><AdminRateLimits /></SafeRouteWrapper>} />
                  <Route path="admin/adapter-audit" element={<SafeRouteWrapper><AdminAdapterAudit /></SafeRouteWrapper>} />
                  <Route path="admin/nphies-claims" element={<SafeRouteWrapper><AdminNphiesClaims /></SafeRouteWrapper>} />
                  <Route path="admin/notifications" element={<SafeRouteWrapper><AdminNotifications /></SafeRouteWrapper>} />
                  <Route path="admin/red-flags" element={<SafeRouteWrapper><RedFlagAdmin /></SafeRouteWrapper>} />
                  <Route path="admin/capa" element={<SafeRouteWrapper><CapaAdmin /></SafeRouteWrapper>} />
                  <Route path="admin/pdpl-consents" element={<SafeRouteWrapper><PdplConsentsAdmin /></SafeRouteWrapper>} />
                  <Route path="admin/session-amendments" element={<SafeRouteWrapper><SessionAmendmentAudit /></SafeRouteWrapper>} />
                  <Route
                    path="admin/branch-license-expiry"
                    element={<SafeRouteWrapper><BranchLicenseExpiryAdmin /></SafeRouteWrapper>}
                  />
                  <Route path="beneficiary-consents" element={<SafeRouteWrapper><BeneficiaryConsentAdmin /></SafeRouteWrapper>} />
                  <Route path="beneficiary-transfers" element={<SafeRouteWrapper><BeneficiaryTransferAdmin /></SafeRouteWrapper>} />
                  <Route path="admin/alerts" element={<SafeRouteWrapper><AlertsCenter /></SafeRouteWrapper>} />
                  <Route path="admin/break-glass" element={<SafeRouteWrapper><BreakGlassActivation /></SafeRouteWrapper>} />
                  <Route path="approvals" element={<SafeRouteWrapper><ApprovalInbox /></SafeRouteWrapper>} />
                  <Route path="branches/analytics" element={<SafeRouteWrapper><BranchAnalytics /></SafeRouteWrapper>} />
                  <Route path="branches/dashboard" element={<SafeRouteWrapper><BranchDashboard /></SafeRouteWrapper>} />
                  <Route path="executive-snapshot" element={<SafeRouteWrapper><ExecutiveSnapshot /></SafeRouteWrapper>} />
                  <Route path="hq-dashboard" element={<SafeRouteWrapper><HQDashboard /></SafeRouteWrapper>} />
                  <Route path="articles" element={<SafeRouteWrapper><ArticleList /></SafeRouteWrapper>} />
                  <Route path="articles/:id" element={<SafeRouteWrapper><ArticleDetail /></SafeRouteWrapper>} />
                  <Route path="parent-portal/management" element={<SafeRouteWrapper><ParentPortalManagement /></SafeRouteWrapper>} />
                  <Route path="referrals" element={<SafeRouteWrapper><ReferralPortal /></SafeRouteWrapper>} />
                  <Route path="rehab/disciplines" element={<SafeRouteWrapper><RehabDisciplinesTaxonomy /></SafeRouteWrapper>} />
                  <Route path="rehab/goal-suggestions" element={<SafeRouteWrapper><RehabGoalSuggestions /></SafeRouteWrapper>} />
                  <Route path="insurance-tariffs" element={<SafeRouteWrapper><InsuranceTariffsAdmin /></SafeRouteWrapper>} />
                  <Route path="zatca-credentials" element={<SafeRouteWrapper><ZatcaCredentialsAdmin /></SafeRouteWrapper>} />
                  <Route path="my-children" element={<SafeRouteWrapper><MyChildrenPortal /></SafeRouteWrapper>} />
                  <Route path="workbench" element={<SafeRouteWrapper><TherapistWorkbench /></SafeRouteWrapper>} />
                  <Route path="chat" element={<SafeRouteWrapper><ChatV2 /></SafeRouteWrapper>} />
                  <Route path="telehealth" element={<SafeRouteWrapper><TelehealthList /></SafeRouteWrapper>} />
                  <Route path="telehealth/:sessionId" element={<SafeRouteWrapper><TelehealthRoom /></SafeRouteWrapper>} />

                  {/* Schema-driven "create" forms — replaces dead Add/New 404s.
                      Static paths outrank module :id routes in React Router v6. */}
                  {Object.entries(CREATE_FORMS).map(([p, cfg]) => (
                    <Route key={p} path={p} element={<EntityFormPage config={cfg} />} />
                  ))}

                  {/* Read-only detail views — replaces dead row/view :id 404s. */}
                  {Object.entries(DETAIL_VIEWS).map(([p, cfg]) => (
                    <Route key={p} path={p} element={<EntityDetailPage config={cfg} />} />
                  ))}

                  {/* Edit forms — replaces dead edit :id 404s (GET prefill + PUT). */}
                  {Object.entries(EDIT_FORMS).map(([p, cfg]) => (
                    <Route key={p} path={p} element={<EntityFormPage config={cfg} />} />
                  ))}

                  {/* File-upload screens — replaces dead /upload 404s (multipart). */}
                  {Object.entries(UPLOAD_FORMS).map(([p, cfg]) => (
                    <Route key={p} path={p} element={<FileUploadPage config={cfg} />} />
                  ))}

                  {/* Domain Route Modules */}
                  {safeRoutes(FinanceRoutes, 'Finance')}
                  {safeRoutes(HRRoutes, 'HR')}
                  {safeRoutes(AdminRoutes, 'Admin')}
                  {safeRoutes(RehabRoutes, 'Rehab')}
                  {safeRoutes(EducationRoutes, 'Education')}
                  {safeRoutes(WorkflowRoutes, 'Workflow')}
                  {safeRoutes(PortalRoutes, 'Portal')}
                  {safeRoutes(EnterpriseRoutes, 'Enterprise')}
                  {safeRoutes(EnterpriseProPlusRoutes, 'EnterpriseProPlus')}
                  {safeRoutes(EnterpriseUltraRoutes, 'EnterpriseUltra')}
                  {safeRoutes(GovernmentIntegrationRoutes, 'GovernmentIntegration')}
                  {safeRoutes(AdministrativeSystemsRoutes, 'AdministrativeSystems')}
                  {safeRoutes(BIDashboardRoutes, 'BIDashboard')}
                  {safeRoutes(BIAnalyticsRoutes, 'BIAnalytics')}
                  {safeRoutes(WarehouseRoutes, 'Warehouse')}
                  {safeRoutes(LegalAffairsRoutes, 'LegalAffairs')}
                  {safeRoutes(TrainingRoutes, 'Training')}
                  {safeRoutes(EventManagementRoutes, 'EventManagement')}
                  {safeRoutes(PublicRelationsRoutes, 'PublicRelations')}
                  {safeRoutes(RiskManagementRoutes, 'RiskManagement')}
                  {safeRoutes(InternalAuditRoutes, 'InternalAudit')}
                  {safeRoutes(AssetManagementRoutes, 'AssetManagement')}
                  {safeRoutes(HelpDeskRoutes, 'HelpDesk')}
                  {safeRoutes(HSERoutes, 'HSE')}
                  {safeRoutes(ProjectManagementRoutes, 'ProjectManagement')}
                  {safeRoutes(ContractManagementRoutes, 'ContractManagement')}
                  {safeRoutes(ProcurementRoutes, 'Procurement')}
                  {safeRoutes(RecruitmentRoutes, 'Recruitment')}
                  {safeRoutes(FleetRoutes, 'Fleet')}
                  {safeRoutes(CrisisManagementRoutes, 'CrisisManagement')}
                  {safeRoutes(PayrollRoutes, 'Payroll')}
                  {safeRoutes(EmployeeAffairsRoutes, 'EmployeeAffairs')}
                  {safeRoutes(AttendanceRoutes, 'Attendance')}
                  {safeRoutes(MessagingRoutes, 'Messaging')}
                  {safeRoutes(QualityComplianceRoutes, 'QualityCompliance')}
                  {safeRoutes(StrategicPlanningRoutes, 'StrategicPlanning')}
                  {safeRoutes(DocumentManagementRoutes, 'DocumentManagement')}
                  {safeRoutes(MeetingsRoutes, 'Meetings')}
                  {safeRoutes(SupplyChainRoutes, 'SupplyChain')}
                  {safeRoutes(PerformanceRoutes, 'Performance')}
                  {safeRoutes(StudentManagementRoutes, 'StudentManagement')}
                  {safeRoutes(DisabilityRoutes, 'Disability')}
                  {safeRoutes(VisitorsRoutes, 'Visitors')}
                  {safeRoutes(ComplaintsRoutes, 'Complaints')}
                  {safeRoutes(FacilityRoutes, 'Facility')}
                  {safeRoutes(KnowledgeCenterRoutes, 'KnowledgeCenter')}
                  {safeRoutes(IntegratedCareRoutes, 'IntegratedCare')}
                  {safeRoutes(SessionsRoutes, 'Sessions')}
                  {safeRoutes(ESignatureRoutes, 'ESignature')}
                  {safeRoutes(TreatmentAuthRoutes, 'TreatmentAuth')}
                  {safeRoutes(FamilySatisfactionRoutes, 'FamilySatisfaction')}
                  {safeRoutes(SuccessionRoutes, 'Succession')}
                  {safeRoutes(MontessoriRoutes, 'Montessori')}
                  {safeRoutes(BeneficiaryRoutes, 'Beneficiary')}
                  {safeRoutes(LeaveManagementRoutes, 'LeaveManagement')}
                  {safeRoutes(HRInsuranceRoutes, 'HRInsurance')}
                  {safeRoutes(OrgStructureRoutes, 'OrgStructure')}
                  {safeRoutes(ReportsRoutes, 'Reports')}
                  {safeRoutes(CRMRoutes, 'CRM')}
                  {safeRoutes(OperationsRoutes, 'Operations')}
                  {safeRoutes(MedicalFilesRoutes, 'MedicalFiles')}
                  {safeRoutes(EMRRoutes, 'EMR')}
                  {safeRoutes(KitchenRoutes, 'Kitchen')}
                  {safeRoutes(LaundryRoutes, 'Laundry')}
                  {safeRoutes(CommunityRoutes, 'Community')}
                  {safeRoutes(VolunteerRoutes, 'Volunteer')}
                  {safeRoutes(MHPSSRoutes, 'MHPSS')}
                  {safeRoutes(IndependentLivingRoutes, 'IndependentLiving')}
                  {safeRoutes(ResearchRoutes, 'Research')}
                  {safeRoutes(ECommerceRoutes, 'ECommerce')}
                  {safeRoutes(CMSRoutes, 'CMS')}
                  {safeRoutes(WaitlistRoutes, 'Waitlist')}
                  {safeRoutes(GPSTrackingRoutes, 'GPSTracking')}
                  {safeRoutes(IoTRoutes, 'IoT')}
                  {safeRoutes(SSOAdminRoutes, 'SSOAdmin')}
                  {safeRoutes(BlockchainRoutes, 'Blockchain')}
                  {safeRoutes(ICFAssessmentRoutes, 'ICFAssessment')}
                  {safeRoutes(ClinicalRoutes, 'Clinical')}
                  {safeRoutes(SessionICFRoutes, 'SessionICF')}
                  {safeRoutes(MDTCoordinationRoutes, 'MDTCoordination')}
                  {safeRoutes(ARRehabRoutes, 'ARRehab')}
                  {safeRoutes(TelehealthRoutes, 'Telehealth')}
                  {safeRoutes(BusTrackingRoutes, 'BusTracking')}
                  {safeRoutes(ReportBuilderRoutes, 'ReportBuilder')}
                  {safeRoutes(LibraryRoutes, 'Library')}
                  {safeRoutes(ChatRoutes, 'Chat')}
                  {safeRoutes(AIDiagnosticRoutes, 'AIDiagnostic')}
                  {safeRoutes(AIPredictiveRoutes, 'AIPredictive')}
                  {safeRoutes(ComplianceRoutes, 'Compliance')}
                  {safeRoutes(OCRDocumentRoutes, 'OCRDocument')}
                  {safeRoutes(CEODashboardRoutes, 'CEODashboard')}
                  {safeRoutes(ExecutiveRoutes, 'Executive')}
                  {safeRoutes(QualityManagementRoutes, 'QualityManagement')}
                  {safeRoutes(WorkforceAnalyticsRoutes, 'WorkforceAnalytics')}
                  {safeRoutes(LearningDevelopmentRoutes, 'LearningDevelopment')}
                  {safeRoutes(AutomatedBackupRoutes, 'AutomatedBackup')}
                  {safeRoutes(WafRateLimitRoutes, 'WafRateLimit')}
                  {safeRoutes(PrintCenterRoutes, 'PrintCenter')}
                  {safeRoutes(CarePlanRoutes, 'CarePlan')}
                  {safeRoutes(EpisodesRoutes, 'Episodes')}
                  {safeRoutes(Beneficiary360Routes, 'Beneficiary360')}
                  {safeRoutes(MuqeemRoutes, 'Muqeem')}
                  {safeRoutes(ZatcaPhase2Routes, 'ZatcaPhase2')}
                  {safeRoutes(NphiesRoutes, 'Nphies')}
                  {safeRoutes(AuditLogsRoutes, 'AuditLogs')}
                  {safeRoutes(TeleRehabRoutes, 'TeleRehab')}
                  {safeRoutes(EquipmentLifecycleRoutes, 'EquipmentLifecycle')}
                  {safeRoutes(MeasuresLibraryRoutes, 'MeasuresLibrary')}
                  {safeRoutes(SocialMediaRoutes, 'SocialMedia')}
                  {safeRoutes(CDSSRoutes, 'CDSS')}
                  {safeRoutes(WhatsAppChatbotRoutes, 'WhatsAppChatbot')}
                  {safeRoutes(GroupTherapyRoutes, 'GroupTherapy')}
                  {safeRoutes(FamilyEngagementRoutes, 'FamilyEngagement')}
                  {safeRoutes(PostRehabRoutes, 'PostRehab')}
                  {safeRoutes(ParentPortalRoutes, 'ParentPortal')}
                  {safeRoutes(GamificationRoutes, 'Gamification')}
                  {safeRoutes(CCTVRoutes, 'CCTV')}

                  {/* Shared Routes */}
                  <Route path="ai-assistant" element={<Navigate to="/ai-analytics" replace />} />
                  <Route path="ai-analytics" element={<SafeRouteWrapper><AIAnalyticsDashboard /></SafeRouteWrapper>} />
                  <Route path="analytics" element={<SafeRouteWrapper><AnalyticsDashboard /></SafeRouteWrapper>} />
                  <Route path="analytics/advanced" element={<SafeRouteWrapper><AdvancedReports /></SafeRouteWrapper>} />
                  <Route path="export-import" element={<SafeRouteWrapper><ExportImportManager /></SafeRouteWrapper>} />
                  <Route path="data-management" element={<SafeRouteWrapper><ExportImportManager /></SafeRouteWrapper>} />
                  <Route path="messages" element={<SafeRouteWrapper><MessagingPage /></SafeRouteWrapper>} />
                  <Route path="communications" element={<SafeRouteWrapper><Communications /></SafeRouteWrapper>} />
                  <Route path="communications-system" element={<SafeRouteWrapper><CommunicationsSystem /></SafeRouteWrapper>} />
                  <Route path="whatsapp" element={<SafeRouteWrapper><WhatsAppDashboard /></SafeRouteWrapper>} />
                  <Route path="documents" element={<SafeRouteWrapper><Documents /></SafeRouteWrapper>} />
                  <Route path="documents-management" element={<SafeRouteWrapper><DocumentsPage /></SafeRouteWrapper>} />
                  <Route path="smart-documents" element={<SafeRouteWrapper><SmartDocumentsPage /></SafeRouteWrapper>} />
                  <Route path="archiving" element={<SafeRouteWrapper><ArchivingDashboard /></SafeRouteWrapper>} />
                  <Route path="electronic-archiving" element={<SafeRouteWrapper><ArchivingDashboard /></SafeRouteWrapper>} />
                  <Route path="documents-advanced" element={<SafeRouteWrapper><DocumentAdvancedPage /></SafeRouteWrapper>} />
                  <Route path="media-library" element={<SafeRouteWrapper><MediaLibrary /></SafeRouteWrapper>} />
                  <Route path="groups" element={<SafeRouteWrapper><Groups /></SafeRouteWrapper>} />
                  <Route path="groups/:groupId" element={<SafeRouteWrapper><GroupDetail /></SafeRouteWrapper>} />
                  <Route path="friends" element={<SafeRouteWrapper><Friends /></SafeRouteWrapper>} />
                  <Route path="balances" element={<SafeRouteWrapper><AccountingDashboard /></SafeRouteWrapper>} />
                  <Route path="expenses" element={<SafeRouteWrapper><ExpenseManagement /></SafeRouteWrapper>} />
                  <Route path="expenses/new" element={<SafeRouteWrapper><ExpenseManagement /></SafeRouteWrapper>} />
                  <Route path="profile" element={<SafeRouteWrapper><Profile /></SafeRouteWrapper>} />
                  <Route path="budget-management" element={<SafeRouteWrapper><BudgetManagement /></SafeRouteWrapper>} />
                  <Route path="surveillance" element={<Navigate to="/monitoring" replace />} />

                  {/* Premium Dashboards */}
                  <Route path="premium" element={<SafeRouteWrapper><PremiumHub /></SafeRouteWrapper>} />
                  <Route path="ceo-pro" element={<SafeRouteWrapper><CEODashboardPro /></SafeRouteWrapper>} />
                  <Route path="hr-pro" element={<SafeRouteWrapper><HRAdvancedDashboard /></SafeRouteWrapper>} />
                  <Route path="finance-pro" element={<SafeRouteWrapper><FinanceDashboardPro /></SafeRouteWrapper>} />
                  <Route path="patients-pro" element={<SafeRouteWrapper><PatientsDashboardPro /></SafeRouteWrapper>} />
                  <Route path="schedule-pro" element={<SafeRouteWrapper><ScheduleDashboardPro /></SafeRouteWrapper>} />
                  <Route path="reports-pro" element={<SafeRouteWrapper><ReportsDashboardPro /></SafeRouteWrapper>} />
                  <Route path="inventory-pro" element={<SafeRouteWrapper><InventoryDashboardPro /></SafeRouteWrapper>} />
                  <Route path="notifications-pro" element={<SafeRouteWrapper><NotificationsDashboardPro /></SafeRouteWrapper>} />
                  {/* Alias: header/sidebar navigate to /notifications */}
                  <Route path="notifications" element={<SafeRouteWrapper><NotificationsDashboardPro /></SafeRouteWrapper>} />
                  <Route path="security-pro" element={<SafeRouteWrapper><SecurityDashboardPro /></SafeRouteWrapper>} />
                  <Route path="analytics-pro" element={<SafeRouteWrapper><AnalyticsDashboardPro /></SafeRouteWrapper>} />
                  <Route path="settings-pro" element={<SafeRouteWrapper><SettingsDashboardPro /></SafeRouteWrapper>} />
                  {/* Alias: header/sidebar settings button + nav navigate to /settings */}
                  <Route path="settings" element={<SafeRouteWrapper><SettingsDashboardPro /></SafeRouteWrapper>} />
                  <Route path="therapist-pro" element={<SafeRouteWrapper><TherapistProDashboard /></SafeRouteWrapper>} />
                  <Route path="kpi-pro" element={<SafeRouteWrapper><KPIProDashboard /></SafeRouteWrapper>} />
                  <Route path="rehab-pro" element={<SafeRouteWrapper><RehabProDashboard /></SafeRouteWrapper>} />
                  <Route path="admin-executive" element={<SafeRouteWrapper><AdminExecutiveDashboard /></SafeRouteWrapper>} />
                  <Route path="pharmacy-pro" element={<SafeRouteWrapper><PharmacyProDashboard /></SafeRouteWrapper>} />
                  <Route path="lab-pro" element={<SafeRouteWrapper><LabProDashboard /></SafeRouteWrapper>} />
                  <Route path="insurance-pro" element={<SafeRouteWrapper><InsuranceProDashboard /></SafeRouteWrapper>} />
                  <Route path="quality-pro" element={<SafeRouteWrapper><QualityProDashboard /></SafeRouteWrapper>} />
                  <Route path="training-pro" element={<SafeRouteWrapper><TrainingProDashboard2 /></SafeRouteWrapper>} />
                  <Route path="crm-pro" element={<SafeRouteWrapper><CRMProDashboard /></SafeRouteWrapper>} />
                  <Route path="operations-pro" element={<SafeRouteWrapper><OperationsProDashboard /></SafeRouteWrapper>} />
                  <Route path="nursing-pro" element={<SafeRouteWrapper><NursingProDashboard /></SafeRouteWrapper>} />
                  <Route path="procurement-pro" element={<SafeRouteWrapper><ProcurementProDashboard /></SafeRouteWrapper>} />
                  <Route path="radiology-pro" element={<SafeRouteWrapper><RadiologyProDashboard /></SafeRouteWrapper>} />
                  <Route path="emergency-pro" element={<SafeRouteWrapper><EmergencyProDashboard /></SafeRouteWrapper>} />
                  <Route path="risk-pro" element={<SafeRouteWrapper><RiskProDashboard /></SafeRouteWrapper>} />
                  <Route path="nutrition-pro" element={<SafeRouteWrapper><NutritionProDashboard /></SafeRouteWrapper>} />
                  <Route path="infection-control-pro" element={<SafeRouteWrapper><InfectionControlProDashboard /></SafeRouteWrapper>} />
                  <Route path="social-work-pro" element={<SafeRouteWrapper><SocialWorkProDashboard /></SafeRouteWrapper>} />
                  <Route path="maintenance-pro" element={<SafeRouteWrapper><MaintenanceProDashboard /></SafeRouteWrapper>} />
                  <Route path="blood-bank-pro" element={<SafeRouteWrapper><BloodBankProDashboard /></SafeRouteWrapper>} />
                  <Route path="medical-records-pro" element={<SafeRouteWrapper><MedicalRecordsProDashboard /></SafeRouteWrapper>} />
                  <Route path="transport-pro" element={<SafeRouteWrapper><TransportProDashboard /></SafeRouteWrapper>} />
                  <Route path="compliance-pro" element={<SafeRouteWrapper><ComplianceProDashboard /></SafeRouteWrapper>} />
                  <Route path="waste-management-pro" element={<SafeRouteWrapper><WasteManagementProDashboard /></SafeRouteWrapper>} />
                  <Route path="telemedicine-pro" element={<SafeRouteWrapper><TelemedicineProDashboard /></SafeRouteWrapper>} />
                  <Route path="clinical-trials-pro" element={<SafeRouteWrapper><ClinicalTrialsProDashboard /></SafeRouteWrapper>} />
                  <Route path="patient-safety-pro" element={<SafeRouteWrapper><PatientSafetyProDashboard /></SafeRouteWrapper>} />
                </Route>
                {/* DDD Platform — own layout, must be outside ProLayout */}
                <Route path="platform/*" element={<SafeRouteWrapper><DDDRoutes /></SafeRouteWrapper>} />
                {/* Mobile App — own layout, must be outside ProLayout */}
                <Route path="mobile/*" element={<SafeRouteWrapper><MobileAppRoutes /></SafeRouteWrapper>} />
                <Route path="*" element={<SafeRouteWrapper><NotFound /></SafeRouteWrapper>} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </NotificationProvider>
      </SocketProvider>
    </SessionTimeoutGuard>
  );
}
