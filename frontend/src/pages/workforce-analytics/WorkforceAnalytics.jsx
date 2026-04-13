/**
 * Workforce Analytics & Planning Dashboard — لوحة تحليلات القوى العاملة
 * Phase 21 — تخطيط القوى العاملة، التنبؤ، التعاقب، المهارات، التعويضات
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import workforceAnalyticsService from '../../services/workforceAnalyticsService';

/* ═══ Helper — risk chip color ═══ */
const _riskColor = (level) => {
  const map = { high: 'error', medium: 'warning', low: 'success' };
  return map[level] || 'default';
};

const statusColor = (st) => {
  const map = {
    draft: 'default', pending: 'warning', approved: 'success', rejected: 'error',
    active: 'info', ready: 'success', developing: 'warning', 'not-ready': 'error',
    'high-risk': 'error',
  };
  return map[st] || 'default';
};

const healthColor = (status) => {
  const map = { healthy: '#4caf50', 'at-risk': '#ff9800', critical: '#f44336' };
  return map[status] || '#9e9e9e';
};

/* ═══ Stat Card ═══ */
const StatCard = ({ icon, title, value, color = 'primary.main', subtitle }) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" fontWeight="bold">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </CardContent>
  </Card>
);

/* ═══ Main Component ═══ */
export default function WorkforceAnalytics() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [healthScore, setHealthScore] = useState(null);
  const [headcountPlans, setHeadcountPlans] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [successionPlans, setSuccessionPlans] = useState([]);
  const [salaryBands, setSalaryBands] = useState([]);

  // Dialogs
  const [openDialog, setOpenDialog] = useState(null);
  const [formData, setFormData] = useState({});

  /* ── Fetch All ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, plans, fcs, succs, bands] = await Promise.allSettled([
        workforceAnalyticsService.getHealthScore(),
        workforceAnalyticsService.listHeadcountPlans(),
        workforceAnalyticsService.listForecasts(),
        workforceAnalyticsService.listSuccessionPlans(),
        workforceAnalyticsService.listSalaryBands(),
      ]);

      if (health.status === 'fulfilled') setHealthScore(health.value?.data?.data || null);
      if (plans.status === 'fulfilled') setHeadcountPlans(plans.value?.data?.data || []);
      if (fcs.status === 'fulfilled') setForecasts(fcs.value?.data?.data || []);
      if (succs.status === 'fulfilled') setSuccessionPlans(succs.value?.data?.data || []);
      if (bands.status === 'fulfilled') setSalaryBands(bands.value?.data?.data || []);
    } catch (err) {
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Form handlers ── */
  const handleFormChange = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleCreateHeadcountPlan = async () => {
    try {
      await workforceAnalyticsService.createHeadcountPlan({
        departmentId: formData.departmentId,
        planYear: parseInt(formData.planYear) || 2026,
        targetHeadcount: parseInt(formData.targetHeadcount) || 0,
        currentHeadcount: parseInt(formData.currentHeadcount) || 0,
        budgetedCost: parseInt(formData.budgetedCost) || 0,
      });
      setOpenDialog(null);
      setFormData({});
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateForecast = async () => {
    try {
      await workforceAnalyticsService.createForecast({
        metric: formData.metric || 'headcount',
        department: formData.department,
        period: formData.period,
        predictedValue: parseFloat(formData.predictedValue) || 0,
        confidence: parseFloat(formData.confidence) || 0.8,
      });
      setOpenDialog(null);
      setFormData({});
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSuccessionPlan = async () => {
    try {
      await workforceAnalyticsService.createSuccessionPlan({
        positionId: formData.positionId,
        positionTitle: formData.positionTitle,
        currentHolder: formData.currentHolder,
        criticalityLevel: formData.criticalityLevel || 'medium',
      });
      setOpenDialog(null);
      setFormData({});
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  /* ── TABS ── */
  const TABS = [
    'نظرة عامة',         // 0 — Overview
    'تخطيط القوى العاملة', // 1 — Headcount Plans
    'التنبؤ',              // 2 — Forecasting
    'التعاقب الوظيفي',     // 3 — Succession
    'المهارات',            // 4 — Skills
    'التعويضات',           // 5 — Compensation
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>جاري تحميل تحليلات القوى العاملة...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تحليلات القوى العاملة والتخطيط
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Phase 21 — Workforce Analytics & Planning
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchAll} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((label, i) => <Tab key={i} label={label} />)}
        </Tabs>
      </Paper>

      {/* ═══ Tab 0: Overview ═══ */}
      {tab === 0 && (
        <Box>
          {/* Health Score */}
          {healthScore && (
            <Paper sx={{ p: 3, mb: 3, border: `2px solid ${healthColor(healthScore.status)}` }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <FavoriteIcon sx={{ fontSize: 48, color: healthColor(healthScore.status) }} />
                    <Typography variant="h3" fontWeight="bold" sx={{ color: healthColor(healthScore.status) }}>
                      {healthScore.overallHealthScore}%
                    </Typography>
                    <Chip
                      label={healthScore.status === 'healthy' ? 'صحي' : healthScore.status === 'at-risk' ? 'معرض للخطر' : 'حرج'}
                      sx={{ bgcolor: healthColor(healthScore.status), color: '#fff', fontWeight: 'bold' }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={9}>
                  <Typography variant="h6" gutterBottom>مؤشرات الصحة التنظيمية</Typography>
                  {healthScore.metrics && Object.entries(healthScore.metrics).map(([key, val]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {key === 'retentionScore' ? 'الاحتفاظ' :
                           key === 'engagementScore' ? 'المشاركة' :
                           key === 'compensationScore' ? 'التعويضات' :
                           key === 'developmentScore' ? 'التطوير' :
                           key === 'diversityScore' ? 'التنوع' : key}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">{val}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={val} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <StatCard icon={<PeopleIcon fontSize="large" />} title="خطط القوى العاملة" value={headcountPlans.length} color="primary.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard icon={<TrendingUpIcon fontSize="large" />} title="التنبؤات" value={forecasts.length} color="info.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard icon={<SwapHorizIcon fontSize="large" />} title="خطط التعاقب" value={successionPlans.length} color="warning.main" />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard icon={<AttachMoneyIcon fontSize="large" />} title="نطاقات الرواتب" value={salaryBands.length} color="success.main" />
            </Grid>
          </Grid>

          {/* Recommendations */}
          {healthScore?.recommendations && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>التوصيات</Typography>
              {healthScore.recommendations.map((rec, i) => (
                <Alert key={i} severity="info" sx={{ mb: 1 }}>{rec}</Alert>
              ))}
            </Paper>
          )}
        </Box>
      )}

      {/* ═══ Tab 1: Headcount Plans ═══ */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setOpenDialog('headcount'); }}>
              خطة جديدة
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المعرّف</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>السنة</TableCell>
                  <TableCell>الحالي</TableCell>
                  <TableCell>المستهدف</TableCell>
                  <TableCell>الميزانية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الموافقة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {headcountPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">لا توجد خطط بعد</TableCell></TableRow>
                ) : headcountPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{plan.id}</Typography></TableCell>
                    <TableCell>{plan.departmentId}</TableCell>
                    <TableCell>{plan.planYear}</TableCell>
                    <TableCell>{plan.currentHeadcount}</TableCell>
                    <TableCell><strong>{plan.targetHeadcount}</strong></TableCell>
                    <TableCell>{plan.budgetedCost ? `${(plan.budgetedCost / 1000).toFixed(0)}K` : '—'}</TableCell>
                    <TableCell><Chip label={plan.status} color={statusColor(plan.status)} size="small" /></TableCell>
                    <TableCell>
                      <Chip label={plan.approvalStatus} color={statusColor(plan.approvalStatus)} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ═══ Tab 2: Forecasting ═══ */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setOpenDialog('forecast'); }}>
              تنبؤ جديد
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المعرّف</TableCell>
                  <TableCell>المقياس</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الفترة</TableCell>
                  <TableCell>القيمة المتوقعة</TableCell>
                  <TableCell>الثقة</TableCell>
                  <TableCell>المنهجية</TableCell>
                  <TableCell>الدقة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forecasts.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">لا توجد تنبؤات بعد</TableCell></TableRow>
                ) : forecasts.map((fc) => (
                  <TableRow key={fc.id}>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{fc.id}</Typography></TableCell>
                    <TableCell>{fc.metric}</TableCell>
                    <TableCell>{fc.department}</TableCell>
                    <TableCell>{fc.period}</TableCell>
                    <TableCell><strong>{fc.predictedValue}</strong></TableCell>
                    <TableCell>{fc.confidence ? `${(fc.confidence * 100).toFixed(0)}%` : '—'}</TableCell>
                    <TableCell>{fc.methodology}</TableCell>
                    <TableCell>{fc.accuracy ? `MAPE: ${fc.accuracy.MAPE}%` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ═══ Tab 3: Succession Planning ═══ */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData({}); setOpenDialog('succession'); }}>
              خطة تعاقب جديدة
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المعرّف</TableCell>
                  <TableCell>المنصب</TableCell>
                  <TableCell>الشاغل الحالي</TableCell>
                  <TableCell>الأهمية</TableCell>
                  <TableCell>البدلاء</TableCell>
                  <TableCell>جاهزية الاستبدال</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {successionPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">لا توجد خطط تعاقب بعد</TableCell></TableRow>
                ) : successionPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{plan.id}</Typography></TableCell>
                    <TableCell>{plan.positionTitle || plan.positionId}</TableCell>
                    <TableCell>{plan.currentHolder}</TableCell>
                    <TableCell>
                      <Chip
                        label={plan.criticalityLevel === 'critical' ? 'حرج' : plan.criticalityLevel === 'high' ? 'عالي' : plan.criticalityLevel === 'medium' ? 'متوسط' : 'منخفض'}
                        color={plan.criticalityLevel === 'critical' ? 'error' : plan.criticalityLevel === 'high' ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{plan.successors?.length || 0}</TableCell>
                    <TableCell>
                      <Chip label={plan.replacementReadiness} color={statusColor(plan.replacementReadiness)} size="small" />
                    </TableCell>
                    <TableCell><Chip label={plan.status} color={statusColor(plan.status)} size="small" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ═══ Tab 4: Skills ═══ */}
      {tab === 4 && (
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <SchoolIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              تتبع المهارات والكفاءات
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Alert severity="info" sx={{ mb: 2 }}>
              استخدم واجهة برمجة التطبيقات لإنشاء وتحديث خرائط المهارات للموظفين.
              يتم تحديد فجوات المهارات تلقائياً بناءً على مستوى الإتقان وسنوات الخبرة.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">إنشاء خريطة مهارات</Typography>
                  <Typography variant="body2" color="text.secondary">
                    POST /api/workforce-analytics/skills
                  </Typography>
                  <Typography variant="caption">
                    الحقول: employeeId, department, skills[], certifications[]
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">تحديث الإتقان</Typography>
                  <Typography variant="body2" color="text.secondary">
                    PUT /api/workforce-analytics/skills/:id
                  </Typography>
                  <Typography variant="caption">
                    الحقول: skillName, proficiency (1-5), yearsOfExperience
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}

      {/* ═══ Tab 5: Compensation ═══ */}
      {tab === 5 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            <AttachMoneyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            نطاقات الرواتب والتعويضات
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المعرّف</TableCell>
                  <TableCell>اسم النطاق</TableCell>
                  <TableCell>المستوى</TableCell>
                  <TableCell>الحد الأدنى</TableCell>
                  <TableCell>نقطة الوسط</TableCell>
                  <TableCell>الحد الأقصى</TableCell>
                  <TableCell>النطاق</TableCell>
                  <TableCell>العملة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salaryBands.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">لا توجد نطاقات رواتب بعد</TableCell></TableRow>
                ) : salaryBands.map((band) => (
                  <TableRow key={band.id}>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{band.id}</Typography></TableCell>
                    <TableCell><strong>{band.bandName}</strong></TableCell>
                    <TableCell>{band.level}</TableCell>
                    <TableCell>{band.minSalary?.toLocaleString()}</TableCell>
                    <TableCell>{band.midPoint?.toLocaleString()}</TableCell>
                    <TableCell>{band.maxSalary?.toLocaleString()}</TableCell>
                    <TableCell>{band.range?.toLocaleString()}</TableCell>
                    <TableCell>{band.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ═══ DIALOGS ═══ */}

      {/* Headcount Plan Dialog */}
      <Dialog open={openDialog === 'headcount'} onClose={() => setOpenDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء خطة قوى عاملة</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="معرّف القسم" value={formData.departmentId || ''} onChange={handleFormChange('departmentId')} margin="normal" />
          <TextField fullWidth label="السنة" type="number" value={formData.planYear || ''} onChange={handleFormChange('planYear')} margin="normal" />
          <TextField fullWidth label="العدد الحالي" type="number" value={formData.currentHeadcount || ''} onChange={handleFormChange('currentHeadcount')} margin="normal" />
          <TextField fullWidth label="العدد المستهدف" type="number" value={formData.targetHeadcount || ''} onChange={handleFormChange('targetHeadcount')} margin="normal" />
          <TextField fullWidth label="الميزانية (ريال)" type="number" value={formData.budgetedCost || ''} onChange={handleFormChange('budgetedCost')} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateHeadcountPlan}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Forecast Dialog */}
      <Dialog open={openDialog === 'forecast'} onClose={() => setOpenDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء تنبؤ جديد</DialogTitle>
        <DialogContent>
          <TextField fullWidth select label="المقياس" value={formData.metric || ''} onChange={handleFormChange('metric')} margin="normal">
            {['headcount', 'cost', 'attrition', 'revenue'].map(m => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth label="القسم" value={formData.department || ''} onChange={handleFormChange('department')} margin="normal" />
          <TextField fullWidth label="الفترة" value={formData.period || ''} onChange={handleFormChange('period')} margin="normal" placeholder="2026-Q1" />
          <TextField fullWidth label="القيمة المتوقعة" type="number" value={formData.predictedValue || ''} onChange={handleFormChange('predictedValue')} margin="normal" />
          <TextField fullWidth label="مستوى الثقة (0-1)" type="number" value={formData.confidence || ''} onChange={handleFormChange('confidence')} margin="normal" inputProps={{ step: 0.1, min: 0, max: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateForecast}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Succession Plan Dialog */}
      <Dialog open={openDialog === 'succession'} onClose={() => setOpenDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء خطة تعاقب</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="معرّف المنصب" value={formData.positionId || ''} onChange={handleFormChange('positionId')} margin="normal" />
          <TextField fullWidth label="اسم المنصب" value={formData.positionTitle || ''} onChange={handleFormChange('positionTitle')} margin="normal" />
          <TextField fullWidth label="الشاغل الحالي" value={formData.currentHolder || ''} onChange={handleFormChange('currentHolder')} margin="normal" />
          <TextField fullWidth select label="مستوى الأهمية" value={formData.criticalityLevel || ''} onChange={handleFormChange('criticalityLevel')} margin="normal">
            {[
              { value: 'critical', label: 'حرج' },
              { value: 'high', label: 'عالي' },
              { value: 'medium', label: 'متوسط' },
              { value: 'low', label: 'منخفض' },
            ].map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateSuccessionPlan}>إنشاء</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
