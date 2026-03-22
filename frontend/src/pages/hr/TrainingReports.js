/**
 * 📊 تقارير التدريب والتطوير — Training Reports
 * AlAwael ERP — Training & Development Module
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendIcon,
  Download as DownloadIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  EmojiEvents as TrophyIcon,
  Assignment as CertIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  trainingReportsService,
  MOCK_TRAINING_DASHBOARD,
  MOCK_PROGRAMS,
  MOCK_CERTIFICATIONS,
} from 'services/trainingService';
import { useSnackbar } from 'contexts/SnackbarContext';

const COLORS = [
  '#0277BD',
  '#26A69A',
  '#FFA726',
  '#EF5350',
  '#AB47BC',
  '#8D6E63',
  '#42A5F5',
  '#66BB6A',
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

export default function TrainingReports() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_TRAINING_DASHBOARD);
  const [programs, setPrograms] = useState(MOCK_PROGRAMS);
  const [certifications, setCertifications] = useState(MOCK_CERTIFICATIONS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingReportsService.getDashboardStats();
      if (res) setDashboard(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Computed metrics
  const completionByCategory = useMemo(() => {
    const cats = {};
    programs.forEach(p => {
      if (!cats[p.category]) cats[p.category] = { name: p.category, total: 0, completed: 0 };
      cats[p.category].total += 1;
      if (p.status === 'مكتمل') cats[p.category].completed += 1;
    });
    return Object.values(cats).map(c => ({
      ...c,
      rate: c.total ? Math.round((c.completed / c.total) * 100) : 0,
    }));
  }, [programs]);

  const trainerPerformance = useMemo(() => {
    const trainers = {};
    programs.forEach(p => {
      if (!p.trainer) return;
      if (!trainers[p.trainer])
        trainers[p.trainer] = { name: p.trainer, programs: 0, totalRating: 0, totalEnrolled: 0 };
      trainers[p.trainer].programs += 1;
      trainers[p.trainer].totalRating += p.rating || 0;
      trainers[p.trainer].totalEnrolled += p.enrolledCount || 0;
    });
    return Object.values(trainers)
      .map(t => ({ ...t, avgRating: (t.totalRating / t.programs).toFixed(1) }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [programs]);

  const costAnalysis = useMemo(() => {
    const cats = {};
    programs.forEach(p => {
      const cat = p.category || 'أخرى';
      if (!cats[cat]) cats[cat] = { name: cat, totalCost: 0, participants: 0, programs: 0 };
      cats[cat].totalCost += p.cost || 0;
      cats[cat].participants += p.enrolledCount || 0;
      cats[cat].programs += 1;
    });
    return Object.values(cats).map(c => ({
      ...c,
      costPerHead: c.participants ? Math.round(c.totalCost / c.participants) : 0,
    }));
  }, [programs]);

  const certStats = useMemo(() => {
    const byType = {};
    certifications.forEach(c => {
      const t = c.type || 'أخرى';
      if (!byType[t]) byType[t] = { name: t, count: 0, active: 0, expired: 0 };
      byType[t].count += 1;
      if (c.status === 'سارية') byType[t].active += 1;
      else byType[t].expired += 1;
    });
    return Object.values(byType);
  }, [certifications]);

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(v || 0);

  const kpis = [
    {
      label: 'إجمالي البرامج',
      value: dashboard.totalPrograms,
      icon: <SchoolIcon />,
      color: '#0277BD',
    },
    {
      label: 'المتدربين النشطين',
      value: dashboard.activeTrainees,
      icon: <GroupIcon />,
      color: '#26A69A',
    },
    {
      label: 'الشهادات الصادرة',
      value: dashboard.certificationsIssued,
      icon: <CertIcon />,
      color: '#FFA726',
    },
    {
      label: 'نسبة الإكمال',
      value: `${dashboard.completionRate}%`,
      icon: <TrophyIcon />,
      color: '#66BB6A',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #00695C 0%, #004D40 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              📊 تقارير التدريب والتطوير
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              تحليلات شاملة لأداء برامج التدريب
            </Typography>
          </Box>
          <Box>
            <Tooltip title="تحديث">
              <IconButton onClick={load} sx={{ color: 'white', mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${k.color}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Box
                  sx={{
                    bgcolor: `${k.color}22`,
                    color: k.color,
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                  }}
                >
                  {k.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {k.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {k.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="نسب الإكمال" />
          <Tab label="أداء المدربين" />
          <Tab label="تحليل التكاليف" />
          <Tab label="الشهادات" />
          <Tab label="الاتجاهات الشهرية" />
          <Tab label="فجوات المهارات" />
        </Tabs>

        {/* Tab 0 — Completion Rates */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  نسبة الإكمال حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={completionByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="total" name="إجمالي" fill="#42A5F5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="مكتمل" fill="#66BB6A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تفاصيل النسب
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {completionByCategory.map((c, i) => (
                    <Box key={i}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{c.name}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {c.rate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={c.rate}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': { bgcolor: COLORS[i % COLORS.length] },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab 1 — Trainer Performance */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              أداء المدربين
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المدرب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>البرامج</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>إجمالي المتدربين</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>متوسط التقييم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأداء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainerPerformance.map((t, i) => (
                    <TableRow key={t.name} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {i < 3 && (
                            <TrophyIcon
                              sx={{ color: ['#FFD700', '#C0C0C0', '#CD7F32'][i], fontSize: 20 }}
                            />
                          )}
                          <Typography fontWeight={600}>{t.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{t.programs}</TableCell>
                      <TableCell>{t.totalEnrolled}</TableCell>
                      <TableCell>
                        <Chip
                          label={t.avgRating}
                          size="small"
                          color={
                            parseFloat(t.avgRating) >= 4
                              ? 'success'
                              : parseFloat(t.avgRating) >= 3
                                ? 'warning'
                                : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={(parseFloat(t.avgRating) / 5) * 100}
                          sx={{ height: 8, borderRadius: 4, width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Tab 2 — Cost Analysis */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التكلفة حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={costAnalysis}
                      dataKey="totalCost"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {costAnalysis.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تكلفة الفرد حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={costAnalysis} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                    <RTooltip formatter={v => formatCurrency(v)} />
                    <Bar
                      dataKey="costPerHead"
                      name="تكلفة الفرد"
                      fill="#FFA726"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>عدد البرامج</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المشاركين</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التكلفة الإجمالية</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>تكلفة الفرد</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {costAnalysis.map((c, i) => (
                        <TableRow key={i} hover>
                          <TableCell fontWeight={600}>{c.name}</TableCell>
                          <TableCell>{c.programs}</TableCell>
                          <TableCell>{c.participants}</TableCell>
                          <TableCell>{formatCurrency(c.totalCost)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={formatCurrency(c.costPerHead)}
                              color={c.costPerHead > 1000 ? 'warning' : 'success'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab 3 — Certifications */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الشهادات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={certStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar
                      dataKey="active"
                      name="سارية"
                      fill="#66BB6A"
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expired"
                      name="منتهية"
                      fill="#EF5350"
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  آخر الشهادات المصدرة
                </Typography>
                {certifications.slice(0, 6).map((c, i) => (
                  <Card key={i} sx={{ mb: 1, borderRadius: 1 }}>
                    <CardContent
                      sx={{
                        py: 1.5,
                        px: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {c.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.certificationName}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={c.status}
                        color={c.status === 'سارية' ? 'success' : 'error'}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab 4 — Monthly Trends */}
        <TabPanel value={tab} index={4}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              الاتجاهات الشهرية للتدريب
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dashboard.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis />
                <RTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="programs"
                  name="البرامج"
                  stroke="#0277BD"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="participants"
                  name="المشاركين"
                  stroke="#26A69A"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="completions"
                  name="الإكمال"
                  stroke="#FFA726"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {dashboard.departmentTraining?.slice(0, 4).map((d, i) => (
                <Grid item xs={6} md={3} key={i}>
                  <Card sx={{ borderRadius: 2, borderRight: `4px solid ${COLORS[i]}` }}>
                    <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {d.department}
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {d.employees} متدرب
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {d.hours} ساعة
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab 5 — Skill Gaps */}
        <TabPanel value={tab} index={5}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تحليل فجوات المهارات
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={dashboard.skillGaps}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" fontSize={10} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="المستوى الحالي"
                      dataKey="current"
                      stroke="#0277BD"
                      fill="#0277BD"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="المستوى المطلوب"
                      dataKey="target"
                      stroke="#EF5350"
                      fill="#EF5350"
                      fillOpacity={0.15}
                    />
                    <Legend />
                    <RTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  أكبر الفجوات
                </Typography>
                {(dashboard.skillGaps || [])
                  .map(s => ({ ...s, gap: s.target - s.current }))
                  .sort((a, b) => b.gap - a.gap)
                  .map((s, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {s.skill}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            size="small"
                            label={`حالي: ${s.current}%`}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`مطلوب: ${s.target}%`}
                            color="error"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      <Box sx={{ position: 'relative' }}>
                        <LinearProgress
                          variant="determinate"
                          value={s.target}
                          sx={{ height: 12, borderRadius: 6, bgcolor: '#FFCDD2' }}
                        />
                        <LinearProgress
                          variant="determinate"
                          value={s.current}
                          sx={{
                            height: 12,
                            borderRadius: 6,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bgcolor: 'transparent',
                            '& .MuiLinearProgress-bar': { bgcolor: '#0277BD' },
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="error">
                        فجوة: {s.gap}%
                      </Typography>
                    </Box>
                  ))}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
