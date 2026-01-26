import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import theme from './theme';

// Pages
import Login from './pages/SimpleLogin';
import Register from './pages/Register';
import Dashboard from './pages/SimpleDashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Friends from './pages/Friends';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Communications from './pages/Communications';
import CommunicationsSystem from './pages/CommunicationsSystem';
import Documents from './pages/Documents';
import DocumentsPage from './pages/DocumentsPage';
import SmartDocumentsPage from './pages/SmartDocumentsPage';
import PaymentDashboard from './pages/PaymentDashboard';
import MessagingPage from './pages/MessagingPage';
import ProjectManagementDashboard from './pages/ProjectManagementDashboard';
import CarePlansDashboard from './pages/IntegratedCare/CarePlansDashboard';
import CreateCarePlan from './pages/IntegratedCare/CreateCarePlan';
import RecordSession from './pages/IntegratedCare/RecordSession';
import StudentPortal from './pages/StudentPortal';
import StudentSchedule from './pages/StudentSchedule';
import StudentGrades from './pages/StudentGrades';
import StudentAttendance from './pages/StudentAttendance';
import StudentAssignments from './pages/StudentAssignments';
import StudentLibrary from './pages/StudentLibrary';
import StudentAnnouncements from './pages/StudentAnnouncements';
import StudentMessages from './pages/StudentMessages';
import TherapistDashboard from './pages/TherapistDashboard';
import TherapistPatients from './pages/TherapistPatients';
import TherapistSchedule from './pages/TherapistSchedule';
import TherapistSessions from './pages/TherapistSessions';
import TherapistCases from './pages/TherapistCases';
import TherapistDocuments from './pages/TherapistDocuments';
import TherapistReports from './pages/TherapistReports';
import TherapistMessages from './pages/TherapistMessages';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersManagement from './pages/AdminUsersManagement';
import AdminSystemSettings from './pages/AdminSystemSettings';
import AdminReportsAnalytics from './pages/AdminReportsAnalytics';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminClinicManagement from './pages/AdminClinicManagement';
import ExecutiveDashboard from './pages/ExecutiveDashboard'; // Phase 11 Dashboard
import AdminPaymentsBilling from './pages/AdminPaymentsBilling';
import AdminNotifications from './pages/AdminNotifications';
import ParentDashboard from './pages/ParentDashboard';
import ChildrenProgress from './pages/ChildrenProgress';
import AttendanceReports from './pages/AttendanceReports';
import TherapistCommunications from './pages/TherapistCommunications';
import PaymentsHistory from './pages/PaymentsHistory';
import DocumentsReports from './pages/DocumentsReports';
import AppointmentsScheduling from './pages/AppointmentsScheduling';
import ParentMessages from './pages/ParentMessages';
import AIAnalyticsDashboard from './pages/AIAnalyticsDashboard';
import ELearningDashboard from './pages/ELearningDashboard';
import HRAdvancedDashboard from './pages/HRAdvancedDashboard';
import SecuritySettings from './pages/SecuritySettings';
import CourseViewer from './pages/CourseViewer';

// Enhanced UI Components
import BeneficiariesManagementPage from './pages/Beneficiaries/BeneficiariesManagementPage';
import EnhancedAdminDashboard from './pages/Dashboard/EnhancedAdminDashboard';
import AdvancedReportsPage from './pages/Reports/AdvancedReportsPage';
import EnhancedBeneficiariesTable from './pages/Beneficiaries/EnhancedBeneficiariesTable';

// Advanced Analytics & Reports
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ExportImportManager from './components/ExportImportManager';
import AdvancedReports from './components/reports/AdvancedReports';

// Advanced UI Components
import AdvancedDashboardUI from './pages/Dashboard/AdvancedDashboardUI';
import AdvancedAdminPanel from './pages/Admin/AdvancedAdminPanel';

// Components
import Layout from './components/Layout';
import Home from './pages/Home';
import ModulePage from './pages/ModulePage';
import ArchivingDashboard from './components/ArchivingDashboard';
import OrganizationChart from './pages/OrganizationChart'; // NEW: Organization Structure

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route component
const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/home" replace />} />
                <Route path="home" element={<Home />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/advanced" element={<AdvancedDashboardUI />} />
                <Route path="activity" element={<Activity />} />
                <Route
                  path="reports"
                  element={<ModulePage title="التقارير والتحليلات" moduleKey="reports" />}
                />

                {/* Business / Operations */}
                <Route
                  path="crm"
                  element={<ModulePage title="إدارة علاقات العملاء (CRM)" moduleKey="crm" />}
                />
                <Route path="finance" element={<PaymentDashboard />} />
                <Route path="messages" element={<MessagingPage />} />
                <Route path="projects" element={<ProjectManagementDashboard />} />
                <Route
                  path="procurement"
                  element={<ModulePage title="المشتريات والمخزون" moduleKey="finance" />}
                />

                {/* Security */}
                <Route path="security" element={<SecuritySettings />} />

                {/* People */}
                <Route path="hr" element={<HRAdvancedDashboard />} />
                <Route path="attendance" element={<HRAdvancedDashboard />} />
                <Route path="payroll" element={<HRAdvancedDashboard />} />
                <Route path="organization" element={<OrganizationChart />} />

                {/* Learning / Care */}
                <Route path="elearning" element={<Navigate to="/lms" replace />} />
                <Route path="lms" element={<ELearningDashboard />} />
                <Route path="lms/course/:id" element={<CourseViewer />} />
                <Route
                  path="sessions"
                  element={<ModulePage title="الجلسات والمواعيد" moduleKey="rehab" />}
                />
                <Route
                  path="rehab"
                  element={<ModulePage title="إعادة التأهيل والعلاج" moduleKey="rehab" />}
                />
                <Route path="integrated-care" element={<CarePlansDashboard />} />
                <Route path="integrated-care/create" element={<CreateCarePlan />} />
                <Route path="integrated-care/session" element={<RecordSession />} />
                <Route
                  path="ai-assistant"
                  element={
                    <ModulePage title="المساعد الذكي بالذكاء الاصطناعي" moduleKey="reports" />
                  }
                />
                <Route path="ai-analytics" element={<AIAnalyticsDashboard />} />

                {/* Communications */}
                <Route path="communications" element={<Communications />} />
                <Route path="communications-system" element={<CommunicationsSystem />} />

                {/* Advanced Analytics & Reports */}
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="analytics/advanced" element={<AdvancedReports />} />
                <Route path="export-import" element={<ExportImportManager />} />
                <Route path="data-management" element={<ExportImportManager />} />

                {/* Document Management */}
                <Route path="documents" element={<Documents />} />
                <Route path="documents-management" element={<DocumentsPage />} />
                <Route path="smart-documents" element={<SmartDocumentsPage />} />
                <Route path="archiving" element={<ArchivingDashboard />} />

                {/* Student Portal */}
                <Route path="student-portal" element={<StudentPortal />} />
                <Route path="student-portal/schedule" element={<StudentSchedule />} />
                <Route path="student-portal/grades" element={<StudentGrades />} />
                <Route path="student-portal/attendance" element={<StudentAttendance />} />
                <Route path="student-portal/assignments" element={<StudentAssignments />} />
                <Route path="student-portal/library" element={<StudentLibrary />} />
                <Route path="student-portal/announcements" element={<StudentAnnouncements />} />
                <Route path="student-portal/messages" element={<StudentMessages />} />

                {/* Therapist Portal */}
                <Route path="therapist-portal" element={<TherapistDashboard />} />
                <Route path="therapist-portal/patients" element={<TherapistPatients />} />
                <Route path="therapist-portal/schedule" element={<TherapistSchedule />} />
                <Route path="therapist-portal/sessions" element={<TherapistSessions />} />
                <Route path="therapist-portal/cases" element={<TherapistCases />} />
                <Route path="therapist-portal/documents" element={<TherapistDocuments />} />
                <Route path="therapist-portal/reports" element={<TherapistReports />} />
                <Route path="therapist-portal/messages" element={<TherapistMessages />} />

                {/* Admin Portal */}
                <Route path="admin-portal" element={<AdminDashboard />} />
                <Route path="admin-portal/enhanced" element={<EnhancedAdminDashboard />} />
                <Route path="admin-portal/advanced" element={<AdvancedAdminPanel />} />
                <Route path="admin-portal/users" element={<AdminUsersManagement />} />
                <Route path="admin-portal/settings" element={<AdminSystemSettings />} />
                <Route path="admin-portal/reports" element={<AdminReportsAnalytics />} />
                <Route path="admin-portal/advanced-reports" element={<AdvancedReportsPage />} />
                <Route path="admin-portal/audit-logs" element={<AdminAuditLogs />} />
                <Route path="admin-portal/clinics" element={<AdminClinicManagement />} />
                <Route path="admin-portal/payments" element={<AdminPaymentsBilling />} />
                <Route path="admin-portal/notifications" element={<AdminNotifications />} />

                {/* Beneficiaries Management - Enhanced UI */}
                <Route path="beneficiaries" element={<BeneficiariesManagementPage />} />
                <Route path="beneficiaries/manage" element={<BeneficiariesManagementPage />} />
                <Route path="beneficiaries/table" element={<EnhancedBeneficiariesTable />} />

                {/* Parent Portal */}
                <Route path="parent-portal" element={<ParentDashboard />} />
                <Route path="parent-portal/children-progress" element={<ChildrenProgress />} />
                <Route path="parent-portal/attendance-reports" element={<AttendanceReports />} />
                <Route
                  path="parent-portal/therapist-communications"
                  element={<TherapistCommunications />}
                />
                <Route path="parent-portal/payments-history" element={<PaymentsHistory />} />
                <Route path="parent-portal/documents-reports" element={<DocumentsReports />} />
                <Route
                  path="parent-portal/appointments-scheduling"
                  element={<AppointmentsScheduling />}
                />
                <Route path="parent-portal/messages" element={<ParentMessages />} />

                {/* Security / Maintenance */}
                <Route
                  path="security"
                  element={<ModulePage title="الأمن والحماية" moduleKey="security" />}
                />
                <Route
                  path="surveillance"
                  element={<ModulePage title="المراقبة والكاميرات" moduleKey="security" />}
                />
                <Route
                  path="maintenance"
                  element={<ModulePage title="الصيانة والتشغيل" moduleKey="security" />}
                />

                {/* Legacy pages kept for navigation completeness */}
                <Route path="groups" element={<Groups />} />
                <Route path="groups/:groupId" element={<GroupDetail />} />
                <Route path="friends" element={<Friends />} />
                <Route
                  path="balances"
                  element={<ModulePage title="الأرصدة والتسويات" moduleKey="finance" />}
                />
                <Route
                  path="expenses"
                  element={<ModulePage title="المصروفات" moduleKey="finance" />}
                />
                <Route
                  path="expenses/new"
                  element={<ModulePage title="إضافة مصروف" moduleKey="finance" />}
                />
                <Route path="profile" element={<Profile />} />
              </Route>
              {/* 404 - Not Found */}
              <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />{' '}
              {/* Phase 11 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
