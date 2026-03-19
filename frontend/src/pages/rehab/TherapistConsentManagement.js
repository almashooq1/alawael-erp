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
  Description as ConsentIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as SignedIcon,
  HourglassTop as PendingIcon,
  Block as RevokedIcon,
  Draw as SignIcon,
  Warning as ExpiredIcon,
  Person as PatientIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const CONSENT_TYPES = [
  { value: 'treatment', label: 'علاج', icon: '💊', color: '#3b82f6' },
  { value: 'assessment', label: 'تقييم', icon: '📋', color: '#8b5cf6' },
  { value: 'data-sharing', label: 'مشاركة بيانات', icon: '🔗', color: '#10b981' },
  { value: 'photography', label: 'تصوير', icon: '📸', color: '#f59e0b' },
  { value: 'research', label: 'بحث', icon: '🔬', color: '#ef4444' },
  { value: 'telehealth', label: 'علاج عن بُعد', icon: '💻', color: '#0d9488' },
];

const TherapistConsentManagement = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [consents, setConsents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    patientName: '',
    guardianName: '',
    consentType: 'treatment',
    title: '',
    description: '',
    expiryDate: '',
    signatureMethod: 'electronic',
  });

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getConsents();
      setConsents(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchConsents error:', err);
      showSnackbar('خطأ في تحميل الموافقات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.patientName) {
      showSnackbar('يرجى إدخال البيانات المطلوبة', 'warning');
      return;
    }
    try {
      if (editData) {
        await therapistService.updateConsent(editData.id, form);
        showSnackbar('تم التحديث', 'success');
      } else {
        await therapistService.createConsent(form);
        showSnackbar('تم الإنشاء', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchConsents();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleSign = async id => {
    try {
      await therapistService.signConsent(id, { method: 'electronic' });
      showSnackbar('تم التوقيع بنجاح', 'success');
      fetchConsents();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleRevoke = async id => {
    try {
      await therapistService.revokeConsent(id);
      showSnackbar('تم إلغاء الموافقة', 'success');
      fetchConsents();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteConsent(id);
      showSnackbar('تم الحذف', 'success');
      fetchConsents();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      patientName: '',
      guardianName: '',
      consentType: 'treatment',
      title: '',
      description: '',
      expiryDate: '',
      signatureMethod: 'electronic',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      patientName: item.patientName,
      guardianName: item.guardianName || '',
      consentType: item.consentType,
      title: item.title,
      description: item.description || '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      signatureMethod: item.signatureMethod || 'electronic',
    });
    setDialogOpen(true);
  };

  const filtered = consents.filter(c => {
    const matchSearch =
      !search ||
      c.patientName?.includes(search) ||
      c.guardianName?.includes(search) ||
      c.title?.includes(search);
    const matchType = typeFilter === 'all' || c.consentType === typeFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const getConsentType = v => CONSENT_TYPES.find(t => t.value === v) || CONSENT_TYPES[0];
  const isExpired = d => d && new Date(d) < new Date();
  const statusMap = {
    signed: { label: 'موقّعة', color: '#22c55e', icon: <SignedIcon sx={{ fontSize: 16 }} /> },
    pending: { label: 'معلّقة', color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 16 }} /> },
    revoked: { label: 'ملغية', color: '#ef4444', icon: <RevokedIcon sx={{ fontSize: 16 }} /> },
  };
  const getStatus = v => statusMap[v] || { label: v, color: '#6b7280', icon: null };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #be185d 0%, #f472b6 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <ConsentIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة الموافقات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة نماذج الموافقة والتوقيعات الإلكترونية لأولياء الأمور
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الموافقات', value: stats.total || 0, color: '#be185d' },
          { label: 'موقّعة', value: stats.signed || 0, color: '#22c55e' },
          { label: 'معلّقة', value: stats.pending || 0, color: '#f59e0b' },
          { label: 'منتهية الصلاحية', value: stats.expired || 0, color: '#ef4444' },
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="النوع">
            <MenuItem value="all">الكل</MenuItem>
            {CONSENT_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                {t.icon} {t.label}
              </MenuItem>
            ))}
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
            <MenuItem value="signed">موقّعة</MenuItem>
            <MenuItem value="pending">معلّقة</MenuItem>
            <MenuItem value="revoked">ملغية</MenuItem>
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
          sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' } }}
        >
          موافقة جديدة
        </Button>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <ConsentIcon sx={{ fontSize: 48, color: '#be185d', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد موافقات</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(c => {
            const type = getConsentType(c.consentType);
            const status = getStatus(c.status);
            const expired = isExpired(c.expiryDate);
            return (
              <Grid item xs={12} md={6} lg={4} key={c.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${type.color}25`,
                    '&:hover': { boxShadow: 4 },
                    transition: '0.2s',
                    ...(expired && c.status === 'signed' ? { borderColor: '#ef444450' } : {}),
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            bgcolor: `${type.color}12`,
                            fontSize: '1.2rem',
                            width: 40,
                            height: 40,
                          }}
                        >
                          {type.icon}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                            {c.title}
                          </Typography>
                          <Chip
                            label={type.label}
                            size="small"
                            sx={{
                              bgcolor: `${type.color}10`,
                              color: type.color,
                              fontSize: '0.65rem',
                              height: 20,
                            }}
                          />
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 0.5,
                        }}
                      >
                        <Chip
                          icon={status.icon}
                          label={status.label}
                          size="small"
                          sx={{
                            bgcolor: `${status.color}12`,
                            color: status.color,
                            fontWeight: 600,
                          }}
                        />
                        {expired && c.status === 'signed' && (
                          <Chip
                            icon={<ExpiredIcon sx={{ fontSize: '14px !important' }} />}
                            label="منتهية"
                            size="small"
                            sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontSize: '0.6rem' }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PatientIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">{c.patientName}</Typography>
                      </Box>
                      {c.guardianName && (
                        <Typography variant="body2" color="text.secondary">
                          ولي الأمر: {c.guardianName}
                        </Typography>
                      )}
                    </Box>
                    {c.description && (
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
                        {c.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      {c.signedDate && (
                        <Chip
                          icon={<DateIcon sx={{ fontSize: '14px !important' }} />}
                          label={`التوقيع: ${new Date(c.signedDate).toLocaleDateString('ar-SA')}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                      {c.expiryDate && (
                        <Chip
                          label={`الانتهاء: ${new Date(c.expiryDate).toLocaleDateString('ar-SA')}`}
                          size="small"
                          sx={{
                            bgcolor: expired ? '#fef2f2' : '#f8fafc',
                            color: expired ? '#ef4444' : 'text.secondary',
                            fontSize: '0.65rem',
                          }}
                        />
                      )}
                      <Chip
                        label={c.signatureMethod === 'electronic' ? 'إلكتروني' : 'ورقي'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        {c.status === 'pending' && (
                          <Tooltip title="توقيع">
                            <IconButton
                              size="small"
                              sx={{ color: '#22c55e' }}
                              onClick={() => handleSign(c.id)}
                            >
                              <SignIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.status === 'signed' && (
                          <Tooltip title="إلغاء الموافقة">
                            <IconButton
                              size="small"
                              sx={{ color: '#ef4444' }}
                              onClick={() => handleRevoke(c.id)}
                            >
                              <RevokedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(c)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
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
          {editData ? 'تعديل الموافقة' : 'موافقة جديدة'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان الموافقة"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </Grid>
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
                label="اسم ولي الأمر"
                value={form.guardianName}
                onChange={e => setForm({ ...form, guardianName: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>نوع الموافقة</InputLabel>
                <Select
                  value={form.consentType}
                  onChange={e => setForm({ ...form, consentType: e.target.value })}
                  label="نوع الموافقة"
                >
                  {CONSENT_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                value={form.expiryDate}
                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>طريقة التوقيع</InputLabel>
                <Select
                  value={form.signatureMethod}
                  onChange={e => setForm({ ...form, signatureMethod: e.target.value })}
                  label="طريقة التوقيع"
                >
                  <MenuItem value="electronic">إلكتروني</MenuItem>
                  <MenuItem value="paper">ورقي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الوصف"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistConsentManagement;
