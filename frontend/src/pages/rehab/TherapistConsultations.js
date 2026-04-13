import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,  InputAdornment,
} from '@mui/material';
import {
  Forum as ConsultIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  LocalHospital as MedicalIcon,
  SwapHoriz as ReferralIcon,
  Assessment as AssessmentIcon,
  QuestionAnswer as QAIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const CONSULTATION_TYPES = [
  { value: 'medical_opinion', label: 'رأي طبي', icon: <MedicalIcon />, color: statusColors.info },
  { value: 'referral', label: 'إحالة', icon: <ReferralIcon />, color: statusColors.warning },
  {
    value: 'collaborative',
    label: 'تعاون مشترك',
    icon: <ConsultIcon />,
    color: statusColors.success,
  },
  {
    value: 'assessment_review',
    label: 'مراجعة تقييم',
    icon: <AssessmentIcon />,
    color: statusColors.purple || '#8b5cf6',
  },
  { value: 'case_discussion', label: 'مناقشة حالة', icon: <QAIcon />, color: '#ec4899' },
];

const STATUS_MAP = {
  pending: { label: 'قيد الانتظار', color: 'warning', icon: <PendingIcon /> },
  responded: { label: 'تم الرد', color: 'success', icon: <CheckIcon /> },
  closed: { label: 'مغلقة', color: 'default', icon: <CancelIcon /> },
  open: { label: 'مفتوحة', color: 'info', icon: <ConsultIcon /> },
};

const PRIORITY_MAP = {
  urgent: { label: 'عاجل', color: 'error' },
  high: { label: 'مرتفع', color: 'warning' },
  normal: { label: 'عادي', color: 'info' },
  low: { label: 'منخفض', color: 'default' },
};

const TherapistConsultations = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    type: 'medical_opinion',
    priority: 'normal',
    subject: '',
    beneficiaryId: '',
    beneficiaryName: '',
    description: '',
    targetSpecialty: '',
  });
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadConsultations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getConsultations();
      setConsultations(res?.consultations || res || []);
    } catch (error) {
      logger.error('Error loading consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await therapistService.createConsultation(form);
      showSnackbar('تم إنشاء الاستشارة بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        type: 'medical_opinion',
        priority: 'normal',
        subject: '',
        beneficiaryId: '',
        beneficiaryName: '',
        description: '',
        targetSpecialty: '',
      });
      loadConsultations();
    } catch (error) {
      showSnackbar('حدث خطأ في إنشاء الاستشارة', 'error');
    }
  };

  const handleReply = async () => {
    try {
      await therapistService.respondToConsultation(selected.id, { response: replyText });
      showSnackbar('تم إرسال الرد بنجاح', 'success');
      setReplyOpen(false);
      setReplyText('');
      loadConsultations();
    } catch (error) {
      showSnackbar('حدث خطأ في إرسال الرد', 'error');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await therapistService.updateConsultationStatus(id, status);
      showSnackbar('تم تحديث الحالة', 'success');
      loadConsultations();
    } catch (error) {
      showSnackbar('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteConsultation(id);
      showSnackbar('تم حذف الاستشارة', 'success');
      loadConsultations();
    } catch (error) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = consultations.filter(c => {
    const matchSearch =
      search === '' ||
      c.subject?.includes(search) ||
      c.description?.includes(search) ||
      c.beneficiaryName?.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total: consultations.length,
    pending: consultations.filter(c => c.status === 'pending').length,
    responded: consultations.filter(c => c.status === 'responded').length,
    closed: consultations.filter(c => c.status === 'closed').length,
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ConsultIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                الاستشارات والإحالات
              </Typography>
              <Typography variant="body2">
                إدارة الاستشارات الطبية والإحالات بين المعالجين
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            استشارة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الاستشارات',
            value: stats.total,
            color: statusColors.info,
            icon: <ConsultIcon />,
          },
          {
            label: 'قيد الانتظار',
            value: stats.pending,
            color: statusColors.warning,
            icon: <PendingIcon />,
          },
          {
            label: 'تم الرد',
            value: stats.responded,
            color: statusColors.success,
            icon: <CheckIcon />,
          },
          {
            label: 'مغلقة',
            value: stats.closed,
            color: neutralColors.textMuted,
            icon: <CancelIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="pending">قيد الانتظار</MenuItem>
            <MenuItem value="responded">تم الرد</MenuItem>
            <MenuItem value="closed">مغلقة</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={typeFilter} label="النوع" onChange={e => setTypeFilter(e.target.value)}>
            <MenuItem value="all">الكل</MenuItem>
            {CONSULTATION_TYPES.map(t => (
              <MenuItem value={t.value} key={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Consultation List */}
      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <ConsultIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد استشارات</Typography>
        </Paper>
      ) : (
        <List>
          {filtered.map(consultation => {
            const typeConfig =
              CONSULTATION_TYPES.find(t => t.value === consultation.type) || CONSULTATION_TYPES[0];
            const stat = STATUS_MAP[consultation.status] || STATUS_MAP.pending;
            const priority = PRIORITY_MAP[consultation.priority] || PRIORITY_MAP.normal;
            return (
              <Card
                key={consultation.id}
                sx={{ mb: 2, borderRadius: 2, borderRight: `4px solid ${typeConfig.color}` }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: typeConfig.color, width: 32, height: 32 }}>
                        {typeConfig.icon}
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {consultation.subject}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={priority.label}
                        color={priority.color}
                        size="small"
                        variant="outlined"
                      />
                      <Chip label={stat.label} color={stat.color} size="small" icon={stat.icon} />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {consultation.description?.substring(0, 120)}
                    {consultation.description?.length > 120 ? '...' : ''}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {consultation.beneficiaryName && (
                        <Chip
                          label={consultation.beneficiaryName}
                          size="small"
                          icon={<PersonIcon />}
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={typeConfig.label}
                        size="small"
                        variant="outlined"
                        sx={{ color: typeConfig.color }}
                      />
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ alignSelf: 'center' }}
                      >
                        {new Date(consultation.createdAt).toLocaleDateString('ar')}
                      </Typography>
                    </Box>
                    <Box>
                      <Tooltip title="عرض">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelected(consultation);
                            setViewOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="رد">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelected(consultation);
                            setReplyOpen(true);
                          }}
                        >
                          <ReplyIcon />
                        </IconButton>
                      </Tooltip>
                      {consultation.status !== 'closed' && (
                        <Tooltip title="إغلاق">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleUpdateStatus(consultation.id, 'closed')}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(consultation.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  {/* Show responses */}
                  {consultation.responses?.length > 0 && (
                    <Box sx={{ mt: 2, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}
                      >
                        الردود ({consultation.responses.length}):
                      </Typography>
                      {consultation.responses.slice(-2).map((r, i) => (
                        <Box
                          key={i}
                          sx={{
                            pl: 2,
                            py: 0.5,
                            borderRight: '2px solid',
                            borderColor: 'primary.main',
                          }}
                        >
                          <Typography variant="body2">{r.response}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {r.respondedBy} - {new Date(r.respondedAt).toLocaleDateString('ar')}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </List>
      )}

      {/* Create Consultation Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConsultIcon color="primary" />
            <Typography variant="h6">استشارة جديدة</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الاستشارة</InputLabel>
                <Select
                  value={form.type}
                  label="نوع الاستشارة"
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {CONSULTATION_TYPES.map(t => (
                    <MenuItem value={t.value} key={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  label="الأولوية"
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                    <MenuItem value={k} key={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="الموضوع"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المستفيد"
                value={form.beneficiaryName}
                onChange={e => setForm(p => ({ ...p, beneficiaryName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="التخصص المطلوب"
                value={form.targetSpecialty}
                onChange={e => setForm(p => ({ ...p, targetSpecialty: e.target.value }))}
                placeholder="مثال: علاج طبيعي، نطق"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="تفاصيل الاستشارة"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleCreate}
            disabled={!form.subject || !form.description}
          >
            إرسال الاستشارة
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Consultation Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6">تفاصيل الاستشارة</Typography>
          <IconButton onClick={() => setViewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selected.subject}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={
                    CONSULTATION_TYPES.find(t => t.value === selected.type)?.label || selected.type
                  }
                  size="small"
                />
                <Chip
                  label={STATUS_MAP[selected.status]?.label || selected.status}
                  size="small"
                  color={STATUS_MAP[selected.status]?.color || 'default'}
                />
                <Chip
                  label={PRIORITY_MAP[selected.priority]?.label || 'عادي'}
                  size="small"
                  variant="outlined"
                />
              </Box>
              {selected.beneficiaryName && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>المستفيد:</strong> {selected.beneficiaryName}
                </Typography>
              )}
              {selected.targetSpecialty && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>التخصص المطلوب:</strong> {selected.targetSpecialty}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>التاريخ:</strong> {new Date(selected.createdAt).toLocaleString('ar')}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                {selected.description}
              </Typography>
              {selected.responses?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    الردود:
                  </Typography>
                  {selected.responses.map((r, i) => (
                    <Paper
                      key={i}
                      sx={{ p: 2, mb: 1, bgcolor: surfaceColors.paperAlt, borderRadius: 2 }}
                    >
                      <Typography variant="body2">{r.response}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {r.respondedBy} — {new Date(r.respondedAt).toLocaleString('ar')}
                      </Typography>
                    </Paper>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onClose={() => setReplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReplyIcon color="primary" />
            <Typography variant="h6">الرد على الاستشارة</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                {selected.subject}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {selected.description?.substring(0, 200)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="الرد"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="اكتب ردك هنا..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleReply}
            disabled={!replyText.trim()}
          >
            إرسال الرد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistConsultations;
