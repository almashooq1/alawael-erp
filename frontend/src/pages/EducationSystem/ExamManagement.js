/**
 * إدارة الاختبارات
 * Exam Management
 */
import { useState, useEffect, useCallback } from 'react';




import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { examService } = educationSystemService;

const examTypes = [
  { value: 'midterm', label: 'اختبار نصفي' },
  { value: 'final', label: 'اختبار نهائي' },
  { value: 'quiz', label: 'اختبار قصير' },
  { value: 'oral', label: 'اختبار شفهي' },
  { value: 'practical', label: 'اختبار عملي' },
  { value: 'diagnostic', label: 'اختبار تشخيصي' },
  { value: 'formative', label: 'تقويم بنائي' },
  { value: 'iep_assessment', label: 'تقييم IEP' },
];

const statusColors = {
  draft: 'default',
  scheduled: 'info',
  active: 'warning',
  completed: 'success',
  graded: 'primary',
  cancelled: 'error',
};
const statusLabels = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  active: 'جارٍ',
  completed: 'مكتمل',
  graded: 'مصحح',
  cancelled: 'ملغي',
};

const questionTypes = [
  { value: 'multiple_choice', label: 'اختيار من متعدد' },
  { value: 'true_false', label: 'صح أو خطأ' },
  { value: 'short_answer', label: 'إجابة قصيرة' },
  { value: 'essay', label: 'مقالي' },
  { value: 'matching', label: 'توصيل' },
  { value: 'fill_blank', label: 'ملء فراغات' },
  { value: 'ordering', label: 'ترتيب' },
  { value: 'practical', label: 'عملي' },
];

/* ── Exam Dialog ───────────────────────────────────────────── */
const defaultForm = {
  title: '',
  titleEn: '',
  type: 'quiz',
  subject: '',
  duration: 60,
  totalPoints: 100,
  passingScore: 60,
  instructions: '',
};

const ExamDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(initial ? { ...defaultForm, ...initial } : defaultForm);
  }, [initial, open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="عنوان الاختبار (عربي)"
              name="title"
              value={form.title}
              onChange={handle}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="العنوان (إنجليزي)"
              name="titleEn"
              value={form.titleEn}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select name="type" value={form.type} onChange={handle} label="النوع">
                {examTypes.map(t => (
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
              label="المادة (ID)"
              name="subject"
              value={form.subject}
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
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="الدرجة الكلية"
              name="totalPoints"
              type="number"
              value={form.totalPoints}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="درجة النجاح"
              name="passingScore"
              type="number"
              value={form.passingScore}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="التعليمات"
              name="instructions"
              value={form.instructions}
              onChange={handle}
              multiline
              rows={2}
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

/* ── Question Dialog ───────────────────────────────────────── */
const defaultQuestion = {
  text: '',
  type: 'multiple_choice',
  points: 5,
  options: ['', '', '', ''],
  correctAnswer: '',
};

const QuestionDialog = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(defaultQuestion);
  useEffect(() => {
    if (open) setForm(defaultQuestion);
  }, [open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleOption = (idx, val) => {
    const opts = [...form.options];
    opts[idx] = val;
    setForm(p => ({ ...p, options: opts }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إضافة سؤال</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="نص السؤال"
              name="text"
              value={form.text}
              onChange={handle}
              required
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>نوع السؤال</InputLabel>
              <Select name="type" value={form.type} onChange={handle} label="نوع السؤال">
                {questionTypes.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الدرجة"
              name="points"
              type="number"
              value={form.points}
              onChange={handle}
            />
          </Grid>

          {(form.type === 'multiple_choice' || form.type === 'matching') && (
            <>
              {form.options.map((opt, i) => (
                <Grid item xs={6} key={i}>
                  <TextField
                    fullWidth
                    label={`الخيار ${i + 1}`}
                    value={opt}
                    onChange={e => handleOption(i, e.target.value)}
                    size="small"
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الإجابة الصحيحة"
                  name="correctAnswer"
                  value={form.correctAnswer}
                  onChange={handle}
                />
              </Grid>
            </>
          )}

          {form.type === 'true_false' && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>الإجابة الصحيحة</InputLabel>
                <Select
                  name="correctAnswer"
                  value={form.correctAnswer}
                  onChange={handle}
                  label="الإجابة الصحيحة"
                >
                  <MenuItem value="true">صح</MenuItem>
                  <MenuItem value="false">خطأ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
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
const ExamManagement = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [examDlg, setExamDlg] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [qDlg, setQDlg] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await examService.getAll({ page: page + 1, limit: rowsPerPage });
      setExams(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل الاختبارات');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveExam = async form => {
    try {
      if (editExam) await examService.update(editExam._id, form);
      else await examService.create(form);
      setExamDlg(false);
      setEditExam(null);
      load();
    } catch {
      setError('خطأ في حفظ الاختبار');
    }
  };

  const handleDeleteExam = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;
    try {
      await examService.delete(id);
      if (selected?._id === id) setSelected(null);
      load();
    } catch {
      setError('خطأ');
    }
  };

  const handleAddQuestion = async form => {
    if (!selected) return;
    try {
      await examService.addQuestion(selected._id, form);
      setQDlg(false);
      const res = await examService.getById(selected._id);
      setSelected(res.data?.data || res.data);
      load();
    } catch {
      setError('خطأ في إضافة السؤال');
    }
  };

  const typeLabel = val => examTypes.find(t => t.value === val)?.label || val;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.orange, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <ExamIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              الاختبارات والتقويم
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إنشاء وإدارة الاختبارات والأسئلة والتصحيح
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditExam(null);
              setExamDlg(true);
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إنشاء اختبار
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
          <Grid item xs={12} md={selected ? 5 : 12}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>الاختبار</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>المدة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الدرجة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">
                        إجراءات
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          لا توجد اختبارات
                        </TableCell>
                      </TableRow>
                    ) : (
                      exams.map(ex => (
                        <TableRow
                          key={ex._id}
                          hover
                          selected={selected?._id === ex._id}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelected(ex)}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  background: gradients.orange,
                                  fontSize: 14,
                                }}
                              >
                                {ex.title?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {ex.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {ex.questions?.length || 0} سؤال
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={typeLabel(ex.type)} size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <TimerIcon fontSize="small" color="action" />
                              {ex.duration} د
                            </Box>
                          </TableCell>
                          <TableCell>{ex.totalPoints}</TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabels[ex.status] || ex.status}
                              size="small"
                              color={statusColors[ex.status] || 'default'}
                            />
                          </TableCell>
                          <TableCell align="center" onClick={e => e.stopPropagation()}>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditExam(ex);
                                  setExamDlg(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteExam(ex._id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={-1}
                page={page}
                onPageChange={(e, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="عدد:"
                labelDisplayedRows={({ from, to }) => `${from}–${to}`}
              />
            </Paper>
          </Grid>

          {/* detail */}
          {selected && (
            <Grid item xs={12} md={7}>
              <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography fontWeight={700}>{selected.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      <Chip label={typeLabel(selected.type)} size="small" />
                      <Chip
                        label={`${selected.duration} دقيقة`}
                        size="small"
                        variant="outlined"
                        icon={<TimerIcon />}
                      />
                      <Chip
                        label={`${selected.totalPoints} درجة`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setQDlg(true)}>
                    إضافة سؤال
                  </Button>
                </Box>
                <Box sx={{ p: 2 }}>
                  {selected.instructions && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {selected.instructions}
                    </Alert>
                  )}

                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    الأسئلة ({selected.questions?.length || 0})
                  </Typography>
                  {selected.questions?.length > 0 ? (
                    <List>
                      {selected.questions.map((q, idx) => (
                        <React.Fragment key={idx}>
                          <ListItem
                            sx={{
                              bgcolor: idx % 2 === 0 ? 'grey.50' : 'transparent',
                              borderRadius: 1,
                            }}
                          >
                            <ListItemIcon>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: 'primary.main',
                                  fontSize: 12,
                                }}
                              >
                                {idx + 1}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={q.text}
                              secondary={
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                  <Chip
                                    label={
                                      questionTypes.find(t => t.value === q.type)?.label || q.type
                                    }
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip label={`${q.points} درجة`} size="small" />
                                </Box>
                              }
                            />
                          </ListItem>
                          {idx < selected.questions.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <QuestionIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        لا توجد أسئلة — أضف السؤال الأول
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      <ExamDialog
        open={examDlg}
        onClose={() => {
          setExamDlg(false);
          setEditExam(null);
        }}
        onSave={handleSaveExam}
        initial={editExam}
      />
      <QuestionDialog open={qDlg} onClose={() => setQDlg(false)} onSave={handleAddQuestion} />
    </Container>
  );
};

export default ExamManagement;
