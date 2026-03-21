/**
 * إدارة المواد الدراسية
 * Subject Management
 */
import { useState, useEffect, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SubjectIcon from '@mui/icons-material/Subject';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const { subjectService } = educationSystemService;

const departments = [
  { value: 'arabic', label: 'اللغة العربية' },
  { value: 'english', label: 'اللغة الإنجليزية' },
  { value: 'math', label: 'الرياضيات' },
  { value: 'science', label: 'العلوم' },
  { value: 'islamic', label: 'التربية الإسلامية' },
  { value: 'social', label: 'الدراسات الاجتماعية' },
  { value: 'pe', label: 'التربية البدنية' },
  { value: 'art', label: 'التربية الفنية' },
  { value: 'computer', label: 'الحاسب الآلي' },
  { value: 'life_skills', label: 'المهارات الحياتية' },
  { value: 'speech_therapy', label: 'تدريب النطق والكلام' },
  { value: 'occupational_therapy', label: 'العلاج الوظيفي' },
  { value: 'behavior_therapy', label: 'تعديل السلوك' },
  { value: 'sensory_integration', label: 'التكامل الحسي' },
  { value: 'other', label: 'أخرى' },
];

const subjectTypes = [
  { value: 'core', label: 'أساسي' },
  { value: 'elective', label: 'اختياري' },
  { value: 'therapy', label: 'علاجي' },
  { value: 'enrichment', label: 'إثرائي' },
  { value: 'vocational', label: 'مهني' },
  { value: 'activity', label: 'نشاط' },
];

const defaultForm = {
  name: '',
  nameEn: '',
  code: '',
  department: '',
  type: 'core',
  weeklyPeriods: 3,
  description: '',
  isActive: true,
};

const SubjectDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(initial ? { ...defaultForm, ...initial } : defaultForm);
  }, [initial, open]);
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل المادة' : 'إضافة مادة جديدة'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="اسم المادة (عربي)"
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
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="رمز المادة"
              name="code"
              value={form.code}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>القسم</InputLabel>
              <Select
                name="department"
                value={form.department}
                onChange={handleChange}
                label="القسم"
              >
                {departments.map(d => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select name="type" value={form.type} onChange={handleChange} label="النوع">
                {subjectTypes.map(t => (
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
              label="الحصص الأسبوعية"
              name="weeklyPeriods"
              type="number"
              value={form.weeklyPeriods}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              label="الوصف"
              name="description"
              value={form.description}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={form.isActive} name="isActive" onChange={handleChange} />}
              label="مادة فعالة"
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
const SubjectManagement = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // dialog
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: page + 1, limit: rowsPerPage };
      if (search) params.search = search;
      const res = filterDept
        ? await subjectService.getByDepartment(filterDept)
        : await subjectService.getAll(params);
      setSubjects(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل المواد');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, filterDept]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleSave = async form => {
    try {
      if (editItem) {
        await subjectService.update(editItem._id, form);
      } else {
        await subjectService.create(form);
      }
      setDlgOpen(false);
      setEditItem(null);
      loadSubjects();
    } catch {
      setError('خطأ في حفظ المادة');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) return;
    try {
      await subjectService.delete(id);
      loadSubjects();
    } catch {
      setError('خطأ في الحذف');
    }
  };

  const handleToggle = async id => {
    try {
      await subjectService.toggleActive(id);
      loadSubjects();
    } catch {
      setError('خطأ');
    }
  };

  const deptLabel = val => departments.find(d => d.value === val)?.label || val;
  const typeLabel = val => subjectTypes.find(t => t.value === val)?.label || val;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.info, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <SubjectIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              المواد الدراسية
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إدارة المقررات والمواد لجميع الأقسام
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditItem(null);
              setDlgOpen(true);
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إضافة مادة
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث عن مادة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>تصفية حسب القسم</InputLabel>
              <Select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                label="تصفية حسب القسم"
              >
                <MenuItem value="">الكل</MenuItem>
                {departments.map(d => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* table */}
      {loading ? (
        <LinearProgress />
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>المادة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحصص</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    إجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      لا توجد مواد
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map(s => (
                    <TableRow key={s._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ width: 32, height: 32, background: gradients.info, fontSize: 14 }}
                          >
                            {s.name?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {s.name}
                            </Typography>
                            {s.nameEn && (
                              <Typography variant="caption" color="text.secondary">
                                {s.nameEn}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.code || '—'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{deptLabel(s.department)}</TableCell>
                      <TableCell>
                        <Chip
                          label={typeLabel(s.type)}
                          size="small"
                          color={
                            s.type === 'core'
                              ? 'primary'
                              : s.type === 'therapy'
                                ? 'warning'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{s.weeklyPeriods}</TableCell>
                      <TableCell>
                        <Chip
                          label={s.isActive ? 'فعالة' : 'معطلة'}
                          size="small"
                          color={s.isActive ? 'success' : 'default'}
                          onClick={() => handleToggle(s._id)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditItem(s);
                              setDlgOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(s._id)}
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
            labelRowsPerPage="عدد الصفوف:"
            labelDisplayedRows={({ from, to }) => `${from}–${to}`}
          />
        </Paper>
      )}

      <SubjectDialog
        open={dlgOpen}
        onClose={() => {
          setDlgOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        initial={editItem}
      />
    </Container>
  );
};

export default SubjectManagement;
