import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import store from './store';
import { getTheme } from './theme/theme';
import './i18n/config'; // Initialize i18n

// Layouts
import MainLayout from './layouts/MainLayout';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import TrafficAccidentReportsPage from './pages/TrafficAccidentReports';

// System Components - All 11 Systems
import UsersList from './components/users/UsersList';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ReportsList from './components/reports/ReportsList';
import NotificationsList from './components/notifications/NotificationsList';
import RolesList from './components/rbac/RolesList';
import IntegrationsList from './components/integrations/IntegrationsList';
import MonitoringDashboard from './components/monitoring/MonitoringDashboard';
import PerformanceMetrics from './components/performance/PerformanceMetrics';
import SupportTickets from './components/support/SupportTickets';
import PredictionsDashboard from './components/predictions/PredictionsDashboard';
import CMSContent from './components/cms/CMSContent';

// New Notifications System
import NotificationsPage from './pages/NotificationsPage';
import { NotificationProvider } from './contexts/NotificationContext';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLtr = createCache({
  key: 'mui',
});

function AppContent() {
  const themeMode = useSelector(state => state.settings.theme);
  const direction = useSelector(state => state.settings.direction);

  // Memoize theme based on mode and direction
  const theme = useMemo(() => {
    const baseTheme = getTheme(themeMode);
    return {
      ...baseTheme,
      direction: direction,
    };
  }, [themeMode, direction]);

  // Select cache based on direction
  const cache = direction === 'rtl' ? cacheRtl : cacheLtr;

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* All 11 Systems - Fully Implemented */}
                <Route path="users" element={<UsersList />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="reports" element={<ReportsList />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="rbac" element={<RolesList />} />
                <Route path="integrations" element={<IntegrationsList />} />
                <Route path="monitoring" element={<MonitoringDashboard />} />
                <Route path="performance" element={<PerformanceMetrics />} />
                <Route path="support" element={<SupportTickets />} />
                <Route path="predictions" element={<PredictionsDashboard />} />
                <Route path="cms" element={<CMSContent />} />

                {/* Transportation & Traffic Management */}
                <Route path="traffic-accidents" element={<TrafficAccidentReportsPage />} />

                {/* Settings */}
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
