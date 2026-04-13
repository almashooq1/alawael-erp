/**
 * Succession Planning Page — تخطيط التعاقب الوظيفي
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import successionPlanningService from '../../services/successionPlanning.service';

const DEMO_PLANS = [
  {
    _id: '1',
    positionId: 'POS-DG-001',
    positionTitle: 'المدير العام',
    currentHolderName: 'أ. أحمد المحمد',
    department: 'الإدارة العامة',
    riskLevel: 'high',
    timeframe: '1-2 سنة',
    status: 'active',
    candidates: [
      {
        name: 'خالد العمري',
        readiness: 85,
        gap: 'خبرة استراتيجية',
        devPlan: 'برنامج القيادة التنفيذية',
      },
      { name: 'سارة المطيري', readiness: 70, gap: 'خبرة مالية', devPlan: 'MBA + تدوير وظيفي' },
    ],
  },
  {
    _id: '2',
    positionId: 'POS-REHAB-001',
    positionTitle: 'مدير التأهيل والعلاج',
    currentHolderName: 'د. فاطمة الراشد',
    department: 'التأهيل والعلاج',
    riskLevel: 'medium',
    timeframe: '2-3 سنوات',
    status: 'active',
    candidates: [
      { name: 'د. نوف السعيد', readiness: 90, gap: 'مهارات إدارية', devPlan: 'تدريب إداري متقدم' },
      {
        name: 'د. ريم القحطاني',
        readiness: 75,
        gap: 'خبرة في التخطيط',
        devPlan: 'ماجستير إدارة صحية',
      },
    ],
  },
  {
    _id: '3',
    positionId: 'POS-IT-001',
    positionTitle: 'مدير تقنية المعلومات',
    currentHolderName: 'م. عبدالله الشمري',
    department: 'تقنية المعلومات',
    riskLevel: 'critical',
    timeframe: '1 سنة',
    status: 'active',
    candidates: [
      { name: 'م. فهد الدوسري', readiness: 80, gap: 'إدارة مشاريع', devPlan: 'شهادة PMP + توجيه' },
    ],
  },
  {
    _id: '4',
    positionId: 'POS-FIN-001',
    positionTitle: 'مدير الشؤون المالية',
    currentHolderName: 'أ. محمد الحربي',
    department: 'الشؤون المالية',
    riskLevel: 'low',
    timeframe: '3-5 سنوات',
    status: 'active',
    candidates: [
      { name: 'أ. نورة الحربي', readiness: 65, gap: 'خبرة ميزانيات', devPlan: 'تدوير وظيفي + CPA' },
      { name: 'أ. عمر السيد', readiness: 60, gap: 'مهارات قيادية', devPlan: 'برنامج قيادة + MBA' },
    ],
  },
];

const RISK_CONFIG = {
  critical: { label: 'حرج', color: 'error' },
  high: { label: 'مرتفع', color: 'error' },
  medium: { label: 'متوسط', color: 'warning' },
  low: { label: 'منخفض', color: 'success' },
};

const readinessColor = r => (r >= 80 ? '#4CAF50' : r >= 60 ? '#FF9800' : '#f44336');

export default function SuccessionPlanningPage() {
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_isDemo, setIsDemo] = useState(false);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await successionPlanningService.getPlans();
      if (res?.data?.data?.length) {
        setPlans(res.data.data);
        setIsDemo(false);
      } else {
        setPlans(DEMO_PLANS);
        setIsDemo(true);
      }
    } catch {
      setPlans(DEMO_PLANS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.data?._id) await successionPlanningService.updatePlan(dialog.data._id, form);
      else await successionPlanningService.createPlan(form);
      setDialog({ open: false, data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const totalCandidates = plans.reduce((s, p) => s + (p.candidates?.length || 0), 0);
  const highRisk = plans.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
  const avgReadiness =
    totalCandidates > 0
      ? Math.round(
          plans.reduce(
            (s, p) => s + (p.candidates?.reduce((ss, c) => ss + c.readiness, 0) || 0),
            0
          ) / totalCandidates
        )
      : 0;

  const filtered =
    tab === 0
      ? plans
      : tab === 1
        ? plans.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical')
        : plans.filter(p => p.riskLevel !== 'high' && p.riskLevel !== 'critical');

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #e65100 0%, #ef6c00 50%, #fb8c00 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <SuccessionIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  تخطيط التعاقب الوظيفي
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  خطط الإحلال الوظيفي وتطوير المرشحين
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setDialog({ open: true, data: null });
                  setForm({ status: 'active', risk: 'medium' });
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                خطة جديدة
              </Button>
              <IconButton sx={{ color: '#fff' }} onClick={fetchData}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'خطط التعاقب', value: plans.length, icon: <SuccessionIcon />, color: '#e65100' },
          { label: 'مرشحون', value: totalCandidates, icon: <GroupsIcon />, color: '#1565c0' },
          { label: 'مخاطر عالية', value: highRisk, icon: <AssessIcon />, color: '#f44336' },
          {
            label: 'متوسط الجاهزية',
            value: `${avgReadiness}%`,
            icon: <ReadyIcon />,
            color: '#4CAF50',
          },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2.5, textAlign: 'center' }}>
              <CardContent sx={{ py: 2 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 1,
                    bgcolor: s.color + '22',
                    color: s.color,
                    width: 44,
                    height: 44,
                  }}
                >
                  {s.icon}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}
      >
        <Tab label={`الكل (${plans.length})`} />
        <Tab label={`مخاطر عالية (${highRisk})`} />
        <Tab label={`أخرى (${plans.length - highRisk})`} />
      </Tabs>

      {/* Plans Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>المنصب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الشاغر الحالي</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المرشحون</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المخاطرة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الإطار الزمني</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => (
                <TableRow
                  key={p._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setDetailDialog({ open: true, data: p })}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {p.positionTitle}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.department}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={<PersonIcon />}
                      label={p.currentHolderName || 'غير محدد'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {p.candidates?.map((c, i) => (
                        <Chip
                          key={i}
                          size="small"
                          label={`${c.name} (${c.readiness}%)`}
                          sx={{
                            bgcolor: readinessColor(c.readiness) + '22',
                            color: readinessColor(c.readiness),
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={RISK_CONFIG[p.riskLevel]?.label}
                      color={RISK_CONFIG[p.riskLevel]?.color}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={<TimelineIcon />}
                      label={p.timeframe}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDialog({ open: true, data: p });
                        setForm(p);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {detailDialog.data?.positionTitle} — خطة التعاقب
        </DialogTitle>
        <DialogContent dividers>
          {detailDialog.data && (
            <Stack spacing={3}>
              <Stack direction="row" spacing={1}>
                <Chip label={detailDialog.data.department} color="primary" />
                <Chip
                  label={RISK_CONFIG[detailDialog.data.riskLevel]?.label}
                  color={RISK_CONFIG[detailDialog.data.riskLevel]?.color}
                />
                <Chip
                  icon={<TimelineIcon />}
                  label={detailDialog.data.timeframe}
                  variant="outlined"
                />
              </Stack>
              <Typography variant="body2">
                الشاغل الحالي: <strong>{detailDialog.data.currentHolderName || 'غير محدد'}</strong>
              </Typography>

              <Typography variant="subtitle1" fontWeight={700}>
                المرشحون للخلافة
              </Typography>
              <Grid container spacing={2}>
                {detailDialog.data.candidates?.map((c, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            {c.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${c.readiness}%`}
                            sx={{
                              bgcolor: readinessColor(c.readiness) + '22',
                              color: readinessColor(c.readiness),
                              fontWeight: 700,
                            }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          مستوى الجاهزية
                        </Typography>
                        <ProgressBar
                          variant="determinate"
                          value={c.readiness}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            mb: 1,
                            '& .MuiLinearProgress-bar': { bgcolor: readinessColor(c.readiness) },
                          }}
                        />
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          الفجوة: {c.gap}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          خطة التطوير: {c.devPlan}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, data: null })}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialog.data?._id ? 'تعديل خطة التعاقب' : 'خطة تعاقب جديدة'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="رمز الوظيفة"
                  value={form.positionId || ''}
                  onChange={e => setForm(p => ({ ...p, positionId: e.target.value }))}
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="المنصب"
                  value={form.positionTitle || ''}
                  onChange={e => setForm(p => ({ ...p, positionTitle: e.target.value }))}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="الشاغل الحالي"
                  value={form.currentHolderName || ''}
                  onChange={e => setForm(p => ({ ...p, currentHolderName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="القسم"
                  value={form.department || ''}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  label="المخاطرة"
                  value={form.riskLevel || 'medium'}
                  onChange={e => setForm(p => ({ ...p, riskLevel: e.target.value }))}
                >
                  {Object.entries(RISK_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="الإطار الزمني"
                  value={form.timeframe || ''}
                  onChange={e => setForm(p => ({ ...p, timeframe: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog({ open: false, data: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
