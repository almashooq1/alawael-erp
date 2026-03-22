/**
 * ♿ إدارة البرامج التأهيلية — Rehabilitation Program Management
 * AlAwael ERP — Full CRUD: programs, goals, sessions, assessments, progress tracking
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  useTheme,
  alpha,
  InputAdornment,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AccessibleForward as RehabIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  CheckCircle as CompleteIcon,
  Flag as GoalIcon,
  PlayCircle as SessionIcon,
  Assessment as AssessIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import { rehabProgramService, specializedProgramService } from 'services/disabilityRehabService';

const DISABILITY_TYPES = ['حركية', 'نطقية', 'سمعية', 'بصرية', 'ذهنية', 'توحد', 'متعددة'];
const PROGRAM_TYPES = [
  { value: 'physical', label: 'علاج طبيعي' },
  { value: 'speech', label: 'علاج نطق' },
  { value: 'occupational', label: 'علاج وظيفي' },
  { value: 'auditory', label: 'تأهيل سمعي' },
  { value: 'visual', label: 'تأهيل بصري' },
  { value: 'behavioral', label: 'تعديل سلوك' },
  { value: 'social', label: 'مهارات اجتماعية' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'suspended', label: 'معلّق' },
  { value: 'draft', label: 'مسودة' },
];

const pctColor = v => (v >= 80 ? 'success' : v >= 50 ? 'warning' : 'error');

const emptyForm = {
  name: '',
  type: 'physical',
  disabilityType: 'حركية',
  beneficiaryName: '',
  beneficiaryAge: '',
  beneficiaryId: '',
  therapist: '',
  startDate: '',
  endDate: '',
  totalSessions: '',
  goals: [{ title: '', target: 100 }],
  notes: '',
};

export default function RehabProgramManagement() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const g = theme.palette.gradients || {};

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Goal dialog
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', target: 100, current: 0 });
  const [goalProgramId, setGoalProgramId] = useState(null);
  const [goalId, setGoalId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, st] = await Promise.all([
        rehabProgramService.getAll(),
        rehabProgramService.getAll(), // stats endpoint
      ]);
      setPrograms(pr?.programs || pr?.data || rehabProgramService.getMockPrograms());
      setStats(st?.stats || rehabProgramService.getMockStats());
    } catch {
      setPrograms(rehabProgramService.getMockPrograms());
      setStats(rehabProgramService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Filtering ── */
  const filtered = programs.filter(p => {
    const matchSearch =
      !search ||
      p.name?.includes(search) ||
      p.beneficiary?.name?.includes(search) ||
      p.therapist?.includes(search) ||
      p.programNumber?.includes(search);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  /* ── CRUD ── */
  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };
  const openEdit = p => {
    setEditId(p._id);
    setForm({
      name: p.name || '',
      type: p.type || 'physical',
      disabilityType: p.disabilityType || '',
      beneficiaryName: p.beneficiary?.name || '',
      beneficiaryAge: p.beneficiary?.age || '',
      beneficiaryId: p.beneficiary?.id || '',
      therapist: p.therapist || '',
      startDate: p.startDate?.slice(0, 10) || '',
      endDate: p.endDate?.slice(0, 10) || '',
      totalSessions: p.totalSessions || '',
      goals: p.goals?.map(g => ({ title: g.title, target: g.target })) || [
        { title: '', target: 100 },
      ],
      notes: p.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      beneficiary: {
        name: form.beneficiaryName,
        age: Number(form.beneficiaryAge),
        id: form.beneficiaryId,
      },
      totalSessions: Number(form.totalSessions),
    };
    const res = editId
      ? await rehabProgramService.update(editId, payload)
      : await rehabProgramService.create(payload);
    if (res) {
      showSnackbar(editId ? 'تم تحديث البرنامج بنجاح' : 'تم إنشاء البرنامج بنجاح', 'success');
      setDialogOpen(false);
      load();
    } else {
      // optimistic local update
      if (editId) {
        setPrograms(prev => prev.map(p => (p._id === editId ? { ...p, ...payload } : p)));
      } else {
        const newP = {
          _id: `rp-new-${Date.now()}`,
          programNumber: `RP-NEW-${String(programs.length + 1).padStart(3, '0')}`,
          ...payload,
          status: 'draft',
          progress: 0,
          completedSessions: 0,
          goals: form.goals.map((g, i) => ({
            id: `ng${i}`,
            ...g,
            current: 0,
            status: 'in_progress',
          })),
        };
        setPrograms(prev => [newP, ...prev]);
      }
      showSnackbar(editId ? 'تم تحديث البرنامج (محلي)' : 'تم إنشاء البرنامج (محلي)', 'success');
      setDialogOpen(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل تريد حذف هذا البرنامج؟')) return;
    const res = await rehabProgramService.remove(id);
    if (res) showSnackbar('تم الحذف بنجاح', 'success');
    setPrograms(prev => prev.filter(p => p._id !== id));
  };

  const handleComplete = async p => {
    const res = await rehabProgramService.complete(p._id);
    if (res) showSnackbar('تم إكمال البرنامج', 'success');
    setPrograms(prev =>
      prev.map(x => (x._id === p._id ? { ...x, status: 'completed', progress: 100 } : x))
    );
  };

  /* ── Detail View ── */
  const openDetail = p => {
    setSelectedProgram(p);
    setDetailOpen(true);
  };

  /* ── Goal Update ── */
  const openGoalUpdate = (programId, goal) => {
    setGoalProgramId(programId);
    setGoalId(goal.id);
    setGoalForm({ title: goal.title, target: goal.target, current: goal.current || 0 });
    setGoalDialogOpen(true);
  };

  const handleGoalSave = async () => {
    await rehabProgramService.updateGoal(goalProgramId, goalId, goalForm);
    setPrograms(prev =>
      prev.map(p => {
        if (p._id !== goalProgramId) return p;
        return {
          ...p,
          goals: p.goals.map(g =>
            g.id === goalId
              ? {
                  ...g,
                  ...goalForm,
                  status: goalForm.current >= goalForm.target ? 'achieved' : 'in_progress',
                }
              : g
          ),
        };
      })
    );
    showSnackbar('تم تحديث الهدف', 'success');
    setGoalDialogOpen(false);
  };

  const st = stats || rehabProgramService.getMockStats();

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );

  const statusChip = s => {
    const map = {
      active: { l: 'نشط', c: 'success' },
      completed: { l: 'مكتمل', c: 'info' },
      suspended: { l: 'معلّق', c: 'warning' },
      draft: { l: 'مسودة', c: 'default' },
    };
    const m = map[s] || { l: s, c: 'default' };
    return <Chip label={m.l} color={m.c} size="small" />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: g.primary || 'linear-gradient(135deg,#2e7d32 0%,#1b5e20 100%)',
          color: '#fff',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              📋 إدارة البرامج التأهيلية
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.9 }}>
              إنشاء وإدارة ومتابعة البرامج التأهيلية للمستفيدين
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: 'rgba(255,255,255,.2)', '&:hover': { bgcolor: 'rgba(255,255,255,.3)' } }}
          >
            برنامج جديد
          </Button>
        </Stack>
      </Paper>

      {/* ── KPI Row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي البرامج', value: st.totalPrograms, color: '#1976d2' },
          { label: 'نشطة', value: st.activePrograms, color: '#2e7d32' },
          { label: 'مكتملة', value: st.completedPrograms, color: '#0288d1' },
          { label: 'المستفيدون', value: st.totalBeneficiaries, color: '#9c27b0' },
          { label: 'متوسط التقدم', value: `${st.avgProgress}%`, color: '#ed6c02' },
          { label: 'تحقيق الأهداف', value: `${st.goalAchievementRate}%`, color: '#388e3c' },
        ].map((k, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                textAlign: 'center',
                border: `2px solid ${alpha(k.color, 0.2)}`,
                bgcolor: alpha(k.color, 0.04),
              }}
            >
              <Typography variant="h5" fontWeight={700} color={k.color}>
                {k.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {k.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ── */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
      >
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="بحث بالاسم، المستفيد، المعالج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
          <TextField
            select
            size="small"
            label="الحالة"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {STATUS_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="نوع البرنامج"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            {PROGRAM_TYPES.map(o => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Chip label={`${filtered.length} برنامج`} color="primary" variant="outlined" />
        </Stack>
      </Paper>

      {/* ── Programs Table ── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#2e7d32', 0.06) }}>
                <TableCell sx={{ fontWeight: 700 }}>البرنامج</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نوع الإعاقة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الجلسات</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأهداف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.programNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.beneficiary?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      عمر: {p.beneficiary?.age} — {p.beneficiary?.disabilityLevel}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.therapist}</TableCell>
                  <TableCell>
                    <Chip label={p.disabilityType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {p.completedSessions}/{p.totalSessions}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={p.progress}
                        color={pctColor(p.progress)}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" fontWeight={700}>
                        {p.progress}%
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {(p.goals || []).map((gl, i) => (
                      <Tooltip key={i} title={`${gl.title}: ${gl.current}/${gl.target}`}>
                        <Chip
                          label={
                            gl.status === 'achieved'
                              ? '✅'
                              : `${Math.round((gl.current / gl.target) * 100)}%`
                          }
                          size="small"
                          color={gl.status === 'achieved' ? 'success' : 'default'}
                          onClick={() => openGoalUpdate(p._id, gl)}
                          sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
                        />
                      </Tooltip>
                    ))}
                  </TableCell>
                  <TableCell>{statusChip(p.status)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" color="info" onClick={() => openDetail(p)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {p.status === 'active' && (
                        <Tooltip title="إكمال البرنامج">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleComplete(p)}
                          >
                            <CompleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => handleDelete(p._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">لا توجد برامج مطابقة</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ═══ Create / Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editId ? 'تعديل البرنامج' : 'برنامج تأهيلي جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="اسم البرنامج"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="نوع البرنامج"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {PROGRAM_TYPES.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="نوع الإعاقة"
                value={form.disabilityType}
                onChange={e => setForm(f => ({ ...f, disabilityType: e.target.value }))}
              >
                {DISABILITY_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="اسم المستفيد"
                value={form.beneficiaryName}
                onChange={e => setForm(f => ({ ...f, beneficiaryName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                label="العمر"
                type="number"
                value={form.beneficiaryAge}
                onChange={e => setForm(f => ({ ...f, beneficiaryAge: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                label="رقم المستفيد"
                value={form.beneficiaryId}
                onChange={e => setForm(f => ({ ...f, beneficiaryId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="المعالج المسؤول"
                value={form.therapist}
                onChange={e => setForm(f => ({ ...f, therapist: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="تاريخ البدء"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="تاريخ الانتهاء"
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                label="عدد الجلسات"
                type="number"
                value={form.totalSessions}
                onChange={e => setForm(f => ({ ...f, totalSessions: e.target.value }))}
              />
            </Grid>

            {/* Goals */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  🎯 الأهداف التأهيلية
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setForm(f => ({ ...f, goals: [...f.goals, { title: '', target: 100 }] }))
                  }
                >
                  إضافة هدف
                </Button>
              </Stack>
              {form.goals.map((gl, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={`الهدف ${i + 1}`}
                    value={gl.title}
                    onChange={e => {
                      const goals = [...form.goals];
                      goals[i].title = e.target.value;
                      setForm(f => ({ ...f, goals }));
                    }}
                  />
                  <TextField
                    size="small"
                    label="الهدف"
                    type="number"
                    value={gl.target}
                    sx={{ width: 100 }}
                    onChange={e => {
                      const goals = [...form.goals];
                      goals[i].target = Number(e.target.value);
                      setForm(f => ({ ...f, goals }));
                    }}
                  />
                  {form.goals.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                        setForm(f => ({ ...f, goals: f.goals.filter((_, j) => j !== i) }))
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            {editId ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedProgram && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                تفاصيل البرنامج: {selectedProgram.name}
                <IconButton onClick={() => setDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#1976d2', 0.04) }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      <PersonIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />{' '}
                      المستفيد
                    </Typography>
                    <Typography variant="body2">
                      الاسم: {selectedProgram.beneficiary?.name}
                    </Typography>
                    <Typography variant="body2">
                      العمر: {selectedProgram.beneficiary?.age} سنة
                    </Typography>
                    <Typography variant="body2">
                      مستوى الإعاقة: {selectedProgram.beneficiary?.disabilityLevel}
                    </Typography>
                    <Typography variant="body2">
                      نوع الإعاقة: {selectedProgram.disabilityType}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#2e7d32', 0.04) }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      <CalendarIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />{' '}
                      البرنامج
                    </Typography>
                    <Typography variant="body2">المعالج: {selectedProgram.therapist}</Typography>
                    <Typography variant="body2">البداية: {selectedProgram.startDate}</Typography>
                    <Typography variant="body2">النهاية: {selectedProgram.endDate}</Typography>
                    <Typography variant="body2">
                      الجلسات: {selectedProgram.completedSessions}/{selectedProgram.totalSessions}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Progress */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      <TrendIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} /> التقدم
                      العام
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={selectedProgram.progress}
                        color={pctColor(selectedProgram.progress)}
                        sx={{ flex: 1, height: 12, borderRadius: 6 }}
                      />
                      <Typography variant="h5" fontWeight={700}>
                        {selectedProgram.progress}%
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Goals */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    🎯 الأهداف
                  </Typography>
                  {(selectedProgram.goals || []).map((gl, i) => (
                    <Paper
                      key={i}
                      sx={{
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {gl.title}
                        </Typography>
                        <Chip
                          label={gl.status === 'achieved' ? 'تم التحقيق ✅' : 'جاري التنفيذ'}
                          size="small"
                          color={gl.status === 'achieved' ? 'success' : 'warning'}
                        />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((gl.current / gl.target) * 100, 100)}
                          color={pctColor((gl.current / gl.target) * 100)}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" fontWeight={700}>
                          {gl.current}/{gl.target}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Grid>

                {/* Latest Assessment */}
                {selectedProgram.latestAssessment && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#ed6c02', 0.04) }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        <AssessIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} /> آخر
                        تقييم
                      </Typography>
                      <Stack direction="row" spacing={3}>
                        <Typography variant="body2">
                          التاريخ: {selectedProgram.latestAssessment.date}
                        </Typography>
                        <Typography variant="body2">
                          الدرجة: <b>{selectedProgram.latestAssessment.score}</b>
                        </Typography>
                        <Chip
                          label={`تحسن +${selectedProgram.latestAssessment.improvement}%`}
                          size="small"
                          color="success"
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ═══ Goal Update Dialog ═══ */}
      <Dialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تحديث تقدم الهدف</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="الهدف" value={goalForm.title} disabled sx={{ mb: 2 }} />
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="التقدم الحالي"
              type="number"
              value={goalForm.current}
              onChange={e => setGoalForm(f => ({ ...f, current: Number(e.target.value) }))}
            />
            <TextField
              fullWidth
              label="الهدف"
              type="number"
              value={goalForm.target}
              onChange={e => setGoalForm(f => ({ ...f, target: Number(e.target.value) }))}
            />
          </Stack>
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((goalForm.current / goalForm.target) * 100, 100)}
              color={pctColor((goalForm.current / goalForm.target) * 100)}
              sx={{ height: 12, borderRadius: 6 }}
            />
            <Typography variant="body2" textAlign="center" sx={{ mt: 0.5 }}>
              {Math.round((goalForm.current / goalForm.target) * 100)}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setGoalDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleGoalSave}>
            تحديث
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
