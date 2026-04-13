import { useState, useEffect } from 'react';




import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const TRAINING_TYPES = [
  { value: 'clinical', label: 'تدريب سريري', color: '#3b82f6' },
  { value: 'observation', label: 'مراقبة', color: '#8b5cf6' },
  { value: 'practicum', label: 'تطبيق عملي', color: '#10b981' },
  { value: 'supervision', label: 'إشراف', color: '#f59e0b' },
  { value: 'workshop', label: 'ورشة عمل', color: '#ef4444' },
];

const TherapistFieldTraining = () => {
  const { currentUser: _currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [training, setTraining] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evalDialog, setEvalDialog] = useState(null);
  const [hoursDialog, setHoursDialog] = useState(null);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    traineeName: '',
    traineeNameEn: '',
    type: 'clinical',
    supervisor: '',
    institution: '',
    startDate: '',
    endDate: '',
    totalHours: 480,
    tasks: '',
  });
  const [evalForm, setEvalForm] = useState({ score: '', notes: '' });
  const [addHours, setAddHours] = useState('');

  useEffect(() => {
    fetchTraining();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTraining = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getFieldTraining();
      setTraining(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchFieldTraining error:', err);
      showSnackbar('خطأ في تحميل بيانات التدريب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.traineeName) {
      showSnackbar('يرجى إدخال اسم المتدرب', 'warning');
      return;
    }
    try {
      const payload = {
        ...form,
        tasks: form.tasks ? form.tasks.split('،').map(t => t.trim()) : [],
      };
      if (editData) {
        await therapistService.updateFieldTraining(editData.id, payload);
        showSnackbar('تم التحديث', 'success');
      } else {
        await therapistService.createFieldTraining(payload);
        showSnackbar('تم الإنشاء', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchTraining();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleAddEvaluation = async () => {
    if (!evalForm.score) {
      showSnackbar('يرجى إدخال الدرجة', 'warning');
      return;
    }
    try {
      await therapistService.addTrainingEvaluation(evalDialog.id, {
        score: Number(evalForm.score),
        notes: evalForm.notes,
      });
      showSnackbar('تمت إضافة التقييم', 'success');
      setEvalDialog(null);
      setEvalForm({ score: '', notes: '' });
      fetchTraining();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleLogHours = async () => {
    if (!addHours || Number(addHours) <= 0) {
      showSnackbar('يرجى إدخال ساعات صالحة', 'warning');
      return;
    }
    try {
      await therapistService.logTrainingHours(hoursDialog.id, Number(addHours));
      showSnackbar('تم تسجيل الساعات', 'success');
      setHoursDialog(null);
      setAddHours('');
      fetchTraining();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteFieldTraining(id);
      showSnackbar('تم الحذف', 'success');
      fetchTraining();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      traineeName: '',
      traineeNameEn: '',
      type: 'clinical',
      supervisor: '',
      institution: '',
      startDate: '',
      endDate: '',
      totalHours: 480,
      tasks: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      traineeName: item.traineeName,
      traineeNameEn: item.traineeNameEn || '',
      type: item.type,
      supervisor: item.supervisor || '',
      institution: item.institution || '',
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      totalHours: item.totalHours || 480,
      tasks: (item.tasks || []).join('، '),
    });
    setDialogOpen(true);
  };

  const filtered = training.filter(t => {
    const matchSearch =
      !search ||
      t.traineeName?.includes(search) ||
      t.supervisor?.includes(search) ||
      t.institution?.includes(search);
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const getType = v => TRAINING_TYPES.find(t => t.value === v) || TRAINING_TYPES[0];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <TrainingIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              سجل التدريب الميداني
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة ومتابعة التدريب الميداني للمتدربين والمشرفين
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المتدربين', value: stats.total || 0, color: '#b45309' },
          { label: 'نشط حالياً', value: stats.active || 0, color: '#3b82f6' },
          { label: 'مكتمل', value: stats.completed || 0, color: '#22c55e' },
          { label: 'إجمالي الساعات', value: stats.totalHours || 0, color: '#8b5cf6' },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper
              sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: `2px solid ${s.color}20` }}
            >
              <Typography variant="h4" fontWeight={800} color={s.color}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="النوع">
            <MenuItem value="all">الكل</MenuItem>
            {TRAINING_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          sx={{ bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' } }}
        >
          متدرب جديد
        </Button>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <TrainingIcon sx={{ fontSize: 48, color: '#b45309', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد سجلات تدريب</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(t => {
            const type = getType(t.type);
            const progress =
              t.totalHours > 0 ? Math.round((t.completedHours / t.totalHours) * 100) : 0;
            const avgScore =
              t.evaluations?.length > 0
                ? Math.round(
                    t.evaluations.reduce((sum, e) => sum + e.score, 0) / t.evaluations.length
                  )
                : null;
            return (
              <Grid item xs={12} md={6} key={t.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${type.color}25`,
                    '&:hover': { boxShadow: 4 },
                    transition: '0.2s',
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={700}>{t.traineeName}</Typography>
                        {t.traineeNameEn && (
                          <Typography variant="caption" color="text.secondary" fontStyle="italic">
                            {t.traineeNameEn}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={type.label}
                        size="small"
                        sx={{ bgcolor: `${type.color}12`, color: type.color, fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">{t.supervisor}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <InstitutionIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">{t.institution}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" fontWeight={600}>
                          الساعات: {t.completedHours || 0} / {t.totalHours}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: progress >= 100 ? '#22c55e' : type.color,
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                    {t.tasks?.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {t.tasks.map((task, i) => (
                          <Chip
                            key={i}
                            icon={<TaskIcon sx={{ fontSize: '14px !important' }} />}
                            label={task}
                            size="small"
                            sx={{ fontSize: '0.65rem', bgcolor: '#f8fafc' }}
                          />
                        ))}
                      </Box>
                    )}
                    {avgScore !== null && (
                      <Chip
                        icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
                        label={`معدل التقييم: ${avgScore}%`}
                        size="small"
                        sx={{
                          bgcolor: avgScore >= 80 ? '#f0fdf4' : '#fef3c7',
                          color: avgScore >= 80 ? '#059669' : '#b45309',
                          fontWeight: 600,
                          mb: 1,
                        }}
                      />
                    )}
                    {t.evaluations?.length > 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                      >
                        {t.evaluations.length} تقييم مسجل
                      </Typography>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Tooltip title="إضافة تقييم">
                          <IconButton
                            size="small"
                            sx={{ color: '#f59e0b' }}
                            onClick={() => setEvalDialog(t)}
                          >
                            <StarIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تسجيل ساعات">
                          <IconButton
                            size="small"
                            sx={{ color: '#8b5cf6' }}
                            onClick={() => setHoursDialog(t)}
                          >
                            <HoursIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل بيانات المتدرب' : 'متدرب جديد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم المتدرب"
                value={form.traineeName}
                onChange={e => setForm({ ...form, traineeName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم بالإنجليزي"
                value={form.traineeNameEn}
                onChange={e => setForm({ ...form, traineeNameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>نوع التدريب</InputLabel>
                <Select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  label="نوع التدريب"
                >
                  {TRAINING_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="المشرف"
                value={form.supervisor}
                onChange={e => setForm({ ...form, supervisor: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="المؤسسة"
                value={form.institution}
                onChange={e => setForm({ ...form, institution: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البدء"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="إجمالي الساعات"
                value={form.totalHours}
                onChange={e => setForm({ ...form, totalHours: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المهام (مفصولة بفواصل)"
                value={form.tasks}
                onChange={e => setForm({ ...form, tasks: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={!!evalDialog} onClose={() => setEvalDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة تقييم - {evalDialog?.traineeName}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            type="number"
            label="الدرجة (من 100)"
            value={evalForm.score}
            onChange={e => setEvalForm({ ...evalForm, score: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="ملاحظات"
            value={evalForm.notes}
            onChange={e => setEvalForm({ ...evalForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvalDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddEvaluation} sx={{ bgcolor: '#f59e0b' }}>
            إضافة التقييم
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hours Dialog */}
      <Dialog open={!!hoursDialog} onClose={() => setHoursDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>تسجيل ساعات - {hoursDialog?.traineeName}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            الساعات المكتملة: {hoursDialog?.completedHours || 0} / {hoursDialog?.totalHours || 0}
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="عدد الساعات"
            value={addHours}
            onChange={e => setAddHours(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHoursDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleLogHours} sx={{ bgcolor: '#8b5cf6' }}>
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistFieldTraining;
