/**
 * MontessoriPrograms — إدارة برامج مونتيسوري (Professional v2)
 *
 * Features:
 *  - Gradient page header with action buttons
 *  - Animated KPI cards
 *  - Professional charts with SVG gradients + glassmorphism tooltips
 *  - Card-based program grid with capacity indicators
 *  - Full CRUD with status management
 *  - Export CSV support
 *
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { gradients, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import montessoriService from '../../services/montessoriService';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { CalendarIcon } from 'utils/iconAliases';

/* ─── Animated counter ─── */
const useAnimatedCounter = (endValue, duration = 1200) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !endValue) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        const t0 = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - t0) / duration, 1);
          setCount(Math.floor((p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) * endValue));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [endValue, duration]);
  return { count, ref };
};

const MiniKPI = ({ label, value, icon, gradient, delay = 0, suffix = '' }) => {
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;
  const { count, ref } = useAnimatedCounter(numVal, 1200);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }} whileHover={{ y: -4, scale: 1.02 }} style={{ height: '100%' }}>
      <Paper elevation={0} sx={{
        p: 2, borderRadius: 3, background: gradient, color: '#fff', height: '100%',
        position: 'relative', overflow: 'hidden',
        '&::after': { content: '""', position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 42, height: 42 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{count.toLocaleString('ar-SA')}{suffix}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{label}</Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

/* ── Demo / Constants ── */
const DEMO_PROGRAMS = [
  { _id: '1', name: 'برنامج الحياة العملية', ageGroup: '3-6', capacity: 20, enrolled: 15, instructor: 'أ. نورة محمد', status: 'active', schedule: 'أحد - خميس 8:00-12:00', description: 'أنشطة الحياة العملية اليومية' },
  { _id: '2', name: 'برنامج الحسي', ageGroup: '4-7', capacity: 15, enrolled: 12, instructor: 'أ. فاطمة علي', status: 'active', schedule: 'أحد - أربعاء 9:00-11:00', description: 'تطوير الحواس الخمس' },
  { _id: '3', name: 'برنامج اللغة', ageGroup: '3-5', capacity: 12, enrolled: 12, instructor: 'أ. سارة أحمد', status: 'active', schedule: 'أحد - خميس 10:00-12:00', description: 'مهارات القراءة والكتابة المبكرة' },
  { _id: '4', name: 'البرنامج الصيفي', ageGroup: '5-8', capacity: 25, enrolled: 0, instructor: 'أ. خالد سعد', status: 'planned', schedule: 'يحدد لاحقاً', description: 'برنامج صيفي شامل' },
  { _id: '5', name: 'برنامج الرياضيات', ageGroup: '4-6', capacity: 15, enrolled: 8, instructor: 'أ. منى عبدالله', status: 'active', schedule: 'أحد - أربعاء 8:30-10:30', description: 'المفاهيم الرياضية الأساسية' },
];
const STATUS_OPTIONS = ['active', 'planned', 'suspended', 'completed', 'archived'];
const statusConfig = {
  active: { label: 'نشط', color: 'success' },
  planned: { label: 'مخطط', color: 'info' },
  suspended: { label: 'معلق', color: 'warning' },
  completed: { label: 'مكتمل', color: 'default' },
  archived: { label: 'مؤرشف', color: 'default' },
};
const CHART_COLORS = ['#667eea', '#43e97b', '#ff9800', '#ef5350', '#ab47bc', '#26c6da'];
const arr = (v) => (Array.isArray(v) ? v : []);

/* ══════════════════════════════════════════════════════════════════ */
const MontessoriPrograms = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', ageGroup: '', capacity: 20, enrolled: 0, instructor: '', status: 'planned', schedule: '', description: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await montessoriService.getPrograms();
      setPrograms(arr(data).length ? arr(data) : DEMO_PROGRAMS);
    } catch {
      setPrograms(DEMO_PROGRAMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = programs.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.instructor?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  /* ── Computed ── */
  const totalCapacity = programs.reduce((s, p) => s + (p.capacity || 0), 0);
  const totalEnrolled = programs.reduce((s, p) => s + (p.enrolled || 0), 0);
  const activeCount = programs.filter((p) => p.status === 'active').length;
  const utilizationPct = totalCapacity ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const statusDistribution = STATUS_OPTIONS.map((s) => ({
    name: statusConfig[s]?.label || s, value: programs.filter((p) => p.status === s).length,
  })).filter((d) => d.value > 0);

  const capacityData = programs.filter((p) => p.status === 'active').map((p) => ({
    name: p.name?.substring(0, 15) || 'برنامج', capacity: p.capacity || 0, enrolled: p.enrolled || 0,
  }));

  /* ── CRUD ── */
  const openCreate = () => { setEditItem(null); setForm({ name: '', ageGroup: '', capacity: 20, enrolled: 0, instructor: '', status: 'planned', schedule: '', description: '' }); setDialogOpen(true); };
  const openEdit = (prog) => {
    setEditItem(prog);
    setForm({ name: prog.name || '', ageGroup: prog.ageGroup || '', capacity: prog.capacity || 20, enrolled: prog.enrolled || 0, instructor: prog.instructor || '', status: prog.status || 'planned', schedule: prog.schedule || '', description: prog.description || '' });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    try {
      if (editItem) { await montessoriService.updateProgram(editItem._id, form); showSnackbar('تم تحديث البرنامج بنجاح', 'success'); }
      else { await montessoriService.createProgram(form); showSnackbar('تم إنشاء البرنامج بنجاح', 'success'); }
      setDialogOpen(false); loadData();
    } catch (err) { showSnackbar('حدث خطأ أثناء الحفظ', 'error'); logger.error('Save program error', err); }
  };
  const handleDelete = (prog) => {
    showConfirm({ title: 'حذف برنامج', message: `هل أنت متأكد من حذف "${prog.name}"؟`, confirmText: 'حذف', confirmColor: 'error',
      onConfirm: async () => { try { await montessoriService.deleteProgram(prog._id); showSnackbar('تم حذف البرنامج', 'success'); loadData(); } catch { showSnackbar('فشل الحذف', 'error'); } },
    });
  };

  /* ── Export CSV ── */
  const handleExport = () => {
    const header = 'اسم البرنامج,الحالة,الفئة العمرية,المعلم,السعة,المسجلون,الجدول';
    const rows = programs.map((p) => `"${p.name}",${statusConfig[p.status]?.label || p.status},${p.ageGroup || '-'},"${p.instructor || '-'}",${p.capacity},${p.enrolled},"${p.schedule || '-'}"`);
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `montessori_programs_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    showSnackbar('تم تصدير البرامج', 'success');
  };

  /* ═══════ Render ═══════ */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>

        {/* Gradient Header */}
        <Box sx={{ background: gradients.success, py: 3, px: 3, mb: -3, borderRadius: '0 0 20px 20px', position: 'relative', overflow: 'hidden',
          '&::after': { content: '""', position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Box>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/montessori')} sx={{ color: '#fff', mb: 0.5 }}>العودة للوحة التحكم</Button>
                <Typography variant="h5" fontWeight={800} color="#fff">إدارة البرامج</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>إنشاء وإدارة برامج مونتيسوري التعليمية</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton onClick={handleExport} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}><DownloadIcon /></IconButton>
                </Tooltip>
                <Tooltip title="تحديث">
                  <IconButton onClick={loadData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}><RefreshIcon /></IconButton>
                </Tooltip>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>برنامج جديد</Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 5, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}><MiniKPI label="إجمالي البرامج" value={programs.length} icon={<SchoolIcon />} gradient={gradients.info} delay={0} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="برامج نشطة" value={activeCount} icon={<TrendingIcon />} gradient={gradients.success} delay={1} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="إجمالي المسجلين" value={totalEnrolled} icon={<PeopleIcon />} gradient={gradients.warning} delay={2} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="نسبة الاستيعاب" value={utilizationPct} icon={<CalendarIcon />} gradient={gradients.assessmentPurple} delay={3} suffix="%" /></Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, height: 300, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>توزيع حالة البرامج</Typography>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <defs>
                        {statusDistribution.map((_, idx) => (
                          <linearGradient key={idx} id={`progPie${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.65} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} cornerRadius={4}
                        label={({ name, value }) => `${name}: ${value}`}>
                        {statusDistribution.map((_, idx) => <Cell key={idx} fill={`url(#progPie${idx})`} stroke="none" />)}
                      </Pie>
                      <RTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="لا توجد بيانات" height={200} />}
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 2.5, height: 300, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>السعة مقابل المسجلين — البرامج النشطة</Typography>
                {capacityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={capacityData} layout="vertical">
                      <defs>
                        <linearGradient id="gCapacity" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#e0e0e0" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#bdbdbd" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="gEnrolled" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor={statusColors.success} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={statusColors.success} stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <RTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="capacity" fill="url(#gCapacity)" name="السعة" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="enrolled" fill="url(#gEnrolled)" name="المسجلون" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="لا توجد بيانات" height={200} />}
              </Paper>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <TextField fullWidth size="small" placeholder="بحث بالاسم أو المعلم..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField select fullWidth size="small" label="الحالة" value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}>
                  <MenuItem value="">الكل</MenuItem>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{statusConfig[s]?.label || s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item>
                <Chip label={`${filtered.length} برنامج`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Grid>
            </Grid>
          </Paper>

          {/* Programs Cards */}
          {filtered.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <EmptyState title="لا توجد برامج مطابقة" />
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {filtered.map((prog, i) => {
                const pct = prog.capacity ? Math.round((prog.enrolled / prog.capacity) * 100) : 0;
                const isZero = prog.enrolled === 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={prog._id || i}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }} whileHover={{ y: -4 }}>
                      <Card elevation={0} sx={{
                        height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
                        border: '1px solid', borderColor: 'divider',
                        ...(isZero && { opacity: 0.7 }),
                        transition: 'all 0.3s ease',
                        '&:hover': { boxShadow: '0 8px 28px rgba(0,0,0,0.1)', borderColor: 'primary.main' },
                      }}>
                        <CardContent sx={{ flex: 1, p: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{prog.name}</Typography>
                            <Chip label={statusConfig[prog.status]?.label || prog.status} size="small" color={statusConfig[prog.status]?.color || 'default'} />
                          </Box>
                          {prog.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{prog.description}</Typography>
                          )}
                          <Stack spacing={0.5}>
                            <Typography variant="body2"><strong>الفئة العمرية:</strong> {prog.ageGroup || '-'}</Typography>
                            <Typography variant="body2"><strong>المعلم:</strong> {prog.instructor || '-'}</Typography>
                            <Typography variant="body2"><strong>الجدول:</strong> {prog.schedule || '-'}</Typography>
                          </Stack>
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">الاستيعاب: {prog.enrolled}/{prog.capacity}</Typography>
                              <Typography variant="caption" fontWeight={700} color={pct >= 90 ? 'error.main' : pct >= 70 ? 'warning.main' : 'success.main'}>{pct}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={Math.min(pct, 100)}
                              color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success'}
                              sx={{ height: 6, borderRadius: 3 }} />
                          </Box>
                        </CardContent>
                        <CardActions sx={{ px: 2.5, pb: 2, pt: 0 }}>
                          <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEdit(prog)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(prog)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </CardActions>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Create/Edit dialog */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{editItem ? 'تعديل البرنامج' : 'إنشاء برنامج جديد'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField fullWidth label="اسم البرنامج" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="الفئة العمرية" value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} placeholder="مثال: 3-6" />
                </Grid>
                <Grid item xs={6}>
                  <TextField select fullWidth label="الحالة" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{statusConfig[s]?.label || s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="number" label="السعة" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 0 }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="number" label="المسجلون" value={form.enrolled} onChange={(e) => setForm((f) => ({ ...f, enrolled: parseInt(e.target.value) || 0 }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="المعلم / المشرف" value={form.instructor} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="الجدول" value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} placeholder="مثال: أحد - خميس 8:00-12:00" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="الوصف" multiline rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button variant="contained" onClick={handleSave} disabled={!form.name}>حفظ</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
      <ConfirmDialog {...confirmState} />
    </DashboardErrorBoundary>
  );
};

export default MontessoriPrograms;
