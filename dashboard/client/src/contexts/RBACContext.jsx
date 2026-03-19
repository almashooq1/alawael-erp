/**
 * RBAC Context Provider
 * Phase 13 - Week 1: Advanced Features
 * Provides role-based access control throughout the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const RBACContext = createContext(null);

// Role hierarchy levels
export const ROLES = {
  ADMIN: { name: 'ADMIN', level: 100 },
  QUALITY_MANAGER: { name: 'QUALITY_MANAGER', level: 80 },
  TEAM_LEAD: { name: 'TEAM_LEAD', level: 60 },
  ANALYST: { name: 'ANALYST', level: 40 },
  VIEWER: { name: 'VIEWER', level: 20 },
  GUEST: { name: 'GUEST', level: 10 },
};

export const RBACProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [roleLevel, setRoleLevel] = useState(0);

  useEffect(() => {
    // Load user role and permissions from backend
    const loadUserRBAC = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data;
        setUser(userData);
        setPermissions(userData.permissions || []);
        setRoleLevel(ROLES[userData.role]?.level || 0);
      } catch (error) {
        console.error('❌ Failed to load RBAC data:', error);
        // Clear invalid token
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    loadUserRBAC();
  }, []);

  // Check if user has specific permission
  const hasPermission = (required) => {
    if (!user) return false;

    // ADMIN has all permissions
    if (user.role === 'ADMIN') return true;

    // Check direct permission
    if (permissions.includes(required)) return true;

    // Check wildcard permissions
    const [action, resource] = required.split(':');
    if (permissions.includes(`${action}:all`)) return true;
    if (permissions.includes('read:all') && action === 'read') return true;
    if (permissions.includes('write:all') && action === 'write') return true;

    return false;
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    if (!user) return false;
    return user.role === requiredRole;
  };

  // Check if user's role is at or above required level
  const hasRoleLevel = (requiredRole) => {
    if (!user) return false;
    const requiredLevel = ROLES[requiredRole]?.level || 0;
    return roleLevel >= requiredLevel;
  };

  // Check if user has any of the required permissions
  const hasAnyPermission = (requiredPermissions = []) => {
    if (!user) return false;
    return requiredPermissions.some((perm) => hasPermission(perm));
  };

  // Check if user has all of the required permissions
  const hasAllPermissions = (requiredPermissions = []) => {
    if (!user) return false;
    return requiredPermissions.every((perm) => hasPermission(perm));
  };

  const value = {
    user,
    loading,
    permissions,
    roleLevel,
    userRole: user?.role,
    hasPermission,
    hasRole,
    hasRoleLevel,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.role === 'ADMIN',
    isAuthenticated: !!user,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

// Custom hook for using RBAC context
export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
};

export default RBACContext;
