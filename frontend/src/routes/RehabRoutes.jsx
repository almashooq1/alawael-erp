/**
 * Rehabilitation & Therapy Routes
 * مسارات التأهيل والعلاج
 */
import { Route, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

// Disability Assessment
const DisabilityAssessmentScales = lazyWithRetry(
  () => import('../pages/DisabilityAssessmentScales')
);
const DisabilityAssessmentTests = lazyWithRetry(() => import('../pages/DisabilityAssessmentTests'));

// Integrated Care
const CarePlansDashboard = lazyWithRetry(
  () => import('../pages/IntegratedCare/CarePlansDashboard')
);
const CreateCarePlan = lazyWithRetry(() => import('../pages/IntegratedCare/CreateCarePlan'));
const RecordSession = lazyWithRetry(() => import('../pages/IntegratedCare/RecordSession'));

// Disability Rehabilitation System
const DisabilityRehabDashboard = lazyWithRetry(
  () => import('../pages/rehab/DisabilityRehabDashboard')
);
const RehabProgramManagement = lazyWithRetry(() => import('../pages/rehab/RehabProgramManagement'));
const TherapySessionAdmin = lazyWithRetry(() => import('../pages/rehab/TherapySessionAdmin'));
const AssistiveDevicesManagement = lazyWithRetry(
  () => import('../pages/rehab/AssistiveDevicesManagement')
);
const DisabilityRehabReports = lazyWithRetry(() => import('../pages/rehab/DisabilityRehabReports'));

// Specialized Rehabilitation Module
const SpecializedScalesLibrary = lazyWithRetry(
  () => import('../pages/SpecializedRehab/SpecializedScalesLibrary')
);
const ScaleAdministration = lazyWithRetry(
  () => import('../pages/SpecializedRehab/ScaleAdministration')
);
const RehabProgramsLibrary = lazyWithRetry(
  () => import('../pages/SpecializedRehab/RehabProgramsLibrary')
);
const ProgramEnrollment = lazyWithRetry(
  () => import('../pages/SpecializedRehab/ProgramEnrollment')
);
const RehabProgressTracking = lazyWithRetry(
  () => import('../pages/SpecializedRehab/RehabProgressTracking')
);
const BehaviorManagement = lazyWithRetry(
  () => import('../pages/SpecializedRehab/BehaviorManagement')
);

// Rehabilitation Plans Dashboard (12-week AI-assisted plans)
const RehabDashboard = lazyWithRetry(() => import('../pages/RehabDashboard'));

// Smart Clinical Assessment Engine
const SmartAssessmentDashboard = lazyWithRetry(
  () => import('../pages/SmartAssessment/SmartAssessmentDashboard')
);

// Clinical Assessments CRUD — إدارة التقييمات السريرية
const ClinicalAssessmentsPage = lazyWithRetry(
  () => import('../pages/SmartAssessment/ClinicalAssessmentsPage')
);

// Group Therapy
const GroupTherapyPage = lazyWithRetry(() => import('../pages/group-therapy/GroupTherapyPage'));

// Therapeutic Goals — الأهداف العلاجية
const GoalsPage = lazyWithRetry(() => import('../pages/goals/GoalsPage'));

// Family Engagement — التواصل الأسري
const FamilyEngagementPage = lazyWithRetry(() => import('../pages/family/FamilyEngagementPage'));

// Tele-Rehabilitation — التأهيل عن بُعد
const TeleRehabPage = lazyWithRetry(() => import('../pages/tele-rehab/TeleRehabPage'));

// Field Training — التدريب الميداني
const FieldTrainingPage = lazyWithRetry(() => import('../pages/field-training/FieldTrainingPage'));

// AI Recommendations — التوصيات الذكية وتقييم المخاطر
const AIRecommendationsPage = lazyWithRetry(
  () => import('../pages/ai-recommendations/AIRecommendationsPage')
);

// Clinical Research — الأبحاث السريرية
const ClinicalResearchPage = lazyWithRetry(
  () => import('../pages/clinical-research/ClinicalResearchPage')
);

// AR/VR Rehabilitation — التأهيل بالواقع المعزز والافتراضي
const ARVRRehabPage = lazyWithRetry(() => import('../pages/ar-vr-rehab/ARVRRehabPage'));

// Rehab Programs (DDD) — البرامج التأهيلية (موحد)
const RehabProgramsPage = lazyWithRetry(() => import('../pages/rehab-programs/RehabProgramsPage'));

// Rehab Templates — مكتبة القوالب التأهيلية الذكية
const RehabTemplatesPage = lazyWithRetry(
  () => import('../pages/rehab-programs/RehabTemplatesPage')
);

// Activity Library — مكتبة الأنشطة التأهيلية (المرحلة 27)
const ActivityLibraryPage = lazyWithRetry(
  () => import('../pages/activity-library/ActivityLibraryPage')
);

// Session Center — مركز الجلسات العلاجية
const SessionCenterPage = lazyWithRetry(() => import('../pages/session-center/SessionCenterPage'));

// Episode Center — مركز الحلقة العلاجية الموحدة
const EpisodeCenterPage = lazyWithRetry(() => import('../pages/episode-center/EpisodeCenterPage'));

// Goal Bank — بنك الأهداف التأهيلية الذكية
const GoalBankPage = lazyWithRetry(() => import('../pages/goal-bank/GoalBankPage'));

// Report Center — مركز التقارير السريرية الموحدة
const ReportCenterPage = lazyWithRetry(() => import('../pages/report-center/ReportCenterPage'));

// Smart Measures Assessment — محرك مقاييس التأهيل الشاملة
const SmartMeasuresPage = lazyWithRetry(() => import('../pages/assessments/SmartAssessmentPage'));

// Rehab Progress Tracker — متتبع التقدم التأهيلي
const RehabProgressTrackerPage = lazyWithRetry(() => import('../pages/rehab/RehabProgressTracker'));

// Compliance Hub — مركز الامتثال المؤسسي
const ComplianceHubPage = lazyWithRetry(() => import('../pages/compliance-hub/ComplianceHubPage'));

// Patient Engagement — بوابة تفاعل المستفيدين
const PatientEngagementPage = lazyWithRetry(
  () => import('../pages/patient-engagement/PatientEngagementPage')
);

// Interoperability — مركز التشغيل البيني والتكامل
const InteroperabilityPage = lazyWithRetry(
  () => import('../pages/interoperability/InteroperabilityPage')
);

// Business Continuity — استمرارية الأعمال وإدارة الأزمات
const BusinessContinuityPage = lazyWithRetry(
  () => import('../pages/business-continuity/BusinessContinuityPage')
);

// HR Development — تطوير الكوادر البشرية
const HRDevelopmentPage = lazyWithRetry(() => import('../pages/hr-development/HRDevelopmentPage'));

// Equipment Lifecycle — دورة حياة المعدات والأجهزة
const EquipmentLifecyclePage = lazyWithRetry(
  () => import('../pages/equipment-lifecycle/EquipmentLifecyclePage')
);

// Facility Management — إدارة المرافق والبيئة
const FacilityManagementPage = lazyWithRetry(
  () => import('../pages/facility-management/FacilityManagementPage')
);

// Research Hub — مركز البحث العلمي والسريري
const ResearchHubPage = lazyWithRetry(() => import('../pages/research-hub/ResearchHubPage'));

// Community Engagement — الانخراط المجتمعي والتطوعي
const CommunityEngagementPage = lazyWithRetry(
  () => import('../pages/community-engagement/CommunityEngagementPage')
);

// Sessions
const SessionsManagement = lazyWithRetry(() => import('../pages/Sessions'));
const SessionsDashboard = lazyWithRetry(() => import('../pages/Sessions/SessionsDashboard'));
const SessionAnalyticsDashboard = lazyWithRetry(
  () => import('../pages/Sessions/SessionAnalyticsDashboard')
);
const SessionCalendarView = lazyWithRetry(() => import('../pages/Sessions/SessionCalendarView'));

export default function RehabRoutes() {
  return (
    <>
      {/* Redirect legacy rehab path */}
      <Route path="rehab" element={<Navigate to="/integrated-care" replace />} />

      {/* Disability Assessment */}
      <Route path="assessment-scales" element={<DisabilityAssessmentScales />} />
      <Route path="assessment-tests" element={<DisabilityAssessmentTests />} />

      {/* Integrated Care */}
      <Route path="integrated-care" element={<CarePlansDashboard />} />
      <Route path="integrated-care/create" element={<CreateCarePlan />} />
      <Route path="integrated-care/session" element={<RecordSession />} />

      {/* Disability Rehabilitation System */}
      <Route path="disability-rehab-dashboard" element={<DisabilityRehabDashboard />} />
      <Route path="rehab-programs" element={<RehabProgramManagement />} />
      <Route path="therapy-sessions-admin" element={<TherapySessionAdmin />} />
      <Route path="assistive-devices" element={<AssistiveDevicesManagement />} />
      <Route path="disability-rehab-reports" element={<DisabilityRehabReports />} />

      {/* Sessions */}
      <Route path="sessions" element={<SessionsManagement />} />
      <Route path="sessions-dashboard" element={<SessionsDashboard />} />
      <Route path="sessions-analytics" element={<SessionAnalyticsDashboard />} />
      <Route path="sessions-calendar" element={<SessionCalendarView />} />

      {/* Specialized Rehabilitation Module */}
      <Route path="specialized-scales" element={<SpecializedScalesLibrary />} />
      <Route path="scale-administration" element={<ScaleAdministration />} />
      <Route path="rehab-programs-library" element={<RehabProgramsLibrary />} />
      <Route path="program-enrollment" element={<ProgramEnrollment />} />
      <Route path="rehab-progress" element={<RehabProgressTracking />} />
      <Route path="behavior-management" element={<BehaviorManagement />} />

      {/* Individualized Rehabilitation Plans — 12-week AI-assisted */}
      <Route path="rehab-plans" element={<RehabDashboard />} />

      {/* Smart Clinical Assessment Engine — محرك التقييم الذكي */}
      <Route path="smart-assessment" element={<SmartAssessmentDashboard />} />

      {/* Clinical Assessments CRUD — إدارة التقييمات السريرية */}
      <Route path="clinical-assessments" element={<ClinicalAssessmentsPage />} />

      {/* Group Therapy — إدارة العلاج الجماعي */}
      <Route path="group-therapy" element={<GroupTherapyPage />} />
      <Route path="therapist-portal/group-therapy" element={<GroupTherapyPage />} />

      {/* Therapeutic Goals — الأهداف العلاجية */}
      <Route path="goals" element={<GoalsPage />} />

      {/* Family Engagement — التواصل الأسري */}
      <Route path="family-engagement" element={<FamilyEngagementPage />} />

      {/* Tele-Rehabilitation — التأهيل عن بُعد */}
      <Route path="tele-rehab" element={<TeleRehabPage />} />

      {/* Field Training — التدريب الميداني */}
      <Route path="field-training" element={<FieldTrainingPage />} />

      {/* AI Recommendations — التوصيات الذكية وتقييم المخاطر */}
      <Route path="ai-recommendations" element={<AIRecommendationsPage />} />

      {/* Clinical Research — الأبحاث السريرية */}
      <Route path="clinical-research" element={<ClinicalResearchPage />} />

      {/* AR/VR Rehabilitation — التأهيل بالواقع المعزز والافتراضي */}
      <Route path="ar-vr" element={<ARVRRehabPage />} />

      {/* Rehab Programs (DDD unified) — البرامج التأهيلية الموحدة */}
      <Route path="programs" element={<RehabProgramsPage />} />

      {/* Rehab Program Templates — مكتبة القوالب التأهيلية الذكية */}
      <Route path="rehab-templates" element={<RehabTemplatesPage />} />

      {/* Activity Library — مكتبة الأنشطة التأهيلية */}
      <Route path="activity-library" element={<ActivityLibraryPage />} />

      {/* Session Center — مركز الجلسات العلاجية */}
      <Route path="session-center" element={<SessionCenterPage />} />

      {/* Episode Center — مركز الحلقة العلاجية الموحدة */}
      <Route path="episode-center" element={<EpisodeCenterPage />} />

      {/* Smart Measures Assessment — مقاييس التأهيل الشاملة */}
      <Route path="rehab-measures" element={<SmartMeasuresPage />} />

      {/* Rehab Progress Tracker — متتبع التقدم */}
      <Route path="rehab-progress-tracker" element={<RehabProgressTrackerPage />} />

      {/* Compliance Hub — مركز الامتثال المؤسسي */}
      <Route path="compliance-hub" element={<ComplianceHubPage />} />

      {/* Patient Engagement — بوابة تفاعل المستفيدين */}
      <Route path="patient-engagement" element={<PatientEngagementPage />} />

      {/* Interoperability — مركز التشغيل البيني والتكامل */}
      <Route path="interoperability" element={<InteroperabilityPage />} />

      {/* Business Continuity — استمرارية الأعمال وإدارة الأزمات */}
      <Route path="business-continuity" element={<BusinessContinuityPage />} />

      {/* HR Development — تطوير الكوادر البشرية */}
      <Route path="hr-development" element={<HRDevelopmentPage />} />

      {/* Equipment Lifecycle — دورة حياة المعدات والأجهزة */}
      <Route path="equipment-lifecycle" element={<EquipmentLifecyclePage />} />

      {/* Facility Management — إدارة المرافق والبيئة */}
      <Route path="facility-management" element={<FacilityManagementPage />} />

      {/* Research Hub — مركز البحث العلمي والسريري */}
      <Route path="research-hub" element={<ResearchHubPage />} />

      {/* Community Engagement — الانخراط المجتمعي والتطوعي */}
      <Route path="community-engagement" element={<CommunityEngagementPage />} />

      {/* Goal Bank — بنك الأهداف التأهيلية الذكية */}
      <Route path="goal-bank" element={<GoalBankPage />} />

      {/* Report Center — مركز التقارير السريرية الموحدة */}
      <Route path="report-center" element={<ReportCenterPage />} />
    </>
  );
}
