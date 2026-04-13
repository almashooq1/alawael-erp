import React, { useMemo } from 'react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { useAuth } from './contexts/AuthContext';
import { useThemeMode } from './contexts/ThemeContext';
import logger from './utils/logger';

// Public pages — lazy loaded with Tailwind design
const LandingPage = React.lazy(() => import('./pages/Landing/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/Landing/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/Landing/RegisterPage'));

// Authenticated shell — heavy providers + all routes (lazy loaded ONCE after login)
const AuthenticatedShell = React.lazy(() =>
  import('./AuthenticatedShell').catch(() => ({ default: () => null }))
);

// Create RTL cache for Arabic support — safe creation with fallback
function createRtlCache() {
  try {
    return createCache({
      key: 'muirtl',
      stylisPlugins: [prefixer, rtlPlugin],
      prepend: true,
    });
  } catch (e) {
    logger.error('Failed to create RTL cache, using default:', e);
    return createCache({ key: 'mui' });
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
  const cacheRtl = useMemo(() => createRtlCache(), []);

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <SnackbarProvider>
            <AuthProvider>
              <Router>
                <Suspense fallback={<DashboardSkeleton />}>
                  <AppRoutes />
                </Suspense>
              </Router>
            </AuthProvider>
          </SnackbarProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </CacheProvider>
  );
}

// Smart router: public routes render instantly, protected routes load the heavy shell
function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Landing page — public */}
      <Route
        path="/"
        element={
          <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
            <LandingPage />
          </Suspense>
        }
      />
      {/* Public Routes — Tailwind design */}
      <Route
        path="/login"
        element={
          !currentUser ? (
            <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
              <LoginPage />
            </Suspense>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/register"
        element={
          !currentUser ? (
            <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
              <RegisterPage />
            </Suspense>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      {/* All other routes — heavy shell only for authenticated users */}
      <Route
        path="/*"
        element={
          currentUser ? (
            <Suspense fallback={<DashboardSkeleton />}>
              <AuthenticatedShell />
            </Suspense>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
