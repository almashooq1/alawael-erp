/**
 * PolicyLibraryAdmin — مكتبة السياسات + سير الاعتماد + الإقرار
 * BC-08 | ISO 10002 / CBAHI | نظام إدارة الجودة والامتثال
 *
 * Endpoints:
 *   GET/POST /api/quality/policies
 *   PUT /api/quality/policies/:policyId
 *   DELETE /api/quality/policies/:policyId
 *   POST /api/quality/policies/:policyId/submit-approval
 *   POST /api/quality/policies/:policyId/approve
 *   POST /api/quality/policies/:policyId/reject
 *   POST /api/quality/policies/:policyId/send-acknowledgement
 *   GET /api/quality/policies/acknowledgements/reports
 *   GET /api/quality/policies/statistics
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Collapse,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PolicyIcon from '@mui/icons-material/Policy';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BarChartIcon from '@mui/icons-material/BarChart';

import apiClient from '../../api/apiClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'سياسات إدارية',
  'سياسات سريرية',
  'سياسات جودة',
  'سياسات موارد بشرية',
  'سياسات مالية',
  'سياسات أمن المعلومات',
  'سياسات PDPL',
  'سياسات السلامة والصحة المهنية',
];

const STATUS_LABELS = {
  draft: { label: 'مسودة', color: 'default' },
  pending_approval: { label: 'في انتظار الاعتماد', color: 'warning' },
  approved: { label: 'معتمدة', color: 'success' },
  rejected: { label: 'مرفوضة', color: 'error' },
  active: { label: 'نشطة', color: 'success' },
  archived: { label: 'مؤرشفة', color: 'default' },
};

const ACK_STATUS_LABELS = {
  not_sent: { label: 'لم يُرسل', color: 'default' },
  sent: { label: 'مرسل', color: 'info' },
  acknowledged: { label: 'مُقرّ به', color: 'success' },
  overdue: { label: 'متأخر', color: 'error' },
};

const EMPTY_FORM = {
  policyId: '',
  policyName: '',
  policyNameAr: '',
  description: '',
  descriptionAr: '',
  category: '',
  version: '1.0',
  effectiveDate: '',
  reviewDate: '',
  applicableTo: '',
};

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_POLICIES = [
  {
    _id: 'd1',
    policyId: 'POL-CLIN-001',
    policyNameAr: 'سياسة السجلات السريرية وحفظها',
    policyName: 'Clinical Records Management Policy',
    category: 'سياسات سريرية',
    version: '2.1',
    status: 'active',
    acknowledgementStatus: 'sent',
    effectiveDate: '2025-01-01',
    reviewDate: '2026-01-01',
    acknowledgedCount: 18,
    totalStaff: 24,
  },
  {
    _id: 'd2',
    policyId: 'POL-HR-002',
    policyNameAr: 'سياسة الحضور والانصراف',
    policyName: 'Attendance and Leave Policy',
    category: 'سياسات موارد بشرية',
    version: '1.3',
    status: 'approved',
    acknowledgementStatus: 'not_sent',
    effectiveDate: '2025-03-15',
    reviewDate: '2026-03-15',
    acknowledgedCount: 0,
    totalStaff: 45,
  },
  {
    _id: 'd3',
    policyId: 'POL-QUAL-003',
    policyNameAr: 'سياسة إدارة المخاطر',
    policyName: 'Risk Management Policy',
    category: 'سياسات جودة',
    version: '1.0',
    status: 'pending_approval',
    acknowledgementStatus: 'not_sent',
    effectiveDate: '',
    reviewDate: '',
    acknowledgedCount: 0,
    totalStaff: 0,
  },
];

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function StatsCard({ label, value, icon, color, sub }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.disabled">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PolicyLibraryAdmin() {
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [expandAck, setExpandAck] = useState({});

  // ── Bulk-acknowledge state ────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, statRes] = await Promise.all([
        apiClient.get('/api/quality/policies'),
        apiClient.get('/api/quality/policies/statistics').catch(() => ({ data: { data: null } })),
      ]);
      setPolicies(polRes.data?.data || polRes.data || []);
      setStats(statRes.data?.data || null);
      setDemoMode(false);
    } catch {
      setPolicies(DEMO_POLICIES);
      setStats({ total: 3, active: 1, pending: 1, acknowledgedPct: 75 });
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = policies.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    return true;
  });
  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Create / Edit ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = pol => {
    setEditTarget(pol);
    setForm({
      policyId: pol.policyId || '',
      policyName: pol.policyName || '',
      policyNameAr: pol.policyNameAr || '',
      description: pol.description || '',
      descriptionAr: pol.descriptionAr || '',
      category: pol.category || '',
      version: pol.version || '1.0',
      effectiveDate: pol.effectiveDate?.slice(0, 10) || '',
      reviewDate: pol.reviewDate?.slice(0, 10) || '',
      applicableTo: pol.applicableTo || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.policyId || !form.policyNameAr) {
      setSnack({ open: true, message: 'رقم السياسة والاسم بالعربي إلزاميان', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await apiClient.put(`/api/quality/policies/${editTarget._id}`, form);
        setSnack({ open: true, message: 'تم تحديث السياسة', severity: 'success' });
      } else {
        await apiClient.post('/api/quality/policies', form);
        setSnack({ open: true, message: 'تم إنشاء السياسة', severity: 'success' });
      }
      setFormOpen(false);
      loadData();
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || 'خطأ في الحفظ',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Approval workflow ─────────────────────────────────────────────────────
  const submitApproval = async pol => {
    try {
      await apiClient.post(`/api/quality/policies/${pol._id}/submit-approval`);
      setSnack({ open: true, message: 'تم إرسال السياسة للاعتماد', severity: 'info' });
      loadData();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'خطأ', severity: 'error' });
    }
  };

  const approvePolicy = async pol => {
    try {
      await apiClient.post(`/api/quality/policies/${pol._id}/approve`);
      setSnack({ open: true, message: 'تم اعتماد السياسة ✓', severity: 'success' });
      loadData();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'خطأ', severity: 'error' });
    }
  };

  const rejectPolicy = async () => {
    if (!rejectReason.trim()) return;
    try {
      await apiClient.post(`/api/quality/policies/${rejectTarget._id}/reject`, {
        reason: rejectReason,
      });
      setSnack({ open: true, message: 'تم رفض السياسة', severity: 'warning' });
      setRejectTarget(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'خطأ', severity: 'error' });
    }
  };

  // ── Acknowledgement ───────────────────────────────────────────────────────
  const sendAck = async pol => {
    try {
      await apiClient.post(`/api/quality/policies/${pol._id}/send-acknowledgement`);
      setSnack({ open: true, message: 'تم إرسال طلبات الإقرار للموظفين', severity: 'success' });
      loadData();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'خطأ', severity: 'error' });
    }
  };

  // ── Bulk send-acknowledgement ─────────────────────────────────────────────
  const bulkSendAck = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkSending(true);
    let ok = 0;
    let fail = 0;
    for (const id of selected) {
      try {
        await apiClient.post(`/api/quality/policies/${id}/send-acknowledgement`);
        ok++;
      } catch {
        fail++;
      }
    }
    setSelected(new Set());
    setBulkSending(false);
    setSnack({
      open: true,
      message: `أُرسل الإقرار لـ ${ok} سياسة${fail > 0 ? ` · فشل ${fail}` : ''}`,
      severity: fail > 0 ? 'warning' : 'success',
    });
    loadData();
  }, [selected, loadData]);

  // Policies eligible for bulk ack (approved/active, not yet sent)
  const bulkEligible = useMemo(
    () =>
      filtered
        .filter(
          p =>
            (p.status === 'approved' || p.status === 'active') &&
            p.acknowledgementStatus !== 'sent' &&
            p.acknowledgementStatus !== 'acknowledged'
        )
        .map(p => p._id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtered changes when policies/filters change
    [policies, filterStatus, filterCat]
  );

  const allBulkSelected = bulkEligible.length > 0 && bulkEligible.every(id => selected.has(id));

  const toggleSelectAll = () => {
    if (allBulkSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        bulkEligible.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...bulkEligible]));
    }
  };

  const toggleOne = id => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/quality/policies/${deleteTarget._id}`);
      setSnack({ open: true, message: 'تم حذف السياسة', severity: 'success' });
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'خطأ', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
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
          <PolicyIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              مكتبة السياسات والإجراءات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إدارة دورة حياة السياسات — ISO 10002 / CBAHI Standard 4
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          سياسة جديدة
        </Button>
      </Box>

      {demoMode && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          عرض بيانات تجريبية — الخادم غير متاح حالياً
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              label="إجمالي السياسات"
              value={stats.total ?? policies.length}
              icon={<PolicyIcon sx={{ color: '#fff' }} />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              label="سياسات نشطة"
              value={stats.active ?? policies.filter(p => p.status === 'active').length}
              icon={<CheckCircleIcon sx={{ color: '#fff' }} />}
              color="#2e7d32"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              label="في انتظار الاعتماد"
              value={stats.pending ?? policies.filter(p => p.status === 'pending_approval').length}
              icon={<PendingActionsIcon sx={{ color: '#fff' }} />}
              color="#ed6c02"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              label="نسبة الإقرار"
              value={`${stats.acknowledgedPct ?? 0}%`}
              icon={<AssignmentTurnedInIcon sx={{ color: '#fff' }} />}
              color="#7b1fa2"
              sub="من إجمالي الموظفين المستهدفين"
            />
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filterStatus}
            label="الحالة"
            onChange={e => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>الفئة</InputLabel>
          <Select value={filterCat} label="الفئة" onChange={e => setFilterCat(e.target.value)}>
            <MenuItem value="all">الكل</MenuItem>
            {CATEGORIES.map(c => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          <BarChartIcon color="action" />
          <Typography variant="body2" color="text.secondary">
            {filtered.length} سياسة
          </Typography>
        </Box>
      </Paper>

      {/* Bulk-action toolbar */}
      {selected.size > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
            {selected.size} سياسة محددة
          </Typography>
          {bulkSending && (
            <LinearProgress
              sx={{ width: 120, borderRadius: 2 }}
              aria-label="جارٍ إرسال السياسات بالجملة"
            />
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<AssignmentTurnedInIcon />}
            onClick={bulkSendAck}
            disabled={bulkSending}
          >
            إرسال إقرار جماعي
          </Button>
          <Button size="small" onClick={() => setSelected(new Set())}>
            إلغاء
          </Button>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Tooltip title="تحديد كل السياسات المؤهلة للإقرار">
                  <Checkbox
                    checked={allBulkSelected}
                    indeterminate={selected.size > 0 && !allBulkSelected}
                    onChange={toggleSelectAll}
                    disabled={bulkEligible.length === 0}
                    size="small"
                  />
                </Tooltip>
              </TableCell>
              <TableCell>رقم السياسة</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الإصدار</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإقرار</TableCell>
              <TableCell>تاريخ المراجعة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  لا توجد سياسات
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map(pol => {
                const st = STATUS_LABELS[pol.status] || { label: pol.status, color: 'default' };
                const ack = ACK_STATUS_LABELS[pol.acknowledgementStatus] || {
                  label: '-',
                  color: 'default',
                };
                const ackPct =
                  pol.totalStaff > 0
                    ? Math.round((pol.acknowledgedCount / pol.totalStaff) * 100)
                    : null;
                const isBulkEligible = bulkEligible.includes(pol._id);
                return (
                  <TableRow key={pol._id} hover selected={selected.has(pol._id)}>
                    <TableCell padding="checkbox">
                      {isBulkEligible && (
                        <Checkbox
                          checked={selected.has(pol._id)}
                          onChange={() => toggleOne(pol._id)}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {pol.policyId}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {pol.policyNameAr}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pol.policyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={pol.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>v{pol.version}</TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={ack.label} color={ack.color} size="small" />
                        {ackPct !== null && (
                          <Typography variant="caption" color="text.secondary">
                            {ackPct}%
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{pol.reviewDate ? pol.reviewDate.slice(0, 10) : '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(pol)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {pol.status === 'draft' && (
                          <Tooltip title="إرسال للاعتماد">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => submitApproval(pol)}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {pol.status === 'pending_approval' && (
                          <>
                            <Tooltip title="اعتماد">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => approvePolicy(pol)}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setRejectTarget(pol);
                                  setRejectReason('');
                                }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {(pol.status === 'approved' || pol.status === 'active') &&
                          pol.acknowledgementStatus !== 'sent' &&
                          pol.acknowledgementStatus !== 'acknowledged' && (
                            <Tooltip title="إرسال طلب الإقرار">
                              <IconButton size="small" color="primary" onClick={() => sendAck(pol)}>
                                <AssignmentTurnedInIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(pol)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {ackPct !== null && (
                          <Tooltip title="تفاصيل الإقرار">
                            <IconButton
                              size="small"
                              onClick={() => setExpandAck(p => ({ ...p, [pol._id]: !p[pol._id] }))}
                            >
                              <ExpandMoreIcon
                                fontSize="small"
                                sx={{
                                  transform: expandAck[pol._id] ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.2s',
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Collapse in={!!expandAck[pol._id]}>
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption">
                            أقرّ {pol.acknowledgedCount} من {pol.totalStaff} موظف ({ackPct}%)
                          </Typography>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editTarget ? 'تعديل السياسة' : 'إنشاء سياسة جديدة'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="رقم السياسة *"
                fullWidth
                size="small"
                value={form.policyId}
                onChange={e => setForm(f => ({ ...f, policyId: e.target.value }))}
                placeholder="مثال: POL-CLIN-001"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="الإصدار"
                fullWidth
                size="small"
                value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الفئة *</InputLabel>
                <Select
                  value={form.category}
                  label="الفئة *"
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الاسم بالعربي *"
                fullWidth
                size="small"
                value={form.policyNameAr}
                onChange={e => setForm(f => ({ ...f, policyNameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الاسم بالإنجليزي"
                fullWidth
                size="small"
                value={form.policyName}
                onChange={e => setForm(f => ({ ...f, policyName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="الوصف بالعربي"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={form.descriptionAr}
                onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description (EN)"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="تاريخ النفاذ"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.effectiveDate}
                onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="تاريخ المراجعة"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.reviewDate}
                onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="تنطبق على"
                fullWidth
                size="small"
                value={form.applicableTo}
                onChange={e => setForm(f => ({ ...f, applicableTo: e.target.value }))}
                placeholder="مثال: كل الموظفين"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : editTarget ? 'حفظ التعديلات' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>رفض السياسة</DialogTitle>
        <DialogContent>
          <TextField
            label="سبب الرفض *"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            onClick={rejectPolicy}
            disabled={!rejectReason.trim()}
          >
            رفض
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل تريد حذف السياسة <strong>{deleteTarget?.policyNameAr}</strong>؟ لا يمكن التراجع.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
