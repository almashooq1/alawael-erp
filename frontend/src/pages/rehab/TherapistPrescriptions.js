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
  Paper,
  Tooltip,} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MedicalServices as PrescriptionIcon,
  LocalHospital as HospitalIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  FitnessCenter as ExerciseIcon,
  Psychology as PsychologyIcon,
  Healing as HealingIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const prescriptionTypes = [
  { value: 'physical_therapy', label: 'علاج طبيعي', icon: <ExerciseIcon /> },
  { value: 'occupational_therapy', label: 'علاج وظيفي', icon: <HealingIcon /> },
  { value: 'speech_therapy', label: 'علاج نطق', icon: <PsychologyIcon /> },
  { value: 'behavioral_therapy', label: 'علاج سلوكي', icon: <PsychologyIcon /> },
  { value: 'medication', label: 'دوائي', icon: <HospitalIcon /> },
  { value: 'assistive_device', label: 'أجهزة مساعدة', icon: <HealingIcon /> },
  { value: 'exercise_program', label: 'برنامج تمارين منزلية', icon: <ExerciseIcon /> },
  { value: 'dietary', label: 'توصيات غذائية', icon: <HealingIcon /> },
];

const TherapistPrescriptions = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [data, setData] = useState({ prescriptions: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patientName: '',
    diagnosis: '',
    prescriptionType: '',
    description: '',
    frequency: '',
    duration: '',
    instructions: '',
    precautions: '',
    followUpDate: '',
  });

  useEffect(() => {
    loadPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, statusFilter]);

  const loadPrescriptions = async () => {
    try {
      const result = await therapistService.getPrescriptions({
        status: statusFilter,
        search: searchText,
      });
      setData(result || { prescriptions: [], stats: {} });
      setLoading(false);
    } catch (error) {
      logger.error('Error loading prescriptions:', error);
      setLoading(false);
      showSnackbar('حدث خطأ في تحميل الوصفات', 'error');
    }
  };

  const handleCreate = async () => {
    try {
      await therapistService.createPrescription(newPrescription);
      showSnackbar('تم إنشاء الوصفة بنجاح', 'success');
      setDialogOpen(false);
      setNewPrescription({
        patientName: '',
        diagnosis: '',
        prescriptionType: '',
        description: '',
        frequency: '',
        duration: '',
        instructions: '',
        precautions: '',
        followUpDate: '',
      });
      loadPrescriptions();
    } catch (error) {
      showSnackbar('حدث خطأ في إنشاء الوصفة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deletePrescription(id);
      showSnackbar('تم حذف الوصفة', 'success');
      loadPrescriptions();
    } catch (error) {
      showSnackbar('حدث خطأ في الحذف', 'error');
    }
  };

  const { stats = {} } = data;
  const prescriptions = data.prescriptions || [];

  const getTypeInfo = type =>
    prescriptionTypes.find(t => t.value === type) || { label: type, icon: <PrescriptionIcon /> };

  const getStatusConfig = status => {
    const map = {
      active: { label: 'نشطة', color: 'success', icon: <CheckIcon /> },
      completed: { label: 'مكتملة', color: 'info', icon: <CheckIcon /> },
      pending_review: { label: 'بانتظار المراجعة', color: 'warning', icon: <WarningIcon /> },
      expired: { label: 'منتهية', color: 'error', icon: <TimerIcon /> },
    };
    return (
      map[status] || { label: status || 'غير محدد', color: 'default', icon: <PrescriptionIcon /> }
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل الوصفات العلاجية...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PrescriptionIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الوصفات العلاجية
            </Typography>
            <Typography variant="body2">إدارة الوصفات والتوصيات العلاجية للمرضى</Typography>
          </Box>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الوصفات', value: stats.total || 0, color: statusColors.info },
          { label: 'وصفات نشطة', value: stats.active || 0, color: statusColors.success },
          {
            label: 'بانتظار المراجعة',
            value: stats.pendingReview || 0,
            color: statusColors.warning,
          },
          { label: 'هذا الشهر', value: stats.thisMonth || 0, color: statusColors.purple },
        ].map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: stat.color }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* أدوات البحث */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="ابحث عن وصفة..."
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="active">نشطة</MenuItem>
            <MenuItem value="completed">مكتملة</MenuItem>
            <MenuItem value="pending_review">بانتظار المراجعة</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          وصفة جديدة
        </Button>
      </Box>

      {/* قائمة الوصفات */}
      {prescriptions.length > 0 ? (
        prescriptions.map(rx => {
          const typeInfo = getTypeInfo(rx.prescriptionType);
          const statusConfig = getStatusConfig(rx.status);
          return (
            <Card key={rx.id} sx={{ borderRadius: 2, mb: 2, boxShadow: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                    <Box sx={{ color: statusColors.success, mt: 0.5 }}>{typeInfo.icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {rx.patientName}
                        </Typography>
                        <Chip label={typeInfo.label} size="small" variant="outlined" />
                        <Chip label={statusConfig.label} color={statusConfig.color} size="small" />
                      </Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        التشخيص: {rx.diagnosis || 'غير محدد'}
                      </Typography>
                      <Typography variant="body2">{rx.description}</Typography>
                      {(rx.frequency || rx.duration) && (
                        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                          {rx.frequency && (
                            <Typography variant="caption">
                              <strong>التكرار:</strong> {rx.frequency}
                            </Typography>
                          )}
                          {rx.duration && (
                            <Typography variant="caption">
                              <strong>المدة:</strong> {rx.duration}
                            </Typography>
                          )}
                          {rx.followUpDate && (
                            <Typography variant="caption">
                              <strong>متابعة:</strong>{' '}
                              {new Date(rx.followUpDate).toLocaleDateString('ar')}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {rx.instructions && (
                        <Paper sx={{ p: 1.5, mt: 1, backgroundColor: surfaceColors.paperAlt }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            التعليمات:
                          </Typography>
                          <Typography variant="body2">{rx.instructions}</Typography>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="طباعة">
                      <IconButton size="small">
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error" onClick={() => handleDelete(rx.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
          <PrescriptionIcon sx={{ fontSize: 60, color: neutralColors.textMuted, mb: 2 }} />
          <Typography color="textSecondary">لا توجد وصفات علاجية</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setDialogOpen(true)}
          >
            إنشاء وصفة جديدة
          </Button>
        </Paper>
      )}

      {/* Dialog إنشاء وصفة */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء وصفة علاجية جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="اسم المريض"
                fullWidth
                value={newPrescription.patientName}
                onChange={e =>
                  setNewPrescription({ ...newPrescription, patientName: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الوصفة</InputLabel>
                <Select
                  value={newPrescription.prescriptionType}
                  label="نوع الوصفة"
                  onChange={e =>
                    setNewPrescription({ ...newPrescription, prescriptionType: e.target.value })
                  }
                >
                  {prescriptionTypes.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField
            label="التشخيص"
            fullWidth
            value={newPrescription.diagnosis}
            onChange={e => setNewPrescription({ ...newPrescription, diagnosis: e.target.value })}
          />
          <TextField
            label="الوصف"
            fullWidth
            multiline
            rows={2}
            value={newPrescription.description}
            onChange={e => setNewPrescription({ ...newPrescription, description: e.target.value })}
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="التكرار"
                fullWidth
                placeholder="مثال: 3 مرات أسبوعياً"
                value={newPrescription.frequency}
                onChange={e =>
                  setNewPrescription({ ...newPrescription, frequency: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="المدة"
                fullWidth
                placeholder="مثال: 6 أسابيع"
                value={newPrescription.duration}
                onChange={e => setNewPrescription({ ...newPrescription, duration: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="تاريخ المتابعة"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newPrescription.followUpDate}
                onChange={e =>
                  setNewPrescription({ ...newPrescription, followUpDate: e.target.value })
                }
              />
            </Grid>
          </Grid>
          <TextField
            label="التعليمات"
            fullWidth
            multiline
            rows={2}
            value={newPrescription.instructions}
            onChange={e => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
          />
          <TextField
            label="الاحتياطات والتحذيرات"
            fullWidth
            multiline
            rows={2}
            value={newPrescription.precautions}
            onChange={e => setNewPrescription({ ...newPrescription, precautions: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newPrescription.patientName || !newPrescription.prescriptionType}
          >
            إنشاء الوصفة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistPrescriptions;
