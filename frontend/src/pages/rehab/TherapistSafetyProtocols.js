import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';

const CATEGORIES = [
  { id: 'fall-prevention', label: 'الوقاية من السقوط', color: '#3b82f6', icon: '🛡️' },
  { id: 'infection-control', label: 'مكافحة العدوى', color: '#ef4444', icon: '🦠' },
  { id: 'patient-handling', label: 'تداول المرضى', color: '#8b5cf6', icon: '🤲' },
  { id: 'emergency-response', label: 'الاستجابة للطوارئ', color: '#f59e0b', icon: '🚨' },
  { id: 'medication-safety', label: 'سلامة الأدوية', color: '#10b981', icon: '💊' },
  { id: 'equipment-safety', label: 'سلامة المعدات', color: '#06b6d4', icon: '⚙️' },
];

const SEVERITIES = [
  { value: 'low', label: 'منخفضة', color: '#6b7280' },
  { value: 'medium', label: 'متوسطة', color: '#f59e0b' },
  { value: 'high', label: 'عالية', color: '#ef4444' },
  { value: 'critical', label: 'حرجة', color: '#dc2626' },
];

const TherapistSafetyProtocols = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [protocols, setProtocols] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [incidentDialog, setIncidentDialog] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'fall-prevention',
    severity: 'medium',
    description: '',
    steps: '',
    createdBy: '',
  });
  const [incidentForm, setIncidentForm] = useState({ description: '', action: '' });

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getSafetyProtocols();
      setProtocols(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchProtocols error:', err);
      showSnackbar('خطأ في تحميل البروتوكولات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title) {
      showSnackbar('يرجى إدخال عنوان البروتوكول', 'warning');
      return;
    }
    try {
      const payload = {
        ...form,
        steps: form.steps ? form.steps.split('\n').filter(s => s.trim()) : [],
      };
      if (editData) {
        await therapistService.updateSafetyProtocol(editData.id, payload);
        showSnackbar('تم تحديث البروتوكول', 'success');
      } else {
        await therapistService.createSafetyProtocol(payload);
        showSnackbar('تم إنشاء البروتوكول', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchProtocols();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleReportIncident = async () => {
    if (!incidentForm.description) {
      showSnackbar('يرجى وصف الحادثة', 'warning');
      return;
    }
    try {
      await therapistService.reportSafetyIncident(incidentDialog.id, incidentForm);
      showSnackbar('تم تسجيل الحادثة', 'success');
      setIncidentDialog(null);
      setIncidentForm({ description: '', action: '' });
      fetchProtocols();
    } catch (err) {
      showSnackbar('خطأ في التسجيل', 'error');
    }
  };

  const handleResolveIncident = async (protocolId, incidentId) => {
    try {
      await therapistService.resolveSafetyIncident(protocolId, incidentId);
      showSnackbar('تم حل الحادثة', 'success');
      fetchProtocols();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteSafetyProtocol(id);
      showSnackbar('تم حذف البروتوكول', 'success');
      fetchProtocols();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      category: 'fall-prevention',
      severity: 'medium',
      description: '',
      steps: '',
      createdBy: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      title: item.title,
      category: item.category,
      severity: item.severity,
      description: item.description || '',
      steps: (item.steps || []).join('\n'),
      createdBy: item.createdBy || '',
    });
    setDialogOpen(true);
  };

  const filtered = protocols.filter(p => {
    const matchSearch = !search || p.title?.includes(search) || p.description?.includes(search);
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const getCategory = v => CATEGORIES.find(c => c.id === v) || CATEGORIES[0];
  const getSeverity = v => SEVERITIES.find(s => s.value === v) || SEVERITIES[1];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <SafetyIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              بروتوكولات السلامة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة بروتوكولات السلامة وتسجيل الحوادث
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي البروتوكولات', value: stats.total || 0, color: '#dc2626' },
          { label: 'نشطة', value: stats.active || 0, color: '#22c55e' },
          { label: 'إجمالي الحوادث', value: stats.totalIncidents || 0, color: '#f59e0b' },
          { label: 'بروتوكولات حرجة', value: stats.criticalCount || 0, color: '#7c3aed' },
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            label="الفئة"
          >
            <MenuItem value="all">الكل</MenuItem>
            {CATEGORIES.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.icon} {c.label}
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
          sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
        >
          بروتوكول جديد
        </Button>
      </Paper>

      {/* List */}
      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <SafetyIcon sx={{ fontSize: 48, color: '#dc2626', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد بروتوكولات</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(p => {
            const cat = getCategory(p.category);
            const sev = getSeverity(p.severity);
            const unresolvedIncidents = (p.incidents || []).filter(i => !i.resolved).length;
            return (
              <Grid item xs={12} md={6} key={p.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${sev.color}25`,
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
                            bgcolor: `${cat.color}12`,
                            fontSize: '1.3rem',
                            width: 44,
                            height: 44,
                          }}
                        >
                          {cat.icon}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700}>{p.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cat.label}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          label={sev.label}
                          size="small"
                          icon={p.severity === 'critical' ? <CriticalIcon /> : undefined}
                          sx={{ bgcolor: `${sev.color}12`, color: sev.color, fontWeight: 600 }}
                        />
                        {unresolvedIncidents > 0 && (
                          <Chip
                            label={`${unresolvedIncidents} حادثة`}
                            size="small"
                            sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.description}
                    </Typography>

                    {/* Steps preview */}
                    {p.steps?.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        {p.steps.slice(0, 2).map((step, i) => (
                          <Box
                            key={i}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}
                          >
                            <Chip
                              label={i + 1}
                              size="small"
                              sx={{
                                width: 20,
                                height: 20,
                                fontSize: '0.65rem',
                                bgcolor: `${cat.color}15`,
                                color: cat.color,
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {step}
                            </Typography>
                          </Box>
                        ))}
                        {p.steps.length > 2 && (
                          <Typography
                            variant="caption"
                            color="primary"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setDetailDialog(p)}
                          >
                            +{p.steps.length - 2} خطوات أخرى...
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      {p.lastReview && (
                        <Chip
                          icon={<ReviewIcon sx={{ fontSize: '14px !important' }} />}
                          label={`آخر مراجعة: ${new Date(p.lastReview).toLocaleDateString('ar-SA')}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="تسجيل حادثة">
                          <IconButton
                            size="small"
                            sx={{ color: '#f59e0b' }}
                            onClick={() => setIncidentDialog(p)}
                          >
                            <IncidentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="التفاصيل">
                          <IconButton size="small" onClick={() => setDetailDialog(p)}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
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
          {editData ? 'تعديل البروتوكول' : 'بروتوكول جديد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان البروتوكول"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
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
                      {c.icon} {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الأهمية</InputLabel>
                <Select
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value })}
                  label="الأهمية"
                >
                  {SEVERITIES.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="الخطوات (سطر لكل خطوة)"
                value={form.steps}
                onChange={e => setForm({ ...form, steps: e.target.value })}
                helperText="اكتب كل خطوة في سطر منفصل"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="أُنشئ بواسطة"
                value={form.createdBy}
                onChange={e => setForm({ ...form, createdBy: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog
        open={!!incidentDialog}
        onClose={() => setIncidentDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تسجيل حادثة - {incidentDialog?.title}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="وصف الحادثة"
            value={incidentForm.description}
            onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
            required
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="الإجراء المتخذ"
            value={incidentForm.action}
            onChange={e => setIncidentForm({ ...incidentForm, action: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialog(null)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleReportIncident}
            sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {detailDialog?.title}
          <IconButton onClick={() => setDetailDialog(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailDialog && (
            <>
              <Typography variant="body1" color="text.secondary" mb={2}>
                {detailDialog.description}
              </Typography>

              {detailDialog.steps?.length > 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    خطوات البروتوكول
                  </Typography>
                  <Stepper orientation="vertical" activeStep={-1} sx={{ mb: 2 }}>
                    {detailDialog.steps.map((step, i) => (
                      <Step key={i} active>
                        <StepLabel>{step}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </>
              )}

              {detailDialog.incidents?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    سجل الحوادث ({detailDialog.incidents.length})
                  </Typography>
                  <List dense>
                    {detailDialog.incidents.map((inc, i) => (
                      <ListItem
                        key={i}
                        sx={{
                          bgcolor: inc.resolved ? '#f0fdf4' : '#fef2f2',
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                        secondaryAction={
                          !inc.resolved && (
                            <Tooltip title="حل الحادثة">
                              <IconButton
                                edge="end"
                                color="success"
                                onClick={() => handleResolveIncident(detailDialog.id, inc.id)}
                              >
                                <ResolvedIcon />
                              </IconButton>
                            </Tooltip>
                          )
                        }
                      >
                        <ListItemIcon>
                          {inc.resolved ? (
                            <ResolvedIcon sx={{ color: '#22c55e' }} />
                          ) : (
                            <WarningIcon sx={{ color: '#ef4444' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={inc.description}
                          secondary={`${inc.action || 'لا يوجد إجراء'} • ${inc.date ? new Date(inc.date).toLocaleDateString('ar-SA') : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default TherapistSafetyProtocols;
