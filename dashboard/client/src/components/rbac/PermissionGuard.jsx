/**
 * PermissionGuard Component
 * Phase 13 - Week 1: Permission-Based Element Protection
 * Shows/hides UI elements based on user permissions
 */

import React from 'react';
import { useRBAC } from '../../contexts/RBACContext';
import { Box, Tooltip } from '@mui/material';

/**
 * PermissionGuard - Conditionally renders content based on permissions
 *
 * @param {string|array} permission - Permission(s) required
 * @param {string} requireAll - If true, requires all permissions (default: false)
 * @param {ReactNode} children - Protected content
 * @param {ReactNode} fallback - Content to show if no permission
 * @param {boolean} showTooltip - Show tooltip explaining why hidden (default: false)
 * @param {boolean} disable - Disable instead of hide (default: false)
 */
export const PermissionGuard = ({
  permission,
  requireAll = false,
  children,
  fallback = null,
  showTooltip = false,
  disable = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();

  // Determine if user has required permission(s)
  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  // No access - handle based on configuration
  if (!hasAccess) {
    // Show fallback content if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Disable content instead of hiding
    if (disable) {
      const disabledElement = React.cloneElement(children, {
        disabled: true,
        style: { opacity: 0.5, cursor: 'not-allowed' },
      });

      if (showTooltip) {
        return (
          <Tooltip title="You don't have permission to perform this action">
            <span>{disabledElement}</span>
          </Tooltip>
        );
      }

      return disabledElement;
    }

    // Show tooltip explaining why hidden
    if (showTooltip) {
      return (
        <Tooltip title="Hidden: Insufficient permissions">
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 20,
              height: 20,
              bgcolor: 'grey.300',
              borderRadius: 1,
            }}
          />
        </Tooltip>
      );
    }

    // Hide completely (return null)
    return null;
  }

  // Has access - render children
  return <>{children}</>;
};

/**
 * Can - Shorthand component for permission checks
 * Usage: <Can do="write:quality">Edit Button</Can>
 */
export const Can = ({ do: permission, children, fallback = null }) => {
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

/**
 * Cannot - Inverse permission check (shows when user DOESN'T have permission)
 * Usage: <Cannot do="write:quality">Read-only mode</Cannot>
 */
export const Cannot = ({ do: permission, children }) => {
  const { hasPermission } = useRBAC();
  return !hasPermission(permission) ? <>{children}</> : null;
};

export default PermissionGuard;
