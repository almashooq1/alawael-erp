/**
 * إدارة المعلمين
 * Teacher Management
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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Avatar,
  TablePagination,
  InputAdornment,
  Rating,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as TeacherIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  WorkHistory as WorkloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { teacherService } = educationSystemService;

const specializations = [
  'تربية خاصة',
  'علاج وظيفي',
  'تدريب نطق',
  'تعديل سلوك',
  'تكامل حسي',
  'تعليم عام',
  'تعليم موهوبين',
  'إرشاد نفسي',
];

const defaultForm = {
  name: '',
  nameEn: '',
  email: '',
  phone: '',
  specialization: '',
  yearsOfExperience: 0,
  maxPeriodsPerDay: 6,
  maxPeriodsPerWeek: 25,
};

const TeacherDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    setForm(
      initial
        ? {
            ...defaultForm,
            ...initial,
            maxPeriodsPerDay: initial.workload?.maxPeriodsPerDay || 6,
            maxPeriodsPerWeek: initial.workload?.maxPeriodsPerWeek || 25,
          }
        : defaultForm
    );
  }, [initial, open]);
  const handle = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الاسم (عربي)"
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
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={form.email}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="رقم الهاتف"
              name="phone"
              value={form.phone}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>التخصص</InputLabel>
              <Select
                name="specialization"
                value={form.specialization}
                onChange={handle}
                label="التخصص"
              >
                {specializations.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="سنوات الخبرة"
              name="yearsOfExperience"
              type="number"
              value={form.yearsOfExperience}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="أقصى حصص/يوم"
              name="maxPeriodsPerDay"
              type="number"
              value={form.maxPeriodsPerDay}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="أقصى حصص/أسبوع"
              name="maxPeriodsPerWeek"
              type="number"
              value={form.maxPeriodsPerWeek}
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
              workload: {
                maxPeriodsPerDay: form.maxPeriodsPerDay,
                maxPeriodsPerWeek: form.maxPeriodsPerWeek,
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

/* ── Teacher detail panel */
const TeacherDetail = ({ teacher, onClose }) => (
  <Dialog open={!!teacher} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل المعلم</DialogTitle>
    <DialogContent dividers>
      {teacher && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 64, height: 64, background: gradients.success, fontSize: 28 }}>
              {teacher.name?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {teacher.name}
              </Typography>
              {teacher.nameEn && <Typography color="text.secondary">{teacher.nameEn}</Typography>}
              <Chip label={teacher.specialization || 'غير محدد'} size="small" sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                البريد الإلكتروني
              </Typography>
              <Typography>{teacher.email || '—'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                الهاتف
              </Typography>
              <Typography>{teacher.phone || '—'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                سنوات الخبرة
              </Typography>
              <Typography>{teacher.yearsOfExperience || 0} سنة</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                الحالة
              </Typography>
              <Chip
                label={teacher.isActive ? 'فعال' : 'غير فعال'}
                size="small"
                color={teacher.isActive ? 'success' : 'default'}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                أقصى حصص/يوم
              </Typography>
              <Typography>{teacher.workload?.maxPeriodsPerDay || 6}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                أقصى حصص/أسبوع
              </Typography>
              <Typography>{teacher.workload?.maxPeriodsPerWeek || 25}</Typography>
            </Grid>
          </Grid>
          {teacher.performanceRatings?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                التقييمات
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating
                  value={
                    teacher.performanceRatings.reduce((a, r) => a + r.rating, 0) /
                    teacher.performanceRatings.length
                  }
                  readOnly
                  precision={0.5}
                />
                <Typography variant="body2" color="text.secondary">
                  ({teacher.performanceRatings.length} تقييم)
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إغلاق</Button>
    </DialogActions>
  </Dialog>
);

/* ══════════════════════════════════════════════════════════════ */
const TeacherManagement = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherService.getAll({ page: page + 1, limit: rowsPerPage, search });
      setTeachers(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل بيانات المعلمين');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async form => {
    try {
      if (editItem) await teacherService.update(editItem._id, form);
      else await teacherService.create(form);
      setDlgOpen(false);
      setEditItem(null);
      load();
    } catch {
      setError('خطأ في حفظ البيانات');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المعلم؟')) return;
    try {
      await teacherService.delete(id);
      load();
    } catch {
      setError('خطأ في الحذف');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.success, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <TeacherIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              المعلمون
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إدارة بيانات المعلمين والمدربين والأخصائيين
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
            إضافة معلم
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* search */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث بالاسم أو التخصص..."
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
                  <TableCell sx={{ fontWeight: 700 }}>المعلم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التخصص</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الخبرة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التواصل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    إجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      لا يوجد معلمون
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map(t => (
                    <TableRow
                      key={t._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setViewItem(t)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ background: gradients.success }}>
                            {t.name?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {t.name}
                            </Typography>
                            {t.nameEn && (
                              <Typography variant="caption" color="text.secondary">
                                {t.nameEn}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={t.specialization || '—'} size="small" />
                      </TableCell>
                      <TableCell>{t.yearsOfExperience || 0} سنة</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {t.email && (
                            <Tooltip title={t.email}>
                              <EmailIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                          {t.phone && (
                            <Tooltip title={t.phone}>
                              <PhoneIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t.isActive !== false ? 'فعال' : 'غير فعال'}
                          size="small"
                          color={t.isActive !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center" onClick={e => e.stopPropagation()}>
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditItem(t);
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
                            onClick={() => handleDelete(t._id)}
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

      <TeacherDialog
        open={dlgOpen}
        onClose={() => {
          setDlgOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        initial={editItem}
      />
      <TeacherDetail teacher={viewItem} onClose={() => setViewItem(null)} />
    </Container>
  );
};

export default TeacherManagement;
