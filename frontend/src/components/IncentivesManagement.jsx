/**
 * Incentives Management — إدارة الحوافز والمزايا
 * Modern MUI rewrite with demo data fallback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import apiClient from 'services/api.client';
import { formatCurrency } from 'utils/formatters';
import { useSnackbar } from 'contexts/SnackbarContext';
import { DEPT_COLORS } from '../constants/departmentColors';
import { statusColors, neutralColors, surfaceColors, gradients, leaveColors, chartColors } from 'theme/palette';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StarIcon from '@mui/icons-material/Star';
import GroupsIcon from '@mui/icons-material/Groups';
import MoneyIcon from '@mui/icons-material/Money';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { TrendIcon } from 'utils/iconAliases';

/* ─── Constants ─── */

const INCENTIVE_TYPES = {
  performance: { label: 'حافز الأداء', icon: <TrendIcon fontSize="small" />, color: statusColors.success },
  attendance: { label: 'حافز الحضور', icon: <AssessmentIcon fontSize="small" />, color: statusColors.info },
  safety: { label: 'حافز السلامة', icon: <StarIcon fontSize="small" />, color: statusColors.warning },
  loyalty: { label: 'حافز الولاء', icon: <TrophyIcon fontSize="small" />, color: statusColors.purple },
  project: { label: 'حافز المشروع', icon: <GroupsIcon fontSize="small" />, color: leaveColors.study },
  seasonal: { label: 'حافز موسمي', icon: <GiftIcon fontSize="small" />, color: leaveColors.maternity },
  recognition: { label: 'حافز التقدير', icon: <StarIcon fontSize="small" />, color: chartColors.category[7] },
  promotion: { label: 'حافز ترقية', icon: <TrendIcon fontSize="small" />, color: statusColors.indigo },
  special: { label: 'حافز خاص', icon: <MoneyIcon fontSize="small" />, color: neutralColors.fallback },
};

const STATUS_CONFIG = {
  draft: { label: 'مسودة', color: 'default' },
  pending: { label: 'قيد الموافقة', color: 'warning' },
  approved: { label: 'معتمد', color: 'success' },
  paid: { label: 'مدفوع', color: 'info' },
  rejected: { label: 'مرفوض', color: 'error' },
};

/* ─── Demo Data ─── */
const DEMO_INCENTIVES = [
  { _id: 'i1', employeeId: 'EMP-2501', employeeName: 'أحمد محمد العتيبي', department: 'تقنية المعلومات', incentiveType: 'performance', amount: 3000, month: '2026-02', year: 2026, reason: 'تميز في إنجاز مشروع النظام الجديد', status: 'approved', createdAt: '2026-02-15' },
  { _id: 'i2', employeeId: 'EMP-2502', employeeName: 'سارة أحمد الغامدي', department: 'الموارد البشرية', incentiveType: 'attendance', amount: 1500, month: '2026-02', year: 2026, reason: 'حضور كامل خلال الربع الأول', status: 'paid', createdAt: '2026-02-20', transactionRef: 'TXN-20260220-001' },
  { _id: 'i3', employeeId: 'EMP-2503', employeeName: 'خالد العلي الشهري', department: 'المالية', incentiveType: 'project', amount: 2500, month: '2026-03', year: 2026, reason: 'إنجاز مشروع التدقيق السنوي', status: 'pending', createdAt: '2026-03-01' },
  { _id: 'i4', employeeId: 'EMP-2504', employeeName: 'نورة السالم المطيري', department: 'التعليم', incentiveType: 'recognition', amount: 1000, month: '2026-01', year: 2026, reason: 'تقدير خاص من الإدارة', status: 'paid', createdAt: '2026-01-15', transactionRef: 'TXN-20260115-001' },
  { _id: 'i5', employeeId: 'EMP-2505', employeeName: 'فهد الحربي', department: 'العمليات', incentiveType: 'safety', amount: 2000, month: '2026-02', year: 2026, reason: 'التزام بمعايير السلامة طوال الفترة', status: 'approved', createdAt: '2026-02-28' },
  { _id: 'i6', employeeId: 'EMP-2506', employeeName: 'منى القحطاني', department: 'الإدارة', incentiveType: 'loyalty', amount: 5000, month: '2026-03', year: 2026, reason: 'إكمال 5 سنوات خدمة', status: 'pending', createdAt: '2026-03-05' },
  { _id: 'i7', employeeId: 'EMP-2507', employeeName: 'عبدالله الزهراني', department: 'التأهيل', incentiveType: 'seasonal', amount: 1200, month: '2026-03', year: 2026, reason: 'مكافأة شهر رمضان', status: 'draft', createdAt: '2026-03-08' },
  { _id: 'i8', employeeId: 'EMP-2508', employeeName: 'هند الشمري', department: 'خدمة العملاء', incentiveType: 'performance', amount: 1800, month: '2026-02', year: 2026, reason: 'أعلى تقييم رضا عملاء', status: 'approved', createdAt: '2026-02-25' },
];

const INITIAL_FORM = {
  employeeId: '', incentiveType: 'performance',
  month: new Date().toISOString().slice(0, 7), year: new Date().getFullYear(),
  amount: '', reason: '',
};

const IncentivesManagement = () => {
  const showSnackbar = useSnackbar();
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, id: null, title: '' });
  const [refDialog, setRefDialog] = useState({ open: false, id: null });
  const [transactionRef, setTransactionRef] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);

  /* ─── Data Loading ─── */
  const loadIncentives = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter !== 'all' ? `/compensation/incentives?status=${filter}` : '/compensation/incentives';
      const data = await apiClient.get(url);
      setIncentives(data?.data || data || []);
    } catch {
      setIncentives(DEMO_INCENTIVES);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadIncentives(); }, [loadIncentives]);

  /* ─── Computed ─── */
  const filtered = useMemo(() => {
    let list = filter === 'all' ? incentives : incentives.filter(i => i.status === filter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        i.employeeName?.toLowerCase().includes(s) ||
        i.employeeId?.toLowerCase().includes(s) ||
        i.reason?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [incentives, filter, search]);

  const stats = useMemo(() => {
    const total = incentives.reduce((s, i) => s + (i.amount || 0), 0);
    const approved = incentives.filter(i => i.status === 'approved').reduce((s, i) => s + i.amount, 0);
    const pending = incentives.filter(i => i.status === 'pending').length;
    const paid = incentives.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    return { total, approved, pending, paid, count: incentives.length };
  }, [incentives]);

  /* ─── Handlers ─── */
  const handleSubmit = useCallback(async () => {
    if (!formData.employeeId || !formData.amount) {
      showSnackbar('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/compensation/incentives', formData);
      showSnackbar('تم إنشاء الحافز بنجاح', 'success');
    } catch {
      // Demo mode — add locally
      const newInc = {
        _id: `i-${Date.now()}`, ...formData,
        employeeName: formData.employeeId, status: 'draft',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setIncentives(prev => [newInc, ...prev]);
      showSnackbar('تم إنشاء الحافز (وضع تجريبي)', 'success');
    }
    setFormData(INITIAL_FORM);
    setFormOpen(false);
    setLoading(false);
    loadIncentives();
  }, [formData, showSnackbar, loadIncentives]);

  const handleApprove = useCallback(async (id) => {
    try {
      await apiClient.put(`/compensation/incentives/${id}/approve`, {});
      showSnackbar('تمت الموافقة على الحافز', 'success');
    } catch {
      setIncentives(prev => prev.map(i => i._id === id ? { ...i, status: 'approved' } : i));
      showSnackbar('تمت الموافقة (وضع تجريبي)', 'success');
    }
    loadIncentives();
  }, [showSnackbar, loadIncentives]);

  const handleReject = useCallback(async (id) => {
    try {
      await apiClient.put(`/compensation/incentives/${id}/reject`, {});
      showSnackbar('تم رفض الحافز', 'info');
    } catch {
      setIncentives(prev => prev.map(i => i._id === id ? { ...i, status: 'rejected' } : i));
      showSnackbar('تم الرفض (وضع تجريبي)', 'info');
    }
    loadIncentives();
  }, [showSnackbar, loadIncentives]);

  const handleMarkPaid = useCallback(async () => {
    if (!transactionRef) { showSnackbar('يرجى إدخال رقم المرجع', 'warning'); return; }
    const id = refDialog.id;
    try {
      await apiClient.put(`/compensation/incentives/${id}/mark-paid`, { transactionRef });
      showSnackbar('تم تحديد الحافز كمدفوع', 'success');
    } catch {
      setIncentives(prev => prev.map(i => i._id === id ? { ...i, status: 'paid', transactionRef } : i));
      showSnackbar('تم التحديث (وضع تجريبي)', 'success');
    }
    setRefDialog({ open: false, id: null });
    setTransactionRef('');
    loadIncentives();
  }, [transactionRef, refDialog.id, showSnackbar, loadIncentives]);

  const handleDelete = useCallback(async (id) => {
    try {
      await apiClient.delete(`/compensation/incentives/${id}`);
      showSnackbar('تم حذف الحافز', 'success');
    } catch {
      setIncentives(prev => prev.filter(i => i._id !== id));
      showSnackbar('تم الحذف (وضع تجريبي)', 'success');
    }
    setConfirmDialog({ open: false, action: null, id: null, title: '' });
    loadIncentives();
  }, [showSnackbar, loadIncentives]);

  const handleExportCSV = useCallback(() => {
    const headers = ['الموظف', 'القسم', 'النوع', 'المبلغ', 'الحالة', 'السبب', 'التاريخ'];
    const rows = filtered.map(i => [
      i.employeeName, i.department,
      INCENTIVE_TYPES[i.incentiveType]?.label || i.incentiveType,
      i.amount, STATUS_CONFIG[i.status]?.label || i.status,
      i.reason, i.createdAt,
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'incentives-export.csv'; a.click();
    URL.revokeObjectURL(url);
    showSnackbar('تم التصدير بنجاح', 'success');
  }, [filtered, showSnackbar]);

  /* ─── Filter Tabs ─── */
  const FILTER_TABS = [
    { value: 'all', label: `الكل (${incentives.length})` },
    { value: 'pending', label: `قيد الموافقة (${incentives.filter(i => i.status === 'pending').length})` },
    { value: 'approved', label: `معتمد (${incentives.filter(i => i.status === 'approved').length})` },
    { value: 'paid', label: `مدفوع (${incentives.filter(i => i.status === 'paid').length})` },
    { value: 'draft', label: `مسودة (${incentives.filter(i => i.status === 'draft').length})` },
  ];

  /* ─── Render ─── */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 3, borderRadius: 3,
        background: gradients.orangeStatus,
        color: 'white',
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <TrophyIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>إدارة الحوافز والمزايا</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة ومتابعة حوافز الموظفين • {incentives.length} حافز
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="تحديث"><IconButton sx={{ color: 'white' }} onClick={loadIncentives}><RefreshIcon /></IconButton></Tooltip>
            <Tooltip title="تصدير CSV"><IconButton sx={{ color: 'white' }} onClick={handleExportCSV}><DownloadIcon /></IconButton></Tooltip>
            <Tooltip title="طباعة"><IconButton sx={{ color: 'white' }} onClick={() => window.print()}><PrintIcon /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
              حافز جديد
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الحوافز', value: formatCurrency(stats.total), icon: <MoneyIcon />, color: statusColors.warning },
          { label: 'المعتمد', value: formatCurrency(stats.approved), icon: <ApproveIcon />, color: statusColors.success },
          { label: 'المدفوع', value: formatCurrency(stats.paid), icon: <PaidIcon />, color: statusColors.info },
          { label: 'قيد الموافقة', value: stats.pending, icon: <AssessmentIcon />, color: chartColors.category[7] },
        ].map((s, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 48, height: 48 }}>
                  {s.icon}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h6" fontWeight={700}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Tabs + Search */}
      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={filter} onChange={(_, v) => { setFilter(v); setPage(0); }}
            variant="scrollable" scrollButtons="auto">
            {FILTER_TABS.map(t => (
              <Tab key={t.value} value={t.value} label={t.label}
                sx={{ fontWeight: 600, minHeight: 52 }} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" placeholder="بحث بالاسم أو السبب..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <Typography variant="body2" color="text.secondary">
            {filtered.length} نتيجة
          </Typography>
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
                <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المبلغ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفترة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>السبب</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <TrophyIcon sx={{ fontSize: 48, color: neutralColors.placeholder, mb: 1 }} />
                    <Typography color="text.secondary">لا توجد حوافز</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(inc => {
                const typeInfo = INCENTIVE_TYPES[inc.incentiveType] || { label: inc.incentiveType, color: neutralColors.textMuted };
                const statusInfo = STATUS_CONFIG[inc.status] || { label: inc.status, color: 'default' };
                const deptColor = DEPT_COLORS[inc.department] || neutralColors.textSecondary;
                return (
                  <TableRow key={inc._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: deptColor, width: 32, height: 32, fontSize: 14 }}>
                          {inc.employeeName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{inc.employeeName}</Typography>
                          <Typography variant="caption" color="text.secondary">{inc.employeeId}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={inc.department} size="small"
                        sx={{ bgcolor: `${deptColor}15`, color: deptColor, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Chip icon={typeInfo.icon} label={typeInfo.label} size="small" variant="outlined"
                        sx={{ borderColor: typeInfo.color, color: typeInfo.color }} />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} color="primary">
                        {formatCurrency(inc.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{inc.month}/{inc.year}</TableCell>
                    <TableCell>
                      <Chip label={statusInfo.label} size="small" color={statusInfo.color} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={inc.reason || ''}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                          {inc.reason}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={0.5}>
                        {inc.status === 'pending' && (
                          <>
                            <Tooltip title="موافقة">
                              <IconButton size="small" color="success"
                                onClick={() => setConfirmDialog({ open: true, action: 'approve', id: inc._id, title: 'هل تريد الموافقة على هذا الحافز؟' })}>
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton size="small" color="error"
                                onClick={() => setConfirmDialog({ open: true, action: 'reject', id: inc._id, title: 'هل تريد رفض هذا الحافز؟' })}>
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {inc.status === 'approved' && (
                          <Tooltip title="تحديد كمدفوع">
                            <IconButton size="small" color="info"
                              onClick={() => setRefDialog({ open: true, id: inc._id })}>
                              <PaidIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(inc.status === 'draft' || inc.status === 'pending') && (
                          <Tooltip title="حذف">
                            <IconButton size="small" color="error"
                              onClick={() => setConfirmDialog({ open: true, action: 'delete', id: inc._id, title: 'هل تريد حذف هذا الحافز؟' })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          labelRowsPerPage="صفوف لكل صفحة:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </Paper>

      {/* ─── New Incentive Dialog ─── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <TrophyIcon color="warning" /> إضافة حافز جديد
          </Box>
          <IconButton onClick={() => setFormOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="معرف الموظف" value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="مثال: EMP-2501" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="نوع الحافز" value={formData.incentiveType}
                onChange={e => setFormData({ ...formData, incentiveType: e.target.value })}>
                {Object.entries(INCENTIVE_TYPES).map(([key, t]) => (
                  <MenuItem key={key} value={key}>{t.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="المبلغ (ريال)" type="number" value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: +e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">SAR</InputAdornment> }} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="الشهر" type="month" value={formData.month}
                onChange={e => setFormData({ ...formData, month: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="السنة" type="number" value={formData.year}
                onChange={e => setFormData({ ...formData, year: +e.target.value })}
                inputProps={{ min: 2020, max: new Date().getFullYear() + 1 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="السبب والوصف" multiline rows={3} value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                placeholder="أدخل سبب الحافز" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleSubmit}
            disabled={loading} startIcon={loading ? <CircularProgress size={18} /> : <AddIcon />}>
            حفظ الحافز
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Confirm Dialog ─── */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, id: null, title: '' })}
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, id: null, title: '' })}>إلغاء</Button>
          <Button variant="contained"
            color={confirmDialog.action === 'approve' ? 'success' : 'error'}
            onClick={() => {
              if (confirmDialog.action === 'approve') handleApprove(confirmDialog.id);
              else if (confirmDialog.action === 'reject') handleReject(confirmDialog.id);
              else if (confirmDialog.action === 'delete') handleDelete(confirmDialog.id);
            }}>
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Transaction Ref Dialog ─── */}
      <Dialog open={refDialog.open} onClose={() => { setRefDialog({ open: false, id: null }); setTransactionRef(''); }}
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>تحديد كمدفوع</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="رقم مرجع العملية" value={transactionRef}
            onChange={e => setTransactionRef(e.target.value)}
            placeholder="مثال: TXN-20260301-001" sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setRefDialog({ open: false, id: null }); setTransactionRef(''); }}>إلغاء</Button>
          <Button variant="contained" color="info" onClick={handleMarkPaid} disabled={!transactionRef}>
            تأكيد الدفع
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IncentivesManagement;
