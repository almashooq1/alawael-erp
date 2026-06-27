/**
 * ComplianceDashboard.jsx — مركز الامتثال والاعتماد
 * ════════════════════════════════════════════════════
 * RTL Arabic dashboard for accreditation tracking (CBAHI, ISO 9001, JCI, etc.)
 * Features: KPIs, compliance pie chart, audit table, filters, corrective actions,
 * upcoming reviews, evidence upload, and immutable audit trail viewer.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Badge,
  Avatar,
  Divider,
  Stack,
  LinearProgress,
  Container,
} from '@mui/material';
import {
  CheckCircle as CompliantIcon,
  Warning as PartialIcon,
  Error as NonCompliantIcon,
  Block as NAICon,
  Schedule as PendingIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  TaskAlt as TaskIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Gavel as StandardIcon,
  Assessment as AssessmentIcon,
  ArrowForwardIos as ArrowForwardIcon,
  ArrowBackIos as ArrowBackIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
} from 'recharts';
import { brandColors, statusColors, chartColors } from '../../theme/palette';
import { withMockFallback } from '../../services/api';
import complianceService from '../../services/complianceService';

/* ─── Status Config ─────────────────────────────────────── */

const STATUS_CONFIG = {
  compliant: { label: 'متوافق', color: 'success', icon: <CompliantIcon />, bg: '#ECFDF5' },
  partially_compliant: { label: 'متوافق جزئياً', color: 'warning', icon: <PartialIcon />, bg: '#FFFBEB' },
  non_compliant: { label: 'غير متوافق', color: 'error', icon: <NonCompliantIcon />, bg: '#FFF1F2' },
  not_applicable: { label: 'غير مطبق', color: 'default', icon: <NAICon />, bg: '#F1F5F9' },
  pending: { label: 'معلق', color: 'info', icon: <PendingIcon />, bg: '#F0F9FF' },
};

const STANDARD_LABELS = {
  CBAHI: 'CBAHI',
  ISO_9001: 'ISO 9001',
  JCI: 'JCI',
  NPHIES: 'NPHIES',
  SCHS: 'SCHS',
  OTHER: 'أخرى',
};

const CATEGORY_LABELS = {
  clinical: 'سريري',
  administrative: 'إداري',
  technical: 'تقني',
  financial: 'مالي',
  safety: 'سلامة',
};

/* ─── Mock Data ─────────────────────────────────────────── */

const MOCK_DASHBOARD = {
  summary: {
    total: 120,
    compliant: 78,
    partiallyCompliant: 18,
    nonCompliant: 8,
    notApplicable: 10,
    pending: 6,
    applicable: 110,
    compliancePercentage: 71,
    averageScore: 82,
  },
  kpis: {
    pendingCorrectiveActions: 12,
    upcomingReviews: 9,
    overdueReviews: 6,
  },
  lastUpdated: new Date().toISOString(),
};

const MOCK_AUDITS = [
  { _id: '1', auditNumber: 'AUD-2025-1001', standard: 'CBAHI', category: 'clinical', criteria: 'بند 3.1.1', description: 'تقييم الحالة عند القبول', status: 'compliant', score: 95, reviewDate: '2025-06-01', nextReviewDate: '2025-12-01', branchId: { name: 'الفرع الرئيسي' } },
  { _id: '2', auditNumber: 'AUD-2025-1002', standard: 'CBAHI', category: 'administrative', criteria: 'بند 2.4.2', description: 'سجل الموافقات الإكلينيكية', status: 'partially_compliant', score: 70, reviewDate: '2025-05-15', nextReviewDate: '2025-11-15', branchId: { name: 'الفرع الرئيسي' } },
  { _id: '3', auditNumber: 'AUD-2025-1003', standard: 'ISO_9001', category: 'technical', criteria: 'بند 7.1.5', description: 'معايرة المعدات الطبية', status: 'compliant', score: 92, reviewDate: '2025-04-20', nextReviewDate: '2025-10-20', branchId: { name: 'فرع الشمال' } },
  { _id: '4', auditNumber: 'AUD-2025-1004', standard: 'JCI', category: 'safety', criteria: 'GLD-03', description: 'إدارة حوادث السقوط', status: 'non_compliant', score: 45, reviewDate: '2025-03-10', nextReviewDate: '2025-09-10', branchId: { name: 'فرع الجنوب' } },
  { _id: '5', auditNumber: 'AUD-2025-1005', standard: 'CBAHI', category: 'financial', criteria: 'بند 5.2.1', description: 'فوترة الخدمات الطبية', status: 'compliant', score: 88, reviewDate: '2025-06-05', nextReviewDate: '2025-12-05', branchId: { name: 'الفرع الرئيسي' } },
  { _id: '6', auditNumber: 'AUD-2025-1006', standard: 'NPHIES', category: 'technical', criteria: 'REQ-12', description: 'تكامل بيانات NPHIES', status: 'pending', score: null, reviewDate: null, nextReviewDate: '2025-08-01', branchId: { name: 'الفرع الرئيسي' } },
  { _id: '7', auditNumber: 'AUD-2025-1007', standard: 'ISO_9001', category: 'clinical', criteria: 'بند 8.5.1', description: 'تتبع جودة الخدمات العلاجية', status: 'compliant', score: 90, reviewDate: '2025-05-20', nextReviewDate: '2025-11-20', branchId: { name: 'فرع الشمال' } },
  { _id: '8', auditNumber: 'AUD-2025-1008', standard: 'CBAHI', category: 'safety', criteria: 'بند 6.3.1', description: 'إدارة الطوارئ والإخلاء', status: 'partially_compliant', score: 65, reviewDate: '2025-04-10', nextReviewDate: '2025-10-10', branchId: { name: 'فرع الجنوب' } },
];

const MOCK_PENDING_ACTIONS = [
  { auditId: '2', auditNumber: 'AUD-2025-1002', standard: 'CBAHI', criteria: 'بند 2.4.2', action: 'تحديث نماذج الموافقات الإكلينيكية', dueDate: '2025-07-15', overdue: true, daysLeft: -5, responsible: { fullName: 'أحمد العلي' } },
  { auditId: '4', auditNumber: 'AUD-2025-1004', standard: 'JCI', criteria: 'GLD-03', action: 'تدريب فريق التمريض على بروتوكول السقوط', dueDate: '2025-07-20', overdue: false, daysLeft: 10, responsible: { fullName: 'فاطمة الزهراني' } },
  { auditId: '8', auditNumber: 'AUD-2025-1008', standard: 'CBAHI', criteria: 'بند 6.3.1', action: 'تجديد شهادات الإطفاء', dueDate: '2025-07-25', overdue: false, daysLeft: 15, responsible: { fullName: 'خالد السعيد' } },
];

const MOCK_UPCOMING_REVIEWS = [
  { _id: '3', auditNumber: 'AUD-2025-1003', standard: 'ISO_9001', criteria: 'بند 7.1.5', nextReviewDate: '2025-07-20', status: 'compliant', score: 92, responsiblePerson: { fullName: 'محمد القحطاني' } },
  { _id: '5', auditNumber: 'AUD-2025-1005', standard: 'CBAHI', criteria: 'بند 5.2.1', nextReviewDate: '2025-07-28', status: 'compliant', score: 88, responsiblePerson: { fullName: 'سارة الدوسري' } },
  { _id: '6', auditNumber: 'AUD-2025-1006', standard: 'NPHIES', criteria: 'REQ-12', nextReviewDate: '2025-08-01', status: 'pending', score: null, responsiblePerson: { fullName: 'عبدالله المالكي' } },
];

const MOCK_AUDIT_TRAIL = {
  totalAudits: 3,
  totalEntries: 5,
  entries: [
    { auditNumber: 'AUD-2025-1004', standard: 'JCI', criteria: 'GLD-03', status: 'non_compliant', changedAt: '2025-06-20T10:00:00Z', field: 'status', oldValue: 'pending', newValue: 'non_compliant', changedBy: { fullName: 'د. نورة الغامدي' }, note: 'Status changed from pending to non_compliant' },
    { auditNumber: 'AUD-2025-1002', standard: 'CBAHI', criteria: 'بند 2.4.2', status: 'partially_compliant', changedAt: '2025-06-18T14:30:00Z', field: 'status', oldValue: 'compliant', newValue: 'partially_compliant', changedBy: { fullName: 'د. سعد الحربي' }, note: 'Status changed from compliant to partially_compliant' },
    { auditNumber: 'AUD-2025-1001', standard: 'CBAHI', criteria: 'بند 3.1.1', status: 'compliant', changedAt: '2025-06-15T09:00:00Z', field: 'evidence', oldValue: null, newValue: 'evaluation_form_v2.pdf', changedBy: { fullName: 'أحمد العلي' }, note: 'Evidence uploaded' },
  ],
};

/* ─── Component ─────────────────────────────────────────── */

export default function ComplianceDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [audits, setAudits] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [upcomingReviews, setUpcomingReviews] = useState([]);
  const [auditTrail, setAuditTrail] = useState(null);

  // Filters
  const [filterStandard, setFilterStandard] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [trailOpen, setTrailOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);

  /* ─── Data Fetching ─────────────────────────────────────── */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const dash = await withMockFallback(
        () => complianceService.getDashboard(filterBranch || undefined, filterStandard || undefined),
        { data: MOCK_DASHBOARD }
      );
      setDashboard(dash.data || MOCK_DASHBOARD);

      const auditList = await withMockFallback(
        () => complianceService.getAudits({
          standard: filterStandard || undefined,
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          branchId: filterBranch || undefined,
          search: searchQuery || undefined,
        }),
        { data: { data: MOCK_AUDITS, pagination: { total: MOCK_AUDITS.length, totalPages: 1 } } }
      );
      setAudits(auditList.data?.data || MOCK_AUDITS);

      const actions = await withMockFallback(
        () => complianceService.getPendingActions(filterBranch || undefined),
        { data: MOCK_PENDING_ACTIONS }
      );
      setPendingActions(actions.data || MOCK_PENDING_ACTIONS);

      const reviews = await withMockFallback(
        () => complianceService.getUpcomingReviews(filterBranch || undefined, 30),
        { data: MOCK_UPCOMING_REVIEWS }
      );
      setUpcomingReviews(reviews.data || MOCK_UPCOMING_REVIEWS);

      const trail = await withMockFallback(
        () => complianceService.getAuditTrail(filterStandard || undefined),
        { data: MOCK_AUDIT_TRAIL }
      );
      setAuditTrail(trail.data || MOCK_AUDIT_TRAIL);
    } catch (err) {
      console.error('[ComplianceDashboard] fetch error:', err);
      // Fallback to mock data on total failure
      setDashboard(MOCK_DASHBOARD);
      setAudits(MOCK_AUDITS);
      setPendingActions(MOCK_PENDING_ACTIONS);
      setUpcomingReviews(MOCK_UPCOMING_REVIEWS);
      setAuditTrail(MOCK_AUDIT_TRAIL);
    } finally {
      setLoading(false);
    }
  }, [filterStandard, filterCategory, filterStatus, filterBranch, searchQuery]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ─── Computed ──────────────────────────────────────────── */

  const pieData = useMemo(() => {
    if (!dashboard) return [];
    const s = dashboard.summary;
    return [
      { name: 'متوافق', value: s.compliant, color: statusColors.success },
      { name: 'جزئي', value: s.partiallyCompliant, color: statusColors.warning },
      { name: 'غير متوافق', value: s.nonCompliant, color: statusColors.error },
      { name: 'معلق', value: s.pending, color: statusColors.info },
      { name: 'غير مطبق', value: s.notApplicable, color: '#94A3B8' },
    ].filter(d => d.value > 0);
  }, [dashboard]);

  const filteredAudits = useMemo(() => {
    let list = [...audits];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.auditNumber?.toLowerCase().includes(q) ||
        a.criteria?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [audits, searchQuery]);

  /* ─── Handlers ──────────────────────────────────────────── */

  const handleTabChange = (_e, v) => setTab(v);

  const handleOpenTrail = () => setTrailOpen(true);
  const handleCloseTrail = () => setTrailOpen(false);

  const handleOpenEvidence = (audit) => {
    setSelectedAudit(audit);
    setEvidenceOpen(true);
  };
  const handleCloseEvidence = () => {
    setEvidenceOpen(false);
    setSelectedAudit(null);
  };

  const handleRefresh = () => fetchAll();

  /* ─── Render Helpers ─────────────────────────────────────── */

  const StatusChip = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <Chip
        icon={cfg.icon}
        label={cfg.label}
        color={cfg.color}
        size="small"
        sx={{ fontWeight: 600, direction: 'rtl' }}
      />
    );
  };

  const KPICard = ({ title, value, sub, color, icon }) => (
    <Card elevation={2} sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={color} mt={0.5}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                {sub}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <Container maxWidth="xl" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            مركز الامتثال والاعتماد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تتبع معايير الاعتماد (CBAHI، ISO 9001، JCI) والتدقيق المستمر
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            تدقيق جديد
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      {dashboard && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="إجمالي المعايير"
              value={dashboard.summary.total}
              sub={`مطبق: ${dashboard.summary.applicable}`}
              color={brandColors.primary}
              icon={<AssessmentIcon />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="نسبة الامتثال"
              value={`${dashboard.summary.compliancePercentage}%`}
              sub={`متوسط النتيجة: ${dashboard.summary.averageScore}`}
              color={statusColors.success}
              icon={<CompliantIcon />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="إجراءات تصحيحية معلقة"
              value={dashboard.kpis.pendingCorrectiveActions}
              sub={`مراجعات قادمة: ${dashboard.kpis.upcomingReviews}`}
              color={statusColors.warning}
              icon={<TaskIcon />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="مراجعات قادمة (30 يوم)"
              value={dashboard.kpis.upcomingReviews}
              sub={`متأخرة: ${dashboard.kpis.overdueReviews}`}
              color={statusColors.info}
              icon={<PendingIcon />}
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ px: 2, pt: 1 }}>
          <Tab label="نظرة عامة" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="التدقيقات" icon={<StandardIcon />} iconPosition="start" />
          <Tab label="الإجراءات التصحيحية" icon={<TaskIcon />} iconPosition="start" />
          <Tab label="المراجعات القادمة" icon={<PendingIcon />} iconPosition="start" />
        </Tabs>

        {/* Tab 0: Overview */}
        {tab === 0 && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  توزيع حالات الامتثال
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={entry => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  ملخص سريع
                </Typography>
                <Stack spacing={2} mt={2}>
                  {dashboard && (
                    <>
                      <Alert severity="success" icon={<CompliantIcon />}>
                        <strong>متوافق:</strong> {dashboard.summary.compliant} معيار ({Math.round((dashboard.summary.compliant / dashboard.summary.total) * 100)}%)
                      </Alert>
                      <Alert severity="warning" icon={<PartialIcon />}>
                        <strong>جزئي:</strong> {dashboard.summary.partiallyCompliant} معيار يحتاج تحسين
                      </Alert>
                      <Alert severity="error" icon={<NonCompliantIcon />}>
                        <strong>غير متوافق:</strong> {dashboard.summary.nonCompliant} معيار يحتاج تدخل فوري
                      </Alert>
                      <Alert severity="info" icon={<PendingIcon />}>
                        <strong>معلق:</strong> {dashboard.summary.pending} معيار قيد المراجعة
                      </Alert>
                    </>
                  )}
                </Stack>
                <Box mt={3}>
                  <Button variant="outlined" startIcon={<HistoryIcon />} onClick={handleOpenTrail} fullWidth>
                    عرض سجل التدقيق (Audit Trail)
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Tab 1: Audits Table */}
        {tab === 1 && (
          <CardContent>
            {/* Filters */}
            <Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>المعيار</InputLabel>
                <Select value={filterStandard} onChange={e => setFilterStandard(e.target.value)} label="المعيار">
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(STANDARD_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الفئة</InputLabel>
                <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} label="الفئة">
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الحالة</InputLabel>
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="الحالة">
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="بحث..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              <Button variant="outlined" size="small" startIcon={<FilterIcon />} onClick={handleRefresh}>
                تطبيق
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell align="right" fontWeight="bold">رقم التدقيق</TableCell>
                    <TableCell align="right">المعيار</TableCell>
                    <TableCell align="right">الفئة</TableCell>
                    <TableCell align="right">البند</TableCell>
                    <TableCell align="right">الوصف</TableCell>
                    <TableCell align="right">الحالة</TableCell>
                    <TableCell align="right">النتيجة</TableCell>
                    <TableCell align="right">الفرع</TableCell>
                    <TableCell align="right">المراجعة القادمة</TableCell>
                    <TableCell align="right">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAudits.map(audit => (
                    <TableRow key={audit._id} hover>
                      <TableCell align="right" fontWeight={600}>{audit.auditNumber}</TableCell>
                      <TableCell align="right">{STANDARD_LABELS[audit.standard] || audit.standard}</TableCell>
                      <TableCell align="right">{CATEGORY_LABELS[audit.category] || audit.category}</TableCell>
                      <TableCell align="right">{audit.criteria}</TableCell>
                      <TableCell align="right">{audit.description}</TableCell>
                      <TableCell align="right"><StatusChip status={audit.status} /></TableCell>
                      <TableCell align="right">
                        {audit.score !== null && audit.score !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={audit.score}
                              sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#F1F5F9',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: audit.score >= 80 ? statusColors.success : audit.score >= 60 ? statusColors.warning : statusColors.error,
                                  borderRadius: 3,
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={600}>{audit.score}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{audit.branchId?.name || '—'}</TableCell>
                      <TableCell align="right">
                        {audit.nextReviewDate ? (
                          <Typography variant="caption">
                            {new Date(audit.nextReviewDate).toLocaleDateString('ar-SA')}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="عرض">
                            <IconButton size="small"><ViewIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="رفع دليل">
                            <IconButton size="small" onClick={() => handleOpenEvidence(audit)}>
                              <UploadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Tab 2: Pending Actions */}
        {tab === 2 && (
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              الإجراءات التصحيحية المعلقة
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell align="right">رقم التدقيق</TableCell>
                    <TableCell align="right">المعيار</TableCell>
                    <TableCell align="right">البند</TableCell>
                    <TableCell align="right">الإجراء</TableCell>
                    <TableCell align="right">المسؤول</TableCell>
                    <TableCell align="right">تاريخ الاستحقاق</TableCell>
                    <TableCell align="right">الحالة</TableCell>
                    <TableCell align="right">إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingActions.map((action, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell align="right" fontWeight={600}>{action.auditNumber}</TableCell>
                      <TableCell align="right">{STANDARD_LABELS[action.standard] || action.standard}</TableCell>
                      <TableCell align="right">{action.criteria}</TableCell>
                      <TableCell align="right">{action.action}</TableCell>
                      <TableCell align="right">{action.responsible?.fullName || '—'}</TableCell>
                      <TableCell align="right">
                        {action.dueDate ? (
                          <Typography variant="caption" color={action.overdue ? 'error' : 'text.primary'} fontWeight={action.overdue ? 700 : 400}>
                            {new Date(action.dueDate).toLocaleDateString('ar-SA')}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {action.overdue ? (
                          <Chip label="متأخر" color="error" size="small" icon={<NonCompliantIcon />} />
                        ) : (
                          <Chip label={`متبقي ${action.daysLeft} يوم`} color="info" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color={action.overdue ? 'error' : 'primary'}
                          startIcon={<TaskIcon />}
                        >
                          إكمال
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingActions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" py={3}>
                          لا توجد إجراءات تصحيحية معلقة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Tab 3: Upcoming Reviews */}
        {tab === 3 && (
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              المراجعات القادمة
            </Typography>
            <Grid container spacing={2}>
              {upcomingReviews.map((review) => (
                <Grid item xs={12} sm={6} md={4} key={review._id}>
                  <Card variant="outlined" sx={{ borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', bgcolor: review.nextReviewDate && new Date(review.nextReviewDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? statusColors.error : statusColors.info }} />
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" fontWeight="bold">{review.auditNumber}</Typography>
                          <StatusChip status={review.status} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {STANDARD_LABELS[review.standard] || review.standard} — {review.criteria}
                        </Typography>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            المراجعة القادمة:
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color={review.nextReviewDate && new Date(review.nextReviewDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'error' : 'primary'}>
                            {review.nextReviewDate ? new Date(review.nextReviewDate).toLocaleDateString('ar-SA') : '—'}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            المسؤول:
                          </Typography>
                          <Typography variant="body2">{review.responsiblePerson?.fullName || '—'}</Typography>
                        </Stack>
                        {review.score !== null && review.score !== undefined && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress
                              variant="determinate"
                              value={review.score}
                              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}
                            />
                            <Typography variant="caption" fontWeight={600}>{review.score}</Typography>
                          </Stack>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {upcomingReviews.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="success" icon={<CompliantIcon />}>
                    لا توجد مراجعات قادمة في الفترة المحددة
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Audit Trail Dialog */}
      <Dialog open={trailOpen} onClose={handleCloseTrail} maxWidth="md" fullWidth>
        <DialogTitle sx={{ direction: 'rtl' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <HistoryIcon color="primary" />
            <span>سجل التدقيق (Audit Trail)</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ direction: 'rtl' }}>
          {auditTrail && (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                إجمالي التدقيقات: {auditTrail.totalAudits} | إجمالي السجلات: {auditTrail.totalEntries}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell align="right">رقم التدقيق</TableCell>
                      <TableCell align="right">المعيار</TableCell>
                      <TableCell align="right">البند</TableCell>
                      <TableCell align="right">الحالة</TableCell>
                      <TableCell align="right">الحقل</TableCell>
                      <TableCell align="right">القيمة القديمة</TableCell>
                      <TableCell align="right">القيمة الجديدة</TableCell>
                      <TableCell align="right">بواسطة</TableCell>
                      <TableCell align="right">التاريخ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditTrail.entries.map((entry, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell align="right" fontWeight={600}>{entry.auditNumber}</TableCell>
                        <TableCell align="right">{STANDARD_LABELS[entry.standard] || entry.standard}</TableCell>
                        <TableCell align="right">{entry.criteria}</TableCell>
                        <TableCell align="right"><StatusChip status={entry.status} /></TableCell>
                        <TableCell align="right">{entry.field}</TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">{String(entry.oldValue ?? '—')}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" fontWeight={600} color="primary">{String(entry.newValue ?? '—')}</Typography>
                        </TableCell>
                        <TableCell align="right">{entry.changedBy?.fullName || '—'}</TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            {entry.changedAt ? new Date(entry.changedAt).toLocaleDateString('ar-SA') : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Alert severity="info" sx={{ mt: 2 }}>
                سجل التدقيق غير قابل للتعديل — يتم الاحتفاظ به لأغراض الامتثال والتدقيق.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={handleCloseTrail} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Evidence Upload Dialog */}
      <Dialog open={evidenceOpen} onClose={handleCloseEvidence} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ direction: 'rtl' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CloudUploadIcon color="primary" />
            <span>رفع دليل مستندي</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          {selectedAudit && (
            <Stack spacing={2} mt={1}>
              <Typography variant="body2">
                <strong>التدقيق:</strong> {selectedAudit.auditNumber} — {selectedAudit.criteria}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedAudit.description}
              </Typography>
              <Divider />
              <Box
                sx={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: brandColors.primary, bgcolor: '#F8FAFC' },
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" fontWeight={500}>
                  اسحب الملفات هنا أو انقر للاختيار
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF، DOCX، JPG، PNG (بحد أقصى 10 ميجابايت)
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={handleCloseEvidence} color="inherit">إلغاء</Button>
          <Button variant="contained" startIcon={<UploadIcon />}>
            رفع الملفات
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
