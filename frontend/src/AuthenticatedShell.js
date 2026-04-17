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
import logger from './utils/logger';

// Route Modules
import {
  FinanceRoutes,
  HRRoutes,
  AdminRoutes,
  RehabRoutes,
  EducationRoutes,
  WorkflowRoutes,
  PortalRoutes,
  EnterpriseRoutes,
  EnterpriseProPlusRoutes,
  EnterpriseUltraRoutes,
  GovernmentIntegrationRoutes,
  AdministrativeSystemsRoutes,
  BIDashboardRoutes,
  WarehouseRoutes,
  LegalAffairsRoutes,
  TrainingRoutes,
  EventManagementRoutes,
  PublicRelationsRoutes,
  RiskManagementRoutes,
  InternalAuditRoutes,
  AssetManagementRoutes,
  HelpDeskRoutes,
  HSERoutes,
  ProjectManagementRoutes,
  ContractManagementRoutes,
  ProcurementRoutes,
  RecruitmentRoutes,
  FleetRoutes,
  CrisisManagementRoutes,
  PayrollRoutes,
  EmployeeAffairsRoutes,
  AttendanceRoutes,
  MessagingRoutes,
  QualityComplianceRoutes,
  StrategicPlanningRoutes,
  DocumentManagementRoutes,
  MeetingsRoutes,
  SupplyChainRoutes,
  PerformanceRoutes,
  StudentManagementRoutes,
  DisabilityRoutes,
  VisitorsRoutes,
  ComplaintsRoutes,
  FacilityRoutes,
  KnowledgeCenterRoutes,
  IntegratedCareRoutes,
  SessionsRoutes,
  ESignatureRoutes,
  TreatmentAuthRoutes,
  FamilySatisfactionRoutes,
  SuccessionRoutes,
  MontessoriRoutes,
  BeneficiaryRoutes,
  LeaveManagementRoutes,
  HRInsuranceRoutes,
  OrgStructureRoutes,
  ReportsRoutes,
  CRMRoutes,
  OperationsRoutes,
  MedicalFilesRoutes,
  KitchenRoutes,
  LaundryRoutes,
  CommunityRoutes,
  VolunteerRoutes,
  MHPSSRoutes,
  IndependentLivingRoutes,
  ResearchRoutes,
  ECommerceRoutes,
  CMSRoutes,
  WaitlistRoutes,
  GPSTrackingRoutes,
  IoTRoutes,
  SSOAdminRoutes,
  BlockchainRoutes,
  ICFAssessmentRoutes,
  MDTCoordinationRoutes,
  ARRehabRoutes,
  TelehealthRoutes,
  BusTrackingRoutes,
  ReportBuilderRoutes,
  LibraryRoutes,
  ChatRoutes,
  AIDiagnosticRoutes,
  OCRDocumentRoutes,
  CEODashboardRoutes,
  QualityManagementRoutes,
  WorkforceAnalyticsRoutes,
  LearningDevelopmentRoutes,
  AutomatedBackupRoutes,
  WafRateLimitRoutes,
  PrintCenterRoutes,
  CarePlanRoutes,
  MuqeemRoutes,
  ZatcaPhase2Routes,
  NphiesRoutes,
  AuditLogsRoutes,
} from './routes';

// Pages
import Home from './pages/common/Home';
import NotFound from './pages/common/NotFound';

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
                <Route path="/" element={<ProLayout />}>
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="home" element={<Home />} />
                  <Route path="dashboard" element={<AdvancedDashboard />} />
                  <Route path="dashboard/simple" element={<Dashboard />} />
                  <Route path="monitoring" element={<MonitoringDashboard />} />
                  <Route path="dashboard/advanced" element={<AdvancedDashboardUI />} />
                  <Route path="dashboard/pro" element={<ProDashboard />} />
                  <Route path="activity" element={<Activity />} />
                  <Route path="reports" element={<AdvancedReportsPage />} />
                  <Route path="admin/bookings" element={<AdminBookings />} />
                  <Route path="admin/applications" element={<AdminApplications />} />

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
                  {safeRoutes(MDTCoordinationRoutes, 'MDTCoordination')}
                  {safeRoutes(ARRehabRoutes, 'ARRehab')}
                  {safeRoutes(TelehealthRoutes, 'Telehealth')}
                  {safeRoutes(BusTrackingRoutes, 'BusTracking')}
                  {safeRoutes(ReportBuilderRoutes, 'ReportBuilder')}
                  {safeRoutes(LibraryRoutes, 'Library')}
                  {safeRoutes(ChatRoutes, 'Chat')}
                  {safeRoutes(AIDiagnosticRoutes, 'AIDiagnostic')}
                  {safeRoutes(OCRDocumentRoutes, 'OCRDocument')}
                  {safeRoutes(CEODashboardRoutes, 'CEODashboard')}
                  {safeRoutes(QualityManagementRoutes, 'QualityManagement')}
                  {safeRoutes(WorkforceAnalyticsRoutes, 'WorkforceAnalytics')}
                  {safeRoutes(LearningDevelopmentRoutes, 'LearningDevelopment')}
                  {safeRoutes(AutomatedBackupRoutes, 'AutomatedBackup')}
                  {safeRoutes(WafRateLimitRoutes, 'WafRateLimit')}
                  {safeRoutes(PrintCenterRoutes, 'PrintCenter')}
                  {safeRoutes(CarePlanRoutes, 'CarePlan')}
                  {safeRoutes(MuqeemRoutes, 'Muqeem')}
                  {safeRoutes(ZatcaPhase2Routes, 'ZatcaPhase2')}
                  {safeRoutes(NphiesRoutes, 'Nphies')}
                  {safeRoutes(AuditLogsRoutes, 'AuditLogs')}

                  {/* Shared Routes */}
                  <Route path="ai-assistant" element={<Navigate to="/ai-analytics" replace />} />
                  <Route path="ai-analytics" element={<AIAnalyticsDashboard />} />
                  <Route path="analytics" element={<AnalyticsDashboard />} />
                  <Route path="analytics/advanced" element={<AdvancedReports />} />
                  <Route path="export-import" element={<ExportImportManager />} />
                  <Route path="data-management" element={<ExportImportManager />} />
                  <Route path="messages" element={<MessagingPage />} />
                  <Route path="communications" element={<Communications />} />
                  <Route path="communications-system" element={<CommunicationsSystem />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="documents-management" element={<DocumentsPage />} />
                  <Route path="smart-documents" element={<SmartDocumentsPage />} />
                  <Route path="archiving" element={<ArchivingDashboard />} />
                  <Route path="electronic-archiving" element={<ArchivingDashboard />} />
                  <Route path="documents-advanced" element={<DocumentAdvancedPage />} />
                  <Route path="media-library" element={<MediaLibrary />} />
                  <Route path="groups" element={<Groups />} />
                  <Route path="groups/:groupId" element={<GroupDetail />} />
                  <Route path="friends" element={<Friends />} />
                  <Route path="balances" element={<AccountingDashboard />} />
                  <Route path="expenses" element={<ExpenseManagement />} />
                  <Route path="expenses/new" element={<ExpenseManagement />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="budget-management" element={<BudgetManagement />} />
                  <Route path="surveillance" element={<Navigate to="/monitoring" replace />} />

                  {/* Premium Dashboards */}
                  <Route path="premium" element={<PremiumHub />} />
                  <Route path="ceo-pro" element={<CEODashboardPro />} />
                  <Route path="hr-pro" element={<HRAdvancedDashboard />} />
                  <Route path="finance-pro" element={<FinanceDashboardPro />} />
                  <Route path="patients-pro" element={<PatientsDashboardPro />} />
                  <Route path="schedule-pro" element={<ScheduleDashboardPro />} />
                  <Route path="reports-pro" element={<ReportsDashboardPro />} />
                  <Route path="inventory-pro" element={<InventoryDashboardPro />} />
                  <Route path="notifications-pro" element={<NotificationsDashboardPro />} />
                  <Route path="security-pro" element={<SecurityDashboardPro />} />
                  <Route path="analytics-pro" element={<AnalyticsDashboardPro />} />
                  <Route path="settings-pro" element={<SettingsDashboardPro />} />
                  <Route path="therapist-pro" element={<TherapistProDashboard />} />
                  <Route path="kpi-pro" element={<KPIProDashboard />} />
                  <Route path="rehab-pro" element={<RehabProDashboard />} />
                  <Route path="admin-executive" element={<AdminExecutiveDashboard />} />
                  <Route path="pharmacy-pro" element={<PharmacyProDashboard />} />
                  <Route path="lab-pro" element={<LabProDashboard />} />
                  <Route path="insurance-pro" element={<InsuranceProDashboard />} />
                  <Route path="quality-pro" element={<QualityProDashboard />} />
                  <Route path="training-pro" element={<TrainingProDashboard2 />} />
                  <Route path="crm-pro" element={<CRMProDashboard />} />
                  <Route path="operations-pro" element={<OperationsProDashboard />} />
                  <Route path="nursing-pro" element={<NursingProDashboard />} />
                  <Route path="procurement-pro" element={<ProcurementProDashboard />} />
                  <Route path="radiology-pro" element={<RadiologyProDashboard />} />
                  <Route path="emergency-pro" element={<EmergencyProDashboard />} />
                  <Route path="risk-pro" element={<RiskProDashboard />} />
                  <Route path="nutrition-pro" element={<NutritionProDashboard />} />
                  <Route path="infection-control-pro" element={<InfectionControlProDashboard />} />
                  <Route path="social-work-pro" element={<SocialWorkProDashboard />} />
                  <Route path="maintenance-pro" element={<MaintenanceProDashboard />} />
                  <Route path="blood-bank-pro" element={<BloodBankProDashboard />} />
                  <Route path="medical-records-pro" element={<MedicalRecordsProDashboard />} />
                  <Route path="transport-pro" element={<TransportProDashboard />} />
                  <Route path="compliance-pro" element={<ComplianceProDashboard />} />
                  <Route path="waste-management-pro" element={<WasteManagementProDashboard />} />
                  <Route path="telemedicine-pro" element={<TelemedicineProDashboard />} />
                  <Route path="clinical-trials-pro" element={<ClinicalTrialsProDashboard />} />
                  <Route path="patient-safety-pro" element={<PatientSafetyProDashboard />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </NotificationProvider>
      </SocketProvider>
    </SessionTimeoutGuard>
  );
}
