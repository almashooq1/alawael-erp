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
  SwapHoriz as ReferralIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as AcceptIcon,
  ArrowForward as ArrowIcon,
  Warning as UrgentIcon,
  Description as NoteIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {   surfaceColors } from '../../theme/palette';

const PRIORITIES = [
  { value: 'low', label: 'منخفضة', color: '#6b7280' },
  { value: 'medium', label: 'متوسطة', color: '#3b82f6' },
  { value: 'high', label: 'عالية', color: '#f59e0b' },
  { value: 'urgent', label: 'طارئة', color: '#ef4444' },
];

const STATUSES = [
  { value: 'pending', label: 'قيد الانتظار', color: '#f59e0b' },
  { value: 'accepted', label: 'مقبولة', color: '#3b82f6' },
  { value: 'in-progress', label: 'قيد التنفيذ', color: '#8b5cf6' },
  { value: 'completed', label: 'مكتملة', color: '#22c55e' },
  { value: 'rejected', label: 'مرفوضة', color: '#ef4444' },
];

const TYPES = [
  { value: 'internal', label: 'إحالة داخلية', icon: '🏥' },
  { value: 'external', label: 'إحالة خارجية', icon: '🌐' },
  { value: 'specialist', label: 'إحالة لأخصائي', icon: '👨‍⚕️' },
  { value: 'emergency', label: 'إحالة طارئة', icon: '🚨' },
];

const TherapistReferrals = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    patientName: '',
    patientId: '',
    type: 'internal',
    toTherapist: '',
    department: '',
    reason: '',
    priority: 'medium',
    notes: '',
  });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getReferrals();
      setReferrals(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchReferrals error:', err);
      showSnackbar('خطأ في تحميل الإحالات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.patientName || !form.reason) {
      showSnackbar('يرجى ملء الحقول المطلوبة', 'warning');
      return;
    }
    try {
      if (editData) {
        await therapistService.updateReferral(editData.id, form);
        showSnackbar('تم تحديث الإحالة بنجاح', 'success');
      } else {
        await therapistService.createReferral(form);
        showSnackbar('تم إنشاء الإحالة بنجاح', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchReferrals();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await therapistService.updateReferralStatus(id, status);
      showSnackbar('تم تحديث الحالة', 'success');
      fetchReferrals();
    } catch (err) {
      showSnackbar('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteReferral(id);
      showSnackbar('تم حذف الإحالة', 'success');
      fetchReferrals();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      patientName: '',
      patientId: '',
      type: 'internal',
      toTherapist: '',
      department: '',
      reason: '',
      priority: 'medium',
      notes: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      patientName: item.patientName,
      patientId: item.patientId,
      type: item.type,
      toTherapist: item.toTherapist,
      department: item.department,
      reason: item.reason,
      priority: item.priority,
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const filtered = referrals.filter(r => {
    const matchSearch =
      !search ||
      r.patientName?.includes(search) ||
      r.reason?.includes(search) ||
      r.toTherapist?.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const getPriority = v => PRIORITIES.find(p => p.value === v) || PRIORITIES[1];
  const getStatus = v => STATUSES.find(s => s.value === v) || STATUSES[0];
  const getType = v => TYPES.find(t => t.value === v) || TYPES[0];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <ReferralIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              سجل الإحالات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة إحالات المرضى بين الأقسام والأخصائيين
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الإحالات', value: stats.total || 0, color: '#7c3aed' },
          { label: 'قيد الانتظار', value: stats.pending || 0, color: '#f59e0b' },
          { label: 'مقبولة', value: stats.accepted || 0, color: '#3b82f6' },
          { label: 'مكتملة', value: stats.completed || 0, color: '#22c55e' },
          { label: 'طارئة', value: stats.urgent || 0, color: '#ef4444' },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2.4} key={i}>
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="النوع">
            <MenuItem value="all">الكل</MenuItem>
            {TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                {t.icon} {t.label}
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
          sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
        >
          إحالة جديدة
        </Button>
      </Paper>

      {/* List */}
      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <ReferralIcon sx={{ fontSize: 48, color: '#7c3aed', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد إحالات</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(r => {
            const priority = getPriority(r.priority);
            const status = getStatus(r.status);
            const type = getType(r.type);
            return (
              <Grid item xs={12} md={6} key={r.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${priority.color}30`,
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
                        mb: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            bgcolor: `${priority.color}15`,
                            color: priority.color,
                            width: 40,
                            height: 40,
                          }}
                        >
                          {r.priority === 'urgent' ? <UrgentIcon /> : <ReferralIcon />}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700}>{r.patientName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.patientId}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          label={type.label}
                          size="small"
                          sx={{ bgcolor: '#f3f4f6', fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={status.label}
                          size="small"
                          sx={{
                            bgcolor: `${status.color}15`,
                            color: status.color,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        my: 1.5,
                        px: 1,
                        py: 0.5,
                        bgcolor: '#f8f9fa',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {r.fromTherapist || 'أنت'}
                      </Typography>
                      <ArrowIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
                      <Typography variant="body2" fontWeight={600} color="#7c3aed">
                        {r.toTherapist}
                      </Typography>
                      <Chip
                        label={r.department}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 'auto', fontSize: '0.7rem' }}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {r.reason}
                    </Typography>

                    {r.notes && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <NoteIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                        <Typography variant="caption" color="text.secondary">
                          {r.notes}
                        </Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          label={priority.label}
                          size="small"
                          sx={{
                            bgcolor: `${priority.color}15`,
                            color: priority.color,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ alignSelf: 'center', ml: 1 }}
                        >
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : ''}
                        </Typography>
                      </Box>
                      <Box>
                        {r.status === 'pending' && (
                          <Tooltip title="قبول">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleStatusChange(r.id, 'accepted')}
                            >
                              <AcceptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(r)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {editData ? 'تعديل الإحالة' : 'إحالة جديدة'}
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
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="رقم المريض"
                value={form.patientId}
                onChange={e => setForm({ ...form, patientId: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الإحالة</InputLabel>
                <Select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  label="نوع الإحالة"
                >
                  {TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  label="الأولوية"
                >
                  {PRIORITIES.map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المُحال إليه"
                value={form.toTherapist}
                onChange={e => setForm({ ...form, toTherapist: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="سبب الإحالة"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                required
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
            sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
          >
            {editData ? 'تحديث' : 'إرسال الإحالة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistReferrals;
