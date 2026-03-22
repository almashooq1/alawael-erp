import React, { useState, useEffect } from 'react';
import kpiDashboardService from '../../services/kpiDashboard.service';
import { useRealTimeKPIs } from '../../contexts/SocketContext';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Speed as KPIIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrackChanges as TargetIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, assessmentColors, surfaceColors } from '../../theme/palette';

const demoKPIs = [
  {
    _id: 'k1',
    name: 'نسبة رضا المستفيدين',
    category: 'quality',
    target: 95,
    actual: 92,
    unit: '%',
    trend: 'up',
    department: 'خدمة العملاء',
    frequency: 'monthly',
  },
  {
    _id: 'k2',
    name: 'معدل الحضور',
    category: 'hr',
    target: 98,
    actual: 96.5,
    unit: '%',
    trend: 'stable',
    department: 'الموارد البشرية',
    frequency: 'monthly',
  },
  {
    _id: 'k3',
    name: 'وقت الاستجابة للطوارئ',
    category: 'operations',
    target: 5,
    actual: 3.2,
    unit: 'دقيقة',
    trend: 'up',
    department: 'السلامة',
    frequency: 'weekly',
  },
  {
    _id: 'k4',
    name: 'نسبة إشغال المركز',
    category: 'operations',
    target: 85,
    actual: 78,
    unit: '%',
    trend: 'down',
    department: 'العمليات',
    frequency: 'daily',
  },
  {
    _id: 'k5',
    name: 'التوفير في المصاريف التشغيلية',
    category: 'finance',
    target: 10,
    actual: 12,
    unit: '%',
    trend: 'up',
    department: 'المالية',
    frequency: 'quarterly',
  },
  {
    _id: 'k6',
    name: 'عدد جلسات التأهيل المنجزة',
    category: 'medical',
    target: 500,
    actual: 475,
    unit: 'جلسة',
    trend: 'up',
    department: 'التأهيل',
    frequency: 'monthly',
  },
  {
    _id: 'k7',
    name: 'معدل دوران الموظفين',
    category: 'hr',
    target: 5,
    actual: 7.3,
    unit: '%',
    trend: 'down',
    department: 'الموارد البشرية',
    frequency: 'quarterly',
  },
  {
    _id: 'k8',
    name: 'نسبة رقمنة العمليات',
    category: 'technology',
    target: 80,
    actual: 65,
    unit: '%',
    trend: 'up',
    department: 'تقنية المعلومات',
    frequency: 'quarterly',
  },
];

const categoryMap = {
  quality: 'الجودة',
  hr: 'الموارد البشرية',
  operations: 'العمليات',
  finance: 'المالية',
  medical: 'الطبي',
  technology: 'التقنية',
};
const categories_default = ['all', ...new Set(demoKPIs.map(k => k.category))];

const getStatus = (actual, target, higherIsBetter = true) => {
  const ratio = actual / target;
  if (higherIsBetter) {
    if (ratio >= 1) return { label: 'ممتاز', color: statusColors.successDark };
    if (ratio >= 0.9) return { label: 'جيد', color: statusColors.warningDark };
    return { label: 'يحتاج تحسين', color: assessmentColors.severe };
  }
  if (ratio <= 1) return { label: 'ممتاز', color: statusColors.successDark };
  if (ratio <= 1.15) return { label: 'جيد', color: statusColors.warningDark };
  return { label: 'يحتاج تحسين', color: assessmentColors.severe };
};

const isLowerBetter = name => name.includes('دوران') || name.includes('وقت');

export default function KPIDashboard() {
  const [kpis, setKpis] = useState([]);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'quality',
    target: '',
    unit: '%',
    department: '',
    frequency: 'monthly',
  });
  const showSnackbar = useSnackbar();

  // ─── Real-time KPI updates via Socket.IO ────────────────────────────
  const { kpis: rtKpis } = useRealTimeKPIs('kpi');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await kpiDashboardService.getAll();
        setKpis(res.data || []);
      } catch {
        setKpis(demoKPIs);
      }
    };
    loadData();
  }, []);

  // Merge real-time KPI updates
  useEffect(() => {
    if (rtKpis && rtKpis.length > 0) {
      setKpis(prev => {
        const updated = [...prev];
        rtKpis.forEach(rt => {
          const idx = updated.findIndex(k => k._id === rt._id || k.kpiId === rt.kpiId);
          if (idx !== -1) updated[idx] = { ...updated[idx], ...rt };
        });
        return updated;
      });
      showSnackbar('تم تحديث مؤشرات الأداء', 'info');
    }
  }, [rtKpis, showSnackbar]);

  const categories = kpis.length
    ? ['all', ...new Set(kpis.map(k => k.category))]
    : categories_default;
  const selectedCategory = categories[tab];
  const filtered =
    selectedCategory === 'all' ? kpis : kpis.filter(k => k.category === selectedCategory);

  const stats = {
    total: kpis.length,
    excellent: kpis.filter(k => {
      const s = getStatus(k.actual, k.target, !isLowerBetter(k.name));
      return s.label === 'ممتاز';
    }).length,
    needsImprovement: kpis.filter(k => {
      const s = getStatus(k.actual, k.target, !isLowerBetter(k.name));
      return s.label === 'يحتاج تحسين';
    }).length,
    avgAchievement:
      kpis.length > 0
        ? Math.round(kpis.reduce((s, k) => s + (k.actual / k.target) * 100, 0) / kpis.length)
        : 0,
  };

  const handleCreate = async () => {
    if (!form.name || !form.target) {
      showSnackbar('اسم المؤشر والمستهدف مطلوبان', 'warning');
      return;
    }
    const payload = { ...form, target: +form.target, actual: 0, trend: 'stable' };
    try {
      const res = await kpiDashboardService.create(payload);
      setKpis(prev => [...prev, res.data || { ...payload, _id: Date.now().toString() }]);
      showSnackbar('تم إنشاء المؤشر بنجاح', 'success');
    } catch {
      setKpis(prev => [...prev, { ...payload, _id: Date.now().toString() }]);
      showSnackbar('تم إنشاء المؤشر محلياً - لم يتصل بالخادم', 'warning');
    }
    setDialogOpen(false);
    setForm({
      name: '',
      category: 'quality',
      target: '',
      unit: '%',
      department: '',
      frequency: 'monthly',
    });
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <KPIIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة مؤشرات الأداء
            </Typography>
            <Typography variant="body2">متابعة وتحليل الأداء المؤسسي</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          مؤشر جديد
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المؤشرات',
            val: stats.total,
            color: statusColors.primaryBlue,
            icon: <TargetIcon />,
          },
          {
            label: 'أداء ممتاز',
            val: stats.excellent,
            color: statusColors.successDark,
            icon: <TrendUpIcon />,
          },
          {
            label: 'يحتاج تحسين',
            val: stats.needsImprovement,
            color: assessmentColors.severe,
            icon: <TrendDownIcon />,
          },
          {
            label: 'متوسط الإنجاز',
            val: `${stats.avgAchievement}%`,
            color: statusColors.purpleDark,
            icon: <ChartIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderRight: `4px solid ${s.color}` }}>
              <CardContent
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {s.val}
                  </Typography>
                </Box>
                <Box sx={{ color: s.color }}>{s.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* KPI Gauges */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          نظرة سريعة على المؤشرات
        </Typography>
        <Grid container spacing={2}>
          {kpis.slice(0, 6).map(kpi => {
            const higherBetter = !isLowerBetter(kpi.name);
            const pct = Math.min(Math.round((kpi.actual / kpi.target) * 100), 150);
            const status = getStatus(kpi.actual, kpi.target, higherBetter);
            return (
              <Grid item xs={6} sm={4} md={2} key={kpi._id}>
                <Box sx={{ textAlign: 'center', p: 1 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={Math.min(pct, 100)}
                      size={80}
                      thickness={5}
                      sx={{ color: status.color }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {pct}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                    {kpi.name.length > 20 ? kpi.name.slice(0, 20) + '...' : kpi.name}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={`الكل (${kpis.length})`} />
          {categories.slice(1).map(c => (
            <Tab key={c} label={categoryMap[c] || c} />
          ))}
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
              <TableCell>المؤشر</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>المستهدف</TableCell>
              <TableCell>الفعلي</TableCell>
              <TableCell>الإنجاز</TableCell>
              <TableCell>الاتجاه</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(kpi => {
              const higherBetter = !isLowerBetter(kpi.name);
              const pct = Math.round((kpi.actual / kpi.target) * 100);
              const status = getStatus(kpi.actual, kpi.target, higherBetter);
              return (
                <TableRow key={kpi._id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{kpi.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.department} |{' '}
                      {kpi.frequency === 'monthly'
                        ? 'شهري'
                        : kpi.frequency === 'weekly'
                          ? 'أسبوعي'
                          : kpi.frequency === 'daily'
                            ? 'يومي'
                            : 'ربع سنوي'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={categoryMap[kpi.category]} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {kpi.target} {kpi.unit}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">
                      {kpi.actual} {kpi.unit}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pct, 100)}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': { bgcolor: status.color },
                        }}
                      />
                      <Typography variant="caption" fontWeight="bold">
                        {pct}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {kpi.trend === 'up' ? (
                      <TrendUpIcon color="success" />
                    ) : kpi.trend === 'down' ? (
                      <TrendDownIcon color="error" />
                    ) : (
                      '➡️'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      size="small"
                      sx={{ bgcolor: status.color, color: '#fff' }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>مؤشر أداء جديد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="اسم المؤشر"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="الفئة"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            sx={{ mb: 2 }}
            SelectProps={{ native: true }}
          >
            {Object.entries(categoryMap).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </TextField>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="المستهدف"
                value={form.target}
                onChange={e => setForm({ ...form, target: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الوحدة"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                placeholder="% أو عدد"
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="القسم المسؤول"
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="التكرار"
            value={form.frequency}
            onChange={e => setForm({ ...form, frequency: e.target.value })}
            SelectProps={{ native: true }}
          >
            <option value="daily">يومي</option>
            <option value="weekly">أسبوعي</option>
            <option value="monthly">شهري</option>
            <option value="quarterly">ربع سنوي</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
