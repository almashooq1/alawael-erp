/**
 * WorkflowSLAPolicies — سياسات مستوى الخدمة (SLA)
 *
 * Manage SLA policies, track compliance, and view SLA dashboard.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const PRIORITY_MAP = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };
const PRIORITY_COLORS = { critical: '#D32F2F', high: '#F57C00', medium: '#FFC107', low: '#4CAF50' };

function ComplianceBar({ value, threshold = 90 }) {
  const color = value >= threshold ? '#4CAF50' : value >= 70 ? '#FF9800' : '#F44336';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        sx={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(color, 0.15),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
      <Typography variant="caption" fontWeight={700} color={color}>
        {value.toFixed(1)}%
      </Typography>
    </Box>
  );
}

export default function WorkflowSLAPolicies() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyData, setPolicyData] = useState({
    name: '',
    nameAr: '',
    description: '',
    priority: 'medium',
    isActive: true,
    responseTime: { value: 60, unit: 'minutes' },
    resolutionTime: { value: 480, unit: 'minutes' },
    escalationPolicy: '',
    targetCompliancePercent: 95,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [policiesRes, statsRes, dashRes] = await Promise.all([
        workflowService.getSLAPolicies(),
        workflowService.getSLAStats(),
        workflowService.getSLADashboard(),
      ]);
      setPolicies(policiesRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setDashboard(dashRes.data?.data || null);
    } catch (err) {
      showSnackbar('خطأ في تحميل سياسات SLA', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (editingPolicy) {
        await workflowService.updateSLAPolicy(editingPolicy._id, policyData);
        showSnackbar('تم تحديث السياسة', 'success');
      } else {
        await workflowService.createSLAPolicy(policyData);
        showSnackbar('تم إنشاء السياسة', 'success');
      }
      setPolicyDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حفظ السياسة', 'error');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل تريد حذف هذه السياسة؟')) return;
    try {
      await workflowService.deleteSLAPolicy(id);
      showSnackbar('تم حذف السياسة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حذف السياسة', 'error');
    }
  };

  const handleToggle = async id => {
    try {
      await workflowService.toggleSLAPolicy(id);
      showSnackbar('تم تغيير حالة السياسة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في تغيير الحالة', 'error');
    }
  };

  const handleClone = async id => {
    try {
      await workflowService.cloneSLAPolicy(id);
      showSnackbar('تم نسخ السياسة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في نسخ السياسة', 'error');
    }
  };

  const openNew = () => {
    setEditingPolicy(null);
    setPolicyData({
      name: '',
      nameAr: '',
      description: '',
      priority: 'medium',
      isActive: true,
      responseTime: { value: 60, unit: 'minutes' },
      resolutionTime: { value: 480, unit: 'minutes' },
      escalationPolicy: '',
      targetCompliancePercent: 95,
    });
    setPolicyDialog(true);
  };

  const openEdit = policy => {
    setEditingPolicy(policy);
    setPolicyData({
      name: policy.name,
      nameAr: policy.nameAr,
      description: policy.description || '',
      priority: policy.priority,
      isActive: policy.isActive,
      responseTime: policy.responseTime || { value: 60, unit: 'minutes' },
      resolutionTime: policy.resolutionTime || { value: 480, unit: 'minutes' },
      escalationPolicy: policy.escalationPolicy || '',
      targetCompliancePercent: policy.targetCompliancePercent || 95,
    });
    setPolicyDialog(true);
  };

  const formatTime = t => {
    if (!t) return '—';
    const v = t.value;
    switch (t.unit) {
      case 'minutes':
        return v < 60 ? `${v} دقيقة` : `${(v / 60).toFixed(1)} ساعة`;
      case 'hours':
        return `${v} ساعة`;
      case 'days':
        return `${v} يوم`;
      default:
        return `${v} ${t.unit}`;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            سياسات مستوى الخدمة (SLA)
          </Typography>
          <Chip icon={<SpeedIcon />} label="SLA" size="small" color="info" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            سياسة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            {
              label: 'إجمالي السياسات',
              value: stats.total || 0,
              color: '#2196F3',
              icon: <SpeedIcon />,
            },
            { label: 'نشطة', value: stats.active || 0, color: '#4CAF50', icon: <CheckIcon /> },
            {
              label: 'متوافقة',
              value: `${stats.complianceRate?.toFixed(1) || 0}%`,
              color: (stats.complianceRate || 0) >= 90 ? '#4CAF50' : '#FF9800',
              icon: <TrendIcon />,
            },
            { label: 'خروقات', value: stats.breaches || 0, color: '#F44336', icon: <ErrorIcon /> },
          ].map((s, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ borderTop: `4px solid ${s.color}` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="السياسات" />
        <Tab label="لوحة الامتثال" icon={<DashboardIcon />} iconPosition="start" />
      </Tabs>

      {/* Policies Tab */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>السياسة</TableCell>
                <TableCell>الأولوية</TableCell>
                <TableCell>وقت الاستجابة</TableCell>
                <TableCell>وقت الحل</TableCell>
                <TableCell>هدف الامتثال</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      لا توجد سياسات SLA
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                policies.map(p => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{p.nameAr || p.name}</Typography>
                      {p.description && (
                        <Typography variant="caption" color="text.secondary">
                          {p.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PRIORITY_MAP[p.priority] || p.priority}
                        size="small"
                        sx={{
                          bgcolor: alpha(PRIORITY_COLORS[p.priority] || '#999', 0.12),
                          color: PRIORITY_COLORS[p.priority] || '#999',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<TimerIcon />}
                        label={formatTime(p.responseTime)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<TimerIcon />}
                        label={formatTime(p.resolutionTime)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <ComplianceBar value={p.targetCompliancePercent || 95} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.isActive}
                        size="small"
                        onChange={() => handleToggle(p._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="نسخ">
                        <IconButton size="small" onClick={() => handleClone(p._id)}>
                          <CloneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => handleDelete(p._id)}>
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
      )}

      {/* Dashboard Tab */}
      {tab === 1 && (
        <Grid container spacing={2}>
          {dashboard ? (
            <>
              {/* Overall compliance */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    نسبة الامتثال الإجمالية
                  </Typography>
                  <ComplianceBar value={dashboard.overallCompliance || 0} />
                </Paper>
              </Grid>
              {/* By priority */}
              {dashboard.byPriority &&
                Object.entries(dashboard.byPriority).map(([priority, data]) => (
                  <Grid item xs={12} sm={6} md={3} key={priority}>
                    <Card sx={{ borderRight: `4px solid ${PRIORITY_COLORS[priority] || '#999'}` }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {PRIORITY_MAP[priority] || priority}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} color={PRIORITY_COLORS[priority]}>
                          {data.compliance?.toFixed(1) || 0}%
                        </Typography>
                        <ComplianceBar value={data.compliance || 0} />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 1 }}
                        >
                          {data.total || 0} مهمة &bull; {data.onTime || 0} في الوقت &bull;{' '}
                          {data.breached || 0} خرق
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {/* Recent breaches */}
              {dashboard.recentBreaches && dashboard.recentBreaches.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom color="error">
                      آخر الخروقات
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>المهمة</TableCell>
                            <TableCell>السياسة</TableCell>
                            <TableCell>نوع الخرق</TableCell>
                            <TableCell>التاريخ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboard.recentBreaches.map((b, i) => (
                            <TableRow key={i}>
                              <TableCell>{b.taskTitle || '—'}</TableCell>
                              <TableCell>{b.policyName || '—'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={b.breachType === 'response' ? 'استجابة' : 'حل'}
                                  color="error"
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {b.breachedAt
                                  ? new Date(b.breachedAt).toLocaleString('ar-SA')
                                  : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}
            </>
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">لا تتوفر بيانات لوحة الامتثال حالياً</Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Policy Dialog */}
      <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPolicy ? 'تعديل سياسة SLA' : 'إنشاء سياسة SLA'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={policyData.nameAr}
                onChange={e => setPolicyData(p => ({ ...p, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (إنجليزي)"
                value={policyData.name}
                onChange={e => setPolicyData(p => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={policyData.description}
                onChange={e => setPolicyData(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={policyData.priority}
                  label="الأولوية"
                  onChange={e => setPolicyData(p => ({ ...p, priority: e.target.value }))}
                >
                  <MenuItem value="low">منخفض</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="high">عالي</MenuItem>
                  <MenuItem value="critical">حرج</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="هدف الامتثال (%)"
                value={policyData.targetCompliancePercent}
                onChange={e =>
                  setPolicyData(p => ({ ...p, targetCompliancePercent: Number(e.target.value) }))
                }
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption">أوقات الاستجابة و الحل</Typography>
              </Divider>
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                type="number"
                label="وقت الاستجابة"
                value={policyData.responseTime.value}
                onChange={e =>
                  setPolicyData(p => ({
                    ...p,
                    responseTime: { ...p.responseTime, value: Number(e.target.value) },
                  }))
                }
              />
            </Grid>
            <Grid item xs={3}>
              <FormControl fullWidth>
                <InputLabel>الوحدة</InputLabel>
                <Select
                  value={policyData.responseTime.unit}
                  label="الوحدة"
                  onChange={e =>
                    setPolicyData(p => ({
                      ...p,
                      responseTime: { ...p.responseTime, unit: e.target.value },
                    }))
                  }
                >
                  <MenuItem value="minutes">دقائق</MenuItem>
                  <MenuItem value="hours">ساعات</MenuItem>
                  <MenuItem value="days">أيام</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                type="number"
                label="وقت الحل"
                value={policyData.resolutionTime.value}
                onChange={e =>
                  setPolicyData(p => ({
                    ...p,
                    resolutionTime: { ...p.resolutionTime, value: Number(e.target.value) },
                  }))
                }
              />
            </Grid>
            <Grid item xs={3}>
              <FormControl fullWidth>
                <InputLabel>الوحدة</InputLabel>
                <Select
                  value={policyData.resolutionTime.unit}
                  label="الوحدة"
                  onChange={e =>
                    setPolicyData(p => ({
                      ...p,
                      resolutionTime: { ...p.resolutionTime, unit: e.target.value },
                    }))
                  }
                >
                  <MenuItem value="minutes">دقائق</MenuItem>
                  <MenuItem value="hours">ساعات</MenuItem>
                  <MenuItem value="days">أيام</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!policyData.nameAr}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
