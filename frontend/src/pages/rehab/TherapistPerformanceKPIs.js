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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,  Paper,
  Avatar,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Speed as KPIIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  CheckCircle as OnTargetIcon,
  Warning as BelowTargetIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const KPI_LABELS = {
  sessionsCompleted: { label: 'الجلسات المكتملة', icon: '📋', color: '#3b82f6' },
  patientSatisfaction: { label: 'رضا المرضى', icon: '😊', color: '#10b981' },
  goalsAchieved: { label: 'الأهداف المحققة', icon: '🎯', color: '#8b5cf6' },
  documentationRate: { label: 'معدل التوثيق', icon: '📝', color: '#f59e0b' },
  attendanceRate: { label: 'معدل الحضور', icon: '✅', color: '#22c55e' },
  referralResponseTime: { label: 'وقت الاستجابة للإحالات', icon: '⏱️', color: '#ef4444' },
};

const RANK_COLORS = {
  ممتاز: '#22c55e',
  'جيد جداً': '#3b82f6',
  جيد: '#f59e0b',
  مقبول: '#ef4444',
};

const TherapistPerformanceKPIs = () => {
  const { currentUser: _currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [kpiData, setKpiData] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    name: '',
    current: 0,
    target: 100,
    unit: '',
    description: '',
  });

  useEffect(() => {
    fetchKPIs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getKPIs();
      setKpiData(res?.data || null);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchKPIs error:', err);
      showSnackbar('خطأ في تحميل مؤشرات الأداء', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      showSnackbar('يرجى إدخال اسم المؤشر', 'warning');
      return;
    }
    try {
      if (editData) {
        await therapistService.updateKPI(editData.id, form);
        showSnackbar('تم تحديث المؤشر', 'success');
      } else {
        await therapistService.createKPI(form);
        showSnackbar('تم إنشاء المؤشر', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchKPIs();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteKPI(id);
      showSnackbar('تم حذف المؤشر', 'success');
      fetchKPIs();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', current: 0, target: 100, unit: '', description: '' });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      name: item.name,
      current: item.current,
      target: item.target,
      unit: item.unit || '',
      description: item.description || '',
    });
    setDialogOpen(true);
  };

  const getProgress = (current, target) => {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const kpis = kpiData?.kpis || {};
  const customKPIs = kpiData?.customKPIs || [];
  const monthlyTrend = kpiData?.monthlyTrend || [];
  const overallScore = kpiData?.overallScore || 0;
  const rank = kpiData?.rank || 'جيد';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <KPIIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              مؤشرات الأداء
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              متابعة وتقييم الأداء المهني
            </Typography>
          </Box>
          {/* Overall Score */}
          <Paper
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.15)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight={800}>
              {overallScore}%
            </Typography>
            <Chip
              label={rank}
              size="small"
              sx={{ bgcolor: RANK_COLORS[rank] || '#3b82f6', color: '#fff', fontWeight: 700 }}
            />
          </Paper>
        </Box>
      </Paper>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المؤشرات', value: stats.totalKPIs || 0, color: '#0891b2' },
          {
            label: 'على الهدف',
            value: stats.onTarget || 0,
            color: '#22c55e',
            icon: <OnTargetIcon />,
          },
          {
            label: 'تحت الهدف',
            value: stats.belowTarget || 0,
            color: '#ef4444',
            icon: <BelowTargetIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={4} key={i}>
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

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : (
        <>
          {/* Main KPIs */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            المؤشرات الأساسية
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(kpis).map(([key, value]) => {
              const meta = KPI_LABELS[key] || { label: key, icon: '📊', color: '#6b7280' };
              const progress = getProgress(value.current, value.target);
              const isOnTarget = progress >= 80;
              return (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${meta.color}20`,
                      '&:hover': { boxShadow: 3 },
                      transition: '0.2s',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: `${meta.color}12`,
                            fontSize: '1.3rem',
                            width: 40,
                            height: 40,
                          }}
                        >
                          {meta.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700}>
                            {meta.label}
                          </Typography>
                        </Box>
                        {isOnTarget ? (
                          <TrendUpIcon sx={{ color: '#22c55e' }} />
                        ) : (
                          <TrendDownIcon sx={{ color: '#ef4444' }} />
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          mb: 1,
                        }}
                      >
                        <Typography variant="h4" fontWeight={800} color={meta.color}>
                          {value.current}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          الهدف: {value.target} {value.unit}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: isOnTarget ? '#22c55e' : meta.color,
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {progress}% من الهدف
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Monthly Trend */}
          {monthlyTrend.length > 0 && (
            <>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                الاتجاه الشهري
              </Typography>
              <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={1}>
                  {monthlyTrend.map((m, i) => (
                    <Grid item xs={3} key={i}>
                      <Paper
                        sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 1 }}
                      >
                        <Typography variant="caption" fontWeight={700} color="primary">
                          {m.month}
                        </Typography>
                        <Divider sx={{ my: 0.5 }} />
                        <Typography variant="body2">📋 {m.sessions} جلسة</Typography>
                        <Typography variant="body2">😊 {m.satisfaction}%</Typography>
                        <Typography variant="body2">🎯 {m.goals} أهداف</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </>
          )}

          {/* Custom KPIs */}
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6" fontWeight={700}>
              مؤشرات مخصصة
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              sx={{ borderColor: '#0891b2', color: '#0891b2' }}
            >
              إضافة مؤشر
            </Button>
          </Box>

          {customKPIs.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: '#0891b2', opacity: 0.4, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                لا توجد مؤشرات مخصصة بعد
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {customKPIs.map(kpi => {
                const progress = getProgress(kpi.current, kpi.target);
                return (
                  <Grid item xs={12} sm={6} md={4} key={kpi.id}>
                    <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: 3 } }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography fontWeight={700}>{kpi.name}</Typography>
                          <Box>
                            <IconButton size="small" onClick={() => openEdit(kpi)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(kpi.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {kpi.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {kpi.current} {kpi.unit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            الهدف: {kpi.target} {kpi.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: progress >= 80 ? '#22c55e' : '#0891b2',
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل المؤشر' : 'مؤشر أداء جديد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم المؤشر"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="القيمة الحالية"
                value={form.current}
                onChange={e => setForm({ ...form, current: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="الهدف"
                value={form.target}
                onChange={e => setForm({ ...form, target: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="الوحدة"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                placeholder="مثل: % أو جلسة"
              />
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#0891b2', '&:hover': { bgcolor: '#0e7490' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistPerformanceKPIs;
