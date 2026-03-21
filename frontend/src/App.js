import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeContext';
import { DashboardSkeleton } from './components/ui/LoadingSkeleton';
import ErrorBoundary from './components/ErrorBoundary';
import { SessionTimeoutGuard } from './components/guards/RouteGuards';
import { reportWebVitals, logPerformanceMetrics } from './utils/performanceMonitor';
import { lazyWithRetry } from './utils/lazyLoader';
import ProLayout from './components/Layout/ProLayout';
import { ToastProvider } from './components/ui/NotificationToast';

// Route Modules
import {
  FinanceRoutes,
  HRRoutes,
  AdminRoutes,
  RehabRoutes,
  EducationRoutes,
  WorkflowRoutes,
  PortalRoutes,
  EnterpriseRoutes,
  EnterpriseProPlusRoutes,
  EnterpriseUltraRoutes,
  GovernmentIntegrationRoutes,
  AdministrativeSystemsRoutes,
  BIDashboardRoutes,
  WarehouseRoutes,
  LegalAffairsRoutes,
  TrainingRoutes,
  EventManagementRoutes,
  PublicRelationsRoutes,
  RiskManagementRoutes,
  InternalAuditRoutes,
  AssetManagementRoutes,
  HelpDeskRoutes,
  HSERoutes,
  ProjectManagementRoutes,
  ContractManagementRoutes,
  ProcurementRoutes,
  RecruitmentRoutes,
  FleetRoutes,
  CrisisManagementRoutes,
  PayrollRoutes,
  EmployeeAffairsRoutes,
  AttendanceRoutes,
  MessagingRoutes,
  QualityComplianceRoutes,
  StrategicPlanningRoutes,
  DocumentManagementRoutes,
  MeetingsRoutes,
} from './routes';

// Pages — Keep eagerly loaded (critical path / small)
import Login from './pages/common/SimpleLogin';
import Register from './pages/Register';
import NotFound from './pages/common/NotFound';
import Home from './pages/common/Home';

// Lazy-loaded pages — Only those remaining in App.js (shared / top-level)
const Dashboard = lazyWithRetry(() => import('./pages/common/SimpleDashboard'));
const AdvancedDashboard = lazyWithRetry(() => import('./components/dashboard/AdvancedDashboard'));
const AdvancedDashboardUI = lazyWithRetry(() => import('./pages/Dashboard/AdvancedDashboardUI'));
const ProDashboard = lazyWithRetry(
  () => import('./components/dashboard/AdvancedDashboard/ProDashboardLayout')
);
const AdvancedReportsPage = lazyWithRetry(() => import('./pages/Reports/AdvancedReportsPage'));
const AnalyticsDashboard = lazyWithRetry(() => import('./components/analytics/AnalyticsDashboard'));
const AdvancedReports = lazyWithRetry(() => import('./components/reports/AdvancedReports'));
const ExportImportManager = lazyWithRetry(() => import('./components/ExportImportManager'));
const MonitoringDashboard = lazyWithRetry(() => import('./pages/common/MonitoringDashboard'));
const Activity = lazyWithRetry(() => import('./pages/common/Activity'));
const Profile = lazyWithRetry(() => import('./pages/common/Profile'));
const Groups = lazyWithRetry(() => import('./pages/common/Groups'));
const GroupDetail = lazyWithRetry(() => import('./pages/common/GroupDetail'));
const Friends = lazyWithRetry(() => import('./pages/common/Friends'));
const Communications = lazyWithRetry(() => import('./pages/communications/Communications'));
const CommunicationsSystem = lazyWithRetry(
  () => import('./pages/communications/CommunicationsSystem')
);
const MessagingPage = lazyWithRetry(() => import('./pages/communications/MessagingPage'));
const Documents = lazyWithRetry(() => import('./pages/documents/Documents'));
const DocumentsPage = lazyWithRetry(() => import('./pages/documents/DocumentsMgmt'));
const SmartDocumentsPage = lazyWithRetry(() => import('./pages/documents/SmartDocumentsPage'));
const ArchivingDashboard = lazyWithRetry(() => import('./pages/documents/ElectronicArchiving'));
const ElectronicArchiving = lazyWithRetry(() => import('./pages/documents/ElectronicArchiving'));
const DocumentAdvancedPage = lazyWithRetry(() => import('./pages/documents/DocumentAdvancedPage'));
const AIAnalyticsDashboard = lazyWithRetry(() => import('./pages/common/AIAnalyticsDashboard'));
const MediaLibrary = lazyWithRetry(() => import('./pages/Media/MediaLibrary'));
const BudgetManagement = lazyWithRetry(() => import('./pages/finance/BudgetManagement'));
const AccountingDashboard = lazyWithRetry(() => import('./pages/finance/AccountingDashboard'));
const ExpenseManagement = lazyWithRetry(() => import('./pages/finance/ExpenseManagement'));

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // Also check localStorage token to handle React state timing after login
  const hasToken = !!localStorage.getItem('authToken');

  if (!currentUser && !hasToken) {
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

// Create RTL cache for Arabic support
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Performance monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('load', logPerformanceMetrics);
  if (process.env.NODE_ENV === 'development') {
    reportWebVitals(logPerformanceMetrics);
  }
}

function App() {
  return (
    <ThemeModeProvider>
      <AppContent />
    </ThemeModeProvider>
  );
}

function AppContent() {
  const { theme } = useThemeMode();

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <AuthProvider>
            <SessionTimeoutGuard timeoutMs={30 * 60 * 1000} warningMs={5 * 60 * 1000}>
              <SocketProvider>
                <NotificationProvider>
                  <SnackbarProvider>
                    <ToastProvider>
                      <Router>
                        <Suspense fallback={<DashboardSkeleton />}>
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
                                  <ProLayout />
                                </ProtectedRoute>
                              }
                            >
                              <Route index element={<Navigate to="/home" replace />} />
                              <Route path="home" element={<Home />} />
                              <Route path="dashboard" element={<AdvancedDashboard />} />{' '}
                              {/* NEW: Using Advanced Dashboard */}
                              <Route path="dashboard/simple" element={<Dashboard />} />{' '}
                              {/* OLD: Simple Dashboard */}
                              <Route path="monitoring" element={<MonitoringDashboard />} />
                              <Route path="dashboard/advanced" element={<AdvancedDashboardUI />} />
                              <Route path="dashboard/pro" element={<ProDashboard />} />
                              <Route path="activity" element={<Activity />} />
                              <Route path="reports" element={<AdvancedReportsPage />} />
                              {/* === Domain Route Modules === */}
                              {FinanceRoutes()}
                              {HRRoutes()}
                              {AdminRoutes()}
                              {RehabRoutes()}
                              {EducationRoutes()}
                              {WorkflowRoutes()}
                              {PortalRoutes()}
                              {EnterpriseRoutes()}
                              {EnterpriseProPlusRoutes()}
                              {EnterpriseUltraRoutes()}
                              {GovernmentIntegrationRoutes()}
                              {AdministrativeSystemsRoutes()}
                              {BIDashboardRoutes()}
                              {WarehouseRoutes()}
                              {LegalAffairsRoutes()}
                              {TrainingRoutes()}
                              {EventManagementRoutes()}
                              {PublicRelationsRoutes()}
                              {RiskManagementRoutes()}
                              {InternalAuditRoutes()}
                              {AssetManagementRoutes()}
                              {HelpDeskRoutes()}
                              {HSERoutes()}
                              {ProjectManagementRoutes()}
                              {ContractManagementRoutes()}
                              {ProcurementRoutes()}
                              {RecruitmentRoutes()}
                              {FleetRoutes()}
                              {CrisisManagementRoutes()}
                              {PayrollRoutes()}
                              {EmployeeAffairsRoutes()}
                              {AttendanceRoutes()}
                              {MessagingRoutes()}
                              {QualityComplianceRoutes()}
                              {StrategicPlanningRoutes()}
                              {DocumentManagementRoutes()}
                              {MeetingsRoutes()}
                              {/* === Shared / Cross-cutting Routes === */}
                              {/* AI & Analytics */}
                              <Route
                                path="ai-assistant"
                                element={<Navigate to="/ai-analytics" replace />}
                              />
                              <Route path="ai-analytics" element={<AIAnalyticsDashboard />} />
                              <Route path="analytics" element={<AnalyticsDashboard />} />
                              <Route path="analytics/advanced" element={<AdvancedReports />} />
                              <Route path="export-import" element={<ExportImportManager />} />
                              <Route path="data-management" element={<ExportImportManager />} />
                              {/* Communications & Messaging */}
                              <Route path="messages" element={<MessagingPage />} />
                              <Route path="communications" element={<Communications />} />
                              <Route
                                path="communications-system"
                                element={<CommunicationsSystem />}
                              />
                              {/* Document Management */}
                              <Route path="documents" element={<Documents />} />
                              <Route path="documents-management" element={<DocumentsPage />} />
                              <Route path="smart-documents" element={<SmartDocumentsPage />} />
                              <Route path="archiving" element={<ArchivingDashboard />} />
                              <Route
                                path="electronic-archiving"
                                element={<ElectronicArchiving />}
                              />
                              <Route path="documents-advanced" element={<DocumentAdvancedPage />} />
                              <Route path="media-library" element={<MediaLibrary />} />
                              {/* Legacy pages kept for navigation completeness */}
                              <Route path="groups" element={<Groups />} />
                              <Route path="groups/:groupId" element={<GroupDetail />} />
                              <Route path="friends" element={<Friends />} />
                              <Route path="balances" element={<AccountingDashboard />} />
                              <Route path="expenses" element={<ExpenseManagement />} />
                              <Route path="expenses/new" element={<ExpenseManagement />} />
                              <Route path="profile" element={<Profile />} />
                              <Route path="budget-management" element={<BudgetManagement />} />
                              {/* Security / Surveillance */}
                              <Route
                                path="surveillance"
                                element={<Navigate to="/monitoring" replace />}
                              />
                            </Route>
                            {/* 404 - Not Found */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </Router>
                    </ToastProvider>
                  </SnackbarProvider>
                </NotificationProvider>
              </SocketProvider>
            </SessionTimeoutGuard>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
