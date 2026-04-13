/**
 * إدارة المناهج الدراسية
 * Curriculum Builder
 */
import { useState, useEffect, useCallback } from 'react';




import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { curriculumService } = educationSystemService;

const statusColors = {
  draft: 'default',
  review: 'warning',
  approved: 'success',
  active: 'info',
  archived: 'default',
};
const statusLabels = {
  draft: 'مسودة',
  review: 'قيد المراجعة',
  approved: 'معتمد',
  active: 'فعال',
  archived: 'مؤرشف',
};

/* ── Curriculum Dialog ─────────────────────────────────────── */
const defaultForm = {
  name: '',
  nameEn: '',
  description: '',
  subject: '',
  gradeLevel: '',
  academicYear: '',
};

const CurriculumDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(initial ? { ...defaultForm, ...initial } : defaultForm);
  }, [initial, open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل المنهج' : 'إضافة منهج جديد'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="اسم المنهج (عربي)"
              name="name"
              value={form.name}
              onChange={handle}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الاسم (إنجليزي)"
              name="nameEn"
              value={form.nameEn}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الوصف"
              name="description"
              value={form.description}
              onChange={handle}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="المادة (ID)"
              name="subject"
              value={form.subject}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="المستوى الدراسي"
              name="gradeLevel"
              value={form.gradeLevel}
              onChange={handle}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => onSave(form)}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── Unit Dialog ───────────────────────────────────────────── */
const UnitDialog = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', description: '', order: 1, estimatedWeeks: 2 });
  useEffect(() => {
    if (open) setForm({ name: '', description: '', order: 1, estimatedWeeks: 2 });
  }, [open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إضافة وحدة</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="اسم الوحدة"
              name="name"
              value={form.name}
              onChange={handle}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الوصف"
              name="description"
              value={form.description}
              onChange={handle}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الترتيب"
              name="order"
              type="number"
              value={form.order}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الأسابيع المقدرة"
              name="estimatedWeeks"
              type="number"
              value={form.estimatedWeeks}
              onChange={handle}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => onSave(form)}>
          إضافة
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── Lesson Dialog ─────────────────────────────────────────── */
const LessonDialog = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: '',
    objectives: '',
    teachingMethods: '',
    duration: 45,
  });
  useEffect(() => {
    if (open) setForm({ title: '', objectives: '', teachingMethods: '', duration: 45 });
  }, [open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إضافة درس</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="عنوان الدرس"
              name="title"
              value={form.title}
              onChange={handle}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الأهداف"
              name="objectives"
              value={form.objectives}
              onChange={handle}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              label="طرق التدريس"
              name="teachingMethods"
              value={form.teachingMethods}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="المدة (دقيقة)"
              name="duration"
              type="number"
              value={form.duration}
              onChange={handle}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => onSave(form)}>
          إضافة
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const CurriculumBuilder = () => {
  const navigate = useNavigate();
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // dialogs
  const [curDlg, setCurDlg] = useState(false);
  const [editCur, setEditCur] = useState(null);
  const [unitDlg, setUnitDlg] = useState(false);
  const [lessonDlg, setLessonDlg] = useState(false);
  const [activeUnit, setActiveUnit] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await curriculumService.getAll();
      setCurricula(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل المناهج');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveCurriculum = async form => {
    try {
      if (editCur) await curriculumService.update(editCur._id, form);
      else await curriculumService.create(form);
      setCurDlg(false);
      setEditCur(null);
      load();
    } catch {
      setError('خطأ في حفظ المنهج');
    }
  };

  const handleDeleteCurriculum = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنهج؟')) return;
    try {
      await curriculumService.delete(id);
      if (selected?._id === id) setSelected(null);
      load();
    } catch {
      setError('خطأ');
    }
  };

  const handleAddUnit = async form => {
    if (!selected) return;
    try {
      await curriculumService.addUnit(selected._id, form);
      setUnitDlg(false);
      // reload selected
      const res = await curriculumService.getById(selected._id);
      setSelected(res.data?.data || res.data);
      load();
    } catch {
      setError('خطأ في إضافة الوحدة');
    }
  };

  const handleAddLesson = async form => {
    if (!selected || !activeUnit) return;
    try {
      await curriculumService.addLesson(selected._id, activeUnit, form);
      setLessonDlg(false);
      setActiveUnit(null);
      const res = await curriculumService.getById(selected._id);
      setSelected(res.data?.data || res.data);
    } catch {
      setError('خطأ في إضافة الدرس');
    }
  };

  const handleApprove = async id => {
    try {
      await curriculumService.approve(id);
      load();
      if (selected?._id === id) {
        const res = await curriculumService.getById(id);
        setSelected(res.data?.data || res.data);
      }
    } catch {
      setError('خطأ في الاعتماد');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.accent, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <CurriculumIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              المناهج الدراسية
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              بناء وإدارة المناهج والوحدات والدروس
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditCur(null);
              setCurDlg(true);
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إضافة منهج
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={3}>
          {/* list */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography fontWeight={700}>المناهج ({curricula.length})</Typography>
              </Box>
              {curricula.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد مناهج بعد</Typography>
                </Box>
              ) : (
                <List>
                  {curricula.map(cur => (
                    <React.Fragment key={cur._id}>
                      <ListItem
                        button
                        selected={selected?._id === cur._id}
                        onClick={() => setSelected(cur)}
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              background: gradients.accent,
                              fontSize: 16,
                            }}
                          >
                            {cur.name?.charAt(0)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={cur.name}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              <Chip
                                label={statusLabels[cur.status] || cur.status}
                                size="small"
                                color={statusColors[cur.status] || 'default'}
                              />
                              <Chip
                                label={`${cur.units?.length || 0} وحدة`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              setEditCur(cur);
                              setCurDlg(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteCurriculum(cur._id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* details */}
          <Grid item xs={12} md={8}>
            {selected ? (
              <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography fontWeight={700}>{selected.name}</Typography>
                    {selected.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selected.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selected.status !== 'approved' && selected.status !== 'active' && (
                      <Button
                        size="small"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => handleApprove(selected._id)}
                      >
                        اعتماد
                      </Button>
                    )}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setUnitDlg(true)}>
                      إضافة وحدة
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ p: 2 }}>
                  {selected.units?.length > 0 ? (
                    selected.units.map((unit, idx) => (
                      <Accordion
                        key={idx}
                        sx={{ mb: 1, borderRadius: 2, '&:before': { display: 'none' } }}
                      >
                        <AccordionSummary expandIcon={<ExpandIcon />}>
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}
                          >
                            <Avatar
                              sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}
                            >
                              {idx + 1}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={600}>{unit.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {unit.lessons?.length || 0} درس · {unit.estimatedWeeks || 0} أسبوع
                              </Typography>
                            </Box>
                            <Tooltip title="إضافة درس">
                              <IconButton
                                size="small"
                                onClick={e => {
                                  e.stopPropagation();
                                  setActiveUnit(unit._id || idx);
                                  setLessonDlg(true);
                                }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {unit.lessons?.length > 0 ? (
                            <List dense>
                              {unit.lessons.map((lesson, li) => (
                                <ListItem key={li}>
                                  <ListItemIcon>
                                    <LessonIcon color="action" fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={lesson.title}
                                    secondary={`${lesson.duration || 45} دقيقة${lesson.teachingMethods ? ` · ${lesson.teachingMethods}` : ''}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textAlign: 'center', py: 2 }}
                            >
                              لا توجد دروس بعد
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <UnitIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        لا توجد وحدات — أضف الوحدة الأولى
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
                <CurriculumIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">اختر منهجاً لعرض تفاصيله</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* dialogs */}
      <CurriculumDialog
        open={curDlg}
        onClose={() => {
          setCurDlg(false);
          setEditCur(null);
        }}
        onSave={handleSaveCurriculum}
        initial={editCur}
      />
      <UnitDialog open={unitDlg} onClose={() => setUnitDlg(false)} onSave={handleAddUnit} />
      <LessonDialog
        open={lessonDlg}
        onClose={() => {
          setLessonDlg(false);
          setActiveUnit(null);
        }}
        onSave={handleAddLesson}
      />
    </Container>
  );
};

export default CurriculumBuilder;
