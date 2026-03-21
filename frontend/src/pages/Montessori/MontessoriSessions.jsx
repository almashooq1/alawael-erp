/**
 * MontessoriSessions — إدارة الجلسات والتقييمات (Professional v2)
 *
 * Features:
 *  - Gradient header with action buttons
 *  - Animated KPI cards with easeOutExpo counter
 *  - Professional charts with SVG gradients & glassmorphism tooltips
 *  - Professional tables with alpha() hover
 *  - Tabbed interface: Sessions + Evaluations
 *  - Full CRUD with ConfirmDialog
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
import montessoriService from '../../services/montessoriService';

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
const DEMO_SESSIONS = [
  { _id: 's1', student: { _id: '1', fullName: 'أحمد محمد العلي' }, date: '2026-03-15', type: 'فردية', activities: ['تصنيف ألوان', 'مطابقة أشكال'], attendance: 'حاضر', notes: 'تفاعل ممتاز' },
  { _id: 's2', student: { _id: '2', fullName: 'سارة خالد المحمد' }, date: '2026-03-15', type: 'جماعية', activities: ['لعب تعاوني'], attendance: 'حاضر', notes: '' },
  { _id: 's3', student: { _id: '3', fullName: 'عبدالله فهد الأحمد' }, date: '2026-03-14', type: 'فردية', activities: ['تمارين حركية'], attendance: 'غائب', notes: 'عذر طبي' },
  { _id: 's4', student: { _id: '1', fullName: 'أحمد محمد العلي' }, date: '2026-03-14', type: 'فردية', activities: ['قراءة بطاقات', 'لعب رمل'], attendance: 'حاضر', notes: '' },
  { _id: 's5', student: { _id: '4', fullName: 'لمى سعد الحربي' }, date: '2026-03-13', type: 'جماعية', activities: ['موسيقى', 'حركة'], attendance: 'حاضر', notes: 'استجابة جيدة' },
];

const DEMO_EVALUATIONS = [
  { _id: 'e1', student: { _id: '1', fullName: 'أحمد محمد العلي' }, area: 'حسي', skill: 'التمييز البصري', level: 'جيد', date: '2026-03-15' },
  { _id: 'e2', student: { _id: '1', fullName: 'أحمد محمد العلي' }, area: 'لغوي', skill: 'المفردات', level: 'متوسط', date: '2026-03-14' },
  { _id: 'e3', student: { _id: '2', fullName: 'سارة خالد المحمد' }, area: 'حركي', skill: 'المهارات الدقيقة', level: 'جيد', date: '2026-03-13' },
  { _id: 'e4', student: { _id: '3', fullName: 'عبدالله فهد الأحمد' }, area: 'اجتماعي', skill: 'التفاعل مع الأقران', level: 'ضعيف', date: '2026-03-12' },
  { _id: 'e5', student: { _id: '4', fullName: 'لمى سعد الحربي' }, area: 'معرفي', skill: 'التصنيف', level: 'ممتاز', date: '2026-03-11' },
];

const SESSION_TYPES = ['فردية', 'جماعية', 'استشارية', 'تقييمية'];
const ATTENDANCE_OPTIONS = ['حاضر', 'غائب', 'متأخر'];
const EVAL_AREAS = ['حسي', 'لغوي', 'حركي', 'اجتماعي', 'معرفي', 'استقلالية', 'سلوكي'];
const EVAL_LEVELS = ['ضعيف', 'متوسط', 'جيد', 'ممتاز'];
const levelColors = { 'ضعيف': '#ef5350', 'متوسط': '#ff9800', 'جيد': '#66bb6a', 'ممتاز': '#42a5f5' };
const CHART_COLORS = ['#ef5350', '#ff9800', '#66bb6a', '#42a5f5', '#ab47bc', '#26c6da'];
const arr = (v) => (Array.isArray(v) ? v : []);

/* ══════════════════════════════════════════════════════════════════ */
const MontessoriSessions = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  // Session dialog
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({ student: '', date: '', type: 'فردية', activities: '', attendance: 'حاضر', notes: '' });

  // Evaluation dialog
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [editEval, setEditEval] = useState(null);
  const [evalForm, setEvalForm] = useState({ student: '', area: '', skill: '', level: 'متوسط', date: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ss, ev, st] = await Promise.allSettled([
        montessoriService.getSessions(),
        montessoriService.getEvaluations(),
        montessoriService.getStudents(),
      ]);
      setSessions(arr(ss.status === 'fulfilled' && ss.value?.length ? ss.value : DEMO_SESSIONS));
      setEvaluations(arr(ev.status === 'fulfilled' && ev.value?.length ? ev.value : DEMO_EVALUATIONS));
      setStudents(arr(st.status === 'fulfilled' ? st.value : []));
    } catch {
      setSessions(DEMO_SESSIONS);
      setEvaluations(DEMO_EVALUATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Filtered ── */
  const filteredSessions = sessions.filter((s) => {
    const name = s.student?.fullName || '';
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });
  const filteredEvals = evaluations.filter((e) => {
    const name = e.student?.fullName || '';
    return !search || name.toLowerCase().includes(search.toLowerCase()) || (e.skill || '').includes(search);
  });

  /* ── KPIs ── */
  const totalSessions = sessions.length;
  const presentCount = sessions.filter((s) => s.attendance === 'حاضر').length;
  const attendanceRate = totalSessions ? Math.round((presentCount / totalSessions) * 100) : 0;
  const totalEvals = evaluations.length;
  const excellentCount = evaluations.filter((e) => e.level === 'ممتاز' || e.level === 'جيد').length;

  /* ── Charts ── */
  const levelDistribution = EVAL_LEVELS.map((l) => ({
    name: l, value: evaluations.filter((e) => e.level === l).length,
  }));
  const areaBreakdown = EVAL_AREAS.map((a) => ({
    area: a, count: evaluations.filter((e) => e.area === a).length,
  })).filter((d) => d.count > 0);

  /* ── Session CRUD ── */
  const openCreateSession = () => {
    setEditSession(null);
    setSessionForm({ student: '', date: new Date().toISOString().substring(0, 10), type: 'فردية', activities: '', attendance: 'حاضر', notes: '' });
    setSessionDialogOpen(true);
  };
  const openEditSession = (sess) => {
    setEditSession(sess);
    setSessionForm({
      student: sess.student?._id || sess.student || '',
      date: sess.date ? sess.date.substring(0, 10) : '',
      type: sess.type || 'فردية',
      activities: (sess.activities || []).join(', '),
      attendance: sess.attendance || 'حاضر',
      notes: sess.notes || '',
    });
    setSessionDialogOpen(true);
  };
  const handleSaveSession = async () => {
    try {
      const payload = { ...sessionForm, activities: sessionForm.activities.split(',').map((a) => a.trim()).filter(Boolean) };
      if (editSession) { await montessoriService.updateSession(editSession._id, payload); showSnackbar('تم تحديث الجلسة', 'success'); }
      else { await montessoriService.createSession(payload); showSnackbar('تم إنشاء الجلسة', 'success'); }
      setSessionDialogOpen(false); loadData();
    } catch { showSnackbar('فشل حفظ الجلسة', 'error'); }
  };
  const handleDeleteSession = (sess) => {
    showConfirm({ title: 'حذف جلسة', message: 'هل أنت متأكد من حذف هذه الجلسة؟', confirmText: 'حذف', confirmColor: 'error',
      onConfirm: async () => { try { await montessoriService.deleteSession(sess._id); showSnackbar('تم حذف الجلسة', 'success'); loadData(); } catch { showSnackbar('فشل الحذف', 'error'); } },
    });
  };

  /* ── Evaluation CRUD ── */
  const openCreateEval = () => {
    setEditEval(null);
    setEvalForm({ student: '', area: '', skill: '', level: 'متوسط', date: new Date().toISOString().substring(0, 10) });
    setEvalDialogOpen(true);
  };
  const openEditEval = (ev) => {
    setEditEval(ev);
    setEvalForm({ student: ev.student?._id || ev.student || '', area: ev.area || '', skill: ev.skill || '', level: ev.level || 'متوسط', date: ev.date ? ev.date.substring(0, 10) : '' });
    setEvalDialogOpen(true);
  };
  const handleSaveEval = async () => {
    try {
      if (editEval) { await montessoriService.updateEvaluation(editEval._id, evalForm); showSnackbar('تم تحديث التقييم', 'success'); }
      else { await montessoriService.createEvaluation(evalForm); showSnackbar('تم إنشاء التقييم', 'success'); }
      setEvalDialogOpen(false); loadData();
    } catch { showSnackbar('فشل حفظ التقييم', 'error'); }
  };
  const handleDeleteEval = (ev) => {
    showConfirm({ title: 'حذف تقييم', message: 'هل أنت متأكد من حذف هذا التقييم؟', confirmText: 'حذف', confirmColor: 'error',
      onConfirm: async () => { try { await montessoriService.deleteEvaluation(ev._id); showSnackbar('تم حذف التقييم', 'success'); loadData(); } catch { showSnackbar('فشل الحذف', 'error'); } },
    });
  };

  /* ── Export CSV ── */
  const handleExport = () => {
    if (activeTab === 0) {
      const hdr = 'الطالب,التاريخ,النوع,الأنشطة,الحضور,ملاحظات';
      const rows = sessions.map((s) => `"${s.student?.fullName || '-'}",${s.date || '-'},${s.type},"${(s.activities || []).join(' / ')}",${s.attendance},"${s.notes || ''}"`);
      const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `montessori_sessions_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    } else {
      const hdr = 'الطالب,المجال,المهارة,المستوى,التاريخ';
      const rows = evaluations.map((e) => `"${e.student?.fullName || '-'}",${e.area},${e.skill},${e.level},${e.date || '-'}`);
      const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `montessori_evaluations_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    }
    showSnackbar('تم التصدير بنجاح', 'success');
  };

  /* ═══════ Render ═══════ */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>

        {/* Gradient Header */}
        <Box sx={{ background: gradients.info, py: 3, px: 3, mb: -3, borderRadius: '0 0 20px 20px', position: 'relative', overflow: 'hidden',
          '&::after': { content: '""', position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Box>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/montessori')} sx={{ color: '#fff', mb: 0.5 }}>العودة للوحة التحكم</Button>
                <Typography variant="h5" fontWeight={800} color="#fff">الجلسات والتقييمات</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>تسجيل الجلسات اليومية وتقييم مستوى الطلاب</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton onClick={handleExport} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}><DownloadIcon /></IconButton>
                </Tooltip>
                <Tooltip title="تحديث">
                  <IconButton onClick={loadData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}><RefreshIcon /></IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 5, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}><MiniKPI label="إجمالي الجلسات" value={totalSessions} icon={<SessionIcon />} gradient={gradients.primary} delay={0} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="نسبة الحضور" value={attendanceRate} icon={<PresentIcon />} gradient={gradients.success} delay={1} suffix="%" /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="إجمالي التقييمات" value={totalEvals} icon={<EvalIcon />} gradient={gradients.warning} delay={2} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="جيد / ممتاز" value={excellentCount} icon={<ClockIcon />} gradient={gradients.assessmentPurple} delay={3} /></Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2.5, height: 300, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>توزيع مستويات التقييم</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <defs>
                      {levelDistribution.map((_, idx) => (
                        <linearGradient key={idx} id={`sessPie${idx}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                          <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie data={levelDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} cornerRadius={4}
                      label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                      {levelDistribution.map((_, idx) => <Cell key={idx} fill={`url(#sessPie${idx})`} stroke="none" />)}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2.5, height: 300, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>التقييمات حسب المجال</Typography>
                {areaBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={areaBreakdown}>
                      <defs>
                        <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c4dff" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#7c4dff" stopOpacity={0.45} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                      <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RTooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" fill="url(#gArea)" name="عدد التقييمات" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="لا توجد بيانات" height={200} />}
              </Paper>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth"
              sx={{ '& .MuiTab-root': { fontWeight: 700, py: 1.5 } }}>
              <Tab icon={<SessionIcon />} label={`الجلسات (${sessions.length})`} />
              <Tab icon={<EvalIcon />} label={`التقييمات (${evaluations.length})`} />
            </Tabs>
          </Paper>

          {/* Search + action */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <TextField fullWidth size="small" placeholder="بحث باسم الطالب..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
              </Grid>
              <Grid item>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                  onClick={activeTab === 0 ? openCreateSession : openCreateEval}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                  {activeTab === 0 ? 'جلسة جديدة' : 'تقييم جديد'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Tab: Sessions */}
          {activeTab === 0 && (
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {filteredSessions.length === 0 ? (
                <Box sx={{ p: 4 }}><EmptyState title="لا توجد جلسات" /></Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الطالب</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الأنشطة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحضور</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ملاحظات</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">إجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSessions.map((s, i) => (
                        <TableRow key={s._id || i} hover sx={{ '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha(theme.palette.primary.main, 0.02) } }}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell><Typography variant="body2" fontWeight={600}>{s.student?.fullName || '-'}</Typography></TableCell>
                          <TableCell>{s.date ? new Date(s.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                          <TableCell><Chip label={s.type} size="small" variant="outlined" sx={{ borderRadius: 2 }} /></TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {(s.activities || []).slice(0, 3).map((a, ai) => <Chip key={ai} label={a} size="small" sx={{ borderRadius: 2 }} />)}
                              {(s.activities || []).length > 3 && <Chip label={`+${s.activities.length - 3}`} size="small" variant="outlined" />}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip icon={s.attendance === 'حاضر' ? <PresentIcon fontSize="small" /> : <AbsentIcon fontSize="small" />}
                              label={s.attendance} size="small"
                              color={s.attendance === 'حاضر' ? 'success' : s.attendance === 'غائب' ? 'error' : 'warning'}
                              variant="outlined" sx={{ borderRadius: 2 }} />
                          </TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>{s.notes || '-'}</Typography></TableCell>
                          <TableCell align="center">
                            <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEditSession(s)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDeleteSession(s)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}

          {/* Tab: Evaluations */}
          {activeTab === 1 && (
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {filteredEvals.length === 0 ? (
                <Box sx={{ p: 4 }}><EmptyState title="لا توجد تقييمات" /></Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الطالب</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المجال</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المهارة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المستوى</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">إجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEvals.map((ev, i) => (
                        <TableRow key={ev._id || i} hover sx={{ '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha(theme.palette.primary.main, 0.02) } }}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell><Typography variant="body2" fontWeight={600}>{ev.student?.fullName || '-'}</Typography></TableCell>
                          <TableCell><Chip label={ev.area} size="small" variant="outlined" sx={{ borderRadius: 2 }} /></TableCell>
                          <TableCell>{ev.skill}</TableCell>
                          <TableCell>
                            <Chip label={ev.level} size="small"
                              sx={{ bgcolor: (levelColors[ev.level] || '#ccc') + '22', color: levelColors[ev.level] || '#666', fontWeight: 700, minWidth: 60, borderRadius: 2 }} />
                          </TableCell>
                          <TableCell>{ev.date ? new Date(ev.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEditEval(ev)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDeleteEval(ev)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}

          {/* Session Dialog */}
          <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{editSession ? 'تعديل الجلسة' : 'إنشاء جلسة جديدة'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField select fullWidth label="الطالب" value={sessionForm.student}
                    onChange={(e) => setSessionForm((f) => ({ ...f, student: e.target.value }))}>
                    <MenuItem value="">اختر الطالب</MenuItem>
                    {students.map((s) => <MenuItem key={s._id} value={s._id}>{s.fullName}</MenuItem>)}
                    {students.length === 0 && DEMO_SESSIONS.map((s) => <MenuItem key={s._id} value={s.student?._id || s._id}>{s.student?.fullName || 'طالب'}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="date" label="التاريخ" value={sessionForm.date}
                    onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField select fullWidth label="نوع الجلسة" value={sessionForm.type}
                    onChange={(e) => setSessionForm((f) => ({ ...f, type: e.target.value }))}>
                    {SESSION_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="الأنشطة (مفصولة بفاصلة)" value={sessionForm.activities}
                    onChange={(e) => setSessionForm((f) => ({ ...f, activities: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField select fullWidth label="الحضور" value={sessionForm.attendance}
                    onChange={(e) => setSessionForm((f) => ({ ...f, attendance: e.target.value }))}>
                    {ATTENDANCE_OPTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="ملاحظات" multiline rows={2} value={sessionForm.notes}
                    onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSessionDialogOpen(false)}>إلغاء</Button>
              <Button variant="contained" onClick={handleSaveSession}>حفظ</Button>
            </DialogActions>
          </Dialog>

          {/* Evaluation Dialog */}
          <Dialog open={evalDialogOpen} onClose={() => setEvalDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{editEval ? 'تعديل التقييم' : 'إنشاء تقييم جديد'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField select fullWidth label="الطالب" value={evalForm.student}
                    onChange={(e) => setEvalForm((f) => ({ ...f, student: e.target.value }))}>
                    <MenuItem value="">اختر الطالب</MenuItem>
                    {students.map((s) => <MenuItem key={s._id} value={s._id}>{s.fullName}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select fullWidth label="المجال" value={evalForm.area}
                    onChange={(e) => setEvalForm((f) => ({ ...f, area: e.target.value }))}>
                    {EVAL_AREAS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select fullWidth label="المستوى" value={evalForm.level}
                    onChange={(e) => setEvalForm((f) => ({ ...f, level: e.target.value }))}>
                    {EVAL_LEVELS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="المهارة" value={evalForm.skill}
                    onChange={(e) => setEvalForm((f) => ({ ...f, skill: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="date" label="التاريخ" value={evalForm.date}
                    onChange={(e) => setEvalForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEvalDialogOpen(false)}>إلغاء</Button>
              <Button variant="contained" onClick={handleSaveEval}>حفظ</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
      <ConfirmDialog {...confirmState} />
    </DashboardErrorBoundary>
  );
};

export default MontessoriSessions;
