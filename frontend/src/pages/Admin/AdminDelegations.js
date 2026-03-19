import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import administrationService from '../../services/administration.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Autocomplete,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search,
  Refresh,
  SwapHoriz,
  MoreVert,
  Visibility,
  CheckCircle,
  PauseCircle,
  Block,
  Update,
  PlayArrow,
  ArrowBack,
  Person,
  CalendarMonth,
  WarningAmber,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const statusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'warning' },
  active: { label: 'نشط', color: 'success' },
  suspended: { label: 'معلّق', color: 'info' },
  expired: { label: 'منتهي', color: 'default' },
  revoked: { label: 'ملغي', color: 'error' },
  completed: { label: 'مكتمل', color: 'success' },
};

const typeLabels = {
  full: 'كامل',
  partial: 'جزئي',
  temporary: 'مؤقت',
  emergency: 'طوارئ',
  financial: 'مالي',
  signature: 'توقيع',
  operational: 'تشغيلي',
};

const tabStatuses = [
  { value: '', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'active', label: 'نشط' },
  { value: 'suspended', label: 'معلّق' },
  { value: 'expired', label: 'منتهي' },
  { value: 'revoked', label: 'ملغي' },
];

const departmentOptions = [
  'الإدارة العامة',
  'الموارد البشرية',
  'المالية',
  'تقنية المعلومات',
  'الشؤون الطبية',
  'التأهيل',
  'التعليم',
  'الشؤون القانونية',
  'العلاقات العامة',
  'المشتريات',
  'الصيانة',
  'الجودة',
];

const scopeAreas = [
  'الموافقات المالية',
  'توقيع المعاملات',
  'إدارة الموظفين',
  'المشتريات',
  'العقود',
  'القرارات الإدارية',
  'المراسلات',
  'التقارير',
  'أخرى',
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDelegations() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [delegations, setDelegations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selected, setSelected] = useState(null);

  /* dialogs */
  const [createDialog, setCreateDialog] = useState(false);
  const [extendDialog, setExtendDialog] = useState(false);
  const [reasonDialog, setReasonDialog] = useState({ open: false, type: '' });
  const [dialogReason, setDialogReason] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [saving, setSaving] = useState(false);

  const [newForm, setNewForm] = useState({
    delegationType: 'partial',
    title: '',
    description: '',
    reason: '',
    delegatorName: '',
    delegatorTitle: '',
    delegatorDepartment: '',
    delegateeName: '',
    delegateeTitle: '',
    delegateeDepartment: '',
    startDate: '',
    endDate: '',
    scopeAreas: [],
    maxTransactionAmount: '',
    restrictions: '',
    notifyBeforeExpiry: 7,
    notifyOnUsage: true,
  });

  /* ─── Load ──────────────────────────────────────────────────────────────── */
  const loadDelegations = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await administrationService.getDelegations(params);
      if (res?.data?.data) {
        setDelegations(res.data.data);
        setPagination(res.data.pagination || {});
      }
    } catch {
      showSnackbar('خطأ في تحميل التفويضات', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, search]);

  useEffect(() => {
    loadDelegations();
  }, [loadDelegations]);

  /* ─── Context menu ──────────────────────────────────────────────────────── */
  const openMenu = (e, d) => {
    setAnchorEl(e.currentTarget);
    setSelected(d);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleAction = async action => {
    closeMenu();
    if (!selected) return;
    try {
      switch (action) {
        case 'activate':
          await administrationService.activateDelegation(selected._id);
          showSnackbar('تم تفعيل التفويض', 'success');
          loadDelegations();
          break;
        case 'suspend':
          setReasonDialog({ open: true, type: 'suspend' });
          return;
        case 'revoke':
          setReasonDialog({ open: true, type: 'revoke' });
          return;
        case 'extend':
          setExtendDialog(true);
          return;
        default:
          break;
      }
    } catch {
      showSnackbar('خطأ في تنفيذ العملية', 'error');
    }
  };

  const handleReasonSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (reasonDialog.type === 'suspend') {
        await administrationService.suspendDelegation(selected._id, { reason: dialogReason });
        showSnackbar('تم تعليق التفويض', 'success');
      } else {
        await administrationService.revokeDelegation(selected._id, { reason: dialogReason });
        showSnackbar('تم إلغاء التفويض', 'success');
      }
      setReasonDialog({ open: false, type: '' });
      setDialogReason('');
      setSelected(null);
      loadDelegations();
    } catch {
      showSnackbar('خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = async () => {
    if (!selected || !extendDate) return;
    setSaving(true);
    try {
      await administrationService.extendDelegation(selected._id, { newEndDate: extendDate });
      showSnackbar('تم تمديد التفويض', 'success');
      setExtendDialog(false);
      setExtendDate('');
      setSelected(null);
      loadDelegations();
    } catch {
      showSnackbar('خطأ في تمديد التفويض', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Create ────────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newForm.title.trim()) {
      showSnackbar('يرجى إدخال عنوان التفويض', 'error');
      return;
    }
    if (!newForm.startDate || !newForm.endDate) {
      showSnackbar('يرجى تحديد فترة التفويض', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...newForm,
        delegator: {
          name: newForm.delegatorName,
          title: newForm.delegatorTitle,
          department: newForm.delegatorDepartment,
        },
        delegatee: {
          name: newForm.delegateeName,
          title: newForm.delegateeTitle,
          department: newForm.delegateeDepartment,
        },
        scope: newForm.scopeAreas.map(area => ({ area, description: '' })),
        maxTransactionAmount: newForm.maxTransactionAmount
          ? Number(newForm.maxTransactionAmount)
          : undefined,
      };
      await administrationService.createDelegation(payload);
      showSnackbar('تم إنشاء التفويض', 'success');
      setCreateDialog(false);
      setNewForm({
        delegationType: 'partial',
        title: '',
        description: '',
        reason: '',
        delegatorName: '',
        delegatorTitle: '',
        delegatorDepartment: '',
        delegateeName: '',
        delegateeTitle: '',
        delegateeDepartment: '',
        startDate: '',
        endDate: '',
        scopeAreas: [],
        maxTransactionAmount: '',
        restrictions: '',
        notifyBeforeExpiry: 7,
        notifyOnUsage: true,
      });
      loadDelegations();
    } catch {
      showSnackbar('خطأ في إنشاء التفويض', 'error');
    } finally {
      setSaving(false);
    }
  };

  const daysRemaining = endDate => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/administration')} sx={{ color: 'white' }}>
              <ArrowBack />
            </IconButton>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <SwapHoriz sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                التفويضات
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة تفويض الصلاحيات
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
            sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            تفويض جديد
          </Button>
        </Box>
      </Box>

      {/* ─── Status Tabs ─────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={(_, v) => {
            setStatusFilter(v);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabStatuses.map(t => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Paper>

      {/* ─── Search ──────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالعنوان أو الرقم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="تحديث">
            <IconButton onClick={loadDelegations}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : delegations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <SwapHoriz sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">لا توجد تفويضات</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المفوِّض</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المفوَّض إليه</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاستخدام</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {delegations.map(d => {
                    const sc = statusConfig[d.status] || statusConfig.draft;
                    const days = daysRemaining(d.endDate);
                    const nearExpiry =
                      d.status === 'active' && days !== null && days <= 7 && days > 0;
                    const isExpired = days !== null && days <= 0;
                    return (
                      <TableRow
                        key={d._id}
                        hover
                        sx={{ bgcolor: nearExpiry ? 'warning.50' : undefined }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                          >
                            {d.delegationNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="600" noWrap sx={{ maxWidth: 200 }}>
                            {d.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeLabels[d.delegationType] || d.delegationType}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{d.delegator?.name || '—'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Typography variant="body2">{d.delegatee?.name || '—'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              {d.startDate
                                ? new Date(d.startDate).toLocaleDateString('ar-SA')
                                : '—'}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              → {d.endDate ? new Date(d.endDate).toLocaleDateString('ar-SA') : '—'}
                            </Typography>
                            {nearExpiry && (
                              <Chip
                                label={`${days} يوم متبقي`}
                                size="small"
                                color="warning"
                                sx={{ mt: 0.5 }}
                                icon={<WarningAmber />}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={d.usageCount || 0} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={e => openMenu(e, d)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={pagination.total || 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              labelRowsPerPage="عدد الصفوف:"
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* ─── Context Menu ────────────────────────────────────────────────── */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        {selected?.status === 'draft' && (
          <MenuItem onClick={() => handleAction('activate')}>
            <PlayArrow sx={{ ml: 1, color: 'success.main' }} /> تفعيل
          </MenuItem>
        )}
        {selected?.status === 'pending_approval' && (
          <MenuItem onClick={() => handleAction('activate')}>
            <CheckCircle sx={{ ml: 1, color: 'success.main' }} /> اعتماد وتفعيل
          </MenuItem>
        )}
        {selected?.status === 'active' && (
          <MenuItem onClick={() => handleAction('extend')}>
            <Update sx={{ ml: 1, color: 'info.main' }} /> تمديد
          </MenuItem>
        )}
        {selected?.status === 'active' && (
          <MenuItem onClick={() => handleAction('suspend')}>
            <PauseCircle sx={{ ml: 1, color: 'warning.main' }} /> تعليق
          </MenuItem>
        )}
        {selected?.status === 'suspended' && (
          <MenuItem onClick={() => handleAction('activate')}>
            <PlayArrow sx={{ ml: 1, color: 'success.main' }} /> إعادة تفعيل
          </MenuItem>
        )}
        {selected && !['revoked', 'completed'].includes(selected.status) && (
          <MenuItem onClick={() => handleAction('revoke')}>
            <Block sx={{ ml: 1, color: 'error.main' }} /> إلغاء
          </MenuItem>
        )}
      </Menu>

      {/* ─── Create Dialog ───────────────────────────────────────────────── */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفويض جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التفويض</InputLabel>
                <Select
                  value={newForm.delegationType}
                  label="نوع التفويض"
                  onChange={e => setNewForm(p => ({ ...p, delegationType: e.target.value }))}
                >
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="عنوان التفويض *"
                value={newForm.title}
                onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="وصف التفويض"
                value={newForm.description}
                multiline
                rows={2}
                onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="سبب التفويض"
                value={newForm.reason}
                onChange={e => setNewForm(p => ({ ...p, reason: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Chip label="المفوِّض" size="small" />
              </Divider>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الاسم"
                value={newForm.delegatorName}
                onChange={e => setNewForm(p => ({ ...p, delegatorName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="المسمى الوظيفي"
                value={newForm.delegatorTitle}
                onChange={e => setNewForm(p => ({ ...p, delegatorTitle: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>القسم</InputLabel>
                <Select
                  value={newForm.delegatorDepartment}
                  label="القسم"
                  onChange={e => setNewForm(p => ({ ...p, delegatorDepartment: e.target.value }))}
                >
                  {departmentOptions.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Chip label="المفوَّض إليه" size="small" />
              </Divider>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الاسم"
                value={newForm.delegateeName}
                onChange={e => setNewForm(p => ({ ...p, delegateeName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="المسمى الوظيفي"
                value={newForm.delegateeTitle}
                onChange={e => setNewForm(p => ({ ...p, delegateeTitle: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>القسم</InputLabel>
                <Select
                  value={newForm.delegateeDepartment}
                  label="القسم"
                  onChange={e => setNewForm(p => ({ ...p, delegateeDepartment: e.target.value }))}
                >
                  {departmentOptions.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Chip label="الفترة والنطاق" size="small" />
              </Divider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ البداية *"
                type="date"
                value={newForm.startDate}
                onChange={e => setNewForm(p => ({ ...p, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ النهاية *"
                type="date"
                value={newForm.endDate}
                onChange={e => setNewForm(p => ({ ...p, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={scopeAreas}
                value={newForm.scopeAreas}
                onChange={(_, v) => setNewForm(p => ({ ...p, scopeAreas: v }))}
                renderInput={params => (
                  <TextField
                    {...params}
                    size="small"
                    label="نطاق التفويض"
                    placeholder="اختر المجالات..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((opt, i) => (
                    <Chip label={opt} size="small" {...getTagProps({ index: i })} key={opt} />
                  ))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="الحد الأقصى للمعاملات المالية"
                type="number"
                value={newForm.maxTransactionAmount}
                onChange={e => setNewForm(p => ({ ...p, maxTransactionAmount: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="القيود"
                value={newForm.restrictions}
                onChange={e => setNewForm(p => ({ ...p, restrictions: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newForm.notifyOnUsage}
                    onChange={e => setNewForm(p => ({ ...p, notifyOnUsage: e.target.checked }))}
                  />
                }
                label="إشعار عند الاستخدام"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'إنشاء التفويض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Reason Dialog (Suspend/Revoke) ──────────────────────────────── */}
      <Dialog
        open={reasonDialog.open}
        onClose={() => setReasonDialog({ open: false, type: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reasonDialog.type === 'suspend' ? 'تعليق التفويض' : 'إلغاء التفويض'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            يرجى كتابة سبب {reasonDialog.type === 'suspend' ? 'التعليق' : 'الإلغاء'}:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={dialogReason}
            onChange={e => setDialogReason(e.target.value)}
            placeholder="السبب..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonDialog({ open: false, type: '' })}>إلغاء</Button>
          <Button
            variant="contained"
            color={reasonDialog.type === 'suspend' ? 'warning' : 'error'}
            onClick={handleReasonSubmit}
            disabled={!dialogReason.trim() || saving}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : reasonDialog.type === 'suspend' ? (
              'تعليق'
            ) : (
              'إلغاء'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Extend Dialog ───────────────────────────────────────────────── */}
      <Dialog open={extendDialog} onClose={() => setExtendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تمديد التفويض</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            اختر التاريخ الجديد لانتهاء التفويض:
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="تاريخ الانتهاء الجديد"
            value={extendDate}
            onChange={e => setExtendDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleExtend} disabled={!extendDate || saving}>
            {saving ? <CircularProgress size={20} /> : 'تمديد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
