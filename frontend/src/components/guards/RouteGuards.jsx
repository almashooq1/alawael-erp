/**
 * Professional Route Guard System — نظام حراسة المسارات الاحترافي
 *
 * Features:
 *  - Role-based route protection
 *  - Permission-based access control
 *  - Lazy loading with loading states
 *  - Redirect handling
 *  - Session timeout detection
 *
 * @module components/guards
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import {
  Alert,
  Box,
  Button,
  Typography
} from '@mui/material';

// ═══════════════════════════════════════════════════════════════════════════
// AUTH GUARD — حراسة المصادقة
// ═══════════════════════════════════════════════════════════════════════════

import WifiOffIcon from '@mui/icons-material/WifiOff';
import LockIcon from '@mui/icons-material/Lock';
/**
 * Protects routes that require authentication.
 * Redirects to login if user is not authenticated.
 */
export function AuthGuard({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE GUARD — حراسة الأدوار
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Protects routes that require specific roles.
 * Shows access denied page if user doesn't have the required role.
 *
 * @param {string[]} allowedRoles - Array of allowed role names
 *
 * Usage:
 *   <RoleGuard allowedRoles={['admin', 'manager']}>
 *     <AdminPage />
 *   </RoleGuard>
 */
export function RoleGuard({ children, allowedRoles = [], fallback = null }) {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'guest';

  // Super admin always has access
  if (userRole === 'super_admin' || userRole === 'admin') {
    return children;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return fallback || <AccessDeniedPage requiredRoles={allowedRoles} currentRole={userRole} />;
  }

  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION GUARD — حراسة الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Protects routes/components that require specific permissions.
 *
 * @param {string} resource - The resource name (e.g., 'users', 'reports')
 * @param {string|string[]} actions - Required actions (e.g., 'read', ['create', 'update'])
 * @param {React.ReactNode} fallback - Optional fallback component
 *
 * Usage:
 *   <PermissionGuard resource="finance" actions="read">
 *     <FinanceDashboard />
 *   </PermissionGuard>
 */
export function PermissionGuard({ children, resource, actions, fallback = null }) {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'guest';
  const userPerms = currentUser?.permissions || [];

  // Super admin bypass
  if (userRole === 'super_admin') return children;

  const requiredActions = Array.isArray(actions) ? actions : [actions];
  const hasAccess = requiredActions.every(action => {
    return (
      userPerms.includes(`${resource}:${action}`) ||
      userPerms.includes(`${resource}:*`) ||
      userPerms.includes('*:*') ||
      userPerms.includes('admin')
    );
  });

  if (!hasAccess) {
    return fallback || null; // Silently hide unauthorized components
  }

  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// GUEST GUARD — حراسة الزوار (منع المصادقين)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Protects routes that should only be accessible to non-authenticated users.
 * Redirects to dashboard if user is already authenticated.
 */
export function GuestGuard({ children, redirectTo = '/dashboard' }) {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION TIMEOUT — انتهاء الجلسة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Monitors user activity and warns before session timeout.
 *
 * @param {number} timeoutMs - Session timeout in milliseconds (default: 30 min)
 * @param {number} warningMs - Warning before timeout (default: 5 min)
 */
export function SessionTimeoutGuard({
  children,
  timeoutMs = 30 * 60 * 1000,
  warningMs = 5 * 60 * 1000,
}) {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const lastActivity = React.useRef(Date.now());
  const warningTimer = React.useRef(null);
  const logoutTimer = React.useRef(null);

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);

    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, timeoutMs - warningMs);

    logoutTimer.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [timeoutMs, warningMs, logout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimers));
    resetTimers();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimers));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [resetTimers]);

  return (
    <>
      {showWarning && (
        <Alert
          severity="warning"
          sx={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            boxShadow: 3,
            minWidth: 400,
          }}
          action={
            <Button color="inherit" size="small" onClick={resetTimers}>
              البقاء متصلاً
            </Button>
          }
        >
          ستنتهي جلستك قريباً بسبب عدم النشاط. انقر للبقاء متصلاً.
        </Alert>
      )}
      {children}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE GUARD — حراسة الاتصال
// ═══════════════════════════════════════════════════════════════════════════

export function OfflineGuard({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        textAlign="center"
        p={4}
      >
        <WifiOffIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          لا يوجد اتصال بالإنترنت
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </Button>
      </Box>
    );
  }

  return children;
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY ROUTE WRAPPER — تغليف التحميل الكسول
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wraps a lazy-loaded component with Suspense, ErrorBoundary, and optional guards.
 *
 * @param {React.LazyExoticComponent} Component - Lazy loaded component
 * @param {Object} options - { auth, roles, permissions, resource, actions }
 */
export function LazyRoute({
  component: Component,
  auth = true,
  roles = [],
  resource = null,
  actions = null,
  ...props
}) {
  let content = (
    <Suspense fallback={<DashboardSkeleton />}>
      <Component {...props} />
    </Suspense>
  );

  // Wrap with permission guard
  if (resource && actions) {
    content = (
      <PermissionGuard resource={resource} actions={actions}>
        {content}
      </PermissionGuard>
    );
  }

  // Wrap with role guard
  if (roles.length > 0) {
    content = <RoleGuard allowedRoles={roles}>{content}</RoleGuard>;
  }

  // Wrap with auth guard
  if (auth) {
    content = <AuthGuard>{content}</AuthGuard>;
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCESS DENIED PAGE — صفحة عدم الصلاحية
// ═══════════════════════════════════════════════════════════════════════════

function AccessDeniedPage({ requiredRoles = [], currentRole = '' }) {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      textAlign="center"
      p={4}
    >
      <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        عذراً، ليس لديك صلاحية
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={1}>
        هذه الصفحة تتطلب صلاحية: <strong>{requiredRoles.join(' أو ')}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        صلاحيتك الحالية: <strong>{currentRole}</strong>
      </Typography>
      <Box display="flex" gap={2}>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          العودة للوحة التحكم
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          رجوع
        </Button>
      </Box>
    </Box>
  );
}
