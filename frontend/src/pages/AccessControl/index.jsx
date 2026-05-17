/**
 * AccessControl — لوحة تحكم الصلاحيات والوصول
 * Comprehensive, intelligent dashboard for role & permission governance
 */
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Tab,
  Tabs,
  Chip,
  Badge,
  Avatar,
  alpha,
  useTheme,
  Tooltip,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Home as HomeIcon,
  AdminPanelSettings as AdminIcon,
  Dashboard as OverviewIcon,
  ManageAccounts as RolesIcon,
  GridOn as MatrixIcon,
  People as UsersIcon,
  History as AuditIcon,
  Insights as InsightsIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

import useAccessControl from './useAccessControl';
import AccessControlOverview from './AccessControlOverview';
import RoleMatrix from './RoleMatrix';
import RolesTab from './RolesTab';
import UsersAccessTab from './UsersAccessTab';
import SecurityInsights from './SecurityInsights';
import AuditTrailTab from './AuditTrailTab';
import { TABS, getSecurityScoreConfig } from './accessControl.constants';

// ─── Circular score indicator ─────────────────────────────────────────────────
const ScoreBadge = ({ score }) => {
  if (score === null || score === undefined) return null;
  const cfg = getSecurityScoreConfig(score);
  return (
    <Tooltip title={`درجة الأمان: ${cfg.label}`}>
      <Chip
        avatar={
          <ShieldIcon sx={{ fontSize: '14px !important', color: `${cfg.color} !important` }} />
        }
        label={`${score}`}
        size="small"
        sx={{
          bgcolor: alpha(cfg.color, 0.12),
          color: cfg.color,
          fontWeight: 700,
          border: `1px solid ${alpha(cfg.color, 0.3)}`,
          fontSize: 13,
        }}
      />
    </Tooltip>
  );
};

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TAB_DEFS = [
  { id: TABS.OVERVIEW, label: 'النظرة العامة', icon: OverviewIcon },
  { id: TABS.ROLES, label: 'الأدوار', icon: RolesIcon },
  { id: TABS.MATRIX, label: 'مصفوفة الصلاحيات', icon: MatrixIcon },
  { id: TABS.USERS, label: 'المستخدمون', icon: UsersIcon },
  { id: TABS.AUDIT, label: 'سجل التدقيق', icon: AuditIcon },
  { id: TABS.INSIGHTS, label: 'تحليلات الأمان', icon: InsightsIcon },
];

// ─── AccessControl page ───────────────────────────────────────────────────────
const AccessControl = () => {
  const theme = useTheme();
  const {
    activeTab,
    setActiveTab,
    users,
    roles,
    stats,
    insights,
    securityScore,
    auditLogs,
    loading,
    loadingUsers,
    loadingAudit,
    saving,
    handleRefresh,
    handleRoleCreate,
    handleRoleUpdate,
    handleRoleDelete,
    handleUserPermissionUpdate,
    handleUserRoleUpdate,
    handleInsightAction,
  } = useAccessControl();

  const criticalCount = insights.filter(
    i => i.severity === 'critical' || i.severity === 'high'
  ).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Loading bar */}
      {loading && (
        <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />
      )}

      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 3, maxWidth: 1600, mx: 'auto' }}>
        {/* Breadcrumb */}
        <Breadcrumbs sx={{ mb: 2, fontSize: 13 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <HomeIcon sx={{ fontSize: 15 }} />
            الرئيسية
          </Link>
          <Link underline="hover" color="inherit" href="/admin">
            <AdminIcon sx={{ fontSize: 15 }} />
            لوحة الإدارة
          </Link>
          <Typography
            color="text.primary"
            fontSize={13}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <SecurityIcon sx={{ fontSize: 15 }} />
            الصلاحيات والوصول
          </Typography>
        </Breadcrumbs>

        {/* Page header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                width: 48,
                height: 48,
              }}
            >
              <SecurityIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                لوحة تحكم الصلاحيات والوصول
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إدارة الأدوار، الصلاحيات، وتحليلات الأمان
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ScoreBadge score={securityScore} />
            {criticalCount > 0 && (
              <Chip
                label={`${criticalCount} تنبيه`}
                color="error"
                size="small"
                sx={{ fontWeight: 700 }}
                onClick={() => setActiveTab(TABS.INSIGHTS)}
              />
            )}
            <Tooltip title="تحديث البيانات">
              <IconButton onClick={handleRefresh} size="small" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            bgcolor: 'background.paper',
            borderRadius: '12px 12px 0 0',
            px: 1,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 14,
                minHeight: 56,
                gap: 0.8,
              },
            }}
          >
            {TAB_DEFS.map(tab => {
              const Icon = tab.icon;
              const isBadge = tab.id === TABS.INSIGHTS && criticalCount > 0;
              return (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      {isBadge ? (
                        <Badge
                          badgeContent={criticalCount}
                          color="error"
                          sx={{ '& .MuiBadge-badge': { fontSize: 9 } }}
                        >
                          <Icon sx={{ fontSize: 18 }} />
                        </Badge>
                      ) : (
                        <Icon sx={{ fontSize: 18 }} />
                      )}
                      {tab.label}
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box>
          {/* Overview */}
          {activeTab === TABS.OVERVIEW && (
            <AccessControlOverview
              stats={stats}
              insights={insights}
              securityScore={securityScore}
              loading={loading}
            />
          )}

          {/* Roles management */}
          {activeTab === TABS.ROLES && (
            <RolesTab
              customRoles={roles.filter(r => r.isCustom || r.type === 'custom')}
              users={users}
              loading={loading}
              saving={saving}
              onRoleCreate={handleRoleCreate}
              onRoleDelete={handleRoleDelete}
            />
          )}

          {/* Role Permission Matrix */}
          {activeTab === TABS.MATRIX && (
            <RoleMatrix
              customRoles={roles.filter(r => r.isCustom || r.type === 'custom')}
              onRoleCreate={handleRoleCreate}
              onRoleUpdate={handleRoleUpdate}
              onRoleDelete={handleRoleDelete}
              saving={saving}
            />
          )}

          {/* Users Access */}
          {activeTab === TABS.USERS && (
            <UsersAccessTab
              users={users}
              loading={loadingUsers || loading}
              saving={saving}
              onRoleUpdate={handleUserRoleUpdate}
              onPermissionUpdate={handleUserPermissionUpdate}
            />
          )}

          {/* Audit Trail */}
          {activeTab === TABS.AUDIT && (
            <AuditTrailTab entries={auditLogs} loading={loadingAudit} onRefresh={() => {}} />
          )}

          {/* Security Insights */}
          {activeTab === TABS.INSIGHTS && (
            <SecurityInsights
              insights={insights}
              loading={loading}
              onRefresh={handleRefresh}
              onAction={handleInsightAction}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AccessControl;
