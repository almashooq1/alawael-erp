/**
 * DDD Domain Routes — مسارات المجالات الموحدة
 *
 * يجمع جميع مسارات الواجهة الأمامية للمجالات DDD
 * ويوفر lazy-loaded pages مع React Router
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import DDDPlatformLayout from '../components/ddd/DDDPlatformLayout';

/* ── Lazy-loaded pages ── */
const ExecutiveDashboard = lazy(() => import('../pages/executive-dashboard/ExecutiveDashboard'));
const BeneficiaryListPage = lazy(() => import('../pages/beneficiary-list/BeneficiaryListPage'));
const Beneficiary360Page = lazy(() => import('../pages/beneficiary-360/Beneficiary360Page'));
const EpisodesPage = lazy(() => import('../pages/episodes/EpisodesPage'));
const SessionsPage = lazy(() => import('../pages/Sessions/SessionsPage'));
const WorkflowPage = lazy(() => import('../pages/workflow/WorkflowPage'));
const QualityPage = lazy(() => import('../pages/Quality/QualityPage'));
const ReportsPage = lazy(() => import('../pages/Reports/ReportsPage'));

/* Domain pages from factory */
const DomainPages = lazy(() => import('../pages/domains/DomainPages'));

/* ── Loading fallback ── */
const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
    <CircularProgress />
  </Box>
);

/* ── Wrapper to extract named export from DomainPages ── */
function DomainPageWrapper({ pageName }) {
  const LazyPage = lazy(() =>
    import('../pages/domains/DomainPages').then(mod => ({ default: mod[pageName] }))
  );
  return (
    <Suspense fallback={<PageLoader />}>
      <LazyPage />
    </Suspense>
  );
}

/**
 * DDDRoutes — يُضاف داخل Router الرئيسي
 *
 * استخدام:
 * <Route path="/platform/*" element={<DDDRoutes />} />
 */
export default function DDDRoutes() {
  return (
    <DDDPlatformLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Executive Dashboard */}
          <Route path="dashboard" element={<ExecutiveDashboard />} />
          <Route path="executive" element={<ExecutiveDashboard />} />

          {/* Beneficiaries */}
          <Route path="beneficiaries" element={<BeneficiaryListPage />} />
          <Route path="beneficiaries/:id" element={<Beneficiary360Page />} />

          {/* Core clinical pages */}
          <Route path="episodes" element={<EpisodesPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="reports" element={<ReportsPage />} />

          {/* Domain pages (factory-generated) */}
          <Route path="assessments" element={<DomainPageWrapper pageName="AssessmentsPage" />} />
          <Route path="care-plans" element={<DomainPageWrapper pageName="CarePlansPage" />} />
          <Route path="goals" element={<DomainPageWrapper pageName="GoalsPage" />} />
          <Route path="group-therapy" element={<DomainPageWrapper pageName="GroupTherapyPage" />} />
          <Route path="tele-rehab" element={<DomainPageWrapper pageName="TeleRehabPage" />} />
          <Route path="ar-vr" element={<DomainPageWrapper pageName="ARVRPage" />} />
          <Route path="behavior" element={<DomainPageWrapper pageName="BehaviorPage" />} />
          <Route path="family" element={<DomainPageWrapper pageName="FamilyPage" />} />
          <Route path="programs" element={<DomainPageWrapper pageName="ProgramsPage" />} />
          <Route
            path="ai-recommendations"
            element={<DomainPageWrapper pageName="AIRecommendationsPage" />}
          />
          <Route path="research" element={<DomainPageWrapper pageName="ResearchPage" />} />
          <Route
            path="field-training"
            element={<DomainPageWrapper pageName="FieldTrainingPage" />}
          />

          {/* Phase 29 – Workforce Development */}
          <Route
            path="workforce-analytics"
            element={<DomainPageWrapper pageName="WorkforceAnalyticsPage" />}
          />
          <Route
            path="credential-manager"
            element={<DomainPageWrapper pageName="CredentialManagerPage" />}
          />
          <Route
            path="mentorship-program"
            element={<DomainPageWrapper pageName="MentorshipProgramPage" />}
          />
          <Route
            path="career-pathway"
            element={<DomainPageWrapper pageName="CareerPathwayPage" />}
          />

          {/* Phase 30 – Accreditation & Compliance */}
          <Route
            path="accreditation-manager"
            element={<DomainPageWrapper pageName="AccreditationManagerPage" />}
          />
          <Route
            path="inspection-tracker"
            element={<DomainPageWrapper pageName="InspectionTrackerPage" />}
          />
          <Route
            path="standards-compliance"
            element={<DomainPageWrapper pageName="StandardsCompliancePage" />}
          />
          <Route
            path="licensure-manager"
            element={<DomainPageWrapper pageName="LicensureManagerPage" />}
          />

          {/* Phase 31 – Patient Engagement */}
          <Route
            path="patient-portal"
            element={<DomainPageWrapper pageName="PatientPortalPage" />}
          />
          <Route
            path="health-education"
            element={<DomainPageWrapper pageName="HealthEducationPage" />}
          />
          <Route
            path="remote-monitoring"
            element={<DomainPageWrapper pageName="RemoteMonitoringPage" />}
          />
          <Route
            path="patient-community"
            element={<DomainPageWrapper pageName="PatientCommunityPage" />}
          />

          {/* Phase 32 – Interoperability */}
          <Route
            path="fhir-integration"
            element={<DomainPageWrapper pageName="FhirIntegrationPage" />}
          />
          <Route path="hl7-messaging" element={<DomainPageWrapper pageName="HL7MessagingPage" />} />
          <Route path="data-exchange" element={<DomainPageWrapper pageName="DataExchangePage" />} />
          <Route
            path="interoperability-hub"
            element={<DomainPageWrapper pageName="InteroperabilityHubPage" />}
          />

          {/* Phase 33 – Disaster Recovery */}
          <Route
            path="backup-manager"
            element={<DomainPageWrapper pageName="BackupManagerPage" />}
          />
          <Route
            path="business-continuity"
            element={<DomainPageWrapper pageName="BusinessContinuityPage" />}
          />
          <Route
            path="system-failover"
            element={<DomainPageWrapper pageName="SystemFailoverPage" />}
          />
          <Route
            path="incident-response"
            element={<DomainPageWrapper pageName="IncidentResponsePage" />}
          />

          {/* Phase 34 – Facility & Asset */}
          <Route
            path="equipment-lifecycle"
            element={<DomainPageWrapper pageName="EquipmentLifecyclePage" />}
          />
          <Route
            path="environmental-monitoring"
            element={<DomainPageWrapper pageName="EnvironmentalMonitoringPage" />}
          />
          <Route
            path="space-management"
            element={<DomainPageWrapper pageName="SpaceManagementPage" />}
          />
          <Route
            path="asset-tracking"
            element={<DomainPageWrapper pageName="AssetTrackingPage" />}
          />

          {/* Phase 35 – Clinical Research */}
          <Route
            path="clinical-research"
            element={<DomainPageWrapper pageName="ClinicalResearchPage" />}
          />
          <Route
            path="clinical-trials"
            element={<DomainPageWrapper pageName="ClinicalTrialsPage" />}
          />
          <Route
            path="outcome-research"
            element={<DomainPageWrapper pageName="OutcomeResearchPage" />}
          />
          <Route
            path="publication-manager"
            element={<DomainPageWrapper pageName="PublicationManagerPage" />}
          />

          {/* Phase 36 – Community Engagement */}
          <Route
            path="volunteer-management"
            element={<DomainPageWrapper pageName="VolunteerManagementPage" />}
          />
          <Route
            path="community-outreach"
            element={<DomainPageWrapper pageName="CommunityOutreachPage" />}
          />
          <Route
            path="donor-relations"
            element={<DomainPageWrapper pageName="DonorRelationsPage" />}
          />
          <Route
            path="advocacy-program"
            element={<DomainPageWrapper pageName="AdvocacyProgramPage" />}
          />

          {/* Fallback */}
          <Route path="*" element={<ExecutiveDashboard />} />
        </Routes>
      </Suspense>
    </DDDPlatformLayout>
  );
}

/**
 * DDD Navigation items for sidebar/menu
 */
export const DDD_NAV_ITEMS = [
  {
    id: 'platform-overview',
    title: 'نظرة عامة',
    titleEn: 'Executive Dashboard',
    path: '/platform/dashboard',
    icon: 'Dashboard',
    roles: ['admin', 'clinical_director', 'branch_manager', 'executive'],
  },
  {
    id: 'beneficiaries',
    title: 'المستفيدون',
    titleEn: 'Beneficiaries',
    path: '/beneficiaries',
    icon: 'People',
    roles: ['admin', 'therapist', 'clinical_director', 'branch_manager'],
  },
  {
    id: 'episodes',
    title: 'حلقات الرعاية',
    titleEn: 'Episodes of Care',
    path: '/episodes',
    icon: 'EventNote',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'sessions',
    title: 'الجلسات',
    titleEn: 'Clinical Sessions',
    path: '/sessions',
    icon: 'CalendarToday',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'assessments',
    title: 'التقييمات',
    titleEn: 'Assessments',
    path: '/assessments',
    icon: 'Assignment',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'care-plans',
    title: 'خطط الرعاية',
    titleEn: 'Care Plans',
    path: '/care-plans',
    icon: 'ListAlt',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'goals',
    title: 'الأهداف العلاجية',
    titleEn: 'Goals & Measures',
    path: '/goals',
    icon: 'TrackChanges',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'group-therapy',
    title: 'العلاج الجماعي',
    titleEn: 'Group Therapy',
    path: '/group-therapy',
    icon: 'Groups',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'tele-rehab',
    title: 'التأهيل عن بُعد',
    titleEn: 'Tele-Rehabilitation',
    path: '/tele-rehab',
    icon: 'Videocam',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'ar-vr',
    title: 'الواقع الافتراضي',
    titleEn: 'AR/VR Rehab',
    path: '/ar-vr',
    icon: 'Vrpano',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'behavior',
    title: 'إدارة السلوك',
    titleEn: 'Behavior Management',
    path: '/behavior',
    icon: 'Psychology',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'programs',
    title: 'البرامج',
    titleEn: 'Programs',
    path: '/programs',
    icon: 'School',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
  {
    id: 'family',
    title: 'بوابة الأسرة',
    titleEn: 'Family Portal',
    path: '/family',
    icon: 'FamilyRestroom',
    roles: ['admin', 'therapist', 'family_member'],
  },
  {
    id: 'quality',
    title: 'الجودة والامتثال',
    titleEn: 'Quality & Compliance',
    path: '/quality',
    icon: 'VerifiedUser',
    roles: ['admin', 'quality_officer', 'clinical_director'],
  },
  {
    id: 'ai-recommendations',
    title: 'التوصيات الذكية',
    titleEn: 'AI Recommendations',
    path: '/ai-recommendations',
    icon: 'AutoAwesome',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'reports',
    title: 'التقارير',
    titleEn: 'Reports & Analytics',
    path: '/reports',
    icon: 'BarChart',
    roles: ['admin', 'clinical_director', 'branch_manager', 'quality_officer'],
  },
  {
    id: 'research',
    title: 'البحث السريري',
    titleEn: 'Clinical Research',
    path: '/research',
    icon: 'Biotech',
    roles: ['admin', 'researcher', 'clinical_director'],
  },
  {
    id: 'field-training',
    title: 'التدريب الميداني',
    titleEn: 'Field Training',
    path: '/field-training',
    icon: 'ModelTraining',
    roles: ['admin', 'supervisor', 'clinical_director'],
  },
  {
    id: 'workflow',
    title: 'سير العمل',
    titleEn: 'Workflow',
    path: '/workflow',
    icon: 'AccountTree',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
  // ── Phase 29: Workforce Development ──
  {
    id: 'workforce-analytics',
    title: 'تحليلات القوى العاملة',
    titleEn: 'Workforce Analytics',
    path: '/workforce-analytics',
    icon: 'Analytics',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
  {
    id: 'credential-manager',
    title: 'إدارة الشهادات',
    titleEn: 'Credential Manager',
    path: '/credential-manager',
    icon: 'Badge',
    roles: ['admin', 'clinical_director', 'hr_manager'],
  },
  {
    id: 'mentorship-program',
    title: 'التوجيه والإرشاد',
    titleEn: 'Mentorship Program',
    path: '/mentorship-program',
    icon: 'Diversity3',
    roles: ['admin', 'clinical_director', 'supervisor'],
  },
  {
    id: 'career-pathway',
    title: 'المسارات المهنية',
    titleEn: 'Career Pathway',
    path: '/career-pathway',
    icon: 'Route',
    roles: ['admin', 'clinical_director', 'hr_manager'],
  },
  // ── Phase 30: Accreditation & Compliance ──
  {
    id: 'accreditation-manager',
    title: 'الاعتماد المؤسسي',
    titleEn: 'Accreditation Manager',
    path: '/accreditation-manager',
    icon: 'Verified',
    roles: ['admin', 'quality_officer', 'clinical_director'],
  },
  {
    id: 'inspection-tracker',
    title: 'متابعة التفتيش',
    titleEn: 'Inspection Tracker',
    path: '/inspection-tracker',
    icon: 'FindInPage',
    roles: ['admin', 'quality_officer', 'clinical_director'],
  },
  {
    id: 'standards-compliance',
    title: 'الامتثال للمعايير',
    titleEn: 'Standards Compliance',
    path: '/standards-compliance',
    icon: 'Rule',
    roles: ['admin', 'quality_officer', 'clinical_director'],
  },
  {
    id: 'licensure-manager',
    title: 'إدارة التراخيص',
    titleEn: 'Licensure Manager',
    path: '/licensure-manager',
    icon: 'CardMembership',
    roles: ['admin', 'quality_officer', 'clinical_director'],
  },
  // ── Phase 31: Patient Engagement ──
  {
    id: 'patient-portal',
    title: 'بوابة المريض',
    titleEn: 'Patient Portal',
    path: '/patient-portal',
    icon: 'PortableWifiOff',
    roles: ['admin', 'therapist', 'clinical_director', 'patient'],
  },
  {
    id: 'health-education',
    title: 'التثقيف الصحي',
    titleEn: 'Health Education',
    path: '/health-education',
    icon: 'MenuBook',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'remote-monitoring',
    title: 'المراقبة عن بُعد',
    titleEn: 'Remote Monitoring',
    path: '/remote-monitoring',
    icon: 'Monitor',
    roles: ['admin', 'therapist', 'clinical_director'],
  },
  {
    id: 'patient-community',
    title: 'مجتمع المرضى',
    titleEn: 'Patient Community',
    path: '/patient-community',
    icon: 'Forum',
    roles: ['admin', 'therapist', 'clinical_director', 'patient'],
  },
  // ── Phase 32: Interoperability ──
  {
    id: 'fhir-integration',
    title: 'تكامل FHIR',
    titleEn: 'FHIR Integration',
    path: '/fhir-integration',
    icon: 'IntegrationInstructions',
    roles: ['admin', 'clinical_director', 'it_admin'],
  },
  {
    id: 'hl7-messaging',
    title: 'رسائل HL7',
    titleEn: 'HL7 Messaging',
    path: '/hl7-messaging',
    icon: 'MarkEmailRead',
    roles: ['admin', 'clinical_director', 'it_admin'],
  },
  {
    id: 'data-exchange',
    title: 'تبادل البيانات',
    titleEn: 'Data Exchange',
    path: '/data-exchange',
    icon: 'SwapHoriz',
    roles: ['admin', 'clinical_director', 'it_admin'],
  },
  {
    id: 'interoperability-hub',
    title: 'مركز التشغيل البيني',
    titleEn: 'Interoperability Hub',
    path: '/interoperability-hub',
    icon: 'Hub',
    roles: ['admin', 'clinical_director', 'it_admin'],
  },
  // ── Phase 33: Disaster Recovery ──
  {
    id: 'backup-manager',
    title: 'النسخ الاحتياطي',
    titleEn: 'Backup Manager',
    path: '/backup-manager',
    icon: 'Backup',
    roles: ['admin', 'it_admin'],
  },
  {
    id: 'business-continuity',
    title: 'استمرارية الأعمال',
    titleEn: 'Business Continuity',
    path: '/business-continuity',
    icon: 'Shield',
    roles: ['admin', 'it_admin', 'clinical_director'],
  },
  {
    id: 'system-failover',
    title: 'تجاوز الأعطال',
    titleEn: 'System Failover',
    path: '/system-failover',
    icon: 'PowerSettingsNew',
    roles: ['admin', 'it_admin'],
  },
  {
    id: 'incident-response',
    title: 'الاستجابة للحوادث',
    titleEn: 'Incident Response',
    path: '/incident-response',
    icon: 'ReportProblem',
    roles: ['admin', 'it_admin', 'clinical_director'],
  },
  // ── Phase 34: Facility & Asset ──
  {
    id: 'equipment-lifecycle',
    title: 'دورة حياة المعدات',
    titleEn: 'Equipment Lifecycle',
    path: '/equipment-lifecycle',
    icon: 'Build',
    roles: ['admin', 'facility_manager', 'clinical_director'],
  },
  {
    id: 'environmental-monitoring',
    title: 'المراقبة البيئية',
    titleEn: 'Environmental Monitoring',
    path: '/environmental-monitoring',
    icon: 'Thermostat',
    roles: ['admin', 'facility_manager', 'clinical_director'],
  },
  {
    id: 'space-management',
    title: 'إدارة المساحات',
    titleEn: 'Space Management',
    path: '/space-management',
    icon: 'MeetingRoom',
    roles: ['admin', 'facility_manager', 'branch_manager'],
  },
  {
    id: 'asset-tracking',
    title: 'تتبع الأصول',
    titleEn: 'Asset Tracking',
    path: '/asset-tracking',
    icon: 'Inventory',
    roles: ['admin', 'facility_manager', 'branch_manager'],
  },
  // ── Phase 35: Clinical Research ──
  {
    id: 'clinical-research',
    title: 'البحث السريري المتقدم',
    titleEn: 'Clinical Research',
    path: '/clinical-research',
    icon: 'Science',
    roles: ['admin', 'researcher', 'clinical_director'],
  },
  {
    id: 'clinical-trials',
    title: 'التجارب السريرية',
    titleEn: 'Clinical Trials',
    path: '/clinical-trials',
    icon: 'Biotech',
    roles: ['admin', 'researcher', 'clinical_director'],
  },
  {
    id: 'outcome-research',
    title: 'بحوث النتائج',
    titleEn: 'Outcome Research',
    path: '/outcome-research',
    icon: 'TrendingUp',
    roles: ['admin', 'researcher', 'clinical_director'],
  },
  {
    id: 'publication-manager',
    title: 'المنشورات العلمية',
    titleEn: 'Publication Manager',
    path: '/publication-manager',
    icon: 'Article',
    roles: ['admin', 'researcher', 'clinical_director'],
  },
  // ── Phase 36: Community Engagement ──
  {
    id: 'volunteer-management',
    title: 'إدارة المتطوعين',
    titleEn: 'Volunteer Management',
    path: '/volunteer-management',
    icon: 'VolunteerActivism',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
  {
    id: 'community-outreach',
    title: 'التواصل المجتمعي',
    titleEn: 'Community Outreach',
    path: '/community-outreach',
    icon: 'Campaign',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
  {
    id: 'donor-relations',
    title: 'علاقات المانحين',
    titleEn: 'Donor Relations',
    path: '/donor-relations',
    icon: 'Favorite',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
  {
    id: 'advocacy-program',
    title: 'برنامج المناصرة',
    titleEn: 'Advocacy Program',
    path: '/advocacy-program',
    icon: 'RecordVoiceOver',
    roles: ['admin', 'clinical_director', 'branch_manager'],
  },
];
