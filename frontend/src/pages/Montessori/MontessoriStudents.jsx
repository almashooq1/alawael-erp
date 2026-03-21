/**
 * MontessoriStudents — إدارة طلاب مونتيسوري (Professional v2)
 *
 * Features:
 *  - Gradient page header with action buttons
 *  - Animated KPI cards with counters
 *  - Professional table with hover, search, and filtering
 *  - Inline student detail with tabs (Plans + Evaluations)
 *  - Full CRUD + Plan management
 *  - Export CSV support
 *
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme, alpha,
} from '@mui/material';


import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { gradients } from '../../theme/palette';
import logger from '../../utils/logger';
import montessoriService from '../../services/montessoriService';

/* ─── Animated counter hook ─── */
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

/* ─── Mini KPI for students page ─── */
const MiniKPI = ({ label, value, icon, gradient, delay = 0 }) => {
  const { count, ref } = useAnimatedCounter(value, 1200);
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
            <Typography variant="h5" fontWeight={800}>{count.toLocaleString('ar-SA')}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{label}</Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

/* ── Demo data ─── */
const DEMO_STUDENTS = [
  { _id: '1', fullName: 'أحمد محمد العلي', gender: 'ذكر', disabilityTypes: ['توحد'], birthDate: '2020-03-15', notes: 'يحتاج متابعة مكثفة' },
  { _id: '2', fullName: 'سارة خالد المحمد', gender: 'أنثى', disabilityTypes: ['ذهنية'], birthDate: '2019-07-22', notes: '' },
  { _id: '3', fullName: 'عبدالله فهد الأحمد', gender: 'ذكر', disabilityTypes: ['حركية'], birthDate: '2021-01-10', notes: 'تحسن ملحوظ' },
  { _id: '4', fullName: 'لمى سعد الحربي', gender: 'أنثى', disabilityTypes: ['سمعية'], birthDate: '2020-11-05', notes: '' },
  { _id: '5', fullName: 'محمد عبدالرحمن', gender: 'ذكر', disabilityTypes: ['توحد', 'ذهنية'], birthDate: '2019-05-18', notes: 'يستجيب للعلاج باللعب' },
];
const DEMO_PLANS = [
  { _id: 'p1', student: { _id: '1', fullName: 'أحمد محمد العلي' }, goals: [{ area: 'حسي', objective: 'تحسين التمييز البصري', achieved: true, activities: ['تصنيف الألوان', 'مطابقة الأشكال'] }, { area: 'لغوي', objective: 'زيادة المفردات', achieved: false, activities: ['بطاقات المفردات', 'القصص المصورة'] }] },
  { _id: 'p2', student: { _id: '2', fullName: 'سارة خالد المحمد' }, goals: [{ area: 'حركي', objective: 'تحسين المهارات الدقيقة', achieved: false, activities: ['اللضم', 'القص'] }] },
];
const DEMO_EVALS = [
  { _id: 'e1', student: { _id: '1', fullName: 'أحمد' }, area: 'حسي', skill: 'التمييز البصري', level: 'جيد', date: '2026-03-15' },
  { _id: 'e2', student: { _id: '1', fullName: 'أحمد' }, area: 'لغوي', skill: 'المفردات', level: 'متوسط', date: '2026-03-14' },
  { _id: 'e3', student: { _id: '2', fullName: 'سارة' }, area: 'حركي', skill: 'المهارات الدقيقة', level: 'جيد', date: '2026-03-13' },
];
const DISABILITY_OPTIONS = ['توحد', 'ذهنية', 'حركية', 'سمعية', 'بصرية', 'تعلم', 'نطق', 'سلوكية', 'أخرى'];
const GENDER_OPTIONS = ['ذكر', 'أنثى'];
const levelColors = { 'ضعيف': '#ef5350', 'متوسط': '#ff9800', 'جيد': '#66bb6a', 'ممتاز': '#42a5f5' };
const arr = (v) => (Array.isArray(v) ? v : []);

/* ══════════════════════════════════════════════════════════════════ */
const MontessoriStudents = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDisability, setFilterDisability] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ fullName: '', birthDate: '', gender: 'ذكر', disabilityTypes: [], notes: '' });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ goals: [{ area: '', objective: '', activities: [] }] });
  const [editPlan, setEditPlan] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, e] = await Promise.allSettled([
        montessoriService.getStudents(),
        montessoriService.getPlans(),
        montessoriService.getEvaluations(),
      ]);
      setStudents(arr(s.status === 'fulfilled' && s.value?.length ? s.value : DEMO_STUDENTS));
      setPlans(arr(p.status === 'fulfilled' && p.value?.length ? p.value : DEMO_PLANS));
      setEvaluations(arr(e.status === 'fulfilled' && e.value?.length ? e.value : DEMO_EVALS));
    } catch {
      setStudents(DEMO_STUDENTS);
      setPlans(DEMO_PLANS);
      setEvaluations(DEMO_EVALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Computed ── */
  const males = students.filter((s) => s.gender === 'ذكر').length;
  const females = students.filter((s) => s.gender === 'أنثى').length;
  const totalPlans = plans.length;
  const totalEvals = evaluations.length;

  const filtered = students.filter((s) => {
    const matchSearch = !search || s.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchDisability = !filterDisability || (s.disabilityTypes || []).includes(filterDisability);
    return matchSearch && matchDisability;
  });

  /* ── CRUD ── */
  const openCreate = () => { setEditItem(null); setForm({ fullName: '', birthDate: '', gender: 'ذكر', disabilityTypes: [], notes: '' }); setDialogOpen(true); };
  const openEdit = (student) => {
    setEditItem(student);
    setForm({ fullName: student.fullName || '', birthDate: student.birthDate ? student.birthDate.substring(0, 10) : '', gender: student.gender || 'ذكر', disabilityTypes: student.disabilityTypes || [], notes: student.notes || '' });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    try {
      if (editItem) { await montessoriService.updateStudent(editItem._id, form); showSnackbar('تم تحديث بيانات الطالب بنجاح', 'success'); }
      else { await montessoriService.createStudent(form); showSnackbar('تم تسجيل الطالب بنجاح', 'success'); }
      setDialogOpen(false); loadData();
    } catch (err) { showSnackbar('حدث خطأ أثناء الحفظ', 'error'); logger.error('Save student error', err); }
  };
  const handleDelete = (student) => {
    showConfirm({ title: 'حذف طالب', message: `هل أنت متأكد من حذف "${student.fullName}"؟`, confirmText: 'حذف', confirmColor: 'error',
      onConfirm: async () => { try { await montessoriService.deleteStudent(student._id); showSnackbar('تم حذف الطالب', 'success'); loadData(); } catch { showSnackbar('فشل الحذف', 'error'); } },
    });
  };

  /* ── Plan CRUD ── */
  const openCreatePlan = () => { setEditPlan(null); setPlanForm({ goals: [{ area: '', objective: '', activities: [] }] }); setPlanDialogOpen(true); };
  const handleSavePlan = async () => {
    try {
      const payload = { student: selectedStudent._id, goals: planForm.goals };
      if (editPlan) { await montessoriService.updatePlan(editPlan._id, payload); showSnackbar('تم تحديث الخطة', 'success'); }
      else { await montessoriService.createPlan(payload); showSnackbar('تم إنشاء الخطة', 'success'); }
      setPlanDialogOpen(false); loadData();
    } catch { showSnackbar('فشل حفظ الخطة', 'error'); }
  };
  const addGoalRow = () => setPlanForm((prev) => ({ ...prev, goals: [...prev.goals, { area: '', objective: '', activities: [] }] }));
  const updateGoalRow = (idx, field, value) => setPlanForm((prev) => ({ ...prev, goals: prev.goals.map((g, i) => (i === idx ? { ...g, [field]: value } : g)) }));

  /* ── Detail helpers ── */
  const studentPlans = selectedStudent ? plans.filter((p) => (p.student?._id || p.student) === selectedStudent._id) : [];
  const studentEvals = selectedStudent ? evaluations.filter((e) => (e.student?._id || e.student) === selectedStudent._id) : [];
  const calcAge = (bd) => { if (!bd) return '-'; return `${Math.floor((Date.now() - new Date(bd)) / 31536000000)} سنة`; };

  /* ── Export CSV ── */
  const handleExport = () => {
    const header = 'الاسم,الجنس,تاريخ الميلاد,أنواع الإعاقة,ملاحظات';
    const rows = students.map((s) => `"${s.fullName}",${s.gender},${s.birthDate || '-'},"${(s.disabilityTypes || []).join('، ')}","${s.notes || ''}"`);
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `montessori_students_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    showSnackbar('تم تصدير بيانات الطلاب', 'success');
  };

  /* ═══════ Detail View ═══════ */
  if (selectedStudent) {
    return (
      <DashboardErrorBoundary>
        <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
          {/* Gradient sub-header */}
          <Box sx={{ background: gradients.info, py: 3, px: 3, borderRadius: '0 0 20px 20px', position: 'relative', overflow: 'hidden',
            '&::after': { content: '""', position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }}>
            <Container maxWidth="lg">
              <Button startIcon={<BackIcon />} onClick={() => setSelectedStudent(null)} sx={{ color: '#fff', mb: 1 }}>
                العودة لقائمة الطلاب
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', fontSize: 28 }}>
                  {selectedStudent.gender === 'أنثى' ? <FemaleIcon fontSize="large" /> : <MaleIcon fontSize="large" />}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={800} color="#fff">{selectedStudent.fullName}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip label={selectedStudent.gender} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                    <Chip label={`العمر: ${calcAge(selectedStudent.birthDate)}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                    {(selectedStudent.disabilityTypes || []).map((d, i) => (
                      <Chip key={i} label={d} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                    ))}
                  </Stack>
                  {selectedStudent.notes && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>{selectedStudent.notes}</Typography>}
                </Box>
              </Box>
            </Container>
          </Box>

          <Container maxWidth="lg" sx={{ py: 3, mt: -2 }}>
            <Paper sx={{ mb: 2, borderRadius: 3, overflow: 'hidden' }}>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} variant="fullWidth"
                sx={{ '& .MuiTab-root': { fontWeight: 600, py: 1.5 } }}>
                <Tab icon={<PlanIcon />} label={`الخطط (${studentPlans.length})`} iconPosition="start" />
                <Tab icon={<EvalIcon />} label={`التقييمات (${studentEvals.length})`} iconPosition="start" />
              </Tabs>
            </Paper>

            {/* Tab: Plans */}
            {detailTab === 0 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>الخطط الفردية (IEP)</Typography>
                  <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={openCreatePlan}>خطة جديدة</Button>
                </Box>
                {studentPlans.length === 0 ? <EmptyState title="لا توجد خطط فردية لهذا الطالب" height={150} /> :
                  studentPlans.map((plan, pi) => (
                    <motion.div key={plan._id || pi} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.1 }}>
                      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2.5 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            الخطة #{pi + 1} — {(plan.goals || []).length} هدف
                          </Typography>
                          <List dense disablePadding>
                            {(plan.goals || []).map((g, gi) => (
                              <ListItem key={gi} divider={gi < (plan.goals || []).length - 1}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  {g.achieved ? <CheckIcon fontSize="small" color="success" /> : <PendingIcon fontSize="small" color="warning" />}
                                </ListItemIcon>
                                <ListItemText primary={`${g.area}: ${g.objective}`} secondary={g.activities?.length ? `الأنشطة: ${g.activities.join(', ')}` : null} />
                                <Chip label={g.achieved ? 'محقق' : 'قيد التنفيذ'} size="small" color={g.achieved ? 'success' : 'warning'} variant="outlined" />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                }
              </Paper>
            )}

            {/* Tab: Evaluations */}
            {detailTab === 1 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>سجل التقييمات</Typography>
                {studentEvals.length === 0 ? <EmptyState title="لا توجد تقييمات لهذا الطالب" height={150} /> : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: isDark ? 'background.paper' : '#f5f7fa' } }}>
                          <TableCell>المجال</TableCell>
                          <TableCell>المهارة</TableCell>
                          <TableCell>المستوى</TableCell>
                          <TableCell>التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentEvals.map((ev, i) => (
                          <TableRow key={ev._id || i} hover>
                            <TableCell>{ev.area}</TableCell>
                            <TableCell>{ev.skill}</TableCell>
                            <TableCell>
                              <Chip label={ev.level} size="small" sx={{ bgcolor: alpha(levelColors[ev.level] || '#ccc', 0.15), color: levelColors[ev.level] || '#666', fontWeight: 700 }} />
                            </TableCell>
                            <TableCell>{ev.date ? new Date(ev.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            )}

            {/* Plan dialog */}
            <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ fontWeight: 700 }}>{editPlan ? 'تعديل الخطة الفردية' : 'إنشاء خطة فردية جديدة'}</DialogTitle>
              <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  أضف أهداف الطالب في مختلف المجالات (حسي، لغوي، حركي، اجتماعي، معرفي)
                </Typography>
                {planForm.goals.map((goal, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={600} color="primary">الهدف #{idx + 1}</Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={12} sm={4}>
                        <TextField select fullWidth size="small" label="المجال" value={goal.area}
                          onChange={(e) => updateGoalRow(idx, 'area', e.target.value)}>
                          {['حسي', 'لغوي', 'حركي', 'اجتماعي', 'معرفي', 'استقلالية', 'سلوكي'].map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <TextField fullWidth size="small" label="الهدف" value={goal.objective}
                          onChange={(e) => updateGoalRow(idx, 'objective', e.target.value)} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" label="الأنشطة (مفصولة بفاصلة)"
                          value={(goal.activities || []).join(', ')}
                          onChange={(e) => updateGoalRow(idx, 'activities', e.target.value.split(',').map((a) => a.trim()).filter(Boolean))} />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                <Button startIcon={<AddIcon />} onClick={addGoalRow} size="small">إضافة هدف</Button>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPlanDialogOpen(false)}>إلغاء</Button>
                <Button variant="contained" onClick={handleSavePlan}>حفظ الخطة</Button>
              </DialogActions>
            </Dialog>
          </Container>
        </Box>
        <ConfirmDialog {...confirmState} />
      </DashboardErrorBoundary>
    );
  }

  /* ═══════ Students List View ═══════ */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>

        {/* Gradient Header */}
        <Box sx={{ background: gradients.info, py: 3, px: 3, mb: -3, borderRadius: '0 0 20px 20px', position: 'relative', overflow: 'hidden',
          '&::after': { content: '""', position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Box>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/montessori')} sx={{ color: '#fff', mb: 0.5 }}>
                  العودة للوحة التحكم
                </Button>
                <Typography variant="h5" fontWeight={800} color="#fff">إدارة طلاب مونتيسوري</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  تسجيل الطلاب وإدارة الملفات الشخصية والخطط الفردية
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton onClick={handleExport} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تحديث">
                  <IconButton onClick={loadData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
                  تسجيل طالب
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 5, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* KPI Row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}><MiniKPI label="إجمالي الطلاب" value={students.length} icon={<ChildIcon />} gradient={gradients.info} delay={0} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="ذكور" value={males} icon={<MaleIcon />} gradient={gradients.ocean} delay={1} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="إناث" value={females} icon={<FemaleIcon />} gradient={gradients.warning} delay={2} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="الخطط الفردية" value={totalPlans} icon={<PlanIcon />} gradient={gradients.success} delay={3} /></Grid>
          </Grid>

          {/* Filters */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth size="small" placeholder="بحث بالاسم..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select fullWidth size="small" label="نوع الإعاقة" value={filterDisability}
                  onChange={(e) => setFilterDisability(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}>
                  <MenuItem value="">الكل</MenuItem>
                  {DISABILITY_OPTIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item>
                <Chip label={`${filtered.length} طالب`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <Box sx={{ p: 4 }}><EmptyState title="لا يوجد طلاب مطابقون للبحث" /></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: isDark ? 'background.paper' : '#f5f7fa' } }}>
                      <TableCell>#</TableCell>
                      <TableCell>الاسم</TableCell>
                      <TableCell>الجنس</TableCell>
                      <TableCell>العمر</TableCell>
                      <TableCell>أنواع الإعاقة</TableCell>
                      <TableCell>ملاحظات</TableCell>
                      <TableCell align="center">إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((s, i) => (
                      <TableRow key={s._id || i} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
                        onClick={() => { setSelectedStudent(s); setDetailTab(0); }}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: alpha(s.gender === 'أنثى' ? '#e91e63' : '#2196f3', 0.15), color: s.gender === 'أنثى' ? '#e91e63' : '#2196f3' }}>
                              {s.gender === 'أنثى' ? <FemaleIcon fontSize="small" /> : <MaleIcon fontSize="small" />}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>{s.fullName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{s.gender}</TableCell>
                        <TableCell>{calcAge(s.birthDate)}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {(s.disabilityTypes || []).map((d, di) => <Chip key={di} label={d} size="small" variant="outlined" color="warning" />)}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>{s.notes || '-'}</Typography>
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="عرض"><IconButton size="small" onClick={() => { setSelectedStudent(s); setDetailTab(0); }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" color="primary" /></IconButton></Tooltip>
                          <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(s)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Create/Edit dialog */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{editItem ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField fullWidth label="الاسم الكامل" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="date" label="تاريخ الميلاد" value={form.birthDate}
                    onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField select fullWidth label="الجنس" value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                    {GENDER_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField select fullWidth label="أنواع الإعاقة" value={form.disabilityTypes}
                    onChange={(e) => setForm((f) => ({ ...f, disabilityTypes: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }))}
                    SelectProps={{ multiple: true, renderValue: (sel) => sel.join(', ') }}>
                    {DISABILITY_OPTIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="ملاحظات" multiline rows={3} value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button variant="contained" onClick={handleSave} disabled={!form.fullName}>حفظ</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
      <ConfirmDialog {...confirmState} />
    </DashboardErrorBoundary>
  );
};

export default MontessoriStudents;
