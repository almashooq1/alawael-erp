/**
 * إدارة الفصول الدراسية
 * Classroom Management
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  Button,
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
  Switch,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MeetingRoom as ClassroomIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Accessible as AccessIcon,
  People as PeopleIcon,
  Tv as EquipIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';
import educationSystemService from '../../services/educationSystem.service';

const { classroomService } = educationSystemService;

const roomTypes = [
  { value: 'regular', label: 'فصل عادي' },
  { value: 'lab', label: 'معمل' },
  { value: 'computer_lab', label: 'معمل حاسب' },
  { value: 'art_room', label: 'قاعة فنون' },
  { value: 'music_room', label: 'قاعة موسيقى' },
  { value: 'therapy_room', label: 'غرفة علاج' },
  { value: 'sensory_room', label: 'غرفة حسية' },
  { value: 'speech_room', label: 'غرفة نطق' },
  { value: 'gym', label: 'صالة رياضية' },
  { value: 'library', label: 'مكتبة' },
  { value: 'auditorium', label: 'قاعة مؤتمرات' },
  { value: 'outdoor', label: 'مساحة خارجية' },
  { value: 'virtual', label: 'فصل افتراضي' },
  { value: 'multi_purpose', label: 'متعددة الأغراض' },
];

const accessibilityFeatures = [
  { key: 'wheelchairAccessible', label: 'كرسي متحرك' },
  { key: 'hasRamp', label: 'منحدر' },
  { key: 'hasElevatorAccess', label: 'مصعد' },
  { key: 'hearingLoop', label: 'دائرة سمعية' },
  { key: 'brailleSignage', label: 'لوحات برايل' },
  { key: 'adjustableDesks', label: 'مكاتب قابلة للتعديل' },
  { key: 'softLighting', label: 'إضاءة هادئة' },
  { key: 'soundproofing', label: 'عزل صوتي' },
];

const defaultForm = {
  name: '',
  nameEn: '',
  roomNumber: '',
  type: 'regular',
  building: '',
  floor: 0,
  capacity: 20,
  isActive: true,
  accessibility: {},
};

const ClassroomDialog = ({ open, onClose, onSave, initial }) => {
  const [form, setForm] = useState(defaultForm);
  useEffect(() => {
    if (initial) {
      setForm({ ...defaultForm, ...initial, accessibility: initial.accessibility || {} });
    } else setForm(defaultForm);
  }, [initial, open]);

  const handle = e => {
    const { name, value, type: inputType, checked } = e.target;
    setForm(p => ({ ...p, [name]: inputType === 'checkbox' ? checked : value }));
  };
  const handleAccess = key => {
    setForm(p => ({ ...p, accessibility: { ...p.accessibility, [key]: !p.accessibility[key] } }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? 'تعديل الفصل' : 'إضافة فصل جديد'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="اسم الفصل (عربي)"
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
              label="رقم الغرفة"
              name="roomNumber"
              value={form.roomNumber}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select name="type" value={form.type} onChange={handle} label="النوع">
                {roomTypes.map(t => (
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
              label="السعة"
              name="capacity"
              type="number"
              value={form.capacity}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="المبنى"
              name="building"
              value={form.building}
              onChange={handle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الطابق"
              name="floor"
              type="number"
              value={form.floor}
              onChange={handle}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              ميزات الوصول
            </Typography>
            <FormGroup row>
              {accessibilityFeatures.map(f => (
                <FormControlLabel
                  key={f.key}
                  control={
                    <Checkbox
                      checked={!!form.accessibility[f.key]}
                      onChange={() => handleAccess(f.key)}
                      size="small"
                    />
                  }
                  label={f.label}
                />
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={form.isActive} name="isActive" onChange={handle} />}
              label="فصل فعال"
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
const ClassroomManagement = () => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await classroomService.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search,
        type: filterType || undefined,
      });
      setClassrooms(res.data?.data || res.data || []);
    } catch {
      setError('خطأ في تحميل الفصول');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async form => {
    try {
      if (editItem) await classroomService.update(editItem._id, form);
      else await classroomService.create(form);
      setDlgOpen(false);
      setEditItem(null);
      load();
    } catch {
      setError('خطأ في الحفظ');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;
    try {
      await classroomService.delete(id);
      load();
    } catch {
      setError('خطأ');
    }
  };

  const typeLabel = val => roomTypes.find(t => t.value === val)?.label || val;
  const accessCount = acc => (acc ? Object.values(acc).filter(Boolean).length : 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* header */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.ocean, color: '#fff' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/education-system')} sx={{ color: '#fff' }}>
            <BackIcon />
          </IconButton>
          <ClassroomIcon sx={{ fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              الفصول الدراسية
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              إدارة القاعات والغرف مع ميزات الوصول
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
            إضافة فصل
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
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الفصل</InputLabel>
              <Select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                label="نوع الفصل"
              >
                <MenuItem value="">الكل</MenuItem>
                {roomTypes.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>الفصل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الغرفة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>السعة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المبنى / الطابق</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الوصول</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    إجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      لا توجد فصول
                    </TableCell>
                  </TableRow>
                ) : (
                  classrooms.map(c => (
                    <TableRow key={c._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              background: gradients.ocean,
                              fontSize: 14,
                            }}
                          >
                            {c.name?.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {c.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{c.roomNumber || '—'}</TableCell>
                      <TableCell>
                        <Chip label={typeLabel(c.type)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PeopleIcon fontSize="small" color="action" />
                          {c.capacity || 0}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {c.building || '—'} / {c.floor ?? '—'}
                      </TableCell>
                      <TableCell>
                        {accessCount(c.accessibility) > 0 ? (
                          <Chip
                            icon={<AccessIcon />}
                            label={`${accessCount(c.accessibility)} ميزة`}
                            size="small"
                            color="info"
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.isActive !== false ? 'فعال' : 'معطل'}
                          size="small"
                          color={c.isActive !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditItem(c);
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
                            onClick={() => handleDelete(c._id)}
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

      <ClassroomDialog
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

export default ClassroomManagement;
