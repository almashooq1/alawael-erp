/**
 * الجدول الدراسي
 * Timetable Builder
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  Button,  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,  LinearProgress,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Schedule as TimetableIcon,
  ArrowBack as BackIcon,
  Publish as PublishIcon,
  ViewWeek as WeekIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { timetableService } = educationSystemService;

const days = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الاثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
];

const dayColors = {
  sunday: '#e3f2fd',
  monday: '#f3e5f5',
  tuesday: '#e8f5e9',
  wednesday: '#fff3e0',
  thursday: '#fce4ec',
};

/* ── Timetable form dialog */
const defaultForm = { name: '', nameEn: '', classroom: '', academicYear: '', semester: '' };

const TimetableDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(initial ? { ...defaultForm, ...initial } : defaultForm);
  }, [initial, open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل الجدول' : 'إنشاء جدول جديد'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="اسم الجدول (عربي)"
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
          <Grid item xs={4}>
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

/* ── Slot dialog */
const defaultSlot = {
  day: 'sunday',
  periodNumber: 1,
  startTime: '08:00',
  endTime: '08:45',
  subject: '',
  teacher: '',
  type: 'class',
};
const slotTypes = [
  { value: 'class', label: 'حصة دراسية' },
  { value: 'break', label: 'استراحة' },
  { value: 'prayer', label: 'صلاة' },
  { value: 'assembly', label: 'طابور' },
  { value: 'activity', label: 'نشاط' },
  { value: 'therapy', label: 'جلسة علاج' },
  { value: 'free', label: 'فراغ' },
];

const SlotDialog = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(defaultSlot);
  useEffect(() => {
    if (open) setForm(defaultSlot);
  }, [open]);
  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إضافة حصة</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>اليوم</InputLabel>
              <Select name="day" value={form.day} onChange={handle} label="اليوم">
                {days.map(d => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="رقم الحصة"
              name="periodNumber"
              type="number"
              value={form.periodNumber}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select name="type" value={form.type} onChange={handle} label="النوع">
                {slotTypes.map(t => (
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
              label="وقت البداية"
              name="startTime"
              type="time"
              value={form.startTime}
              onChange={handle}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="وقت النهاية"
              name="endTime"
              type="time"
              value={form.endTime}
              onChange={handle}
              InputLabelProps={{ shrink: true }}
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
          إضافة
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── Timetable grid view ───────────────────────────────────── */
const TimetableGrid = ({ timetable }) => {
  const slots = timetable?.slots || [];
  const maxPeriod = Math.max(7, ...slots.map(s => s.periodNumber || 0));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const getSlot = (day, period) => slots.find(s => s.day === day && s.periodNumber === period);

  const slotColor = type => {
    const map = {
      class: '#e3f2fd',
      break: '#fff9c4',
      prayer: '#e8f5e9',
      assembly: '#f3e5f5',
      therapy: '#fce4ec',
      activity: '#e0f7fa',
      free: '#f5f5f5',
    };
    return map[type] || '#fff';
  };

  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 700 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 60 }}>الحصة</TableCell>
            {days.map(d => (
              <TableCell
                key={d.value}
                align="center"
                sx={{ fontWeight: 700, bgcolor: dayColors[d.value] }}
              >
                {d.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {periods.map(p => (
            <TableRow key={p}>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>{p}</TableCell>
              {days.map(d => {
                const slot = getSlot(d.value, p);
                return (
                  <TableCell
                    key={d.value}
                    align="center"
                    sx={{
                      bgcolor: slot ? slotColor(slot.type) : '#fafafa',
                      border: '1px solid #eee',
                      minWidth: 100,
                      py: 1,
                    }}
                  >
                    {slot ? (
                      <Box>
                        <Typography variant="caption" fontWeight={700} display="block">
                          {slot.subject?.name ||
                            slot.subjectName ||
                            slotTypes.find(t => t.value === slot.type)?.label ||
                            slot.type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {slot.startTime} - {slot.endTime}
                        </Typography>
                        {slot.teacher?.name && (
                          <Typography variant="caption" color="primary.main" display="block">
                            {slot.teacher.name}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const TimetableBuilder = () => {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const [ttDlg, setTtDlg] = useState(false);
  const [editTt, setEditTt] = useState(null);
  const [slotDlg, setSlotDlg] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await timetableService.getAll();
      setTimetables(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل الجداول');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveTimetable = async form => {
    try {
      if (editTt) await timetableService.update(editTt._id, form);
      else await timetableService.create(form);
      setTtDlg(false);
      setEditTt(null);
      load();
    } catch {
      setError('خطأ في حفظ الجدول');
    }
  };

  const handleDeleteTimetable = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجدول؟')) return;
    try {
      await timetableService.delete(id);
      if (selected?._id === id) setSelected(null);
      load();
    } catch {
      setError('خطأ');
    }
  };

  const handleAddSlot = async form => {
    if (!selected) return;
    try {
      await timetableService.addSlot(selected._id, form);
      setSlotDlg(false);
      const res = await timetableService.getById(selected._id);
      setSelected(res.data?.data || res.data);
      load();
    } catch {
      setError('خطأ في إضافة الحصة');
    }
  };

  const handlePublish = async () => {
    if (!selected) return;
    try {
      await timetableService.publish(selected._id);
      load();
      const res = await timetableService.getById(selected._id);
      setSelected(res.data?.data || res.data);
    } catch {
      setError('خطأ في النشر');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.warning, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <TimetableIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              الجدول الدراسي
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إنشاء وإدارة الجداول الدراسية الأسبوعية
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditTt(null);
              setTtDlg(true);
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إنشاء جدول
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
        <>
          {/* timetable selector */}
          <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography fontWeight={700} sx={{ mr: 1 }}>
                الجداول:
              </Typography>
              {timetables.length === 0 ? (
                <Typography color="text.secondary">لا توجد جداول بعد</Typography>
              ) : (
                timetables.map(tt => (
                  <Chip
                    key={tt._id}
                    label={tt.name}
                    onClick={() => setSelected(tt)}
                    onDelete={() => handleDeleteTimetable(tt._id)}
                    color={selected?._id === tt._id ? 'primary' : 'default'}
                    variant={selected?._id === tt._id ? 'filled' : 'outlined'}
                    icon={<TimetableIcon />}
                  />
                ))
              )}
            </Box>
          </Paper>

          {/* timetable view */}
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
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Chip
                      label={selected.status === 'published' ? 'منشور' : 'مسودة'}
                      size="small"
                      color={selected.status === 'published' ? 'success' : 'default'}
                    />
                    <Chip
                      label={`${selected.slots?.length || 0} حصة`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setSlotDlg(true)}>
                    إضافة حصة
                  </Button>
                  {selected.status !== 'published' && (
                    <Button
                      size="small"
                      color="success"
                      startIcon={<PublishIcon />}
                      onClick={handlePublish}
                    >
                      نشر
                    </Button>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditTt(selected);
                      setTtDlg(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ p: 2 }}>
                <TimetableGrid timetable={selected} />
              </Box>
            </Paper>
          ) : (
            timetables.length > 0 && (
              <Paper sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
                <WeekIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">اختر جدولاً لعرضه</Typography>
              </Paper>
            )
          )}
        </>
      )}

      <TimetableDialog
        open={ttDlg}
        onClose={() => {
          setTtDlg(false);
          setEditTt(null);
        }}
        onSave={handleSaveTimetable}
        initial={editTt}
      />
      <SlotDialog open={slotDlg} onClose={() => setSlotDlg(false)} onSave={handleAddSlot} />
    </Container>
  );
};

export default TimetableBuilder;
