/**
 * RoleGuard Component
 * Phase 13 - Week 1: Role-Based Route Protection
 * Protects routes based on user role requirements
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../../contexts/RBACContext';
import { Alert, CircularProgress, Box } from '@mui/material';

/**
 * RoleGuard - Protects routes requiring specific roles
 *
 * @param {string|array} requiredRole - Role(s) required to access route
 * @param {boolean} requireLevel - If true, checks role hierarchy (default: false)
 * @param {ReactNode} children - Protected content
 * @param {ReactNode} fallback - Content to show if access denied
 * @param {string} redirectTo - Path to redirect if access denied
 */
export const RoleGuard = ({
  requiredRole,
  requireLevel = false,
  children,
  fallback = null,
  redirectTo = '/access-denied',
}) => {
  const { user, loading, hasRole, hasRoleLevel } = useRBAC();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access
  const hasAccess = Array.isArray(requiredRole)
    ? requiredRole.some((role) =>
        requireLevel ? hasRoleLevel(role) : hasRole(role)
      )
    : requireLevel
    ? hasRoleLevel(requiredRole)
    : hasRole(requiredRole);

  // Access denied
  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }

    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    return (
      <Box p={3}>
        <Alert severity="error">
          <strong>Access Denied</strong>
          <br />
          You don't have the required role to access this resource.
          <br />
          Required: {Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}
          <br />
          Your role: {user.role}
        </Alert>
      </Box>
    );
  }

  // Access granted - render protected content
  return <>{children}</>;
};

export default RoleGuard;
