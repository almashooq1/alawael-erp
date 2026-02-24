import React from 'react';
import { useAuth } from './AuthContext';
import { hasPermission } from './roles';

export default function RequirePermission({ permission, children, fallback = null }) {
  const { role } = useAuth();
  if (!role || !hasPermission(role, permission)) return fallback;
  return <>{children}</>;
}
