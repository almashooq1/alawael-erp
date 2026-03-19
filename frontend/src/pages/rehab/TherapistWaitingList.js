import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Chip,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  HourglassTop as WaitIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Person as PatientIcon,
  CalendarToday as DateIcon,
  ArrowUpward as HighIcon,
  ArrowDownward as LowIcon,
  DragHandle as MediumIcon,
  CheckCircle as AdmittedIcon,
  NotificationsActive as ContactedIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const SERVICE_TYPES = [
  { value: 'speech-therapy', label: 'علاج نطق', icon: '🗣️' },
  { value: 'occupational-therapy', label: 'علاج وظيفي', icon: '🤲' },
  { value: 'physical-therapy', label: 'علاج طبيعي', icon: '🏃' },
  { value: 'behavioral-therapy', label: 'علاج سلوكي', icon: '🧠' },
  { value: 'assessment', label: 'تقييم', icon: '📋' },
  { value: 'consultation', label: 'استشارة', icon: '👨‍⚕️' },
];

const TherapistWaitingList = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [waitingList, setWaitingList] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    patientName: '',
    patientAge: '',
    serviceType: 'speech-therapy',
    priority: 'medium',
    referralDate: '',
    estimatedWait: '',
    contactPhone: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getWaitingList();
      setWaitingList(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchWaitingList error:', err);
      showSnackbar('خطأ في تحميل قائمة الانتظار', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.patientName) {
      showSnackbar('يرجى إدخال اسم المريض', 'warning');
      return;
    }
    try {
      const payload = {
        ...form,
        patientAge: Number(form.patientAge) || 0,
        estimatedWait: Number(form.estimatedWait) || 0,
      };
      if (editData) {
        await therapistService.updateWaitingListItem(editData.id, payload);
        showSnackbar('تم التحديث', 'success');
      } else {
        await therapistService.addToWaitingList(payload);
        showSnackbar('تمت الإضافة', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await therapistService.updateWaitingStatus(id, newStatus);
      showSnackbar('تم تحديث الحالة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.removeFromWaitingList(id);
      showSnackbar('تم الحذف', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      patientName: '',
      patientAge: '',
      serviceType: 'speech-therapy',
      priority: 'medium',
      referralDate: '',
      estimatedWait: '',
      contactPhone: '',
      notes: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      patientName: item.patientName,
      patientAge: String(item.patientAge || ''),
      serviceType: item.serviceType,
      priority: item.priority,
      referralDate: item.referralDate
        ? new Date(item.referralDate).toISOString().split('T')[0]
        : '',
      estimatedWait: String(item.estimatedWait || ''),
      contactPhone: item.contactPhone || '',
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const filtered = waitingList.filter(w => {
    const matchSearch =
      !search || w.patientName?.includes(search) || w.contactPhone?.includes(search);
    const matchPri = priorityFilter === 'all' || w.priority === priorityFilter;
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchSearch && matchPri && matchStatus;
  });

  const getService = v => SERVICE_TYPES.find(s => s.value === v) || SERVICE_TYPES[0];
  const priorityMap = {
    urgent: { label: 'عاجل', color: '#ef4444', icon: <HighIcon sx={{ fontSize: 14 }} /> },
    high: { label: 'عالي', color: '#f59e0b', icon: <HighIcon sx={{ fontSize: 14 }} /> },
    medium: { label: 'متوسط', color: '#3b82f6', icon: <MediumIcon sx={{ fontSize: 14 }} /> },
    low: { label: 'منخفض', color: '#22c55e', icon: <LowIcon sx={{ fontSize: 14 }} /> },
  };
  const statusMap = {
    waiting: { label: 'قيد الانتظار', color: '#f59e0b' },
    contacted: { label: 'تم التواصل', color: '#3b82f6' },
    scheduled: { label: 'تم الجدولة', color: '#8b5cf6' },
    admitted: { label: 'تم القبول', color: '#22c55e' },
    cancelled: { label: 'ملغي', color: '#94a3b8' },
  };

  const daysSinceReferral = date => {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0f766e 0%, #5eead4 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <WaitIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              قائمة الانتظار
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة قائمة انتظار المرضى وتتبع الأولويات
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المنتظرين', value: stats.total || 0, color: '#0f766e' },
          { label: 'عاجل / عالي', value: stats.urgent || 0, color: '#ef4444' },
          { label: 'تم التواصل', value: stats.contacted || 0, color: '#3b82f6' },
          { label: 'تم القبول', value: stats.admitted || 0, color: '#22c55e' },
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
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>الأولوية</InputLabel>
          <Select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            label="الأولوية"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="urgent">عاجل</MenuItem>
            <MenuItem value="high">عالي</MenuItem>
            <MenuItem value="medium">متوسط</MenuItem>
            <MenuItem value="low">منخفض</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="waiting">قيد الانتظار</MenuItem>
            <MenuItem value="contacted">تم التواصل</MenuItem>
            <MenuItem value="admitted">تم القبول</MenuItem>
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
          sx={{ bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
        >
          إضافة للانتظار
        </Button>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <WaitIcon sx={{ fontSize: 48, color: '#0f766e', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا يوجد مرضى في قائمة الانتظار</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(w => {
            const svc = getService(w.serviceType);
            const pri = priorityMap[w.priority] || priorityMap.medium;
            const st = statusMap[w.status] || statusMap.waiting;
            const days = daysSinceReferral(w.referralDate);
            return (
              <Grid item xs={12} md={6} lg={4} key={w.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    borderRight: `4px solid ${pri.color}`,
                    '&:hover': { boxShadow: 4 },
                    transition: '0.2s',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: `${pri.color}12`, width: 44, height: 44 }}>
                          <Typography fontSize="1.3rem">{svc.icon}</Typography>
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700}>{w.patientName}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                            {w.patientAge > 0 && (
                              <Chip
                                label={`${w.patientAge} سنة`}
                                size="small"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            )}
                            <Chip
                              label={svc.label}
                              size="small"
                              sx={{ bgcolor: '#f0f9ff', fontSize: '0.6rem', height: 18 }}
                            />
                          </Box>
                        </Box>
                      </Box>
                      {w.position && (
                        <Box
                          sx={{
                            textAlign: 'center',
                            minWidth: 40,
                            px: 1,
                            py: 0.5,
                            bgcolor: '#f8fafc',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="h6" fontWeight={800} color="#0f766e">
                            #{w.position}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.55rem' }}>
                            الترتيب
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        icon={pri.icon}
                        label={pri.label}
                        size="small"
                        sx={{ bgcolor: `${pri.color}10`, color: pri.color, fontWeight: 600 }}
                      />
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{ bgcolor: `${st.color}12`, color: st.color, fontWeight: 600 }}
                      />
                      {days > 0 && (
                        <Chip
                          label={`${days} يوم انتظار`}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.65rem',
                            borderColor: days > 30 ? '#ef4444' : '#e2e8f0',
                            color: days > 30 ? '#ef4444' : 'text.secondary',
                          }}
                        />
                      )}
                      {w.estimatedWait > 0 && (
                        <Chip
                          label={`المتوقع: ${w.estimatedWait} يوم`}
                          size="small"
                          sx={{ bgcolor: '#fef2f2', fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                      {w.referralDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            الإحالة: {new Date(w.referralDate).toLocaleDateString('ar-SA')}
                          </Typography>
                        </Box>
                      )}
                      {w.contactPhone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" dir="ltr">
                            {w.contactPhone}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {w.notes && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {w.notes}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {w.status === 'waiting' && (
                          <Tooltip title="تم التواصل">
                            <IconButton
                              size="small"
                              sx={{ color: '#3b82f6' }}
                              onClick={() => handleStatusChange(w.id, 'contacted')}
                            >
                              <ContactedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(w.status === 'waiting' || w.status === 'contacted') && (
                          <Tooltip title="قبول">
                            <IconButton
                              size="small"
                              sx={{ color: '#22c55e' }}
                              onClick={() => handleStatusChange(w.id, 'admitted')}
                            >
                              <AdmittedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(w)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(w.id)}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل البيانات' : 'إضافة لقائمة الانتظار'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم المريض"
                value={form.patientName}
                onChange={e => setForm({ ...form, patientName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                type="number"
                label="العمر"
                value={form.patientAge}
                onChange={e => setForm({ ...form, patientAge: e.target.value })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="رقم التواصل"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>نوع الخدمة</InputLabel>
                <Select
                  value={form.serviceType}
                  onChange={e => setForm({ ...form, serviceType: e.target.value })}
                  label="نوع الخدمة"
                >
                  {SERVICE_TYPES.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.icon} {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  label="الأولوية"
                >
                  <MenuItem value="urgent">عاجل</MenuItem>
                  <MenuItem value="high">عالي</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="low">منخفض</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الإحالة"
                value={form.referralDate}
                onChange={e => setForm({ ...form, referralDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="مدة الانتظار المتوقعة (أيام)"
                value={form.estimatedWait}
                onChange={e => setForm({ ...form, estimatedWait: e.target.value })}
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#0f766e', '&:hover': { bgcolor: '#115e59' } }}
          >
            {editData ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistWaitingList;
