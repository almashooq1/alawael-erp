 
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';




import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  under_review: { label: 'تحت المراجعة', color: '#2196F3' },
  approved: { label: 'معتمد', color: '#4CAF50' },
  active: { label: 'نشط', color: '#8BC34A' },
  closed: { label: 'مغلق', color: '#795548' },
};
const typeMap = {
  annual_budget: 'الميزانية السنوية',
  rolling_forecast: 'التوقعات المتجددة',
  strategic_plan: 'الخطة الاستراتيجية',
  capital_budget: 'ميزانية رأس المال',
  cash_flow_forecast: 'توقعات التدفق النقدي',
};

const FinancialPlanning = () => {
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [kpiDashboard, setKpiDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scenarioDialog, setScenarioDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    planName: '',
    planType: 'annual_budget',
    fiscalYear: new Date().getFullYear().toString(),
    startDate: '',
    endDate: '',
  });
  const [scenarioForm, setScenarioForm] = useState({
    name: '',
    type: 'optimistic',
    revenueMultiplier: '1.1',
    expenseMultiplier: '0.95',
    description: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, kRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/financial-plans`, { headers }),
        fetch(`${API}/finance/ultimate/financial-plans/kpi/dashboard`, { headers }),
      ]);
      const pData = await pRes.json();
      const kData = await kRes.json();
      if (pData.success) setPlans(pData.data);
      if (kData.success) setKpiDashboard(kData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
   
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const payload = { ...form, fiscalYear: parseInt(form.fiscalYear) };
      const res = await fetch(`${API}/finance/ultimate/financial-plans`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddScenario = async () => {
    if (!selected) return;
    try {
      const payload = {
        ...scenarioForm,
        revenueMultiplier: parseFloat(scenarioForm.revenueMultiplier),
        expenseMultiplier: parseFloat(scenarioForm.expenseMultiplier),
      };
      const res = await fetch(`${API}/finance/ultimate/financial-plans/${selected._id}/scenario`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setScenarioDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVariance = async id => {
    try {
      await fetch(`${API}/finance/ultimate/financial-plans/${id}/calculate-variance`, {
        method: 'POST',
        headers,
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetail = async id => {
    try {
      const res = await fetch(`${API}/finance/ultimate/financial-plans/${id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setSelected(data.data);
        setDetailDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
          التخطيط والتحليل المالي (FP&A)
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            خطة مالية جديدة
          </Button>
        </Box>
      </Box>

      {kpiDashboard && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي الخطط',
              value: kpiDashboard.totalPlans,
              color: '#2196F3',
              icon: <Assessment />,
            },
            {
              label: 'خطط نشطة',
              value: kpiDashboard.activePlans,
              color: '#4CAF50',
              icon: <TrendingUp />,
            },
            {
              label: 'إجمالي الإيرادات المخططة',
              value: fmt(kpiDashboard.totalPlannedRevenue),
              color: '#FF9800',
              icon: <BarChart />,
            },
            {
              label: 'إجمالي المصروفات المخططة',
              value: fmt(kpiDashboard.totalPlannedExpenses),
              color: '#F44336',
              icon: <Timeline />,
            },
            {
              label: 'صافي الربح المخطط',
              value: fmt(kpiDashboard.netPlannedProfit),
              color: '#8BC34A',
              icon: <Speed />,
            },
            {
              label: 'متوسط الانحراف',
              value: `${kpiDashboard.avgVariance || 0}%`,
              color: '#9C27B0',
              icon: <CompareArrows />,
            },
          ].map((s, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="الخطط المالية" icon={<Assessment />} iconPosition="start" />
        <Tab label="مؤشرات الأداء (KPIs)" icon={<Speed />} iconPosition="start" />
        <Tab label="السيناريوهات" icon={<CompareArrows />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الخطة',
                    'الاسم',
                    'النوع',
                    'السنة',
                    'الإيرادات المخططة',
                    'المصروفات المخططة',
                    'السيناريوهات',
                    'الحالة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map(p => {
                  const st = statusMap[p.status] || statusMap.draft;
                  const totalRev = (p.revenuePlan || []).reduce(
                    (s, r) => s + (r.plannedAmount || 0),
                    0
                  );
                  const totalExp = (p.expensePlan || []).reduce(
                    (s, e) => s + (e.plannedAmount || 0),
                    0
                  );
                  return (
                    <TableRow
                      key={p._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchDetail(p._id)}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {p.planNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{p.planName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {typeMap[p.planType] || p.planType}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{p.fiscalYear}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50', fontWeight: 600 }}>
                        {fmt(totalRev)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#F44336' }}>
                        {fmt(totalExp)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={p.scenarios?.length || 0}
                          size="small"
                          sx={{ bgcolor: '#2196F320', color: '#2196F3' }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="حساب الانحراف">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleVariance(p._id)}
                            >
                              <CompareArrows fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="إضافة سيناريو">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelected(p);
                                setScenarioDialog(true);
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد خطط مالية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              مؤشرات الأداء الرئيسية (KPIs)
            </Typography>
            {kpiDashboard?.kpis && kpiDashboard.kpis.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['المؤشر', 'القيمة المستهدفة', 'القيمة الفعلية', 'نسبة التحقيق', 'الحالة'].map(
                      h => (
                        <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                          {h}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpiDashboard.kpis.map((kpi, i) => {
                    const achieve = kpi.target ? Math.round((kpi.actual / kpi.target) * 100) : 0;
                    return (
                      <TableRow key={i}>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {kpi.name}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{kpi.target}</TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {kpi.actual}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(achieve, 100)}
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                              color={
                                achieve >= 90 ? 'success' : achieve >= 70 ? 'warning' : 'error'
                              }
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {achieve}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={achieve >= 90 ? 'ممتاز' : achieve >= 70 ? 'جيد' : 'يحتاج تحسين'}
                            size="small"
                            sx={{
                              bgcolor:
                                achieve >= 90
                                  ? '#4CAF5020'
                                  : achieve >= 70
                                    ? '#FF980020'
                                    : '#F4433620',
                              color:
                                achieve >= 90 ? '#4CAF50' : achieve >= 70 ? '#FF9800' : '#F44336',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography color={neutralColors.textSecondary} textAlign="center" py={3}>
                لا توجد مؤشرات أداء بعد
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && selected && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              السيناريوهات - {selected.planName}
            </Typography>
            <Grid container spacing={2}>
              {(selected.scenarios || []).map((sc, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Card
                    sx={{
                      border: '1px solid',
                      borderColor:
                        sc.type === 'optimistic'
                          ? '#4CAF50'
                          : sc.type === 'pessimistic'
                            ? '#F44336'
                            : sc.type === 'stress'
                              ? '#D32F2F'
                              : '#2196F3',
                      bgcolor: surfaceColors.card,
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color={
                          sc.type === 'optimistic'
                            ? '#4CAF50'
                            : sc.type === 'pessimistic'
                              ? '#F44336'
                              : '#2196F3'
                        }
                      >
                        {sc.name || sc.type}
                      </Typography>
                      <Typography variant="body2" color={neutralColors.textSecondary} mb={1}>
                        {sc.description}
                      </Typography>
                      <Typography variant="body2">
                        <strong>مضاعف الإيرادات:</strong> {sc.revenueMultiplier}x
                      </Typography>
                      <Typography variant="body2">
                        <strong>مضاعف المصروفات:</strong> {sc.expenseMultiplier}x
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {(!selected.scenarios || selected.scenarios.length === 0) && (
                <Grid item xs={12}>
                  <Typography color={neutralColors.textSecondary} textAlign="center" py={2}>
                    لا توجد سيناريوهات
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>خطة مالية جديدة</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم الخطة"
              value={form.planName}
              onChange={e => setForm({ ...form, planName: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="نوع الخطة"
              value={form.planType}
              onChange={e => setForm({ ...form, planType: e.target.value })}
              fullWidth
            >
              {Object.entries(typeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="السنة المالية"
              type="number"
              value={form.fiscalYear}
              onChange={e => setForm({ ...form, fiscalYear: e.target.value })}
              fullWidth
            />
            <TextField
              label="تاريخ البدء"
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Scenario Dialog */}
      <Dialog
        open={scenarioDialog}
        onClose={() => setScenarioDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة سيناريو - {selected?.planName}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم السيناريو"
              value={scenarioForm.name}
              onChange={e => setScenarioForm({ ...scenarioForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="النوع"
              value={scenarioForm.type}
              onChange={e => setScenarioForm({ ...scenarioForm, type: e.target.value })}
              fullWidth
            >
              <MenuItem value="base">أساسي</MenuItem>
              <MenuItem value="optimistic">متفائل</MenuItem>
              <MenuItem value="pessimistic">متشائم</MenuItem>
              <MenuItem value="stress">ضغط</MenuItem>
            </TextField>
            <TextField
              label="مضاعف الإيرادات"
              type="number"
              value={scenarioForm.revenueMultiplier}
              onChange={e =>
                setScenarioForm({ ...scenarioForm, revenueMultiplier: e.target.value })
              }
              fullWidth
              inputProps={{ step: 0.05 }}
            />
            <TextField
              label="مضاعف المصروفات"
              type="number"
              value={scenarioForm.expenseMultiplier}
              onChange={e =>
                setScenarioForm({ ...scenarioForm, expenseMultiplier: e.target.value })
              }
              fullWidth
              inputProps={{ step: 0.05 }}
            />
            <TextField
              label="الوصف"
              value={scenarioForm.description}
              onChange={e => setScenarioForm({ ...scenarioForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScenarioDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddScenario}
            sx={{ bgcolor: brandColors.primary }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الخطة - {selected?.planNumber}</DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>
                  <strong>الاسم:</strong> {selected.planName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>النوع:</strong> {typeMap[selected.planType]}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>السنة:</strong> {selected.fiscalYear}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>السيناريوهات:</strong> {selected.scenarios?.length || 0}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} mt={1}>
                  خطة الإيرادات:
                </Typography>
              </Grid>
              {(selected.revenuePlan || []).map((r, i) => (
                <Grid item xs={4} key={i}>
                  <Card sx={{ p: 1.5, bgcolor: '#4CAF5008' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {r.category || `بند ${i + 1}`}
                    </Typography>
                    <Typography variant="body2">مخطط: {fmt(r.plannedAmount)}</Typography>
                    <Typography variant="body2">فعلي: {fmt(r.actualAmount)}</Typography>
                  </Card>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} mt={1}>
                  خطة المصروفات:
                </Typography>
              </Grid>
              {(selected.expensePlan || []).map((e, i) => (
                <Grid item xs={4} key={i}>
                  <Card sx={{ p: 1.5, bgcolor: '#F4433608' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {e.category || `بند ${i + 1}`}
                    </Typography>
                    <Typography variant="body2">مخطط: {fmt(e.plannedAmount)}</Typography>
                    <Typography variant="body2">فعلي: {fmt(e.actualAmount)}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FinancialPlanning;
