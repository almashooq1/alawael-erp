/**
 * Education System Routes
 * مسارات النظام التعليمي
 */
import { Route, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

// Education System Module
const EducationSystemDashboard = lazyWithRetry(
  () => import('../pages/EducationSystem/EducationSystemDashboard')
);
const AcademicYearManagement = lazyWithRetry(
  () => import('../pages/EducationSystem/AcademicYearManagement')
);
const SubjectManagement = lazyWithRetry(
  () => import('../pages/EducationSystem/SubjectManagement')
);
const TeacherManagement = lazyWithRetry(
  () => import('../pages/EducationSystem/TeacherManagement')
);
const ClassroomManagement = lazyWithRetry(
  () => import('../pages/EducationSystem/ClassroomManagement')
);
const CurriculumBuilder = lazyWithRetry(
  () => import('../pages/EducationSystem/CurriculumBuilder')
);
const TimetableBuilder = lazyWithRetry(
  () => import('../pages/EducationSystem/TimetableBuilder')
);
const ExamManagement = lazyWithRetry(() => import('../pages/EducationSystem/ExamManagement'));
const GradebookPage = lazyWithRetry(() => import('../pages/EducationSystem/GradebookPage'));

// E-Learning / LMS
const ELearningDashboard = lazyWithRetry(() => import('../pages/education/ELearningDashboard'));
const CourseViewer = lazyWithRetry(() => import('../pages/education/CourseViewer'));
const EducationRehab = lazyWithRetry(() => import('../pages/EducationRehab'));

// Montessori Module
const MontessoriDashboard = lazyWithRetry(() => import('../pages/Montessori/MontessoriDashboard'));
const MontessoriStudents = lazyWithRetry(() => import('../pages/Montessori/MontessoriStudents'));
const MontessoriPrograms = lazyWithRetry(() => import('../pages/Montessori/MontessoriPrograms'));
const MontessoriSessions = lazyWithRetry(() => import('../pages/Montessori/MontessoriSessions'));
const MontessoriTeam = lazyWithRetry(() => import('../pages/Montessori/MontessoriTeam'));

// Beneficiaries & Students
const BeneficiariesDashboard = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiariesDashboard')
);
const BeneficiariesManagementPage = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiariesManagementPage')
);
const _EnhancedBeneficiariesTable = lazyWithRetry(
  () => import('../pages/Beneficiaries/EnhancedBeneficiariesTable')
);
const BeneficiariesListPage = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiariesListPage')
);
const BeneficiaryPrintTemplates = lazyWithRetry(
  () => import('../pages/Beneficiaries/templates/BeneficiaryPrintTemplates')
);
const StudentRegistrationForm = lazyWithRetry(() => import('../pages/StudentRegistration'));
const StudentsDashboard = lazyWithRetry(
  () => import('../pages/StudentManagement/StudentsDashboard')
);
const StudentManagementList = lazyWithRetry(
  () => import('../pages/StudentManagement/StudentManagementList')
);
const ComprehensiveStudentReport = lazyWithRetry(
  () => import('../pages/ComprehensiveStudentReport')
);
const StudentReportsCenter = lazyWithRetry(
  () => import('../pages/StudentManagement/StudentReportsCenter')
);
const PeriodicStudentReport = lazyWithRetry(
  () => import('../pages/PeriodicStudentReport')
);
const StudentComparisonReport = lazyWithRetry(
  () => import('../pages/StudentComparisonReport')
);
const ParentStudentReport = lazyWithRetry(
  () => import('../pages/ParentStudentReport')
);

export default function EducationRoutes() {
  return (
    <>
      {/* E-Learning / LMS */}
      <Route path="elearning" element={<Navigate to="/lms" replace />} />
      <Route path="lms" element={<ELearningDashboard />} />
      <Route path="lms/course/:id" element={<CourseViewer />} />
      <Route path="education" element={<EducationRehab />} />

      {/* Montessori Module */}
      <Route path="montessori" element={<MontessoriDashboard />} />
      <Route path="montessori/students" element={<MontessoriStudents />} />
      <Route path="montessori/programs" element={<MontessoriPrograms />} />
      <Route path="montessori/sessions" element={<MontessoriSessions />} />
      <Route path="montessori/team" element={<MontessoriTeam />} />

      {/* Education System Module */}
      <Route path="education-system" element={<EducationSystemDashboard />} />
      <Route path="education-system/academic-years" element={<AcademicYearManagement />} />
      <Route path="education-system/subjects" element={<SubjectManagement />} />
      <Route path="education-system/teachers" element={<TeacherManagement />} />
      <Route path="education-system/classrooms" element={<ClassroomManagement />} />
      <Route path="education-system/curriculum" element={<CurriculumBuilder />} />
      <Route path="education-system/timetable" element={<TimetableBuilder />} />
      <Route path="education-system/exams" element={<ExamManagement />} />
      <Route path="education-system/gradebook" element={<GradebookPage />} />

      {/* Beneficiaries Management */}
      <Route path="beneficiaries-dashboard" element={<BeneficiariesDashboard />} />
      <Route path="beneficiaries" element={<BeneficiariesListPage />} />
      <Route path="beneficiaries/manage" element={<BeneficiariesListPage />} />
      <Route path="beneficiaries/table" element={<BeneficiariesListPage />} />
      <Route path="beneficiaries/legacy" element={<BeneficiariesManagementPage />} />
      <Route path="beneficiaries/templates" element={<BeneficiaryPrintTemplates />} />

      {/* Students */}
      <Route path="student-registration" element={<StudentRegistrationForm />} />
      <Route path="students-dashboard" element={<StudentsDashboard />} />
      <Route path="student-management" element={<StudentManagementList />} />
      <Route path="student-report/:studentId" element={<ComprehensiveStudentReport />} />
      <Route path="student-report/:studentId/parent" element={<ParentStudentReport />} />
      <Route path="student-reports-center" element={<StudentReportsCenter />} />
      <Route path="student-reports/periodic" element={<PeriodicStudentReport />} />
      <Route path="student-reports/comparison" element={<StudentComparisonReport />} />
    </>
  );
}
