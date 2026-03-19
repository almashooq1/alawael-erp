/**
 * إدارة الأعوام الدراسية
 * Academic Year Management
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
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  RadioButtonUnchecked as InactiveIcon,
  DateRange as SemesterIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { academicYearService } = educationSystemService;

/* ── رسائل فارغة ───────────────────────────────────────────── */
const EmptyState = ({ message }) => (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
    <Typography color="text.secondary">{message}</Typography>
  </Box>
);

/* ── ديالوج العام الدراسي ──────────────────────────────────── */
const defaultForm = {
  name: '',
  nameEn: '',
  startDate: '',
  endDate: '',
  gradingSystem: 'percentage',
  passingGrade: 60,
  maxAbsences: 15,
};

const AcademicYearDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(initial ? { ...defaultForm, ...initial } : defaultForm);
  }, [initial, open]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل العام الدراسي' : 'إضافة عام دراسي جديد'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الاسم (عربي)"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الاسم (إنجليزي)"
              name="nameEn"
              value={form.nameEn}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="تاريخ البداية"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="تاريخ النهاية"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>نظام الدرجات</InputLabel>
              <Select
                name="gradingSystem"
                value={form.gradingSystem}
                onChange={handleChange}
                label="نظام الدرجات"
              >
                <MenuItem value="percentage">نسبة مئوية</MenuItem>
                <MenuItem value="gpa">معدل تراكمي</MenuItem>
                <MenuItem value="letter">رموز حرفية</MenuItem>
                <MenuItem value="descriptive">وصفي</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="حد النجاح"
              name="passingGrade"
              type="number"
              value={form.passingGrade}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="أقصى غياب"
              name="maxAbsences"
              type="number"
              value={form.maxAbsences}
              onChange={handleChange}
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

/* ── ديالوج الفصل الدراسي ─────────────────────────────────── */
const defaultSemesterForm = { name: '', startDate: '', endDate: '' };

const SemesterDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultSemesterForm);
  useEffect(() => {
    setForm(initial ? { ...defaultSemesterForm, ...initial } : defaultSemesterForm);
  }, [initial, open]);
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل الفصل الدراسي' : 'إضافة فصل دراسي'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="اسم الفصل"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="بداية"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="نهاية"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
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

/* ══════════════════════════════════════════════════════════════ */
const AcademicYearManagement = () => {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  // dialogs
  const [yearDlg, setYearDlg] = useState(false);
  const [editYear, setEditYear] = useState(null);
  const [semDlg, setSemDlg] = useState(false);
  const [editSem, setEditSem] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  /* ── load ──────────────────────────────────────── */
  const loadYears = useCallback(async () => {
    try {
      setLoading(true);
      const res = await academicYearService.getAll();
      setYears(res.data?.data || res.data || []);
    } catch (e) {
      setError('حدث خطأ في تحميل الأعوام الدراسية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  /* ── helpers ───────────────────────────────────── */
  const handleSaveYear = async form => {
    try {
      if (editYear) {
        await academicYearService.update(editYear._id, form);
      } else {
        await academicYearService.create(form);
      }
      setYearDlg(false);
      setEditYear(null);
      loadYears();
    } catch {
      setError('حدث خطأ في حفظ البيانات');
    }
  };

  const handleDeleteYear = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العام الدراسي؟')) return;
    try {
      await academicYearService.delete(id);
      loadYears();
    } catch {
      setError('حدث خطأ في الحذف');
    }
  };

  const handleSetCurrent = async id => {
    try {
      await academicYearService.setCurrent(id);
      loadYears();
    } catch {
      setError('حدث خطأ');
    }
  };

  const handleSaveSemester = async form => {
    if (!selectedYear) return;
    try {
      await academicYearService.addSemester(selectedYear._id, form);
      setSemDlg(false);
      setEditSem(null);
      loadYears();
    } catch {
      setError('حدث خطأ في حفظ الفصل الدراسي');
    }
  };

  /* ── render ────────────────────────────────────── */
  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.primary, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <CalendarIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              الأعوام الدراسية
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إدارة الأعوام والفصول الدراسية
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditYear(null);
              setYearDlg(true);
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إضافة عام
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
      ) : years.length === 0 ? (
        <EmptyState message="لا توجد أعوام دراسية بعد" />
      ) : (
        <Grid container spacing={3}>
          {/* years list */}
          <Grid item xs={12} md={5} lg={4}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography fontWeight={700}>قائمة الأعوام الدراسية ({years.length})</Typography>
              </Box>
              <List>
                {years.map(yr => (
                  <React.Fragment key={yr._id}>
                    <ListItem
                      button
                      selected={selectedYear?._id === yr._id}
                      onClick={() => setSelectedYear(yr)}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {!yr.isCurrent && (
                            <Tooltip title="تعيين كعام حالي">
                              <IconButton
                                size="small"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSetCurrent(yr._id);
                                }}
                              >
                                <InactiveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={e => {
                                e.stopPropagation();
                                setEditYear(yr);
                                setYearDlg(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteYear(yr._id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        {yr.isCurrent ? (
                          <ActiveIcon color="success" />
                        ) : (
                          <CalendarIcon color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={yr.name}
                        secondary={yr.isCurrent ? 'العام الحالي' : `${yr.status || ''}`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* year details */}
          <Grid item xs={12} md={7} lg={8}>
            {selectedYear ? (
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
                  <Typography fontWeight={700}>{selectedYear.name} — التفاصيل</Typography>
                  {selectedYear.isCurrent && (
                    <Chip label="العام الحالي" color="success" size="small" icon={<ActiveIcon />} />
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        تاريخ البداية
                      </Typography>
                      <Typography fontWeight={600}>
                        {selectedYear.startDate
                          ? new Date(selectedYear.startDate).toLocaleDateString('ar-SA')
                          : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        تاريخ النهاية
                      </Typography>
                      <Typography fontWeight={600}>
                        {selectedYear.endDate
                          ? new Date(selectedYear.endDate).toLocaleDateString('ar-SA')
                          : '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        نظام الدرجات
                      </Typography>
                      <Typography fontWeight={600}>
                        {selectedYear.settings?.gradingSystem || 'نسبة مئوية'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        حد النجاح
                      </Typography>
                      <Typography fontWeight={600}>
                        {selectedYear.settings?.passingGrade || 60}%
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Typography fontWeight={700}>الفصول الدراسية</Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditSem(null);
                        setSemDlg(true);
                      }}
                    >
                      إضافة فصل
                    </Button>
                  </Box>

                  {selectedYear.semesters?.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>اسم الفصل</TableCell>
                            <TableCell>البداية</TableCell>
                            <TableCell>النهاية</TableCell>
                            <TableCell>الحالة</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedYear.semesters.map((sem, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{sem.name}</TableCell>
                              <TableCell>
                                {sem.startDate
                                  ? new Date(sem.startDate).toLocaleDateString('ar-SA')
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {sem.endDate
                                  ? new Date(sem.endDate).toLocaleDateString('ar-SA')
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={sem.isCurrent ? 'success' : 'default'}
                                  label={sem.isCurrent ? 'حالي' : 'غير فعال'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      لا توجد فصول بعد
                    </Typography>
                  )}
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
                <SemesterIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">اختر عاماً دراسياً لعرض التفاصيل</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* dialogs */}
      <AcademicYearDialog
        open={yearDlg}
        onClose={() => {
          setYearDlg(false);
          setEditYear(null);
        }}
        onSave={handleSaveYear}
        initial={editYear}
      />
      <SemesterDialog
        open={semDlg}
        onClose={() => {
          setSemDlg(false);
          setEditSem(null);
        }}
        onSave={handleSaveSemester}
        initial={editSem}
      />
    </Container>
  );
};

export default AcademicYearManagement;
