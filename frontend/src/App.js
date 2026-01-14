import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import theme from './theme';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Friends from './pages/Friends';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Communications from './pages/Communications';
import Documents from './pages/Documents';
import DocumentsPage from './pages/DocumentsPage';
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

// Components
import Layout from './components/Layout';
import Home from './pages/Home';
import ModulePage from './pages/ModulePage';
import ArchivingDashboard from './components/ArchivingDashboard';

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
                <Route path="activity" element={<Activity />} />
                <Route path="reports" element={<ModulePage title="التقارير والتحليلات" moduleKey="reports" />} />

                {/* Business / Operations */}
                <Route path="crm" element={<ModulePage title="إدارة علاقات العملاء (CRM)" moduleKey="crm" />} />
                <Route path="finance" element={<ModulePage title="المالية والمحاسبة" moduleKey="finance" />} />
                <Route path="procurement" element={<ModulePage title="المشتريات والمخزون" moduleKey="finance" />} />

                {/* People */}
                <Route path="hr" element={<ModulePage title="الموارد البشرية" moduleKey="hr" />} />
                <Route path="attendance" element={<ModulePage title="الحضور والإجازات" moduleKey="hr" />} />
                <Route path="payroll" element={<ModulePage title="الرواتب" moduleKey="hr" />} />

                {/* Learning / Care */}
                <Route path="elearning" element={<ModulePage title="التعلم الإلكتروني" moduleKey="elearning" />} />
                <Route path="sessions" element={<ModulePage title="الجلسات والمواعيد" moduleKey="rehab" />} />
                <Route path="rehab" element={<ModulePage title="إعادة التأهيل والعلاج" moduleKey="rehab" />} />
                <Route path="ai-assistant" element={<ModulePage title="المساعد الذكي بالذكاء الاصطناعي" moduleKey="reports" />} />
                <Route path="ai-analytics" element={<AIAnalyticsDashboard />} />

                {/* Communications */}
                <Route path="communications" element={<Communications />} />

                {/* Document Management */}
                <Route path="documents" element={<Documents />} />
                <Route path="documents-management" element={<DocumentsPage />} />
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
                <Route path="admin-portal/users" element={<AdminUsersManagement />} />
                <Route path="admin-portal/settings" element={<AdminSystemSettings />} />
                <Route path="admin-portal/reports" element={<AdminReportsAnalytics />} />
                <Route path="admin-portal/audit-logs" element={<AdminAuditLogs />} />
                <Route path="admin-portal/clinics" element={<AdminClinicManagement />} />
                <Route path="admin-portal/payments" element={<AdminPaymentsBilling />} />
                <Route path="admin-portal/notifications" element={<AdminNotifications />} />

                {/* Parent Portal */}
                <Route path="parent-portal" element={<ParentDashboard />} />
                <Route path="parent-portal/children-progress" element={<ChildrenProgress />} />
                <Route path="parent-portal/attendance-reports" element={<AttendanceReports />} />
                <Route path="parent-portal/therapist-communications" element={<TherapistCommunications />} />
                <Route path="parent-portal/payments-history" element={<PaymentsHistory />} />
                <Route path="parent-portal/documents-reports" element={<DocumentsReports />} />
                <Route path="parent-portal/appointments-scheduling" element={<AppointmentsScheduling />} />
                <Route path="parent-portal/messages" element={<ParentMessages />} />

                {/* Security / Maintenance */}
                <Route path="security" element={<ModulePage title="الأمن والحماية" moduleKey="security" />} />
                <Route path="surveillance" element={<ModulePage title="المراقبة والكاميرات" moduleKey="security" />} />
                <Route path="maintenance" element={<ModulePage title="الصيانة والتشغيل" moduleKey="security" />} />

                {/* Legacy pages kept for navigation completeness */}
                <Route path="groups" element={<Groups />} />
                <Route path="groups/:groupId" element={<GroupDetail />} />
                <Route path="friends" element={<Friends />} />
                <Route path="balances" element={<ModulePage title="الأرصدة والتسويات" moduleKey="finance" />} />
                <Route path="expenses" element={<ModulePage title="المصروفات" moduleKey="finance" />} />
                <Route path="expenses/new" element={<ModulePage title="إضافة مصروف" moduleKey="finance" />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* 404 - Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
