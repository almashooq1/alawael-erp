/**
 * HRAdvancedDashboard – orchestrator (index).
 *
 * Split from the original 654-line HRAdvancedDashboard.js:
 *   constants.js      – chart colors, STATUS_MAP, attendance helpers
 *   KPICard.jsx        – KPICard & QuickAction components
 *   useHRDashboard.js  – state, fetch, actions, derived data
 *   ChartsRow.jsx      – Attendance pie + Department bar
 *   BottomRow.jsx      – Leaves list + Reviews list
 *   index.js           – this file (layout + wiring)
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  EventAvailable as AttendanceIcon,
  AccountBalanceWallet as PayrollIcon,
  BeachAccess as LeaveIcon,
  TrendingUp as PerformanceIcon,
  PersonAdd as AddEmployeeIcon,
  Assessment as ReportIcon,
  Schedule as ClockIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme/palette';
import useHRDashboard from './useHRDashboard';
import { KPICard, QuickAction } from './KPICard';
import ChartsRow from './ChartsRow';
import BottomRow from './BottomRow';

const HRAdvancedDashboard = () => {
  const navigate = useNavigate();
  const {
    kpis,
    attendance,
    leaves,
    reviews,
    isDemo,
    loading,
    actionLoading,
    loadDashboard,
    handleCheckIn,
    handleCheckOut,
    presentCount,
    absentCount,
    pendingLeaves,
    attendanceChartData,
    departmentChartData,
  } = useHRDashboard();

  /* ─── Loading ─── */
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <CircularProgress size={28} />
          <Typography variant="h6" color="text.secondary">
            جاري تحميل بيانات الموارد البشرية...
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <Paper sx={{ height: 120, borderRadius: 3 }}>
                <LinearProgress />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة الموارد البشرية
            </Typography>
            <Typography variant="body2">نظرة شاملة على بيانات الموارد البشرية</Typography>
          </Box>
        </Box>
      </Box>

      {/* Title bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            نظام الموارد البشرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            لوحة التحكم الشاملة —{' '}
            {new Date().toLocaleDateString('ar-SA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isDemo && (
            <Chip
              icon={<WarningIcon />}
              label="بيانات تجريبية"
              color="warning"
              variant="filled"
              size="small"
            />
          )}
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={loadDashboard}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          API الموارد البشرية غير متاح حالياً — يتم عرض بيانات تجريبية. البيانات الحقيقية ستظهر عند
          توفر الخادم.
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="إجمالي الموظفين"
            value={kpis?.totalEmployees ?? 0}
            subtitle={`${kpis?.activeEmployees ?? 0} نشط`}
            icon={<PeopleIcon />}
            color="primary"
            onClick={() => navigate('/hr/employees')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="معدل الحضور"
            value={`${kpis?.attendanceRate ?? (attendance.length ? ((presentCount / attendance.length) * 100).toFixed(0) : 0)}%`}
            subtitle={`${presentCount} حاضر اليوم`}
            icon={<AttendanceIcon />}
            color="success"
            onClick={() => navigate('/hr/attendance')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="إجازات معلقة"
            value={kpis?.pendingLeaves ?? pendingLeaves.length}
            subtitle="بانتظار الموافقة"
            icon={<LeaveIcon />}
            color="warning"
            onClick={() => navigate('/hr/leaves')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="إجمالي الرواتب"
            value={`${((kpis?.totalPayroll ?? 0) / 1000).toFixed(0)}K`}
            subtitle="ريال سعودي"
            icon={<PayrollIcon />}
            color="info"
            onClick={() => navigate('/hr/payroll')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="متوسط التقييم"
            value={
              kpis?.avgRating ??
              (reviews.length
                ? (
                    reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length
                  ).toFixed(1)
                : '—')
            }
            subtitle="من 5"
            icon={<PerformanceIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KPICard
            title="في إجازة"
            value={kpis?.onLeave ?? absentCount}
            subtitle="موظف"
            icon={<CancelIcon />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}
      >
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          إجراءات سريعة
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <QuickAction
            icon={<ClockIcon />}
            label="تسجيل حضور"
            onClick={handleCheckIn}
            color="success"
          />
          <QuickAction
            icon={<ClockIcon />}
            label="تسجيل انصراف"
            onClick={handleCheckOut}
            color="error"
          />
          <QuickAction
            icon={<AddEmployeeIcon />}
            label="إضافة موظف"
            onClick={() => navigate('/hr/employees')}
          />
          <QuickAction
            icon={<LeaveIcon />}
            label="إدارة الإجازات"
            onClick={() => navigate('/hr/leaves')}
            color="warning"
          />
          <QuickAction
            icon={<PayrollIcon />}
            label="الرواتب"
            onClick={() => navigate('/hr/payroll')}
            color="info"
          />
          <QuickAction
            icon={<ReportIcon />}
            label="التقارير"
            onClick={() => navigate('/hr/analytics')}
            color="secondary"
          />
        </Box>
        {actionLoading && <LinearProgress sx={{ mt: 1.5, borderRadius: 2 }} />}
      </Paper>

      {/* Charts */}
      <ChartsRow
        attendanceChartData={attendanceChartData}
        departmentChartData={departmentChartData}
      />

      {/* Bottom row */}
      <BottomRow leaves={leaves} reviews={reviews} navigate={navigate} />
    </Container>
  );
};

export default HRAdvancedDashboard;
