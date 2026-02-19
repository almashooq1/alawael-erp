import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeModule from './modules/EmployeeModule';
import AttendanceModule from './modules/AttendanceModule';
import LeaveModule from './modules/LeaveModule';
import PayrollModule from './modules/PayrollModule';
import PerformanceModule from './modules/PerformanceModule';
import AttendanceReport from './pages/AttendanceReport';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './i18n';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <CssBaseline />
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/employees/*"
              element={
                <PrivateRoute>
                  <EmployeeModule />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/*"
              element={
                <PrivateRoute>
                  <AttendanceModule />
                </PrivateRoute>
              }
            />
            <Route
              path="/leaves/*"
              element={
                <PrivateRoute>
                  <LeaveModule />
                </PrivateRoute>
              }
            />
            <Route
              path="/payroll/*"
              element={
                <PrivateRoute>
                  <PayrollModule />
                </PrivateRoute>
              }
            />
            <Route
              path="/performance/*"
              element={
                <PrivateRoute>
                  <PerformanceModule />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance-report"
              element={
                <PrivateRoute>
                  <AttendanceReport />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
