import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import BookIcon from '@mui/icons-material/Book';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const CATEGORIES = [
  { id: 'mobility', nameAr: 'أجهزة التنقل', icon: '🦽', color: '#3b82f6' },
  { id: 'sensory', nameAr: 'أدوات حسية', icon: '👁️', color: '#8b5cf6' },
  { id: 'exercise', nameAr: 'معدات تمارين', icon: '🏋️', color: '#10b981' },
  { id: 'assistive', nameAr: 'أجهزة مساعدة', icon: '🦾', color: '#f59e0b' },
  { id: 'diagnostic', nameAr: 'أجهزة تشخيص', icon: '🔬', color: '#ef4444' },
  { id: 'therapeutic', nameAr: 'أدوات علاجية', icon: '💊', color: '#ec4899' },
];

const STATUS_MAP = {
  available: { label: 'متاحة', color: '#22c55e', icon: <AvailableIcon /> },
  'in-use': { label: 'مستخدمة', color: '#3b82f6', icon: <UnavailableIcon /> },
  maintenance: { label: 'صيانة', color: '#f59e0b', icon: <MaintenanceIcon /> },
  retired: { label: 'مُتقاعدة', color: '#6b7280', icon: <UnavailableIcon /> },
};

const CONDITIONS = [
  { value: 'excellent', label: 'ممتازة', color: '#22c55e' },
  { value: 'good', label: 'جيدة', color: '#3b82f6' },
  { value: 'fair', label: 'مقبولة', color: '#f59e0b' },
  { value: 'poor', label: 'ضعيفة', color: '#ef4444' },
];

const TherapistEquipment = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [equipment, setEquipment] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookDialog, setBookDialog] = useState(null);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    name: '',
    nameEn: '',
    category: 'exercise',
    serialNumber: '',
    location: '',
    condition: 'good',
    notes: '',
  });
  const [bookUntil, setBookUntil] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getEquipment();
      setEquipment(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchEquipment error:', err);
      showSnackbar('خطأ في تحميل المعدات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      showSnackbar('يرجى إدخال اسم المعدة', 'warning');
      return;
    }
    try {
      if (editData) {
        await therapistService.updateEquipment(editData.id, form);
        showSnackbar('تم تحديث المعدة', 'success');
      } else {
        await therapistService.createEquipment(form);
        showSnackbar('تم إضافة المعدة', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchEquipment();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleBook = async () => {
    if (!bookUntil) {
      showSnackbar('يرجى تحديد تاريخ الإرجاع', 'warning');
      return;
    }
    try {
      await therapistService.bookEquipment(bookDialog.id, {
        therapistName: currentUser?.name || 'المعالج',
        until: bookUntil,
      });
      showSnackbar('تم حجز المعدة', 'success');
      setBookDialog(null);
      setBookUntil('');
      fetchEquipment();
    } catch (err) {
      showSnackbar(err?.message || 'خطأ في الحجز', 'error');
    }
  };

  const handleReturn = async id => {
    try {
      await therapistService.returnEquipment(id);
      showSnackbar('تم إرجاع المعدة', 'success');
      fetchEquipment();
    } catch (err) {
      showSnackbar('خطأ في الإرجاع', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteEquipment(id);
      showSnackbar('تم حذف المعدة', 'success');
      fetchEquipment();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      nameEn: '',
      category: 'exercise',
      serialNumber: '',
      location: '',
      condition: 'good',
      notes: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      name: item.name,
      nameEn: item.nameEn || '',
      category: item.category,
      serialNumber: item.serialNumber || '',
      location: item.location || '',
      condition: item.condition || 'good',
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const filtered = equipment.filter(e => {
    const matchSearch =
      !search ||
      e.name?.includes(search) ||
      e.nameEn?.toLowerCase().includes(search.toLowerCase()) ||
      e.serialNumber?.includes(search);
    const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const getCategory = v => CATEGORIES.find(c => c.id === v) || CATEGORIES[0];
  const getStatusInfo = v => STATUS_MAP[v] || STATUS_MAP.available;
  const getCondition = v => CONDITIONS.find(c => c.value === v) || CONDITIONS[1];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <EquipmentIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة المعدات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              مخزن المعدات العلاجية والحجز والصيانة
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المعدات', value: stats.total || 0, color: '#ea580c' },
          { label: 'متاحة', value: stats.available || 0, color: '#22c55e' },
          { label: 'مستخدمة', value: stats.inUse || 0, color: '#3b82f6' },
          { label: 'صيانة', value: stats.maintenance || 0, color: '#f59e0b' },
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

      {/* Toolbar */}
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
          placeholder="بحث بالاسم أو الرقم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            label="الفئة"
          >
            <MenuItem value="all">الكل</MenuItem>
            {CATEGORIES.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.icon} {c.nameAr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
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
          sx={{ bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' } }}
        >
          إضافة معدة
        </Button>
      </Paper>

      {/* List */}
      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <EquipmentIcon sx={{ fontSize: 48, color: '#ea580c', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد معدات</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(item => {
            const cat = getCategory(item.category);
            const st = getStatusInfo(item.status);
            const cond = getCondition(item.condition);
            return (
              <Grid item xs={12} sm={6} lg={4} key={item.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${cat.color}25`,
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
                        mb: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: st.color,
                                border: '2px solid #fff',
                              }}
                            />
                          }
                        >
                          <Avatar
                            sx={{
                              bgcolor: `${cat.color}12`,
                              fontSize: '1.5rem',
                              width: 48,
                              height: 48,
                            }}
                          >
                            {cat.icon}
                          </Avatar>
                        </Badge>
                        <Box>
                          <Typography fontWeight={700}>{item.name}</Typography>
                          {item.nameEn && (
                            <Typography variant="caption" color="text.secondary">
                              {item.nameEn}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{ bgcolor: `${st.color}15`, color: st.color, fontWeight: 600 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                      {item.serialNumber && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SerialIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
                          <Typography variant="caption" color="text.secondary">
                            {item.serialNumber}
                          </Typography>
                        </Box>
                      )}
                      {item.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
                          <Typography variant="caption" color="text.secondary">
                            {item.location}
                          </Typography>
                        </Box>
                      )}
                      {item.bookedBy && (
                        <Typography variant="caption" color="primary" fontWeight={600}>
                          محجوزة بواسطة: {item.bookedBy}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <Chip
                        label={cat.nameAr}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={cond.label}
                        size="small"
                        sx={{ bgcolor: `${cond.color}12`, color: cond.color, fontSize: '0.7rem' }}
                      />
                    </Box>

                    {item.notes && (
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {item.notes}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        {item.status === 'available' && (
                          <Tooltip title="حجز">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setBookDialog(item)}
                            >
                              <BookIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {item.status === 'in-use' && (
                          <Tooltip title="إرجاع">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleReturn(item.id)}
                            >
                              <ReturnIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item.id)}
                          >
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل المعدة' : 'إضافة معدة جديدة'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم بالعربي"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم بالإنجليزي"
                value={form.nameEn}
                onChange={e => setForm({ ...form, nameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  label="الفئة"
                >
                  {CATEGORIES.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.icon} {c.nameAr}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={form.condition}
                  onChange={e => setForm({ ...form, condition: e.target.value })}
                  label="الحالة"
                >
                  {CONDITIONS.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الرقم التسلسلي"
                value={form.serialNumber}
                onChange={e => setForm({ ...form, serialNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الموقع"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' } }}
          >
            {editData ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book Dialog */}
      <Dialog open={!!bookDialog} onClose={() => setBookDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>حجز معدة: {bookDialog?.name}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            type="date"
            label="تاريخ الإرجاع"
            value={bookUntil}
            onChange={e => setBookUntil(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleBook} sx={{ bgcolor: '#ea580c' }}>
            حجز
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistEquipment;
