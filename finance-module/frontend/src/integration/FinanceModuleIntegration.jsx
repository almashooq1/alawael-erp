/**
 * Finance Module Frontend Integration
 * Provides routing, navigation, and component registry for finance dashboards
 * 
 * Key Features:
 * - Lazy-load finance module components
 * - Role-based access control
 * - Redux store integration
 * - Error boundaries
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box, Alert } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load components for code splitting
const ValidationDashboard = lazy(() => 
  import('./FinanceModule/ValidationDashboard')
);
const CashFlowDashboard = lazy(() => 
  import('./FinanceModule/CashFlowDashboard')
);
const RiskMatrix = lazy(() => 
  import('./FinanceModule/RiskMatrix')
);

/**
 * Loading Fallback Component
 */
const FinanceModuleLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="500px"
  >
    <CircularProgress />
  </Box>
);

/**
 * Error Fallback Component
 */
const FinanceModuleErrorFallback = ({ error, resetErrorBoundary }) => (
  <Box p={3}>
    <Alert severity="error">
      <strong>Finance Module Error:</strong> {error.message}
      <Box mt={2}>
        <button onClick={resetErrorBoundary} style={{
          padding: '8px 16px',
          backgroundColor: '#d32f2f',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Try Again
        </button>
      </Box>
    </Alert>
  </Box>
);

/**
 * Finance Module Router Component
 * Mounts all finance dashboards with proper error handling and loading states
 * 
 * Routes:
 * - /finance/ → Main dashboard selector (if added)
 * - /finance/validation → Compliance monitoring
 * - /finance/cashflow → Cash position & forecasting
 * - /finance/risk → Risk assessment matrix
 */
export const FinanceModuleRouter = () => {
  return (
    <ErrorBoundary FallbackComponent={FinanceModuleErrorFallback}>
      <Suspense fallback={<FinanceModuleLoader />}>
        <Routes>
          {/* Redirects old paths */}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          
          {/* Main Dashboards */}
          <Route 
            path="validation" 
            element={<ValidationDashboard />} 
          />
          <Route 
            path="cashflow" 
            element={<CashFlowDashboard />} 
          />
          <Route 
            path="risk" 
            element={<RiskMatrix />} 
          />
          
          {/* Fallback for undefined routes */}
          <Route path="*" element={<Navigate to="validation" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Navigation Items for Finance Module
 * Use these in main navigation menu
 */
export const financeModuleNavItems = [
  {
    id: 'finance-validation',
    label: 'Compliance',
    icon: 'CheckCircle',
    path: '/dashboard/finance/validation',
    requiredRoles: ['auditor', 'manager', 'admin'],
    badge: null, // Can be updated with violation count
    description: 'Monitor compliance violations and audit reports'
  },
  {
    id: 'finance-cashflow',
    label: 'Cash Flow',
    icon: 'TrendingUp',
    path: '/dashboard/finance/cashflow',
    requiredRoles: ['manager', 'director', 'admin'],
    badge: null, // Can show liquidity status
    description: 'Track cash position and forecasts'
  },
  {
    id: 'finance-risk',
    label: 'Risk Matrix',
    icon: 'WarningAmber',
    path: '/dashboard/finance/risk',
    requiredRoles: ['manager', 'auditor', 'admin'],
    badge: null, // Can show critical risk count
    description: 'Assess and manage financial risks'
  }
];

/**
 * Finance Module Auth Check
 * Verifies user has required role
 */
export const checkFinanceModuleAccess = (userRoles, requiredRoles) => {
  if (!userRoles || userRoles.length === 0) return false;
  return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Finance Module API Service Registry
 * Centralized API endpoints
 */
export const financeModuleAPI = {
  // Validation endpoints
  getViolations: '/api/finance/validation/violations',
  getViolation: (id) => `/api/finance/validation/violations/${id}`,
  resolveViolation: (id) => `/api/finance/validation/violations/${id}/resolve`,
  getViolationsReport: '/api/finance/validation/violations-report',
  generateReport: '/api/finance/validation/reports/generate',
  
  // Cash Flow endpoints
  getCashFlowSummary: '/api/finance/cashflow/summary',
  getCashFlow: (id) => `/api/finance/cashflow/${id}`,
  createCashFlow: '/api/finance/cashflow/create',
  getForecasts: '/api/finance/cashflow/forecasts/all',
  generateForecast: '/api/finance/cashflow/forecasts/generate',
  getReserves: '/api/finance/cashflow/reserves/all',
  updateReserve: (id) => `/api/finance/cashflow/reserves/${id}`,
  recordReserveTransaction: (id) => `/api/finance/cashflow/reserves/${id}/transaction`,
  analyzeCashFlow: '/api/finance/cashflow/analyze',
  
  // Risk endpoints
  getRiskMatrix: '/api/finance/risk/matrix',
  getRiskItems: '/api/finance/risk/items',
  getRiskItem: (id) => `/api/finance/risk/${id}`,
  createRiskItem: '/api/finance/risk/create',
  updateRiskItem: (id) => `/api/finance/risk/${id}`,
  createRiskMatrix: '/api/finance/risk/matrix/create',
  getHeatmapData: '/api/finance/risk/heatmap',
  getRiskTrends: '/api/finance/risk/trends/all',
  addMitigationStrategy: (id) => `/api/finance/risk/${id}/mitigation`,
  
  // Health check
  health: '/api/finance/health'
};

/**
 * Redux Store Integration
 * Actions for finance module state management
 */
export const financeModuleActions = {
  // Violations
  LOAD_VIOLATIONS: 'finance/LOAD_VIOLATIONS',
  SET_VIOLATIONS: 'finance/SET_VIOLATIONS',
  RESOLVE_VIOLATION: 'finance/RESOLVE_VIOLATION',
  SET_VIOLATION_ERROR: 'finance/SET_VIOLATION_ERROR',
  
  // Cash Flow
  LOAD_CASH_FLOW: 'finance/LOAD_CASH_FLOW',
  SET_CASH_FLOW: 'finance/SET_CASH_FLOW',
  SET_FORECASTS: 'finance/SET_FORECASTS',
  SET_RESERVES: 'finance/SET_RESERVES',
  SET_CASH_FLOW_ERROR: 'finance/SET_CASH_FLOW_ERROR',
  
  // Risk
  LOAD_RISK_MATRIX: 'finance/LOAD_RISK_MATRIX',
  SET_RISK_MATRIX: 'finance/SET_RISK_MATRIX',
  SET_RISKS: 'finance/SET_RISKS',
  SET_HEATMAP_DATA: 'finance/SET_HEATMAP_DATA',
  SET_RISK_ERROR: 'finance/SET_RISK_ERROR',
  
  // General
  SET_LOADING: 'finance/SET_LOADING',
  SET_ERROR: 'finance/SET_ERROR'
};

/**
 * Feature Flags
 * Control feature availability
 */
export const financeModuleFeatures = {
  enableValidationDashboard: true,
  enableCashFlowForecasting: true,
  enableRiskMatrix: true,
  enableWebSocketUpdates: true,
  enableMLPredictions: false, // Coming soon
  enableExportPDF: false, // Coming soon
  enableMobileOptimization: false // Coming soon
};

/**
 * Module Information
 */
export const financeModuleInfo = {
  name: 'Finance Module',
  version: '1.0.0',
  description: 'Advanced financial management system',
  components: 3,
  endpoints: 25,
  features: [
    'Compliance monitoring',
    'Cash flow forecasting',
    'Risk assessment',
    'Real-time updates',
    'Advanced analytics'
  ],
  lastUpdated: '2026-02-16'
};

export default FinanceModuleRouter;
