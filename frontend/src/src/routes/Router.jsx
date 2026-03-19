// Security Center Components
import SecurityCenter from '../components/security/SecurityCenter';
import SecurityDashboard from '../components/security/SecurityDashboard';
import NotificationSettings from '../components/security/NotificationSettings';
// Router Configuration - Router.jsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import MainLayout from '../layouts/MainLayout';

// Auth Pages
import Login from '../pages/Auth/Login';

// Dashboard
import Dashboard from '../pages/Dashboard/Dashboard';

// Beneficiaries
import BeneficiariesList from '../pages/Beneficiaries/BeneficiariesList';
import BeneficiaryForm from '../pages/Beneficiaries/BeneficiaryForm';
import BeneficiaryDetail from '../pages/Beneficiaries/BeneficiaryDetail';

// Reports
import ReportsList from '../pages/Reports/ReportsList';
import ReportForm from '../pages/Reports/ReportForm';
import ReportDetail from '../pages/Reports/ReportDetail';

// Sessions
import SessionsList from '../pages/Sessions/SessionsList';
import SessionForm from '../pages/Sessions/SessionForm';
import SessionDetail from '../pages/Sessions/SessionDetail';

// Assessments
import AssessmentsList from '../pages/Assessments/AssessmentsList';
import AssessmentForm from '../pages/Assessments/AssessmentForm';

// Programs
import ProgramsList from '../pages/Programs/ProgramsList';
import ProgramForm from '../pages/Programs/ProgramForm';

// Goals
import GoalsList from '../pages/Goals/GoalsList';
import GoalForm from '../pages/Goals/GoalForm';

// Accounting
import AccountingMain from '../pages/Accounting';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Not Found Page
const NotFound = () => {
  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>404 - الصفحة غير موجودة</h1>
      <p>عذراً، الصفحة التي تبحث عنها غير موجودة</p>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Security Center */}
        <Route path="/security-center" element={<SecurityCenter />} />
        <Route path="/security-dashboard" element={<SecurityDashboard />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />

        {/* Beneficiaries */}
        <Route path="/beneficiaries" element={<BeneficiariesList />} />
        <Route path="/beneficiaries/new" element={<BeneficiaryForm />} />
        <Route path="/beneficiaries/:id" element={<BeneficiaryDetail />} />
        <Route path="/beneficiaries/:id/edit" element={<BeneficiaryForm />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsList />} />
        <Route path="/reports/new" element={<ReportForm />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        <Route path="/reports/:id/edit" element={<ReportForm />} />

        {/* Sessions */}
        <Route path="/sessions" element={<SessionsList />} />
        <Route path="/sessions/new" element={<SessionForm />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/sessions/:id/edit" element={<SessionForm />} />

        {/* Assessments */}
        <Route path="/assessments" element={<AssessmentsList />} />
        <Route path="/assessments/new" element={<AssessmentForm />} />
        <Route path="/assessments/:id" element={<AssessmentForm />} />

        {/* Programs */}
        <Route path="/programs" element={<ProgramsList />} />
        <Route path="/programs/new" element={<ProgramForm />} />
        <Route path="/programs/:id" element={<ProgramForm />} />

        {/* Goals */}
        <Route path="/goals" element={<GoalsList />} />
        <Route path="/goals/new" element={<GoalForm />} />
        <Route path="/goals/:id" element={<GoalForm />} />

        {/* Accounting System */}
        <Route path="/accounting" element={<AccountingMain />} />
      </Route>

      {/* Fallback Routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
