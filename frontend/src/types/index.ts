/**
 * TypeScript Type Definitions — Al-Awael ERP
 * تعريفات الأنواع المشتركة في المشروع
 */

// ─── User / Auth Types ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  branchId?: string;
  avatar?: string;
  permissions?: string[];
  customPermissions?: string[];
  deniedPermissions?: string[];
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── API Types ───────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

// ─── Dashboard Types ─────────────────────────────────────────────────────

export interface DashboardSummary {
  totalBeneficiaries: number;
  totalEmployees: number;
  totalSessions: number;
  totalRevenue: number;
  pendingApprovals: number;
  activeAlerts: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'pending';
  icon?: string;
  count?: number;
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  unit?: string;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon?: string;
  color?: string;
}

// ─── RBAC Types ────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  label: string;
  level: number;
  permissions: string[];
  description?: string;
  isActive: boolean;
}

export interface Permission {
  resource: string;
  action: string;
  label: string;
  description?: string;
}

export interface RoleDetail extends Role {
  effectivePermissions: Permission[];
  inheritedFrom?: string[];
}

// ─── Module Types ────────────────────────────────────────────────────────

export interface ModuleConfig {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  route: string;
  permissions?: string[];
  isEnabled: boolean;
  isBeta?: boolean;
  children?: ModuleConfig[];
}

// ─── Search Types ────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  score?: number;
}

export interface SearchSuggestion {
  query: string;
  count: number;
  category?: string;
}

// ─── Cache Types ─────────────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  entries: string[];
}

// ─── Network Types ───────────────────────────────────────────────────────

export interface NetworkStatus {
  online: boolean;
  since: Date | null;
}

// ─── Accessibility Types ─────────────────────────────────────────────────

export interface AccessibilityPreferences {
  dark?: boolean;
  readable?: boolean;
  noAnim?: boolean;
  bigCursor?: boolean;
  highlightLinks?: boolean;
}

// ─── Error Types ─────────────────────────────────────────────────────────

export interface AppError {
  status: number;
  data: unknown;
  message: string;
  code?: string;
}

// ─── Component Props ─────────────────────────────────────────────────────

export interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export interface SafeRouteWrapperProps {
  children: React.ReactNode;
}

export interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// ─── Offline Queue Types ─────────────────────────────────────────────────

export interface QueuedRequest {
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
}

export interface QueueStats {
  size: number;
  oldest: number | null;
}

// ─── Query Types (React Query) ───────────────────────────────────────────

export interface QueryHookResult<T, E = AppError> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: E | null;
  isSuccess: boolean;
  isError: boolean;
}

export interface MutationHookResult<T, V = unknown, E = AppError> {
  mutate: (variables: V) => void;
  mutateAsync: (variables: V) => Promise<T>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: E | null;
  data: T | undefined;
}

// ─── Re-export React types for convenience ────────────────────────────────

export type ReactNode = React.ReactNode;
export type FC<P = Record<string, unknown>> = React.FC<P>;
