/**
 * Strategic Planning Dashboard — لوحة التخطيط الاستراتيجي
 * النظام المفقود بالكامل — تم بناؤه من الصفر
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import strategicPlanningService from '../../services/strategicPlanning.service';
import {
  Alert,
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
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import SpeedIcon from '@mui/icons-material/Speed';
import TimelineIcon from '@mui/icons-material/Timeline';
import EditIcon from '@mui/icons-material/Edit';
import { ChartIcon } from 'utils/iconAliases';

/* ══════════════ بيانات تجريبية ══════════════ */
const DEMO_GOALS = [
  {
    _id: '1',
    title: 'تحسين جودة الخدمات التأهيلية',
    perspective: 'customer',
    status: 'on_track',
    progress: 72,
    weight: 25,
    owner: 'إدارة التأهيل',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    initiativesCount: 4,
    kpisCount: 3,
  },
  {
    _id: '2',
    title: 'رفع كفاءة العمليات التشغيلية',
    perspective: 'internal_processes',
    status: 'at_risk',
    progress: 45,
    weight: 20,
    owner: 'إدارة العمليات',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    initiativesCount: 3,
    kpisCount: 5,
  },
  {
    _id: '3',
    title: 'تطوير الكوادر البشرية',
    perspective: 'learning_growth',
    status: 'on_track',
    progress: 68,
    weight: 20,
    owner: 'إدارة الموارد البشرية',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    initiativesCount: 5,
    kpisCount: 4,
  },
  {
    _id: '4',
    title: 'تحقيق الاستدامة المالية',
    perspective: 'financial',
    status: 'on_track',
    progress: 81,
    weight: 20,
    owner: 'الإدارة المالية',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    initiativesCount: 3,
    kpisCount: 6,
  },
  {
    _id: '5',
    title: 'التحول الرقمي الشامل',
    perspective: 'internal_processes',
    status: 'delayed',
    progress: 32,
    weight: 15,
    owner: 'إدارة تقنية المعلومات',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    initiativesCount: 6,
    kpisCount: 4,
  },
];

const DEMO_INITIATIVES = [
  {
    _id: '1',
    title: 'برنامج تدريب المعالجين الجدد',
    goalId: '3',
    status: 'in_progress',
    progress: 60,
    budget: 150000,
    spent: 85000,
    owner: 'أحمد المحمد',
    priority: 'high',
    startDate: '2026-02-01',
    endDate: '2026-08-31',
  },
  {
    _id: '2',
    title: 'تطبيق نظام الجودة الشاملة',
    goalId: '1',
    status: 'in_progress',
    progress: 45,
    budget: 200000,
    spent: 78000,
    owner: 'سارة العلي',
    priority: 'critical',
    startDate: '2026-01-15',
    endDate: '2026-09-30',
  },
  {
    _id: '3',
    title: 'أتمتة إجراءات القبول والتسجيل',
    goalId: '5',
    status: 'not_started',
    progress: 0,
    budget: 120000,
    spent: 0,
    owner: 'خالد السعيد',
    priority: 'medium',
    startDate: '2026-04-01',
    endDate: '2026-10-31',
  },
  {
    _id: '4',
    title: 'تنويع مصادر الدخل',
    goalId: '4',
    status: 'in_progress',
    progress: 70,
    budget: 80000,
    spent: 52000,
    owner: 'فاطمة الراشد',
    priority: 'high',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
  },
  {
    _id: '5',
    title: 'إطلاق بوابة المستفيدين الإلكترونية',
    goalId: '5',
    status: 'in_progress',
    progress: 55,
    budget: 180000,
    spent: 95000,
    owner: 'محمد العمري',
    priority: 'high',
    startDate: '2026-03-01',
    endDate: '2026-11-30',
  },
];

const DEMO_KPIS = [
  {
    _id: '1',
    name: 'نسبة رضا المستفيدين',
    goalId: '1',
    target: 90,
    actual: 85,
    unit: '%',
    frequency: 'quarterly',
    trend: 'up',
  },
  {
    _id: '2',
    name: 'معدل دوران الموظفين',
    goalId: '3',
    target: 5,
    actual: 8,
    unit: '%',
    frequency: 'monthly',
    trend: 'down',
  },
  {
    _id: '3',
    name: 'نسبة التحصيل المالي',
    goalId: '4',
    target: 95,
    actual: 91,
    unit: '%',
    frequency: 'monthly',
    trend: 'up',
  },
  {
    _id: '4',
    name: 'عدد الخدمات المؤتمتة',
    goalId: '5',
    target: 20,
    actual: 7,
    unit: 'خدمة',
    frequency: 'quarterly',
    trend: 'up',
  },
  {
    _id: '5',
    name: 'معدل إنجاز الخطط العلاجية',
    goalId: '1',
    target: 85,
    actual: 78,
    unit: '%',
    frequency: 'monthly',
    trend: 'stable',
  },
  {
    _id: '6',
    name: 'ساعات التدريب لكل موظف',
    goalId: '3',
    target: 40,
    actual: 28,
    unit: 'ساعة',
    frequency: 'quarterly',
    trend: 'up',
  },
];

const PERSPECTIVES = {
  financial: { label: 'المنظور المالي', color: '#4CAF50', icon: '💰' },
  customer: { label: 'منظور العملاء', color: '#2196F3', icon: '👥' },
  internal_processes: { label: 'العمليات الداخلية', color: '#FF9800', icon: '⚙️' },
  learning_growth: { label: 'التعلم والنمو', color: '#9C27B0', icon: '📚' },
};

const GOAL_STATUS = {
  on_track: { label: 'على المسار', color: 'success' },
  at_risk: { label: 'في خطر', color: 'warning' },
  delayed: { label: 'متأخر', color: 'error' },
  completed: { label: 'مكتمل', color: 'info' },
  not_started: { label: 'لم يبدأ', color: 'default' },
};

const INITIATIVE_STATUS = {
  not_started: { label: 'لم تبدأ', color: 'default' },
  in_progress: { label: 'قيد التنفيذ', color: 'info' },
  completed: { label: 'مكتملة', color: 'success' },
  on_hold: { label: 'معلقة', color: 'warning' },
  cancelled: { label: 'ملغاة', color: 'error' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'حرج', color: 'error' },
  high: { label: 'عالي', color: 'warning' },
  medium: { label: 'متوسط', color: 'info' },
  low: { label: 'منخفض', color: 'default' },
};

const CHART_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

export default function StrategicPlanningPage() {
  const [tab, setTab] = useState(0);
  const [goals, setGoals] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [kpis, setKPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, type: '', data: null });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, initRes, kpiRes] = await Promise.all([
        strategicPlanningService.getGoals().catch(() => null),
        strategicPlanningService.getInitiatives().catch(() => null),
        strategicPlanningService.getKPIs().catch(() => null),
      ]);
      setGoals(goalsRes?.data?.data?.length ? goalsRes.data.data : DEMO_GOALS);
      setInitiatives(initRes?.data?.data?.length ? initRes.data.data : DEMO_INITIATIVES);
      setKPIs(kpiRes?.data?.data?.length ? kpiRes.data.data : DEMO_KPIS);
    } catch {
      setGoals(DEMO_GOALS);
      setInitiatives(DEMO_INITIATIVES);
      setKPIs(DEMO_KPIS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'goal') {
        if (dialog.data?._id) await strategicPlanningService.updateGoal(dialog.data._id, form);
        else await strategicPlanningService.createGoal(form);
      } else if (dialog.type === 'initiative') {
        if (dialog.data?._id)
          await strategicPlanningService.updateInitiative(dialog.data._id, form);
        else await strategicPlanningService.createInitiative(form);
      } else if (dialog.type === 'kpi') {
        if (dialog.data?._id) await strategicPlanningService.updateKPI(dialog.data._id, form);
        else await strategicPlanningService.createKPI(form);
      }
      setDialog({ open: false, type: '', data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const openDialog = (type, data = null) => {
    setDialog({ open: true, type, data });
    setForm(data || {});
    setError('');
  };

  /* ── Stats ── */
  const totalGoals = goals.length;
  const onTrack = goals.filter(g => g.status === 'on_track').length;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;
  const totalBudget = initiatives.reduce((s, i) => s + (i.budget || 0), 0);
  const totalSpent = initiatives.reduce((s, i) => s + (i.spent || 0), 0);

  const perspectiveData = Object.entries(PERSPECTIVES).map(([key, p]) => {
    const pGoals = goals.filter(g => g.perspective === key);
    return {
      subject: p.label,
      progress: pGoals.length
        ? Math.round(pGoals.reduce((s, g) => s + g.progress, 0) / pGoals.length)
        : 0,
      fullMark: 100,
    };
  });

  const goalsByStatus = Object.entries(GOAL_STATUS)
    .map(([key, cfg]) => ({
      name: cfg.label,
      value: goals.filter(g => g.status === key).length,
    }))
    .filter(d => d.value > 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <FlagIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  التخطيط الاستراتيجي
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  الأهداف والمبادرات ومؤشرات الأداء — بطاقة الأداء المتوازن
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => openDialog('goal')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                هدف جديد
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

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'الأهداف الاستراتيجية',
            value: totalGoals,
            icon: <FlagIcon />,
            color: '#1a237e',
          },
          {
            label: 'على المسار الصحيح',
            value: `${onTrack}/${totalGoals}`,
            icon: <CheckIcon />,
            color: '#4CAF50',
          },
          {
            label: 'نسبة الإنجاز الكلية',
            value: `${avgProgress}%`,
            icon: <SpeedIcon />,
            color: '#FF9800',
          },
          {
            label: 'المبادرات الجارية',
            value: initiatives.filter(i => i.status === 'in_progress').length,
            icon: <InitiativeIcon />,
            color: '#2196F3',
          },
          {
            label: 'الميزانية المعتمدة',
            value: `${(totalBudget / 1000).toFixed(0)}K ر.س`,
            icon: <ChartIcon />,
            color: '#9C27B0',
          },
          {
            label: 'نسبة الصرف',
            value: totalBudget ? `${Math.round((totalSpent / totalBudget) * 100)}%` : '0%',
            icon: <TrendingIcon />,
            color: '#F44336',
          },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={2} key={i}>
            <Card sx={{ borderRadius: 2.5, border: '1px solid #e0e0e0', textAlign: 'center' }}>
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
        <Tab icon={<FlagIcon />} label="الأهداف الاستراتيجية" iconPosition="start" />
        <Tab icon={<InitiativeIcon />} label="المبادرات" iconPosition="start" />
        <Tab icon={<KPIIcon />} label="مؤشرات الأداء (KPIs)" iconPosition="start" />
        <Tab icon={<TimelineIcon />} label="بطاقة الأداء المتوازن" iconPosition="start" />
      </Tabs>

      {/* ═══ Tab 0: الأهداف الاستراتيجية ═══ */}
      {tab === 0 && (
        <Box>
          {Object.entries(PERSPECTIVES).map(([pKey, pCfg]) => {
            const pGoals = goals.filter(g => g.perspective === pKey);
            if (!pGoals.length) return null;
            return (
              <Box key={pKey} sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <span>{pCfg.icon}</span> {pCfg.label}
                  <Chip
                    size="small"
                    label={`${pGoals.length} أهداف`}
                    sx={{ bgcolor: pCfg.color + '22', color: pCfg.color }}
                  />
                </Typography>
                <Grid container spacing={2}>
                  {pGoals.map(goal => (
                    <Grid item xs={12} md={6} key={goal._id}>
                      <Card sx={{ borderRadius: 2, borderRight: `4px solid ${pCfg.color}` }}>
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 1,
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight={600}>
                              {goal.title}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                size="small"
                                label={GOAL_STATUS[goal.status]?.label}
                                color={GOAL_STATUS[goal.status]?.color}
                              />
                              <IconButton size="small" onClick={() => openDialog('goal', goal)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            المسؤول: {goal.owner} | الوزن: {goal.weight}%
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={goal.progress}
                              sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor:
                                    goal.progress >= 70
                                      ? '#4CAF50'
                                      : goal.progress >= 40
                                        ? '#FF9800'
                                        : '#F44336',
                                  borderRadius: 4,
                                },
                              }}
                            />
                            <Typography variant="body2" fontWeight={700}>
                              {goal.progress}%
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              size="small"
                              icon={<InitiativeIcon />}
                              label={`${goal.initiativesCount || 0} مبادرات`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              icon={<KPIIcon />}
                              label={`${goal.kpisCount || 0} مؤشرات`}
                              variant="outlined"
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ═══ Tab 1: المبادرات ═══ */}
      {tab === 1 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                المبادرات والمشاريع الاستراتيجية
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => openDialog('initiative')}
              >
                مبادرة جديدة
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المبادرة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المسؤول</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الميزانية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الصرف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {initiatives.map(init => (
                    <TableRow key={init._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {init.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{init.owner}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={PRIORITY_CONFIG[init.priority]?.label}
                          color={PRIORITY_CONFIG[init.priority]?.color}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={INITIATIVE_STATUS[init.status]?.label}
                          color={INITIATIVE_STATUS[init.status]?.color}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={init.progress}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">{init.progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{(init.budget || 0).toLocaleString()} ر.س</TableCell>
                      <TableCell>{(init.spent || 0).toLocaleString()} ر.س</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openDialog('initiative', init)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ═══ Tab 2: مؤشرات الأداء ═══ */}
      {tab === 2 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                مؤشرات الأداء الرئيسية (KPIs)
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => openDialog('kpi')}
              >
                مؤشر جديد
              </Button>
            </Box>
            <Grid container spacing={2}>
              {kpis.map(kpi => {
                const pct = kpi.target ? Math.round((kpi.actual / kpi.target) * 100) : 0;
                const isGood = pct >= 90;
                const isWarn = pct >= 70 && pct < 90;
                return (
                  <Grid item xs={12} sm={6} md={4} key={kpi._id}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          {kpi.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            المستهدف: {kpi.target} {kpi.unit}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={isGood ? 'success.main' : isWarn ? 'warning.main' : 'error.main'}
                          >
                            الفعلي: {kpi.actual} {kpi.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(pct, 100)}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: isGood ? '#4CAF50' : isWarn ? '#FF9800' : '#F44336',
                              borderRadius: 5,
                            },
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            التكرار:{' '}
                            {kpi.frequency === 'monthly'
                              ? 'شهري'
                              : kpi.frequency === 'quarterly'
                                ? 'ربع سنوي'
                                : 'سنوي'}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${pct}%`}
                            color={isGood ? 'success' : isWarn ? 'warning' : 'error'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ═══ Tab 3: بطاقة الأداء المتوازن ═══ */}
      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  بطاقة الأداء المتوازن (BSC)
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={perspectiveData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="نسبة التقدم"
                      dataKey="progress"
                      stroke="#1a237e"
                      fill="#1a237e"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  حالة الأهداف
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={goalsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {goalsByStatus.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  تقدم الأهداف حسب المنظور
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={goals.map(g => ({
                      name: g.title.substring(0, 25) + '...',
                      progress: g.progress,
                      perspective: PERSPECTIVES[g.perspective]?.label,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis domain={[0, 100]} />
                    <RTooltip />
                    <Bar
                      dataKey="progress"
                      name="نسبة الإنجاز"
                      fill="#1a237e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══ Dialog ═══ */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, type: '', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialog.type === 'goal'
            ? dialog.data?._id
              ? 'تعديل هدف استراتيجي'
              : 'إضافة هدف استراتيجي'
            : dialog.type === 'initiative'
              ? dialog.data?._id
                ? 'تعديل مبادرة'
                : 'إضافة مبادرة'
              : dialog.data?._id
                ? 'تعديل مؤشر أداء'
                : 'إضافة مؤشر أداء'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'goal' && (
              <>
                <TextField
                  fullWidth
                  label="عنوان الهدف"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
                <TextField
                  fullWidth
                  select
                  label="المنظور"
                  value={form.perspective || ''}
                  onChange={e => setForm(p => ({ ...p, perspective: e.target.value }))}
                >
                  {Object.entries(PERSPECTIVES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.icon} {v.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="المسؤول"
                  value={form.owner || ''}
                  onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="الوزن (%)"
                  value={form.weight || ''}
                  onChange={e => setForm(p => ({ ...p, weight: Number(e.target.value) }))}
                />
                <TextField
                  fullWidth
                  select
                  label="الحالة"
                  value={form.status || 'not_started'}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                >
                  {Object.entries(GOAL_STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="تاريخ البداية"
                      InputLabelProps={{ shrink: true }}
                      value={form.startDate || ''}
                      onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="تاريخ النهاية"
                      InputLabelProps={{ shrink: true }}
                      value={form.endDate || ''}
                      onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              </>
            )}
            {dialog.type === 'initiative' && (
              <>
                <TextField
                  fullWidth
                  label="عنوان المبادرة"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="المسؤول"
                  value={form.owner || ''}
                  onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                />
                <TextField
                  fullWidth
                  select
                  label="الأولوية"
                  value={form.priority || 'medium'}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="الميزانية (ر.س)"
                      value={form.budget || ''}
                      onChange={e => setForm(p => ({ ...p, budget: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="الحالة"
                      value={form.status || 'not_started'}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    >
                      {Object.entries(INITIATIVE_STATUS).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </>
            )}
            {dialog.type === 'kpi' && (
              <>
                <TextField
                  fullWidth
                  label="اسم المؤشر"
                  value={form.name || ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="القيمة المستهدفة"
                      value={form.target || ''}
                      onChange={e => setForm(p => ({ ...p, target: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="الوحدة"
                      value={form.unit || ''}
                      onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  select
                  label="التكرار"
                  value={form.frequency || 'monthly'}
                  onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
                >
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                  <MenuItem value="annual">سنوي</MenuItem>
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog({ open: false, type: '', data: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
