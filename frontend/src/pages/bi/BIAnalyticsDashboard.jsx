/**
 * BIAnalyticsDashboard.jsx — لوحة التحليلات المتقدمة وذكاء الأعمال
 * ═══════════════════════════════════════════════════════════════════
 * المسار: /bi-analytics
 * التخطيط: RTL عربي بالكامل، 3 تبويبات، سحب وإفلات، مخططات recharts
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Paper, Typography, Tabs, Tab, Button, Chip, IconButton,
  Divider, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, Card, CardContent, CardHeader, Avatar, Badge, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, LinearProgress, Alert, Snackbar, Fade,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Checkbox, FormGroup, FormControlLabel, Switch, CircularProgress,
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  Funnel, FunnelChart, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  BarChart as BarChartIcon,
  TableChart as TableChartIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  Radar as RadarIcon,
  FilterAlt as FilterIcon,
  DragIndicator as DragIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AIIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  LocalHospital as HospitalIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule,
} from '@mui/icons-material';

import biAnalyticsService from '../../services/biAnalyticsService';

// ── Constants & Mock Data ─────────────────────────────────────────
const COLORS = ['#1e3a5f', '#2e7d32', '#c62828', '#f9a825', '#6a1b9a', '#00838f', '#1565c0', '#e65100'];

const CHART_TYPES = [
  { id: 'table', label: 'جدول', icon: <TableChartIcon /> },
  { id: 'bar', label: 'أعمدة', icon: <BarChartIcon /> },
  { id: 'line', label: 'خطي', icon: <ShowChartIcon /> },
  { id: 'pie', label: 'دائري', icon: <PieChartIcon /> },
  { id: 'radar', label: 'راداري', icon: <RadarIcon /> },
];

const MOCK_PREDICTIVE_DATA = {
  revenue: {
    forecast: [45000, 47000, 49000, 51000, 53000, 55000],
    historical: [32000, 34000, 36000, 38000, 40000, 42000, 44000, 43000, 45000, 46000, 47000, 48000],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    confidence: 0.87,
    trend: 'up',
    message: 'الإيرادات المتوقعة ترتفع 8% مقارنة بالفترة السابقة',
  },
  staffing: {
    forecast: [42, 45, 48],
    labels: ['الربع الحالي', 'الربع القادم', 'الربع التالي'],
    byDepartment: [
      { name: 'التأهيل', current: 18, needed: 22 },
      { name: 'العلاج الطبيعي', current: 8, needed: 10 },
      { name: 'التخاطب', current: 6, needed: 7 },
      { name: 'العلاج الوظيفي', current: 5, needed: 6 },
      { name: 'الإدارة', current: 4, needed: 4 },
      { name: 'الموارد البشرية', current: 2, needed: 3 },
    ],
    confidence: 0.72,
    trend: 'up',
    message: 'احتياج تعيين 6 موظفين جدد في الربع القادم',
  },
  expansion: {
    currentCapacity: 120,
    waitlist: 35,
    recommendedCapacity: 155,
    expansionNeeded: true,
    confidence: 0.65,
    trend: 'up',
    message: 'يوصى بافتتاح فرع جديد أو توسعة المركز الحالي',
  },
};

const MOCK_SCHEDULED_REPORTS = [
  {
    templateId: 'RPT-001',
    name: 'تقرير الإيرادات الشهرية',
    category: 'financial',
    frequency: 'monthly',
    recipients: ['finance@alawael.com', 'manager@alawael.com'],
    lastRunAt: '2025-06-01T06:00:00Z',
    nextRunAt: '2025-07-01T06:00:00Z',
    lastRunStatus: 'success',
    isActive: true,
  },
  {
    templateId: 'RPT-002',
    name: 'تقرير الجلسات الأسبوعي',
    category: 'clinical',
    frequency: 'weekly',
    recipients: ['clinical@alawael.com'],
    lastRunAt: '2025-06-22T06:00:00Z',
    nextRunAt: '2025-06-29T06:00:00Z',
    lastRunStatus: 'success',
    isActive: true,
  },
  {
    templateId: 'RPT-003',
    name: 'تقرير الموظفين اليومي',
    category: 'hr',
    frequency: 'daily',
    recipients: ['hr@alawael.com'],
    lastRunAt: '2025-06-27T06:00:00Z',
    nextRunAt: '2025-06-28T06:00:00Z',
    lastRunStatus: 'failed',
    lastError: 'فشل الاتصال بقاعدة البيانات',
    isActive: true,
  },
  {
    templateId: 'RPT-004',
    name: 'تقرير التقييمات ربع سنوي',
    category: 'clinical',
    frequency: 'quarterly',
    recipients: ['director@alawael.com'],
    lastRunAt: '2025-04-01T06:00:00Z',
    nextRunAt: '2025-07-01T06:00:00Z',
    lastRunStatus: 'success',
    isActive: false,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────
function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function frequencyLabel(f) {
  const map = { once: 'مرة واحدة', hourly: 'كل ساعة', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربع سنوي' };
  return map[f] || f;
}

function categoryLabel(c) {
  const map = { clinical: 'سريري', financial: 'مالي', operational: 'تشغيلي', hr: 'موارد بشرية', executive: 'تنفيذي' };
  return map[c] || c;
}

function categoryColor(c) {
  const map = { clinical: '#2e7d32', financial: '#1565c0', operational: '#f9a825', hr: '#6a1b9a', executive: '#c62828' };
  return map[c] || '#1e3a5f';
}

// ── Component ───────────────────────────────────────────────────────
export default function BIAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ── Report Builder State ──
  const [builderConfig, setBuilderConfig] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDimensions, setSelectedDimensions] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState('table');
  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', branchId: 'all' });
  const [reportData, setReportData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Scheduled Reports State ──
  const [scheduledReports, setScheduledReports] = useState(MOCK_SCHEDULED_REPORTS);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // ── Predictions State ──
  const [predictiveData, setPredictiveData] = useState({
    revenue: null,
    staffing: null,
    expansion: null,
  });
  const [predLoading, setPredLoading] = useState({ revenue: false, staffing: false, expansion: false });

  // ── Load initial data ──
  useEffect(() => {
    loadBuilderConfig();
    loadPredictions();
  }, []);

  const loadBuilderConfig = async () => {
    const cfg = await biAnalyticsService.getBuilderConfig();
    setBuilderConfig(cfg);
  };

  const loadPredictions = async () => {
    setPredLoading({ revenue: true, staffing: true, expansion: true });
    const [rev, staff, exp] = await Promise.all([
      biAnalyticsService.getPredictiveAnalytics('revenue'),
      biAnalyticsService.getPredictiveAnalytics('staffing'),
      biAnalyticsService.getPredictiveAnalytics('expansion'),
    ]);
    setPredictiveData({
      revenue: rev?.forecast ? rev : MOCK_PREDICTIVE_DATA.revenue,
      staffing: staff?.forecast ? staff : MOCK_PREDICTIVE_DATA.staffing,
      expansion: exp?.currentCapacity ? exp : MOCK_PREDICTIVE_DATA.expansion,
    });
    setPredLoading({ revenue: false, staffing: false, expansion: false });
  };

  // ── Build Report ──
  const handleBuildReport = async () => {
    if (!selectedSource) {
      setSnackbar({ open: true, message: 'اختر مصدر البيانات أولاً', severity: 'warning' });
      return;
    }
    if (selectedMetrics.length === 0) {
      setSnackbar({ open: true, message: 'اختر مقياسًا واحدًا على الأقل', severity: 'warning' });
      return;
    }
    setLoading(true);
    const config = {
      sourceId: selectedSource,
      dimensions: selectedDimensions,
      metrics: selectedMetrics.map(m => ({ field: m.field, aggregation: m.aggregation, label: m.label })),
      filters: reportFilters,
      startDate: reportFilters.startDate,
      endDate: reportFilters.endDate,
      branchId: reportFilters.branchId,
    };
    const data = await biAnalyticsService.buildReport(config);
    setReportData(data);
    setLoading(false);
  };

  // ── Export ──
  const handleExport = async (format) => {
    if (!reportData) {
      setSnackbar({ open: true, message: 'بنِ التقرير أولاً', severity: 'warning' });
      return;
    }
    setExportLoading(true);
    const result = await biAnalyticsService.exportCustomReport({
      sourceId: selectedSource,
      dimensions: selectedDimensions,
      metrics: selectedMetrics.map(m => ({ field: m.field, aggregation: m.aggregation, label: m.label })),
      filters: reportFilters,
      startDate: reportFilters.startDate,
      endDate: reportFilters.endDate,
      branchId: reportFilters.branchId,
    }, format);
    if (result.success && result.url) {
      const a = document.createElement('a');
      a.href = result.url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(result.url);
      setSnackbar({ open: true, message: `تم تصدير التقرير بنجاح: ${result.filename}`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: 'فشل التصدير', severity: 'error' });
    }
    setExportLoading(false);
  };

  // ── Drag & Drop helpers ──
  const toggleDimension = (dim) => {
    setSelectedDimensions(prev =>
      prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]
    );
  };

  const toggleMetric = (metric) => {
    setSelectedMetrics(prev => {
      const exists = prev.find(m => m.field === metric.field && m.aggregation === metric.aggregation);
      return exists ? prev.filter(m => !(m.field === metric.field && m.aggregation === metric.aggregation)) : [...prev, metric];
    });
  };

  // ── Render ──
  return (
    <Box dir="rtl" sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: '#1e3a5f', width: 56, height: 56 }}>
            <AnalyticsIcon sx={{ fontSize: 32, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
              التحليلات المتقدمة والذكاء التجاري
            </Typography>
            <Typography variant="body1" color="text.secondary">
              منشئ التقارير المخصصة، الجدولة، والتنبؤات التحليلية
            </Typography>
          </Box>
        </Box>
      </motion.div>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            bgcolor: '#fff',
            '& .MuiTabs-indicator': { bgcolor: '#1e3a5f', height: 3 },
            '& .MuiTab-root': { fontWeight: 600, fontSize: '1rem', py: 2 },
            '& .Mui-selected': { color: '#1e3a5f !important' },
          }}
        >
          <Tab icon={<BarChartIcon />} iconPosition="start" label="منشئ التقارير" />
          <Tab icon={<ScheduleIcon />} iconPosition="start" label="التقارير المجدولة" />
          <Tab icon={<AIIcon />} iconPosition="start" label="التنبؤات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <ReportBuilderTab
              builderConfig={builderConfig}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              selectedDimensions={selectedDimensions}
              selectedMetrics={selectedMetrics}
              toggleDimension={toggleDimension}
              toggleMetric={toggleMetric}
              selectedChartType={selectedChartType}
              setSelectedChartType={setSelectedChartType}
              reportFilters={reportFilters}
              setReportFilters={setReportFilters}
              reportData={reportData}
              loading={loading}
              exportLoading={exportLoading}
              onBuild={handleBuildReport}
              onExport={handleExport}
              setSnackbar={setSnackbar}
            />
          </motion.div>
        )}
        {activeTab === 1 && (
          <motion.div
            key="scheduled"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <ScheduledReportsTab
              reports={scheduledReports}
              setReports={setScheduledReports}
              setSnackbar={setSnackbar}
            />
          </motion.div>
        )}
        {activeTab === 2 && (
          <motion.div
            key="predictions"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <PredictionsTab
              data={predictiveData}
              loading={predLoading}
              onRefresh={loadPredictions}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-Component: Report Builder Tab
// ═══════════════════════════════════════════════════════════════════
function ReportBuilderTab(props) {
  const {
    builderConfig, selectedSource, setSelectedSource,
    selectedDimensions, selectedMetrics, toggleDimension, toggleMetric,
    selectedChartType, setSelectedChartType,
    reportFilters, setReportFilters,
    reportData, loading, exportLoading,
    onBuild, onExport, setSnackbar,
  } = props;

  const source = builderConfig?.sources?.find(s => s.id === selectedSource);

  return (
    <Grid container spacing={2}>
      {/* Left Column: Data Source Selection */}
      <Grid item xs={12} md={3}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3, height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e3a5f' }}>
            مصدر البيانات
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {(builderConfig?.sources || []).map(src => (
              <ListItem key={src.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={selectedSource === src.id}
                  onClick={() => {
                    setSelectedSource(src.id);
                    setSelectedDimensions([]);
                    setSelectedMetrics([]);
                  }}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': { bgcolor: '#e3f2fd', borderRight: '4px solid #1e3a5f' },
                  }}
                >
                  <ListItemIcon>
                    {src.id === 'icf' ? <HospitalIcon color="primary" /> :
                     src.id === 'sessions' ? <CalendarIcon color="primary" /> :
                     src.id === 'beneficiaries' ? <PeopleIcon color="primary" /> :
                     src.id === 'finance' ? <MoneyIcon color="primary" /> :
                     <BusinessIcon color="primary" />}
                  </ListItemIcon>
                  <ListItemText primary={src.name} secondary={src.nameEn} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {/* Common Filters */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#555' }}>
            <FilterIcon sx={{ fontSize: 16, verticalAlign: 'middle', ml: 0.5 }} />
            الفلاتر
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="من تاريخ"
              type="date"
              size="small"
              value={reportFilters.startDate}
              onChange={e => setReportFilters(f => ({ ...f, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ direction: 'ltr' }}
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              size="small"
              value={reportFilters.endDate}
              onChange={e => setReportFilters(f => ({ ...f, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ direction: 'ltr' }}
            />
            <TextField
              label="الفرع"
              size="small"
              select
              value={reportFilters.branchId}
              onChange={e => setReportFilters(f => ({ ...f, branchId: e.target.value }))}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="main">الفرع الرئيسي</MenuItem>
              <MenuItem value="north">فرع الشمال</MenuItem>
              <MenuItem value="south">فرع الجنوب</MenuItem>
            </TextField>
          </Stack>
        </Paper>
      </Grid>

      {/* Middle Column: Dimensions & Metrics */}
      <Grid item xs={12} md={3}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3, height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e3a5f' }}>
            الأبعاد والمقاييس
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {source ? (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32', mb: 1 }}>
                الأبعاد
              </Typography>
              <List dense sx={{ mb: 2 }}>
                {source.dimensions.map(dim => {
                  const fieldDef = source.fields.find(f => f.field === dim);
                  const isSelected = selectedDimensions.includes(dim);
                  return (
                    <ListItem key={dim} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        dense
                        selected={isSelected}
                        onClick={() => toggleDimension(dim)}
                        sx={{ borderRadius: 1, py: 0.5 }}
                      >
                        <Checkbox size="small" checked={isSelected} sx={{ p: 0.5, ml: 1 }} />
                        <ListItemText primary={fieldDef?.label || dim} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#c62828', mb: 1 }}>
                المقاييس
              </Typography>
              <List dense>
                {source.metrics.map((metric, idx) => {
                  const isSelected = selectedMetrics.some(m => m.field === metric.field && m.aggregation === metric.aggregation);
                  return (
                    <ListItem key={`${metric.field}-${idx}`} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        dense
                        selected={isSelected}
                        onClick={() => toggleMetric(metric)}
                        sx={{ borderRadius: 1, py: 0.5 }}
                      >
                        <Checkbox size="small" checked={isSelected} sx={{ p: 0.5, ml: 1 }} />
                        <ListItemText
                          primary={metric.label}
                          secondary={metric.aggregation}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: '#999' }}>
              <Typography>اختر مصدر بيانات لعرض الأبعاد والمقاييس</Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Right Column: Preview & Export */}
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
              معاينة التقرير
            </Typography>
            <Stack direction="row" spacing={1}>
              {CHART_TYPES.map(ct => (
                <Tooltip key={ct.id} title={ct.label}>
                  <IconButton
                    size="small"
                    color={selectedChartType === ct.id ? 'primary' : 'default'}
                    onClick={() => setSelectedChartType(ct.id)}
                    sx={{
                      bgcolor: selectedChartType === ct.id ? '#e3f2fd' : 'transparent',
                      border: selectedChartType === ct.id ? '1px solid #1e3a5f' : '1px solid transparent',
                    }}
                  >
                    {ct.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Build Button */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <BarChartIcon />}
              onClick={onBuild}
              disabled={loading || !selectedSource}
              sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#2a4a70' } }}
            >
              {loading ? 'جاري البناء...' : 'بناء التقرير'}
            </Button>
            <Button
              variant="outlined"
              startIcon={exportLoading ? <CircularProgress size={18} /> : <DownloadIcon />}
              onClick={() => onExport('excel')}
              disabled={exportLoading || !reportData}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={exportLoading ? <CircularProgress size={18} /> : <DownloadIcon />}
              onClick={() => onExport('pdf')}
              disabled={exportLoading || !reportData}
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={exportLoading ? <CircularProgress size={18} /> : <DownloadIcon />}
              onClick={() => onExport('powerbi')}
              disabled={exportLoading || !reportData}
            >
              PowerBI
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              disabled={!reportData}
              onClick={() => setSnackbar({ open: true, message: 'تم حفظ القالب (محاكاة)', severity: 'success' })}
            >
              حفظ القالب
            </Button>
          </Box>

          {/* Chart/Table Preview */}
          <Box sx={{ flex: 1, minHeight: 400, bgcolor: '#fafafa', borderRadius: 2, p: 2, overflow: 'auto' }}>
            {reportData ? (
              <ReportPreview data={reportData} chartType={selectedChartType} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                <PreviewIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography>اضبط الأبعاد والمقاييس ثم اضغط "بناء التقرير"</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-Component: Report Preview
// ═══════════════════════════════════════════════════════════════════
function ReportPreview({ data, chartType }) {
  const rows = data?.data || [];
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

  if (!rows.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: '#999' }}>
        <Typography>لا توجد بيانات</Typography>
      </Box>
    );
  }

  // Chart data preparation
  const chartData = rows.map((row, idx) => ({
    name: row[keys[0]] || idx,
    ...row,
  }));

  const numericKeys = keys.filter(k => typeof rows[0][k] === 'number');

  if (chartType === 'table') {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {keys.map(k => (
                <TableCell key={k} sx={{ fontWeight: 700, bgcolor: '#1e3a5f', color: '#fff', textAlign: 'center' }}>
                  {k}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} hover>
                {keys.map(k => (
                  <TableCell key={k} sx={{ textAlign: 'center' }}>
                    {row[k] ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ReTooltip />
          <Legend />
          {numericKeys.slice(0, 4).map((k, i) => (
            <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ReTooltip />
          <Legend />
          {numericKeys.slice(0, 4).map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie') {
    const pieData = rows.map((row, i) => ({
      name: String(row[keys[0]] || i),
      value: Number(row[numericKeys[0]]) || 0,
    })).filter(d => d.value > 0);
    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={120}
            dataKey="value"
            nameKey="name"
            label
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <ReTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'radar') {
    const radarData = rows.slice(0, 8).map(row => ({
      subject: String(row[keys[0]] || ''),
      A: Number(row[numericKeys[0]]) || 0,
      B: Number(row[numericKeys[1]]) || 0,
      fullMark: 100,
    }));
    return (
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis />
          <Radar name={numericKeys[0] || 'A'} dataKey="A" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.3} />
          {numericKeys[1] && <Radar name={numericKeys[1]} dataKey="B" stroke="#2e7d32" fill="#2e7d32" fillOpacity={0.3} />}
          <Legend />
          <ReTooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  return <Typography>نوع المخطط غير مدعوم</Typography>;
}

// ═══════════════════════════════════════════════════════════════════
// Sub-Component: Scheduled Reports Tab
// ═══════════════════════════════════════════════════════════════════
function ScheduledReportsTab({ reports, setReports, setSnackbar }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleToggle = (idx) => {
    setReports(prev => prev.map((r, i) => i === idx ? { ...r, isActive: !r.isActive } : r));
  };

  const handleRunNow = (idx) => {
    setSnackbar({ open: true, message: `تم تشغيل "${reports[idx].name}" الآن`, severity: 'success' });
  };

  const paginated = reports.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
          التقارير المجدولة
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#2a4a70' } }}
          onClick={() => setSnackbar({ open: true, message: 'سيتم فتح نموذج إنشاء جدولة (محاكاة)', severity: 'info' })}
        >
          جدولة جديدة
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700 }}>التقرير</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التكرار</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المستلمون</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>آخر تشغيل</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التالي</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const realIdx = page * rowsPerPage + idx;
              return (
                <TableRow key={r.templateId} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Badge
                        color={r.lastRunStatus === 'success' ? 'success' : r.lastRunStatus === 'failed' ? 'error' : 'warning'}
                        variant="dot"
                      >
                        <ScheduleIcon color="action" />
                      </Badge>
                      <Typography fontWeight={600}>{r.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryLabel(r.category)}
                      size="small"
                      sx={{ bgcolor: categoryColor(r.category) + '22', color: categoryColor(r.category), fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{frequencyLabel(r.frequency)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {r.recipients.map((email, i) => (
                        <Chip key={i} label={email.split('@')[0]} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDateTime(r.lastRunAt)}</TableCell>
                  <TableCell>{formatDateTime(r.nextRunAt)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.isActive}
                      onChange={() => handleToggle(realIdx)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="تشغيل الآن">
                        <IconButton size="small" color="primary" onClick={() => handleRunNow(realIdx)}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="info">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#999' }}>
                  لا توجد تقارير مجدولة
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={reports.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
        labelRowsPerPage="عدد الصفوف:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        sx={{ direction: 'ltr', '& .MuiTablePagination-toolbar': { direction: 'rtl' } }}
      />
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-Component: Predictions Tab
// ═══════════════════════════════════════════════════════════════════
function PredictionsTab({ data, loading, onRefresh }) {
  const revenueChartData = useMemo(() => {
    const rev = data.revenue;
    if (!rev) return [];
    return rev.months.map((m, i) => ({
      name: m,
      historical: rev.historical[i] || 0,
      forecast: i >= rev.historical.length - rev.forecast.length ? rev.forecast[i - (rev.historical.length - rev.forecast.length)] : null,
    }));
  }, [data.revenue]);

  const staffingChartData = useMemo(() => {
    const staff = data.staffing;
    if (!staff) return [];
    return staff.byDepartment.map(d => ({
      name: d.name,
      current: d.current,
      needed: d.needed,
    }));
  }, [data.staffing]);

  return (
    <Grid container spacing={3}>
      {/* Revenue Prediction Card */}
      <Grid item xs={12} md={4}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: '#1e3a5f' }}><TrendingUpIcon /></Avatar>}
              title="التنبؤ بالإيرادات"
              subheader={`الثقة: ${((data.revenue?.confidence || 0) * 100).toFixed(0)}%`}
              action={
                <IconButton onClick={onRefresh} disabled={loading.revenue}>
                  {loading.revenue ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              }
            />
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1 }}>
                {data.revenue?.forecast?.[0]?.toLocaleString('ar-SA') || 0} ر.س
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {data.revenue?.message || ''}
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ReTooltip />
                    <Line type="monotone" dataKey="historical" stroke="#1e3a5f" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#2e7d32" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>

      {/* Staffing Prediction Card */}
      <Grid item xs={12} md={4}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: '#6a1b9a' }}><PeopleIcon /></Avatar>}
              title="تنبؤ احتياجات الموظفين"
              subheader={`الثقة: ${((data.staffing?.confidence || 0) * 100).toFixed(0)}%`}
              action={
                <IconButton onClick={onRefresh} disabled={loading.staffing}>
                  {loading.staffing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              }
            />
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#6a1b9a', mb: 1 }}>
                +{((data.staffing?.forecast?.[1] || 0) - (data.staffing?.forecast?.[0] || 0)).toLocaleString('ar-SA')} موظف
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {data.staffing?.message || ''}
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffingChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <ReTooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#1e3a5f" name="الحالي" />
                    <Bar dataKey="needed" fill="#2e7d32" name="المطلوب" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>

      {/* Expansion Prediction Card */}
      <Grid item xs={12} md={4}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: data.expansion?.expansionNeeded ? '#c62828' : '#2e7d32' }}>
                {data.expansion?.expansionNeeded ? <TrendingUpIcon /> : <CheckCircleIcon />}
              </Avatar>}
              title="التنبؤ بالتوسع"
              subheader={`الثقة: ${((data.expansion?.confidence || 0) * 100).toFixed(0)}%`}
              action={
                <IconButton onClick={onRefresh} disabled={loading.expansion}>
                  {loading.expansion ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              }
            />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">السعة الحالية</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {data.expansion?.currentCapacity || 0} مستفيد
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">قائمة الانتظار</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#c62828' }}>
                    {data.expansion?.waitlist || 0} مستفيد
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">السعة الموصى بها</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                    {data.expansion?.recommendedCapacity || 0} مستفيد
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((data.expansion?.currentCapacity || 0) / (data.expansion?.recommendedCapacity || 1)) * 100)}
                  sx={{
                    height: 10, borderRadius: 5,
                    bgcolor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': { bgcolor: data.expansion?.expansionNeeded ? '#c62828' : '#2e7d32' },
                  }}
                />
                <Alert severity={data.expansion?.expansionNeeded ? 'warning' : 'success'} sx={{ borderRadius: 2 }}>
                  {data.expansion?.message || ''}
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>

      {/* Combined Forecast Chart */}
      <Grid item xs={12}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardHeader
              title="مخطط التنبؤات المجمّع"
              subheader="مقارنة الإيرادات والموارد البشرية عبر الفترات"
            />
            <CardContent>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ReTooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="historical" stroke="#1e3a5f" name="الإيرادات" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="forecast" stroke="#2e7d32" name="التنبؤ" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>
    </Grid>
  );
}
