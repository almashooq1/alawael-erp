/**
 * KPIFrameworkDashboard — لوحة مؤشرات الأداء المؤسسية
 * BC-13 | نظام KPI الكانوني الموحّد
 *
 * Endpoints:
 *   GET  /api/kpi-dashboard/categories
 *   GET  /api/kpi-dashboard/definitions?categoryId=&active=true
 *   GET  /api/kpi-dashboard/values?kpiId=&period=
 *   GET  /api/kpi-dashboard/targets?kpiId=
 *   GET  /api/kpi-dashboard/alerts?resolved=false
 *   GET  /api/kpi-dashboard/scorecards?branchId=&period=
 *   GET  /api/kpi-reports/summary
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Tooltip,
  Divider,
  Badge,
  Button,
  IconButton,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import apiClient from '../../api/apiClient';

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_CATEGORIES = [
  { _id: 'cat1', name: 'KPIs الجودة', nameAr: 'مؤشرات الجودة', color: '#1976d2' },
  { _id: 'cat2', name: 'KPIs العمليات', nameAr: 'مؤشرات العمليات', color: '#388e3c' },
  { _id: 'cat3', name: 'KPIs المالية', nameAr: 'مؤشرات مالية', color: '#f57c00' },
  { _id: 'cat4', name: 'KPIs الموارد البشرية', nameAr: 'مؤشرات الموارد البشرية', color: '#7b1fa2' },
];

const DEMO_KPIS = [
  {
    _id: 'k1',
    categoryId: 'cat1',
    code: 'QUAL-001',
    nameAr: 'نسبة رضا المستفيدين',
    unit: '%',
    direction: 'higher_better',
    currentValue: 89,
    target: 90,
    benchmarkMin: 75,
    aggregationPeriod: 'monthly',
    trend: 'up',
    status: 'at_risk',
    enableAlerts: true,
    showOnDashboard: true,
  },
  {
    _id: 'k2',
    categoryId: 'cat1',
    code: 'QUAL-002',
    nameAr: 'معدل الشكاوى المحلولة في الوقت المحدد',
    unit: '%',
    direction: 'higher_better',
    currentValue: 93,
    target: 85,
    benchmarkMin: 80,
    aggregationPeriod: 'monthly',
    trend: 'up',
    status: 'on_track',
    enableAlerts: false,
    showOnDashboard: true,
  },
  {
    _id: 'k3',
    categoryId: 'cat2',
    code: 'OPS-001',
    nameAr: 'معدل الالتزام بالجلسات المجدولة',
    unit: '%',
    direction: 'higher_better',
    currentValue: 78,
    target: 90,
    benchmarkMin: 85,
    aggregationPeriod: 'monthly',
    trend: 'down',
    status: 'off_track',
    enableAlerts: true,
    showOnDashboard: true,
  },
  {
    _id: 'k4',
    categoryId: 'cat3',
    code: 'FIN-001',
    nameAr: 'نسبة التحصيل من الفواتير',
    unit: '%',
    direction: 'higher_better',
    currentValue: 82,
    target: 85,
    benchmarkMin: 75,
    aggregationPeriod: 'monthly',
    trend: 'flat',
    status: 'at_risk',
    enableAlerts: true,
    showOnDashboard: true,
  },
  {
    _id: 'k5',
    categoryId: 'cat4',
    code: 'HR-001',
    nameAr: 'نسبة الحضور الإجمالية',
    unit: '%',
    direction: 'higher_better',
    currentValue: 94.5,
    target: 95,
    benchmarkMin: 90,
    aggregationPeriod: 'monthly',
    trend: 'up',
    status: 'at_risk',
    enableAlerts: false,
    showOnDashboard: true,
  },
  {
    _id: 'k6',
    categoryId: 'cat4',
    code: 'HR-002',
    nameAr: 'معدل دوران الكوادر الصحية',
    unit: '%',
    direction: 'lower_better',
    currentValue: 12,
    target: 10,
    benchmarkMin: null,
    benchmarkMax: 15,
    aggregationPeriod: 'quarterly',
    trend: 'up',
    status: 'at_risk',
    enableAlerts: true,
    showOnDashboard: true,
  },
];

const DEMO_ALERTS = [
  {
    _id: 'a1',
    kpiCode: 'QUAL-001',
    kpiNameAr: 'نسبة رضا المستفيدين',
    message: 'القيمة أقل من الهدف بنسبة 1.1%',
    severity: 'warning',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'a2',
    kpiCode: 'OPS-001',
    kpiNameAr: 'معدل الالتزام بالجلسات',
    message: 'انحراف −12% عن الهدف — يستوجب مراجعة',
    severity: 'error',
    createdAt: new Date().toISOString(),
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatus(kpi) {
  if (!kpi.target) return 'no_target';
  const pct =
    kpi.direction === 'lower_better'
      ? (kpi.target / kpi.currentValue) * 100
      : (kpi.currentValue / kpi.target) * 100;
  if (pct >= 100) return 'on_track';
  if (pct >= 90) return 'at_risk';
  return 'off_track';
}

const STATUS_CONFIG = {
  on_track: {
    label: 'محقق',
    color: '#2e7d32',
    bgcolor: '#e8f5e9',
    icon: <CheckCircleOutlineIcon fontSize="small" />,
  },
  at_risk: {
    label: 'مخاطرة',
    color: '#e65100',
    bgcolor: '#fff3e0',
    icon: <WarningAmberIcon fontSize="small" />,
  },
  off_track: {
    label: 'خارج النطاق',
    color: '#c62828',
    bgcolor: '#ffebee',
    icon: <ErrorOutlineIcon fontSize="small" />,
  },
  no_target: { label: 'بدون هدف', color: '#757575', bgcolor: '#f5f5f5', icon: null },
};

function TrendIcon({ trend, direction }) {
  const isPositive =
    (direction === 'higher_better' && trend === 'up') ||
    (direction === 'lower_better' && trend === 'down');
  const isNegative =
    (direction === 'higher_better' && trend === 'down') ||
    (direction === 'lower_better' && trend === 'up');

  if (isPositive) return <TrendingUpIcon sx={{ color: '#2e7d32', fontSize: 18 }} />;
  if (isNegative) return <TrendingDownIcon sx={{ color: '#c62828', fontSize: 18 }} />;
  return <TrendingFlatIcon sx={{ color: '#757575', fontSize: 18 }} />;
}

function KPICard({ kpi }) {
  const status = kpi.status || getStatus(kpi);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.no_target;
  const pct = kpi.target
    ? kpi.direction === 'lower_better'
      ? Math.min(100, (kpi.target / kpi.currentValue) * 100)
      : Math.min(100, (kpi.currentValue / kpi.target) * 100)
    : null;

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 2,
        borderTop: `3px solid ${cfg.color}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Chip
            label={kpi.code}
            size="small"
            sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', fontSize: '0.7rem' }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendIcon trend={kpi.trend} direction={kpi.direction} />
            {kpi.enableAlerts && (
              <Tooltip title="تنبيهات مفعّلة">
                <NotificationsActiveIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </Tooltip>
            )}
          </Box>
        </Box>

        <Typography variant="body1" fontWeight="bold" sx={{ mb: 1, lineHeight: 1.3 }}>
          {kpi.nameAr}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: cfg.color }}>
            {kpi.currentValue ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {kpi.unit}
          </Typography>
        </Box>

        {kpi.target && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            الهدف: {kpi.target} {kpi.unit}
          </Typography>
        )}

        {pct !== null && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, pct))}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': { bgcolor: cfg.color, borderRadius: 3 },
              }}
            />
            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 'bold' }}>
              {pct.toFixed(1)}% من الهدف
            </Typography>
          </Box>
        )}
      </CardContent>
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Chip
          icon={cfg.icon}
          label={cfg.label}
          size="small"
          sx={{ bgcolor: cfg.bgcolor, color: cfg.color, fontWeight: 'bold' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {kpi.aggregationPeriod === 'monthly'
            ? 'شهري'
            : kpi.aggregationPeriod === 'quarterly'
              ? 'ربعي'
              : kpi.aggregationPeriod === 'yearly'
                ? 'سنوي'
                : kpi.aggregationPeriod}
        </Typography>
      </Box>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KPIFrameworkDashboard() {
  const [categories, setCategories] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const [activeTab, setActiveTab] = useState(0); // 0 = all categories
  const [period, setPeriod] = useState('monthly');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, defRes, alertRes] = await Promise.all([
        apiClient.get('/api/kpi-dashboard/categories'),
        apiClient.get('/api/kpi-dashboard/definitions?active=true'),
        apiClient
          .get('/api/kpi-dashboard/alerts?resolved=false')
          .catch(() => ({ data: { data: [] } })),
      ]);
      setCategories(catRes.data?.data || catRes.data || []);
      setKpis(defRes.data?.data || defRes.data || []);
      setAlerts(alertRes.data?.data || alertRes.data || []);
      setDemoMode(false);
    } catch {
      setCategories(DEMO_CATEGORIES);
      setKpis(DEMO_KPIS);
      setAlerts(DEMO_ALERTS);
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tabs: 0 = all, 1..n = category index
  const currentCategoryId = activeTab === 0 ? null : categories[activeTab - 1]?._id;
  const filteredKpis = currentCategoryId
    ? kpis.filter(k => k.categoryId === currentCategoryId)
    : kpis;

  // Summary counts
  const onTrack = filteredKpis.filter(k => (k.status || getStatus(k)) === 'on_track').length;
  const atRisk = filteredKpis.filter(k => (k.status || getStatus(k)) === 'at_risk').length;
  const offTrack = filteredKpis.filter(k => (k.status || getStatus(k)) === 'off_track').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SpeedIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              إطار مؤشرات الأداء المؤسسي (KPI)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              متابعة أداء المنظومة الصحية — قياس حي بالأهداف والمعايير المرجعية
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الفترة</InputLabel>
            <Select value={period} label="الفترة" onChange={e => setPeriod(e.target.value)}>
              <MenuItem value="monthly">شهري</MenuItem>
              <MenuItem value="quarterly">ربعي</MenuItem>
              <MenuItem value="yearly">سنوي</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="تحديث">
            <IconButton onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {demoMode && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          عرض بيانات تجريبية — الخادم غير متاح حالياً
        </Alert>
      )}

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRight: '4px solid #f57c00',
            bgcolor: '#fff8e1',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Badge badgeContent={alerts.length} color="error">
              <NotificationsActiveIcon color="warning" />
            </Badge>
            <Typography fontWeight="bold">تنبيهات مؤشرات الأداء</Typography>
          </Box>
          {alerts.map(al => (
            <Alert
              key={al._id}
              severity={al.severity === 'error' ? 'error' : 'warning'}
              sx={{ mb: 0.5, py: 0 }}
            >
              <strong>[{al.kpiCode}]</strong> {al.kpiNameAr} — {al.message}
            </Alert>
          ))}
        </Paper>
      )}

      {/* Summary Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ borderTop: '3px solid #2e7d32' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ color: '#2e7d32' }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#2e7d32">
                    {onTrack}
                  </Typography>
                  <Typography variant="caption">مؤشرات محققة</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ borderTop: '3px solid #e65100' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ color: '#e65100' }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#e65100">
                    {atRisk}
                  </Typography>
                  <Typography variant="caption">تحت المراقبة</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ borderTop: '3px solid #c62828' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutlineIcon sx={{ color: '#c62828' }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#c62828">
                    {offTrack}
                  </Typography>
                  <Typography variant="caption">خارج النطاق</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`الكل (${kpis.length})`} />
          {categories.map(cat => (
            <Tab
              key={cat._id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: cat.color || '#1976d2',
                    }}
                  />
                  {cat.nameAr}
                  <Chip
                    label={kpis.filter(k => k.categoryId === cat._id).length}
                    size="small"
                    sx={{ height: 16, fontSize: '0.65rem' }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
        <Divider />
      </Paper>

      {/* KPI Cards Grid */}
      {filteredKpis.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">لا توجد مؤشرات أداء في هذه الفئة</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} startIcon={<RefreshIcon />} onClick={loadData}>
            تحديث
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredKpis.map(kpi => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={kpi._id}>
              <KPICard kpi={kpi} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
