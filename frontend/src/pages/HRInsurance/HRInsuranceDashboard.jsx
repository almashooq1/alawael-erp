/**
 * HRInsuranceDashboard.jsx — لوحة إدارة تأمين الموظفين الصحي
 *
 * تكامل شؤون الموظفين مع شركات التأمين السعودية المعتمدة من ساما
 *
 * 4 تبويبات:
 *   1. لوحة المعلومات — إحصائيات وبطاقات KPI ورسوم بيانية
 *   2. وثائق التأمين — جدول CRUD مع الفلترة والبحث
 *   3. المطالبات الطبية — تتبع وإدارة المطالبات
 *   4. التقارير — ملخص مالي وخصومات الرواتب
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Tabs, Tab, Button, IconButton, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent, Divider, Avatar, LinearProgress, Tooltip, Alert,
  InputAdornment, FormControl, InputLabel, Select, CircularProgress,
  List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
  Accordion, AccordionSummary, AccordionDetails, Badge,
} from '@mui/material';
import {
  HealthAndSafety as InsuranceIcon,
  LocalHospital as HospitalIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as ActiveIcon,
  Cancel as CancelIcon,
  Schedule as PendingIcon,
  PersonAdd as AddDependentIcon,
  Receipt as ClaimIcon,
  Autorenew as RenewIcon,
  Business as CompanyIcon,
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MoneyIcon,
  FamilyRestroom as FamilyIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Star as VipIcon,
  MedicalServices as MedicalIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, chartColors } from '../../theme/palette';
import hrInsuranceService from '../../services/hrInsuranceService';

// ─── Status & Class Config ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  active: { label: 'نشط', color: 'success', icon: <ActiveIcon fontSize="small" /> },
  pending: { label: 'قيد الانتظار', color: 'warning', icon: <PendingIcon fontSize="small" /> },
  suspended: { label: 'معلق', color: 'default', icon: <WarningIcon fontSize="small" /> },
  expired: { label: 'منتهي', color: 'error', icon: <CancelIcon fontSize="small" /> },
  cancelled: { label: 'ملغي', color: 'error', icon: <CancelIcon fontSize="small" /> },
  renewal_pending: { label: 'بانتظار التجديد', color: 'info', icon: <RenewIcon fontSize="small" /> },
};

const CLASS_CONFIG = {
  VIP: { label: 'VIP', color: '#FFD700', bgColor: '#FFF8E1' },
  A: { label: 'فئة أ', color: '#4CAF50', bgColor: '#E8F5E9' },
  B: { label: 'فئة ب', color: '#2196F3', bgColor: '#E3F2FD' },
  C: { label: 'فئة ج', color: '#FF9800', bgColor: '#FFF3E0' },
  D: { label: 'فئة د', color: '#9E9E9E', bgColor: '#F5F5F5' },
};

const CLAIM_TYPES = [
  { value: 'outpatient', label: 'عيادة خارجية' },
  { value: 'inpatient', label: 'تنويم' },
  { value: 'dental', label: 'أسنان' },
  { value: 'optical', label: 'نظارات' },
  { value: 'maternity', label: 'ولادة' },
  { value: 'emergency', label: 'طوارئ' },
  { value: 'pharmacy', label: 'صيدلية' },
  { value: 'lab_radiology', label: 'مختبر وأشعة' },
  { value: 'physiotherapy', label: 'علاج طبيعي' },
  { value: 'chronic_disease', label: 'أمراض مزمنة' },
];

const RELATIONSHIPS = [
  { value: 'spouse', label: 'زوج/زوجة' },
  { value: 'son', label: 'ابن' },
  { value: 'daughter', label: 'ابنة' },
  { value: 'father', label: 'أب' },
  { value: 'mother', label: 'أم' },
  { value: 'other', label: 'آخر' },
];

const CLAIM_STATUS_CONFIG = {
  submitted: { label: 'مقدمة', color: 'info' },
  under_review: { label: 'قيد المراجعة', color: 'warning' },
  approved: { label: 'مقبولة', color: 'success' },
  partially_approved: { label: 'مقبولة جزئياً', color: 'warning' },
  rejected: { label: 'مرفوضة', color: 'error' },
  paid: { label: 'مدفوعة', color: 'success' },
  appealed: { label: 'مستأنفة', color: 'default' },
};

// ─── Helper: Format Currency ─────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(amount || 0);

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ title, value, icon, gradient, subtitle, badge }) => (
  <Card
    sx={{
      background: gradient || gradients.primary,
      color: '#fff',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(102,126,234,0.25)',
      position: 'relative',
      overflow: 'hidden',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.5 }}>{title}</Typography>
          <Typography variant="h4" fontWeight={700}>
            {badge ? <Badge badgeContent={badge} color="error">{value}</Badge> : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ opacity: 0.75, mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function HRInsuranceDashboard() {
  const showSnackbar = useSnackbar();

  // ── State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 10, total: 0 });
  const [companies, setCompanies] = useState([]);
  const [_coverageClasses, _setCoverageClasses] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Dialogs
  const [policyDialog, setPolicyDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [claimDialog, setClaimDialog] = useState(false);
  const [dependentDialog, setDependentDialog] = useState(false);
  const [renewDialog, setRenewDialog] = useState(false);

  // Forms
  const [policyForm, setPolicyForm] = useState({});
  const [claimForm, setClaimForm] = useState({});
  const [dependentForm, setDependentForm] = useState({});
  const [renewForm, setRenewForm] = useState({});

  const [reportData, setReportData] = useState(null);
  const [expiringPolicies, setExpiringPolicies] = useState([]);

  // ── Data Fetching ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await hrInsuranceService.getStats();
      setStats(res.data?.data || res.data);
    } catch { /* stats optional */ }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await hrInsuranceService.getCompanies();
      setCompanies(res.data?.data || []);
    } catch { /* ref data optional */ }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await hrInsuranceService.getCoverageClasses();
      _setCoverageClasses(res.data?.data || []);
    } catch { /* ref data optional */ }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...(searchQuery && { search: searchQuery }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterCompany && { insuranceCompany: filterCompany }),
        ...(filterClass && { coverageClass: filterClass }),
      };
      const res = await hrInsuranceService.getPolicies(params);
      const data = res.data;
      setPolicies(data?.data || []);
      if (data?.pagination) {
        setPagination((prev) => ({ ...prev, total: data.pagination.total }));
      }
    } catch {
      showSnackbar('خطأ في جلب وثائق التأمين', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, filterStatus, filterCompany, filterClass, showSnackbar]);

  const fetchExpiring = useCallback(async () => {
    try {
      const res = await hrInsuranceService.getExpiringPolicies(30);
      setExpiringPolicies(res.data?.data || []);
    } catch { /* optional */ }
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      const res = await hrInsuranceService.getReportSummary();
      setReportData(res.data?.data || res.data);
    } catch { /* optional */ }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchClasses();
  }, [fetchCompanies, fetchClasses]);

  useEffect(() => {
    fetchStats();
    fetchExpiring();
  }, [fetchStats, fetchExpiring]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleRefresh = useCallback(() => {
    fetchStats();
    fetchPolicies();
    fetchExpiring();
    showSnackbar('تم تحديث البيانات', 'success');
  }, [fetchStats, fetchPolicies, fetchExpiring, showSnackbar]);

  // ── Company lookup ─────────────────────────────────────────────────────
  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach((c) => { map[c.id] = c; });
    return map;
  }, [companies]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleCreatePolicy = async () => {
    try {
      await hrInsuranceService.createPolicy(policyForm);
      showSnackbar('تم إنشاء وثيقة التأمين بنجاح', 'success');
      setPolicyDialog(false);
      setPolicyForm({});
      fetchPolicies();
      fetchStats();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'خطأ في إنشاء الوثيقة', 'error');
    }
  };

  const handleUpdatePolicy = async () => {
    try {
      await hrInsuranceService.updatePolicy(selectedPolicy._id, policyForm);
      showSnackbar('تم تحديث الوثيقة بنجاح', 'success');
      setPolicyDialog(false);
      setPolicyForm({});
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'خطأ في تحديث الوثيقة', 'error');
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الوثيقة؟')) return;
    try {
      await hrInsuranceService.deletePolicy(id);
      showSnackbar('تم إلغاء الوثيقة بنجاح', 'success');
      fetchPolicies();
      fetchStats();
    } catch {
      showSnackbar('خطأ في إلغاء الوثيقة', 'error');
    }
  };

  const handleSubmitClaim = async () => {
    try {
      await hrInsuranceService.submitClaim(selectedPolicy._id, claimForm);
      showSnackbar('تم تقديم المطالبة بنجاح', 'success');
      setClaimDialog(false);
      setClaimForm({});
      fetchPolicies();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'خطأ في تقديم المطالبة', 'error');
    }
  };

  const handleAddDependent = async () => {
    try {
      await hrInsuranceService.addDependent(selectedPolicy._id, dependentForm);
      showSnackbar('تم إضافة التابع بنجاح', 'success');
      setDependentDialog(false);
      setDependentForm({});
      fetchPolicies();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'خطأ في إضافة التابع', 'error');
    }
  };

  const handleRenewPolicy = async () => {
    try {
      await hrInsuranceService.renewPolicy(selectedPolicy._id, renewForm);
      showSnackbar('تم تجديد الوثيقة بنجاح', 'success');
      setRenewDialog(false);
      setRenewForm({});
      fetchPolicies();
      fetchStats();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'خطأ في تجديد الوثيقة', 'error');
    }
  };

  const openEditPolicy = (policy) => {
    setSelectedPolicy(policy);
    setPolicyForm({
      employeeId: policy.employeeId,
      employeeName: policy.employeeName,
      nationalId: policy.nationalId,
      department: policy.department,
      position: policy.position,
      insuranceCompany: policy.insuranceCompany,
      coverageClass: policy.coverageClass,
      policyNumber: policy.policyNumber,
      memberNumber: policy.memberNumber,
      startDate: policy.startDate?.split('T')[0],
      endDate: policy.endDate?.split('T')[0],
      status: policy.status,
      premium: policy.premium || {},
    });
    setPolicyDialog(true);
  };

  const openDetail = async (policy) => {
    try {
      const res = await hrInsuranceService.getPolicy(policy._id);
      setSelectedPolicy(res.data?.data || policy);
      setDetailDialog(true);
    } catch {
      setSelectedPolicy(policy);
      setDetailDialog(true);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <InsuranceIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              تأمين الموظفين الصحي
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تكامل شؤون الموظفين مع شركات التأمين السعودية
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setSelectedPolicy(null); setPolicyForm({}); setPolicyDialog(true); }}
          >
            وثيقة جديدة
          </Button>
        </Box>
      </Box>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: '16px', mb: 3, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => { setActiveTab(v); if (v === 3) fetchReport(); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 }, '& .Mui-selected': { fontWeight: 700 }, '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' } }}
        >
          <Tab icon={<InsuranceIcon />} label="لوحة المعلومات" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="وثائق التأمين" iconPosition="start" />
          <Tab icon={<ClaimIcon />} label="المطالبات الطبية" iconPosition="start" />
          <Tab icon={<ReportIcon />} label="التقارير" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 0: لوحة المعلومات (Dashboard)                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <Box>
          {/* KPI Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="إجمالي الوثائق النشطة"
                value={stats?.activePolicies ?? 0}
                icon={<InsuranceIcon />}
                gradient={gradients.primary}
                subtitle={`من أصل ${stats?.totalPolicies ?? 0} وثيقة`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="إجمالي الأعضاء المؤمنين"
                value={stats?.financials?.totalMembers ?? 0}
                icon={<FamilyIcon />}
                gradient={gradients.success}
                subtitle={`${stats?.financials?.totalDependents ?? 0} تابع`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="التكلفة السنوية"
                value={formatCurrency(stats?.financials?.totalAnnualPremium)}
                icon={<MoneyIcon />}
                gradient={gradients.info}
                subtitle={`متوسط: ${formatCurrency(stats?.financials?.avgPremium)}`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="وثائق تنتهي قريباً"
                value={stats?.expiringPolicies ?? 0}
                icon={<WarningIcon />}
                gradient={gradients.warning}
                badge={stats?.expiringPolicies > 0 ? '!' : null}
                subtitle="خلال 30 يوم"
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Company Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  <CompanyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  توزيع شركات التأمين
                </Typography>
                {stats?.byCompany?.length > 0 ? (
                  <List dense>
                    {stats.byCompany.map((item, idx) => (
                      <ListItem key={item.company} divider={idx < stats.byCompany.length - 1}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: chartColors[idx % chartColors.length], width: 36, height: 36 }}>
                            {item.companyInfo?.nameAr?.charAt(0) || '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={item.companyInfo?.nameAr || item.company}
                          secondary={`${item.count} موظف — ${formatCurrency(item.totalPremium)}`}
                        />
                        <ListItemSecondaryAction>
                          <Chip label={item.count} size="small" color="primary" />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={3}>
                    لا توجد بيانات بعد
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Coverage Class Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  <VipIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  فئات التغطية
                </Typography>
                {stats?.byClass?.length > 0 ? (
                  <Box>
                    {stats.byClass.map((item) => {
                      const cls = CLASS_CONFIG[item._id] || {};
                      return (
                        <Box key={item._id} display="flex" alignItems="center" mb={1.5}>
                          <Chip
                            label={cls.label || item._id}
                            size="small"
                            sx={{ bgcolor: cls.bgColor, color: cls.color, fontWeight: 'bold', minWidth: 80, mr: 2 }}
                          />
                          <Box flex={1} mr={2}>
                            <LinearProgress
                              variant="determinate"
                              value={stats.activePolicies ? (item.count / stats.activePolicies) * 100 : 0}
                              sx={{
                                height: 10,
                                borderRadius: 5,
                                bgcolor: '#f0f0f0',
                                '& .MuiLinearProgress-bar': { bgcolor: cls.color, borderRadius: 5 },
                              }}
                            />
                          </Box>
                          <Typography fontWeight={700} minWidth={40} textAlign="center">
                            {item.count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={3}>
                    لا توجد بيانات بعد
                  </Typography>
                )}
              </Paper>

              {/* Financial Summary */}
              <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  الملخص المالي
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { label: 'حصة صاحب العمل', value: formatCurrency(stats?.financials?.totalEmployerShare), color: statusColors.success },
                    { label: 'حصة الموظفين', value: formatCurrency(stats?.financials?.totalEmployeeShare), color: statusColors.warning },
                    { label: 'ضريبة القيمة المضافة (15%)', value: formatCurrency(stats?.financials?.totalVAT), color: statusColors.error },
                  ].map((item) => (
                    <Grid item xs={12} key={item.label}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                        <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                        <Typography fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                      </Box>
                      <Divider />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Expiring Policies Alert */}
            {expiringPolicies.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning" icon={<WarningIcon />}>
                  <Typography fontWeight={700} mb={1}>
                    تنبيه: {expiringPolicies.length} وثيقة تأمين تنتهي خلال 30 يوم
                  </Typography>
                  {expiringPolicies.slice(0, 5).map((p) => (
                    <Typography key={p._id} variant="body2">
                      • {p.employeeName} — {p.policyNumber} — تنتهي في{' '}
                      {new Date(p.endDate).toLocaleDateString('ar-SA')}
                    </Typography>
                  ))}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: وثائق التأمين (Policies Table)                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <Paper sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          {/* Filters */}
          <Box p={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="بحث بالاسم أو رقم الوثيقة..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPagination((p) => ({ ...p, page: 0 })); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ minWidth: 260 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الحالة</InputLabel>
              <Select value={filterStatus} label="الحالة" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>شركة التأمين</InputLabel>
              <Select value={filterCompany} label="شركة التأمين" onChange={(e) => setFilterCompany(e.target.value)}>
                <MenuItem value="">الكل</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.nameAr}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>الفئة</InputLabel>
              <Select value={filterClass} label="الفئة" onChange={(e) => setFilterClass(e.target.value)}>
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(CLASS_CONFIG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading && <LinearProgress />}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>الموظف</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>رقم الوثيقة</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>شركة التأمين</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>تاريخ الانتهاء</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>المعالون</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>القسط السنوي</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }} align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد وثائق تأمين</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((p) => {
                    const comp = companyMap[p.insuranceCompany];
                    const cls = CLASS_CONFIG[p.coverageClass] || {};
                    const sts = STATUS_CONFIG[p.status] || {};
                    const depCount = p.dependents?.filter((d) => d.status === 'active').length || 0;
                    return (
                      <TableRow key={p._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{p.employeeName}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.employeeId} — {p.department}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">{p.policyNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{comp?.nameAr || p.insuranceCompanyNameAr || p.insuranceCompany}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={cls.label || p.coverageClass} size="small" sx={{ bgcolor: cls.bgColor, color: cls.color, fontWeight: 'bold' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.endDate ? new Date(p.endDate).toLocaleDateString('ar-SA') : '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip icon={<FamilyIcon />} label={depCount} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{formatCurrency(p.premium?.totalAnnualPremium)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip icon={sts.icon} label={sts.label || p.status} size="small" color={sts.color || 'default'} />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5} justifyContent="center">
                            <Tooltip title="عرض"><IconButton size="small" onClick={() => openDetail(p)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEditPolicy(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="تجديد">
                              <IconButton size="small" color="info" onClick={() => { setSelectedPolicy(p); setRenewDialog(true); }}>
                                <RenewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="إلغاء"><IconButton size="small" color="error" onClick={() => handleDeletePolicy(p._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page}
            onPageChange={(_, p) => setPagination((prev) => ({ ...prev, page: p }))}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={(e) => setPagination({ page: 0, limit: parseInt(e.target.value, 10), total: pagination.total })}
            labelRowsPerPage="عدد الصفوف:"
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: المطالبات الطبية (Claims)                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <Paper sx={{ borderRadius: '20px', p: 2.5, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            <ClaimIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            المطالبات الطبية
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            اختر وثيقة تأمين من تبويب &quot;وثائق التأمين&quot; ثم اضغط &quot;عرض&quot; لإدارة مطالباتها، أو استعرض جميع المطالبات أدناه
          </Typography>

          {/* Claims summary from stats */}
          {stats?.claimStats?.length > 0 ? (
            <Grid container spacing={2} mb={3}>
              {stats.claimStats.map((cs) => {
                const csConfig = CLAIM_STATUS_CONFIG[cs._id] || {};
                return (
                  <Grid item xs={6} sm={4} md={3} key={cs._id}>
                    <Card variant="outlined" sx={{ borderRadius: '16px', transition: 'all 0.3s cubic-bezier(.4,0,.2,1)', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' } }}>
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Chip label={csConfig.label || cs._id} color={csConfig.color || 'default'} size="small" sx={{ mb: 1 }} />
                        <Typography variant="h5" fontWeight={700}>{cs.count}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(cs.totalClaimed)} مطالبة
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>لا توجد مطالبات مسجلة بعد</Alert>
          )}

          {/* Per policy claims */}
          {policies.filter((p) => p.claims?.length > 0).length > 0 ? (
            policies
              .filter((p) => p.claims?.length > 0)
              .map((p) => (
                <Accordion key={p._id} sx={{ mb: 1, borderRadius: '10px', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <MedicalIcon color="primary" />
                      <Box flex={1}>
                        <Typography fontWeight={700}>{p.employeeName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.policyNumber} — {p.claims.length} مطالبة
                        </Typography>
                      </Box>
                      <Chip label={`${p.claims.length} مطالبة`} size="small" color="primary" variant="outlined" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>رقم المطالبة</TableCell>
                          <TableCell>النوع</TableCell>
                          <TableCell>المبلغ المطالب</TableCell>
                          <TableCell>المبلغ المعتمد</TableCell>
                          <TableCell>الحالة</TableCell>
                          <TableCell>التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {p.claims.map((c) => {
                          const csConfig = CLAIM_STATUS_CONFIG[c.status] || {};
                          return (
                            <TableRow key={c._id}>
                              <TableCell><Typography variant="body2" fontFamily="monospace">{c.claimNumber}</Typography></TableCell>
                              <TableCell>{CLAIM_TYPES.find((t) => t.value === c.claimType)?.label || c.claimType}</TableCell>
                              <TableCell>{formatCurrency(c.amounts?.claimed)}</TableCell>
                              <TableCell>{formatCurrency(c.amounts?.approved)}</TableCell>
                              <TableCell><Chip label={csConfig.label || c.status} size="small" color={csConfig.color || 'default'} /></TableCell>
                              <TableCell>{c.submittedDate ? new Date(c.submittedDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              ))
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              لا توجد مطالبات مسجلة في الوثائق الحالية
            </Typography>
          )}
        </Paper>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: التقارير (Reports)                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 3 && (
        <Box>
          <Grid container spacing={3}>
            {/* Financial Overview */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  نظرة مالية عامة
                </Typography>
                {reportData?.financials ? (
                  <List dense>
                    {[
                      { label: 'إجمالي الأقساط السنوية', value: formatCurrency(reportData.financials.totalAnnualPremium) },
                      { label: 'حصة صاحب العمل', value: formatCurrency(reportData.financials.totalEmployerShare) },
                      { label: 'حصة الموظفين', value: formatCurrency(reportData.financials.totalEmployeeShare) },
                      { label: 'ضريبة القيمة المضافة', value: formatCurrency(reportData.financials.totalVAT) },
                      { label: 'متوسط القسط السنوي', value: formatCurrency(reportData.financials.avgPremium) },
                      { label: 'إجمالي الأعضاء', value: reportData.financials.totalMembers },
                    ].map((item) => (
                      <ListItem key={item.label} divider>
                        <ListItemText primary={item.label} />
                        <Typography fontWeight={700}>{item.value}</Typography>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={3}><CircularProgress size={32} /></Box>
                )}
              </Paper>
            </Grid>

            {/* Claims by Type */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  <HospitalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  المطالبات حسب النوع
                </Typography>
                {reportData?.claimsByType?.length > 0 ? (
                  <List dense>
                    {reportData.claimsByType.map((ct) => (
                      <ListItem key={ct._id} divider>
                        <ListItemText
                          primary={CLAIM_TYPES.find((t) => t.value === ct._id)?.label || ct._id}
                          secondary={`${ct.count} مطالبة`}
                        />
                        <Box textAlign="right">
                          <Typography variant="body2" fontWeight={700}>{formatCurrency(ct.totalClaimed)}</Typography>
                          <Typography variant="caption" color="success.main">
                            معتمد: {formatCurrency(ct.totalApproved)}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={3}>لا توجد بيانات</Typography>
                )}
              </Paper>
            </Grid>

            {/* Department Breakdown */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  التوزيع حسب الأقسام
                </Typography>
                {reportData?.byDepartment?.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>القسم</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>عدد الموظفين المؤمنين</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>إجمالي الأقساط</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>متوسط القسط</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.byDepartment.map((dept) => (
                          <TableRow key={dept._id} hover>
                            <TableCell>{dept._id || 'غير محدد'}</TableCell>
                            <TableCell>{dept.count}</TableCell>
                            <TableCell>{formatCurrency(dept.totalPremium)}</TableCell>
                            <TableCell>{formatCurrency(dept.count ? dept.totalPremium / dept.count : 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={3}>لا توجد بيانات</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* ── Policy Create/Edit Dialog ──────────────────────────────────── */}
      <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>{selectedPolicy ? 'تعديل وثيقة التأمين' : 'إنشاء وثيقة تأمين جديدة'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="رقم الموظف" size="small" value={policyForm.employeeId || ''} onChange={(e) => setPolicyForm({ ...policyForm, employeeId: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم الموظف" size="small" value={policyForm.employeeName || ''} onChange={(e) => setPolicyForm({ ...policyForm, employeeName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="رقم الهوية" size="small" value={policyForm.nationalId || ''} onChange={(e) => setPolicyForm({ ...policyForm, nationalId: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="القسم" size="small" value={policyForm.department || ''} onChange={(e) => setPolicyForm({ ...policyForm, department: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>شركة التأمين</InputLabel>
                <Select value={policyForm.insuranceCompany || ''} label="شركة التأمين" onChange={(e) => setPolicyForm({ ...policyForm, insuranceCompany: e.target.value })}>
                  {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.nameAr} ({c.nameEn})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>فئة التغطية</InputLabel>
                <Select value={policyForm.coverageClass || 'B'} label="فئة التغطية" onChange={(e) => setPolicyForm({ ...policyForm, coverageClass: e.target.value })}>
                  {Object.entries(CLASS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="رقم الوثيقة" size="small" value={policyForm.policyNumber || ''} onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="رقم العضوية" size="small" value={policyForm.memberNumber || ''} onChange={(e) => setPolicyForm({ ...policyForm, memberNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="تاريخ البداية" size="small" type="date" InputLabelProps={{ shrink: true }} value={policyForm.startDate || ''} onChange={(e) => setPolicyForm({ ...policyForm, startDate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="تاريخ الانتهاء" size="small" type="date" InputLabelProps={{ shrink: true }} value={policyForm.endDate || ''} onChange={(e) => setPolicyForm({ ...policyForm, endDate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="القسط السنوي (ريال)" size="small" type="number" value={policyForm.premium?.employeePremium || ''} onChange={(e) => setPolicyForm({ ...policyForm, premium: { ...policyForm.premium, employeePremium: parseFloat(e.target.value) } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="نسبة تحمل صاحب العمل (%)" size="small" type="number" value={policyForm.premium?.employerSharePercent ?? 100} onChange={(e) => setPolicyForm({ ...policyForm, premium: { ...policyForm.premium, employerSharePercent: parseFloat(e.target.value) } })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={selectedPolicy ? handleUpdatePolicy : handleCreatePolicy}>
            {selectedPolicy ? 'حفظ التعديلات' : 'إنشاء الوثيقة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Policy Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <InsuranceIcon color="primary" />
            تفاصيل وثيقة التأمين — {selectedPolicy?.employeeName}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPolicy && (
            <Box>
              {/* Basic Info */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">رقم الموظف</Typography>
                  <Typography fontWeight={700}>{selectedPolicy.employeeId}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">شركة التأمين</Typography>
                  <Typography fontWeight={700}>{selectedPolicy.insuranceCompanyNameAr || selectedPolicy.insuranceCompany}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">فئة التغطية</Typography>
                  <Chip label={CLASS_CONFIG[selectedPolicy.coverageClass]?.label || selectedPolicy.coverageClass} size="small" sx={{ bgcolor: CLASS_CONFIG[selectedPolicy.coverageClass]?.bgColor, color: CLASS_CONFIG[selectedPolicy.coverageClass]?.color, fontWeight: 'bold' }} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">رقم الوثيقة</Typography>
                  <Typography fontFamily="monospace">{selectedPolicy.policyNumber}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">الصلاحية</Typography>
                  <Typography variant="body2">
                    {selectedPolicy.startDate && new Date(selectedPolicy.startDate).toLocaleDateString('ar-SA')} — {selectedPolicy.endDate && new Date(selectedPolicy.endDate).toLocaleDateString('ar-SA')}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">الحالة</Typography>
                  <Box>
                    <Chip icon={STATUS_CONFIG[selectedPolicy.status]?.icon} label={STATUS_CONFIG[selectedPolicy.status]?.label || selectedPolicy.status} size="small" color={STATUS_CONFIG[selectedPolicy.status]?.color || 'default'} />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Dependents */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  <FamilyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  المعالون ({selectedPolicy.dependents?.length || 0})
                </Typography>
                <Button size="small" startIcon={<AddDependentIcon />} onClick={() => { setDependentForm({}); setDependentDialog(true); }}>
                  إضافة تابع
                </Button>
              </Box>
              {selectedPolicy.dependents?.length > 0 ? (
                <List dense>
                  {selectedPolicy.dependents.map((dep) => (
                    <ListItem key={dep._id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: dep.status === 'active' ? 'success.main' : 'grey.400' }}>
                          {dep.name?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={dep.name}
                        secondary={`${dep.relationshipAr || dep.relationship} — ${dep.nationalId}`}
                      />
                      <Chip label={dep.status === 'active' ? 'نشط' : dep.status} size="small" color={dep.status === 'active' ? 'success' : 'default'} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" py={1}>لا يوجد معالون</Typography>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Claims list */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  <ClaimIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  المطالبات ({selectedPolicy.claims?.length || 0})
                </Typography>
                {selectedPolicy.status === 'active' && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => { setClaimForm({}); setClaimDialog(true); }}>
                    مطالبة جديدة
                  </Button>
                )}
              </Box>
              {selectedPolicy.claims?.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الرقم</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>المبلغ</TableCell>
                      <TableCell>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPolicy.claims.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell><Typography variant="body2" fontFamily="monospace">{c.claimNumber}</Typography></TableCell>
                        <TableCell>{c.claimTypeAr || CLAIM_TYPES.find((t) => t.value === c.claimType)?.label || c.claimType}</TableCell>
                        <TableCell>{formatCurrency(c.amounts?.claimed)}</TableCell>
                        <TableCell><Chip label={CLAIM_STATUS_CONFIG[c.status]?.label || c.status} size="small" color={CLAIM_STATUS_CONFIG[c.status]?.color || 'default'} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" py={1}>لا توجد مطالبات</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Dependent Dialog ───────────────────────────────────────── */}
      <Dialog open={dependentDialog} onClose={() => setDependentDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>إضافة تابع جديد</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم التابع" size="small" value={dependentForm.name || ''} onChange={(e) => setDependentForm({ ...dependentForm, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="رقم الهوية" size="small" value={dependentForm.nationalId || ''} onChange={(e) => setDependentForm({ ...dependentForm, nationalId: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>صلة القرابة</InputLabel>
                <Select value={dependentForm.relationship || ''} label="صلة القرابة" onChange={(e) => setDependentForm({ ...dependentForm, relationship: e.target.value })}>
                  {RELATIONSHIPS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="تاريخ الميلاد" size="small" type="date" InputLabelProps={{ shrink: true }} value={dependentForm.dateOfBirth || ''} onChange={(e) => setDependentForm({ ...dependentForm, dateOfBirth: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الجنس</InputLabel>
                <Select value={dependentForm.gender || ''} label="الجنس" onChange={(e) => setDependentForm({ ...dependentForm, gender: e.target.value })}>
                  <MenuItem value="male">ذكر</MenuItem>
                  <MenuItem value="female">أنثى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDependentDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddDependent}>إضافة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Submit Claim Dialog ────────────────────────────────────────── */}
      <Dialog open={claimDialog} onClose={() => setClaimDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>تقديم مطالبة طبية جديدة</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع المطالبة</InputLabel>
                <Select value={claimForm.claimType || ''} label="نوع المطالبة" onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}>
                  {CLAIM_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>مقدم المطالبة</InputLabel>
                <Select value={claimForm.claimant || 'employee'} label="مقدم المطالبة" onChange={(e) => setClaimForm({ ...claimForm, claimant: e.target.value })}>
                  <MenuItem value="employee">الموظف</MenuItem>
                  <MenuItem value="dependent">تابع</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم المستشفى/العيادة" size="small" value={claimForm.provider?.name || ''} onChange={(e) => setClaimForm({ ...claimForm, provider: { ...claimForm.provider, name: e.target.value } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="المدينة" size="small" value={claimForm.provider?.city || ''} onChange={(e) => setClaimForm({ ...claimForm, provider: { ...claimForm.provider, city: e.target.value } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="المبلغ المطالب (ريال)" size="small" type="number" value={claimForm.amounts?.claimed || ''} onChange={(e) => setClaimForm({ ...claimForm, amounts: { ...claimForm.amounts, claimed: parseFloat(e.target.value) } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="وصف التشخيص" size="small" value={claimForm.diagnosis?.description || ''} onChange={(e) => setClaimForm({ ...claimForm, diagnosis: { ...claimForm.diagnosis, description: e.target.value } })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmitClaim}>تقديم المطالبة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Renewal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={renewDialog} onClose={() => setRenewDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>
          <RenewIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          تجديد وثيقة التأمين — {selectedPolicy?.employeeName}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="تاريخ الانتهاء الجديد" size="small" type="date" InputLabelProps={{ shrink: true }} value={renewForm.newEndDate || ''} onChange={(e) => setRenewForm({ ...renewForm, newEndDate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="القسط الجديد (ريال)" size="small" type="number" value={renewForm.newPremium || ''} onChange={(e) => setRenewForm({ ...renewForm, newPremium: parseFloat(e.target.value) })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>فئة التغطية الجديدة</InputLabel>
                <Select value={renewForm.newCoverageClass || selectedPolicy?.coverageClass || 'B'} label="فئة التغطية الجديدة" onChange={(e) => setRenewForm({ ...renewForm, newCoverageClass: e.target.value })}>
                  {Object.entries(CLASS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleRenewPolicy}>تجديد</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
