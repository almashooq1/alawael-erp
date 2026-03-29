/**
 * سجل الدرجات
 * Gradebook Page
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,  LinearProgress,
  Alert,  Avatar,  Divider,} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Grade as GradeIcon,
  ArrowBack as BackIcon,
  Lock as FinalizeIcon,
  Person as StudentIcon,
  } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { gradebookService } = educationSystemService;

const gradeColors = {
  'A+': '#1b5e20',
  A: '#2e7d32',
  'B+': '#1565c0',
  B: '#1976d2',
  'C+': '#f57f17',
  C: '#ff8f00',
  'D+': '#e65100',
  D: '#bf360c',
  F: '#b71c1c',
};

/* ── Gradebook Dialog ──────────────────────────────────────── */
const defaultForm = { subject: '', classroom: '', academicYear: '', semester: '', teacher: '' };

const GradebookDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(initial ? { ...defaultForm, ...initial } : defaultForm);
  }, [initial, open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل سجل الدرجات' : 'إنشاء سجل درجات'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="المادة (ID)"
              name="subject"
              value={form.subject}
              onChange={handle}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الفصل (ID)"
              name="classroom"
              value={form.classroom}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="العام الدراسي (ID)"
              name="academicYear"
              value={form.academicYear}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="الفصل الدراسي"
              name="semester"
              value={form.semester}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="المعلم (ID)"
              name="teacher"
              value={form.teacher}
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

/* ── Grade Entry Dialog ────────────────────────────────────── */
const defaultEntry = {
  student: '',
  assignments: 0,
  midterm: 0,
  final: 0,
  participation: 0,
  practical: 0,
};

const EntryDialog = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(defaultEntry);
  useEffect(() => {
    if (open) setForm(defaultEntry);
  }, [open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إضافة درجة طالب</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الطالب (ID)"
              name="student"
              value={form.student}
              onChange={handle}
              required
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="الواجبات"
              name="assignments"
              type="number"
              value={form.assignments}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="نصفي"
              name="midterm"
              type="number"
              value={form.midterm}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="نهائي"
              name="final"
              type="number"
              value={form.final}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="المشاركة"
              name="participation"
              type="number"
              value={form.participation}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="العملي"
              name="practical"
              type="number"
              value={form.practical}
              onChange={handle}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={() =>
            onSave({
              ...form,
              scores: {
                assignments: Number(form.assignments),
                midterm: Number(form.midterm),
                final: Number(form.final),
                participation: Number(form.participation),
                practical: Number(form.practical),
              },
            })
          }
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── Stats cards ───────────────────────────────────────────── */
const StatsRow = ({ entries }) => {
  if (!entries?.length) return null;
  const totals = entries.map(e => e.totalPercentage || 0).filter(Boolean);
  if (!totals.length) return null;
  const avg = (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1);
  const max = Math.max(...totals).toFixed(1);
  const min = Math.min(...totals).toFixed(1);
  const passed = totals.filter(t => t >= 60).length;

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {[
        { label: 'المتوسط', value: `${avg}%`, gradient: gradients.info },
        { label: 'الأعلى', value: `${max}%`, gradient: gradients.success },
        { label: 'الأدنى', value: `${min}%`, gradient: gradients.warning },
        { label: 'الناجحون', value: `${passed}/${totals.length}`, gradient: gradients.primary },
      ].map((s, i) => (
        <Grid item xs={6} sm={3} key={i}>
          <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: s.gradient }} />
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {s.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const GradebookPage = () => {
  const navigate = useNavigate();
  const [gradebooks, setGradebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(0);

  const [gbDlg, setGbDlg] = useState(false);
  const [editGb, setEditGb] = useState(null);
  const [entryDlg, setEntryDlg] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gradebookService.getAll();
      setGradebooks(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل سجلات الدرجات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveGradebook = async form => {
    try {
      if (editGb) await gradebookService.update(editGb._id, form);
      else await gradebookService.create(form);
      setGbDlg(false);
      setEditGb(null);
      load();
    } catch {
      setError('خطأ في حفظ السجل');
    }
  };

  const handleDeleteGradebook = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await gradebookService.delete(id);
      if (selected?._id === id) setSelected(null);
      load();
    } catch {
      setError('خطأ');
    }
  };

  const handleAddEntry = async form => {
    if (!selected) return;
    try {
      await gradebookService.addEntry(selected._id, form);
      setEntryDlg(false);
      const res = await gradebookService.getById(selected._id);
      setSelected(res.data?.data || res.data);
      load();
    } catch {
      setError('خطأ في إضافة الدرجة');
    }
  };

  const handleFinalize = async () => {
    if (!selected) return;
    try {
      await gradebookService.finalize(selected._id);
      const res = await gradebookService.getById(selected._id);
      setSelected(res.data?.data || res.data);
      load();
    } catch {
      setError('خطأ في الاعتماد');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.fire, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <GradeIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              سجل الدرجات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إدارة درجات الطلاب والتقارير الفصلية
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditGb(null);
              setGbDlg(true);
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إنشاء سجل
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
                <Typography fontWeight={700}>سجلات الدرجات ({gradebooks.length})</Typography>
              </Box>
              {gradebooks.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد سجلات بعد</Typography>
                </Box>
              ) : (
                <Box>
                  {gradebooks.map(gb => (
                    <React.Fragment key={gb._id}>
                      <Box
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          bgcolor: selected?._id === gb._id ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onClick={() => setSelected(gb)}
                      >
                        <Box>
                          <Typography fontWeight={600}>
                            {gb.subject?.name || gb.subject || 'مادة'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Chip
                              label={gb.isFinalized ? 'معتمد' : 'قيد التعديل'}
                              size="small"
                              color={gb.isFinalized ? 'success' : 'default'}
                            />
                            <Chip
                              label={`${gb.entries?.length || 0} طالب`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              setEditGb(gb);
                              setGbDlg(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteGradebook(gb._id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Divider />
                    </React.Fragment>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* detail */}
          <Grid item xs={12} md={8}>
            {selected ? (
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
                    <Typography fontWeight={700}>
                      {selected.subject?.name || selected.subject || 'سجل الدرجات'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      <Chip
                        label={selected.isFinalized ? 'معتمد' : 'قيد التعديل'}
                        size="small"
                        color={selected.isFinalized ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!selected.isFinalized && (
                      <>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setEntryDlg(true)}
                        >
                          إضافة درجة
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<FinalizeIcon />}
                          onClick={handleFinalize}
                        >
                          اعتماد النتائج
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
                <Box sx={{ p: 2 }}>
                  <StatsRow entries={selected.entries} />

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>الطالب</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            الواجبات
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            نصفي
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            نهائي
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            المشاركة
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            المجموع
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            النسبة
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">
                            التقدير
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selected.entries?.length > 0 ? (
                          selected.entries.map((entry, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                                    <StudentIcon fontSize="small" />
                                  </Avatar>
                                  <Typography variant="body2">
                                    {entry.student?.name || entry.student || '—'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                {entry.scores?.assignments ?? '—'}
                              </TableCell>
                              <TableCell align="center">{entry.scores?.midterm ?? '—'}</TableCell>
                              <TableCell align="center">{entry.scores?.final ?? '—'}</TableCell>
                              <TableCell align="center">
                                {entry.scores?.participation ?? '—'}
                              </TableCell>
                              <TableCell align="center">
                                <Typography fontWeight={700}>{entry.totalScore ?? '—'}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                {entry.totalPercentage ? `${entry.totalPercentage}%` : '—'}
                              </TableCell>
                              <TableCell align="center">
                                {entry.letterGrade ? (
                                  <Chip
                                    label={entry.letterGrade}
                                    size="small"
                                    sx={{
                                      fontWeight: 700,
                                      color: '#fff',
                                      bgcolor: gradeColors[entry.letterGrade] || '#757575',
                                    }}
                                  />
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                              <StudentIcon
                                sx={{
                                  fontSize: 40,
                                  color: 'text.disabled',
                                  mb: 1,
                                  display: 'block',
                                  mx: 'auto',
                                }}
                              />
                              <Typography color="text.secondary">
                                لا توجد درجات — أضف درجة الطالب الأول
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
                <GradeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">اختر سجلاً لعرض الدرجات</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      <GradebookDialog
        open={gbDlg}
        onClose={() => {
          setGbDlg(false);
          setEditGb(null);
        }}
        onSave={handleSaveGradebook}
        initial={editGb}
      />
      <EntryDialog open={entryDlg} onClose={() => setEntryDlg(false)} onSave={handleAddEntry} />
    </Container>
  );
};

export default GradebookPage;
