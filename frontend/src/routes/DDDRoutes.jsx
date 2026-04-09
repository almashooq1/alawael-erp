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
const SessionsPage = lazy(() => import('../pages/sessions/SessionsPage'));
const WorkflowPage = lazy(() => import('../pages/workflow/WorkflowPage'));
const QualityPage = lazy(() => import('../pages/quality/QualityPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));

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
        <Route path="ai-recommendations" element={<DomainPageWrapper pageName="AIRecommendationsPage" />} />
        <Route path="research" element={<DomainPageWrapper pageName="ResearchPage" />} />
        <Route path="field-training" element={<DomainPageWrapper pageName="FieldTrainingPage" />} />

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
];
