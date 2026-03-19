/**
 * Portal Routes (Student, Therapist, Parent)
 * مسارات البوابات (الطالب، المعالج، ولي الأمر)
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

// Student Portal
const StudentPortal = lazyWithRetry(() => import('../pages/education/StudentPortal'));
const StudentSchedule = lazyWithRetry(() => import('../pages/education/StudentSchedule'));
const StudentGrades = lazyWithRetry(() => import('../pages/education/StudentGrades'));
const StudentAttendance = lazyWithRetry(() => import('../pages/education/StudentAttendance'));
const StudentAssignments = lazyWithRetry(() => import('../pages/education/StudentAssignments'));
const StudentLibrary = lazyWithRetry(() => import('../pages/education/StudentLibrary'));
const StudentAnnouncements = lazyWithRetry(() => import('../pages/education/StudentAnnouncements'));
const StudentMessages = lazyWithRetry(() => import('../pages/education/StudentMessages'));
const StudentReports = lazyWithRetry(() => import('../pages/StudentReports'));

// Student Portal Extended Services (خدمات الطالب الموسّعة)
const StudentComplaints = lazyWithRetry(() => import('../pages/education/StudentComplaints'));
const StudentCertificates = lazyWithRetry(() => import('../pages/education/StudentCertificates'));
const StudentHealthTracker = lazyWithRetry(() => import('../pages/education/StudentHealthTracker'));
const StudentRewardsStore = lazyWithRetry(() => import('../pages/education/StudentRewardsStore'));
const StudentEvents = lazyWithRetry(() => import('../pages/education/StudentEvents'));
const StudentELearning = lazyWithRetry(() => import('../pages/education/StudentELearning'));

// Therapist Portal
const TherapistDashboard = lazyWithRetry(() => import('../pages/rehab/TherapistDashboard'));
const TherapistPatients = lazyWithRetry(() => import('../pages/rehab/TherapistPatients'));
const TherapistSchedule = lazyWithRetry(() => import('../pages/rehab/TherapistSchedule'));
const TherapistSessions = lazyWithRetry(() => import('../pages/rehab/TherapistSessions'));
const TherapistCases = lazyWithRetry(() => import('../pages/rehab/TherapistCases'));
const TherapistDocuments = lazyWithRetry(() => import('../pages/rehab/TherapistDocuments'));
const TherapistReports = lazyWithRetry(() => import('../pages/rehab/TherapistReports'));
const TherapistMessages = lazyWithRetry(() => import('../pages/rehab/TherapistMessages'));

// Therapist Portal Extended
const TherapistTreatmentPlans = lazyWithRetry(() => import('../pages/rehab/TherapistTreatmentPlans'));
const TherapistAssessments = lazyWithRetry(() => import('../pages/rehab/TherapistAssessments'));
const TherapistPrescriptions = lazyWithRetry(() => import('../pages/rehab/TherapistPrescriptions'));
const TherapistProfessionalDev = lazyWithRetry(() => import('../pages/rehab/TherapistProfessionalDev'));
const TherapistAnalytics = lazyWithRetry(() => import('../pages/rehab/TherapistAnalytics'));
const TherapistConsultations = lazyWithRetry(() => import('../pages/rehab/TherapistConsultations'));

// Therapist Portal Pro
const TherapistDailyTasks = lazyWithRetry(() => import('../pages/rehab/TherapistDailyTasks'));
const TherapistProgressTracking = lazyWithRetry(() => import('../pages/rehab/TherapistProgressTracking'));
const TherapistClinicalLibrary = lazyWithRetry(() => import('../pages/rehab/TherapistClinicalLibrary'));
const TherapistDocTemplates = lazyWithRetry(() => import('../pages/rehab/TherapistDocTemplates'));
const TherapistParentComm = lazyWithRetry(() => import('../pages/rehab/TherapistParentComm'));
const TherapistSmartGoals = lazyWithRetry(() => import('../pages/rehab/TherapistSmartGoals'));

// Therapist Portal Ultra
const TherapistReferrals = lazyWithRetry(() => import('../pages/rehab/TherapistReferrals'));
const TherapistGroupTherapy = lazyWithRetry(() => import('../pages/rehab/TherapistGroupTherapy'));
const TherapistEquipment = lazyWithRetry(() => import('../pages/rehab/TherapistEquipment'));
const TherapistPerformanceKPIs = lazyWithRetry(() => import('../pages/rehab/TherapistPerformanceKPIs'));
const TherapistSafetyProtocols = lazyWithRetry(() => import('../pages/rehab/TherapistSafetyProtocols'));
const TherapistClinicalResearch = lazyWithRetry(() => import('../pages/rehab/TherapistClinicalResearch'));

// Therapist Portal Elite
const TherapistTelehealth = lazyWithRetry(() => import('../pages/rehab/TherapistTelehealth'));
const TherapistFieldTraining = lazyWithRetry(() => import('../pages/rehab/TherapistFieldTraining'));
const TherapistConsentManagement = lazyWithRetry(() => import('../pages/rehab/TherapistConsentManagement'));
const TherapistQualityReports = lazyWithRetry(() => import('../pages/rehab/TherapistQualityReports'));
const TherapistWaitingList = lazyWithRetry(() => import('../pages/rehab/TherapistWaitingList'));
const TherapistAchievements = lazyWithRetry(() => import('../pages/rehab/TherapistAchievements'));

// Parent Portal
const ParentDashboard = lazyWithRetry(() => import('../pages/common/ParentDashboard'));
const ChildrenProgress = lazyWithRetry(() => import('../pages/education/ChildrenProgress'));
const AttendanceReports = lazyWithRetry(() => import('../pages/hr/AttendanceReports'));
const TherapistCommunications = lazyWithRetry(() => import('../pages/rehab/TherapistCommunications'));
const PaymentsHistory = lazyWithRetry(() => import('../pages/finance/PaymentsHistory'));
const DocumentsReports = lazyWithRetry(() => import('../pages/documents/DocumentsReports'));
const AppointmentsScheduling = lazyWithRetry(() => import('../pages/common/AppointmentsScheduling'));
const ParentMessages = lazyWithRetry(() => import('../pages/common/ParentMessages'));

export default function PortalRoutes() {
  return (
    <>
      {/* Student Portal */}
      <Route path="student-portal" element={<StudentPortal />} />
      <Route path="student-portal/schedule" element={<StudentSchedule />} />
      <Route path="student-portal/grades" element={<StudentGrades />} />
      <Route path="student-portal/attendance" element={<StudentAttendance />} />
      <Route path="student-portal/reports" element={<StudentReports />} />
      <Route path="student-portal/assignments" element={<StudentAssignments />} />
      <Route path="student-portal/library" element={<StudentLibrary />} />
      <Route path="student-portal/announcements" element={<StudentAnnouncements />} />
      <Route path="student-portal/messages" element={<StudentMessages />} />
      <Route path="student-portal/complaints" element={<StudentComplaints />} />
      <Route path="student-portal/certificates" element={<StudentCertificates />} />
      <Route path="student-portal/health-tracker" element={<StudentHealthTracker />} />
      <Route path="student-portal/rewards" element={<StudentRewardsStore />} />
      <Route path="student-portal/events" element={<StudentEvents />} />
      <Route path="student-portal/elearning" element={<StudentELearning />} />

      {/* Therapist Portal */}
      <Route path="therapist-portal" element={<TherapistDashboard />} />
      <Route path="therapist-portal/patients" element={<TherapistPatients />} />
      <Route path="therapist-portal/schedule" element={<TherapistSchedule />} />
      <Route path="therapist-portal/sessions" element={<TherapistSessions />} />
      <Route path="therapist-portal/cases" element={<TherapistCases />} />
      <Route path="therapist-portal/documents" element={<TherapistDocuments />} />
      <Route path="therapist-portal/reports" element={<TherapistReports />} />
      <Route path="therapist-portal/messages" element={<TherapistMessages />} />
      <Route path="therapist-portal/treatment-plans" element={<TherapistTreatmentPlans />} />
      <Route path="therapist-portal/assessments" element={<TherapistAssessments />} />
      <Route path="therapist-portal/prescriptions" element={<TherapistPrescriptions />} />
      <Route path="therapist-portal/professional-dev" element={<TherapistProfessionalDev />} />
      <Route path="therapist-portal/analytics" element={<TherapistAnalytics />} />
      <Route path="therapist-portal/consultations" element={<TherapistConsultations />} />
      <Route path="therapist-portal/tasks" element={<TherapistDailyTasks />} />
      <Route path="therapist-portal/progress-tracking" element={<TherapistProgressTracking />} />
      <Route path="therapist-portal/clinical-library" element={<TherapistClinicalLibrary />} />
      <Route path="therapist-portal/doc-templates" element={<TherapistDocTemplates />} />
      <Route path="therapist-portal/parent-comm" element={<TherapistParentComm />} />
      <Route path="therapist-portal/smart-goals" element={<TherapistSmartGoals />} />
      <Route path="therapist-portal/referrals" element={<TherapistReferrals />} />
      <Route path="therapist-portal/group-therapy" element={<TherapistGroupTherapy />} />
      <Route path="therapist-portal/equipment" element={<TherapistEquipment />} />
      <Route path="therapist-portal/kpis" element={<TherapistPerformanceKPIs />} />
      <Route path="therapist-portal/safety-protocols" element={<TherapistSafetyProtocols />} />
      <Route path="therapist-portal/clinical-research" element={<TherapistClinicalResearch />} />
      <Route path="therapist-portal/telehealth" element={<TherapistTelehealth />} />
      <Route path="therapist-portal/field-training" element={<TherapistFieldTraining />} />
      <Route path="therapist-portal/consents" element={<TherapistConsentManagement />} />
      <Route path="therapist-portal/quality-reports" element={<TherapistQualityReports />} />
      <Route path="therapist-portal/waiting-list" element={<TherapistWaitingList />} />
      <Route path="therapist-portal/achievements" element={<TherapistAchievements />} />

      {/* Parent Portal */}
      <Route path="parent-portal" element={<ParentDashboard />} />
      <Route path="parent-portal/children-progress" element={<ChildrenProgress />} />
      <Route path="parent-portal/attendance-reports" element={<AttendanceReports />} />
      <Route path="parent-portal/therapist-communications" element={<TherapistCommunications />} />
      <Route path="parent-portal/payments-history" element={<PaymentsHistory />} />
      <Route path="parent-portal/documents-reports" element={<DocumentsReports />} />
      <Route path="parent-portal/appointments-scheduling" element={<AppointmentsScheduling />} />
      <Route path="parent-portal/messages" element={<ParentMessages />} />
    </>
  );
}
