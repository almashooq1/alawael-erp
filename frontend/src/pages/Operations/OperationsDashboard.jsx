import { useState, useEffect, useCallback } from 'react';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors, neutralColors } from '../../theme/palette';
import logger from '../../utils/logger';
import operationsService from '../../services/operations.service';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InventoryIcon from '@mui/icons-material/Inventory';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  totalAssets: 187,
  activeEquipment: 64,
  openMaintenance: 12,
  overdueMaintenance: 3,
  scheduledTasks: 8,
  totalBranches: 5,
  utilizationRate: 78,
  licensesExpiring: 4,
};

const DEMO_ASSETS_BY_CATEGORY = [
  { name: 'معدات طبية', value: 52, color: chartColors.category[0] },
  { name: 'أثاث مكتبي', value: 38, color: chartColors.category[1] },
  { name: 'أجهزة إلكترونية', value: 35, color: chartColors.category[2] },
  { name: 'مركبات', value: 22, color: chartColors.category[3] },
  { name: 'معدات تعليمية', value: 25, color: chartColors.category[4] },
  { name: 'أخرى', value: 15, color: chartColors.category[5] },
];

const DEMO_MAINTENANCE_TREND = [
  { month: 'يناير', completed: 15, pending: 3, cost: 12000 },
  { month: 'فبراير', completed: 12, pending: 5, cost: 15000 },
  { month: 'مارس', completed: 18, pending: 2, cost: 9000 },
  { month: 'أبريل', completed: 14, pending: 4, cost: 11000 },
  { month: 'مايو', completed: 20, pending: 1, cost: 8000 },
  { month: 'يونيو', completed: 16, pending: 3, cost: 13000 },
];

const DEMO_MAINTENANCE_STATUS = [
  { name: 'مكتملة', value: 42, color: statusColors.success },
  { name: 'قيد التنفيذ', value: 12, color: statusColors.warning },
  { name: 'متأخرة', value: 3, color: statusColors.error },
  { name: 'مجدولة', value: 8, color: statusColors.info },
];

const DEMO_RECENT_MAINTENANCE = [
  { id: 1, asset: 'جهاز علاج طبيعي #12', type: 'صيانة دورية', status: 'completed', date: '2026-03-10', cost: 1500 },
  { id: 2, asset: 'مكيف مكتب الإدارة', type: 'صيانة طارئة', status: 'in-progress', date: '2026-03-10', cost: 800 },
  { id: 3, asset: 'طابعة ليزر HP', type: 'صيانة دورية', status: 'pending', date: '2026-03-11', cost: 350 },
  { id: 4, asset: 'كرسي متحرك #5', type: 'إصلاح', status: 'completed', date: '2026-03-09', cost: 600 },
  { id: 5, asset: 'نظام إنذار الحريق', type: 'فحص دوري', status: 'scheduled', date: '2026-03-12', cost: 0 },
];

const STATUS_MAP = {
  completed: { label: 'مكتملة', color: 'success' },
  'in-progress': { label: 'قيد التنفيذ', color: 'info' },
  pending: { label: 'معلقة', color: 'warning' },
  scheduled: { label: 'مجدولة', color: 'primary' },
  overdue: { label: 'متأخرة', color: 'error' },
};

/* ──────── Main Component ──────── */
export default function OperationsDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [assetsByCategory, setAssetsByCategory] = useState(DEMO_ASSETS_BY_CATEGORY);
  const [maintenanceTrend, _setMaintenanceTrend] = useState(DEMO_MAINTENANCE_TREND);
  const [maintenanceStatus, setMaintenanceStatus] = useState(DEMO_MAINTENANCE_STATUS);
  const [recentMaintenance, setRecentMaintenance] = useState(DEMO_RECENT_MAINTENANCE);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, equipRes, maintRes, schedRes, licensesRes, branchesRes] = await Promise.all([
        operationsService.getAssets().catch(err => { logger.warn('Operations: assets fetch', err); return null; }),
        operationsService.getEquipment().catch(err => { logger.warn('Operations: equipment fetch', err); return null; }),
        operationsService.getMaintenance().catch(err => { logger.warn('Operations: maintenance fetch', err); return null; }),
        operationsService.getSchedules().catch(err => { logger.warn('Operations: schedules fetch', err); return null; }),
        operationsService.getLicenses().catch(err => { logger.warn('Operations: licenses fetch', err); return null; }),
        operationsService.getBranches().catch(err => { logger.warn('Operations: branches fetch', err); return null; }),
      ]);

      const assets = assetsRes?.data || assetsRes || [];
      const equipment = equipRes?.data || equipRes || [];
      const maintenance = maintRes?.data || maintRes || [];
      const schedules = schedRes?.data || schedRes || [];
      const licenses = licensesRes?.data || licensesRes || [];
      const branches = branchesRes?.data || branchesRes || [];

      if (Array.isArray(assets) && assets.length > 0) {
        const openMaint = Array.isArray(maintenance)
          ? maintenance.filter(m => m.status !== 'completed').length
          : 0;
        const overdue = Array.isArray(maintenance)
          ? maintenance.filter(m => m.status === 'overdue').length
          : 0;

        setStats({
          totalAssets: assets.length,
          activeEquipment: Array.isArray(equipment) ? equipment.filter(e => e.status === 'active').length : equipment.length,
          openMaintenance: openMaint,
          overdueMaintenance: overdue,
          scheduledTasks: Array.isArray(schedules) ? schedules.filter(s => s.status === 'scheduled').length : 0,
          totalBranches: Array.isArray(branches) ? branches.length : 0,
          utilizationRate: 78,
          licensesExpiring: Array.isArray(licenses) ? licenses.filter(l => {
            if (!l.expiryDate) return false;
            const diff = (new Date(l.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
            return diff <= 30 && diff > 0;
          }).length : 0,
        });

        /* category breakdown */
        const catMap = {};
        const catColors = chartColors.category;
        assets.forEach(a => {
          const cat = a.category || 'أخرى';
          catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const catArr = Object.entries(catMap).map(([name, value], i) => ({
          name, value, color: catColors[i % catColors.length],
        }));
        if (catArr.length > 0) setAssetsByCategory(catArr);

        /* maintenance status */
        if (Array.isArray(maintenance) && maintenance.length > 0) {
          const statusMap = {};
          maintenance.forEach(m => {
            const s = m.status || 'pending';
            statusMap[s] = (statusMap[s] || 0) + 1;
          });
          const localStatusColors = { completed: statusColors.success, 'in-progress': statusColors.warning, overdue: statusColors.error, pending: statusColors.info, scheduled: statusColors.purple };
          const statusArr = Object.entries(statusMap).map(([name, value]) => ({
            name: STATUS_MAP[name]?.label || name,
            value,
            color: localStatusColors[name] || neutralColors.fallback,
          }));
          setMaintenanceStatus(statusArr);

          /* recent maintenance */
          const recent = maintenance
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
            .slice(0, 5)
            .map((m, i) => ({
              id: m._id || i,
              asset: m.assetName || m.asset?.name || 'أصل',
              type: m.type || m.maintenanceType || '-',
              status: m.status || 'pending',
              date: m.date || m.createdAt?.slice(0, 10) || '-',
              cost: m.cost || 0,
            }));
          setRecentMaintenance(recent);
        }
      }
    } catch (err) {
      logger.warn('OperationsDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات العمليات — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box
        sx={{
          background: gradients.ocean,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              لوحة تحكم العمليات والأصول
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة الأصول والمعدات وطلبات الصيانة
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="inherit"
          sx={{ color: '#185a9d', fontWeight: 600 }}
          startIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/operations')}
        >
          إدارة العمليات
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="إجمالي الأصول" value={stats.totalAssets} subtitle="أصل مسجل" icon={<InventoryIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="معدات نشطة" value={stats.activeEquipment} subtitle={`${stats.utilizationRate}% استخدام`} icon={<EngineeringIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="صيانة مفتوحة" value={stats.openMaintenance} subtitle="طلب صيانة" icon={<BuildIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="صيانة متأخرة" value={stats.overdueMaintenance} subtitle="تحتاج متابعة" icon={<WarningIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="مهام مجدولة" value={stats.scheduledTasks} subtitle="هذا الأسبوع" icon={<CheckCircleIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="الفروع" value={stats.totalBranches} subtitle={`${stats.licensesExpiring} رخصة تنتهي`} icon={<BusinessIcon />} color="secondary" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              اتجاه الصيانة الشهري
            </Typography>
            {maintenanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لاتجاه الصيانة الشهري">
                <BarChart data={maintenanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="completed" fill={statusColors.success} name="مكتملة" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="pending" fill={statusColors.warning} name="معلقة" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke={statusColors.primaryBlue} strokeWidth={2} name="التكلفة (ر.س)" dot={{ r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              الأصول حسب الفئة
            </Typography>
            {assetsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني للأصول حسب الفئة">
                <PieChart>
                  <Pie
                    data={assetsByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {assetsByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              حالة الصيانة
            </Typography>
            {maintenanceStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} role="img" aria-label="رسم بياني لحالة الصيانة">
                <PieChart>
                  <Pie
                    data={maintenanceStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {maintenanceStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={250} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                آخر طلبات الصيانة
              </Typography>
              <Button size="small" onClick={() => navigate('/operations')}>
                عرض الكل
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>الأصل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>التكلفة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentMaintenance.map(m => (
                    <TableRow key={m.id} hover>
                      <TableCell>{m.asset}</TableCell>
                      <TableCell>{m.type}</TableCell>
                      <TableCell>{m.date}</TableCell>
                      <TableCell align="center">{m.cost > 0 ? `${m.cost.toLocaleString()} ر.س` : '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_MAP[m.status]?.label || m.status}
                          color={STATUS_MAP[m.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
    </DashboardErrorBoundary>
  );
}
