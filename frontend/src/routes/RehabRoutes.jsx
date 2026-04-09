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
const DisabilityAssessmentTests = lazyWithRetry(
  () => import('../pages/DisabilityAssessmentTests')
);

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

// Sessions
const SessionsManagement = lazyWithRetry(() => import('../pages/Sessions'));
const SessionsDashboard = lazyWithRetry(() => import('../pages/Sessions/SessionsDashboard'));
const SessionAnalyticsDashboard = lazyWithRetry(() => import('../pages/Sessions/SessionAnalyticsDashboard'));
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
    </>
  );
}
