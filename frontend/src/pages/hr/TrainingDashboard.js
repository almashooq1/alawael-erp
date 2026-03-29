/**
 * 🎓 لوحة تحكم التدريب — Training Dashboard
 * AlAwael ERP — Training & Development Module
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Paper,
  Tab,
  Tabs,
  LinearProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  Star as StarIcon,
  TrendingUp as TrendIcon,
  AccountBalanceWallet as BudgetIcon,
  Refresh as RefreshIcon,
  } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { trainingReportsService, MOCK_TRAINING_DASHBOARD } from 'services/trainingService';

const COLORS = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A'];

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

export default function TrainingDashboard() {
  const theme = useTheme();
  const [data, setData] = useState(MOCK_TRAINING_DASHBOARD);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingReportsService.getDashboardStats();
      if (res) setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const kpis = [
    {
      label: 'البرامج التدريبية',
      value: data.totalPrograms,
      sub: `${data.activePrograms} نشط`,
      icon: <SchoolIcon />,
      color: '#42A5F5',
    },
    {
      label: 'الموظفون المتدربون',
      value: data.totalEmployeesTrained,
      sub: 'خلال العام',
      icon: <PeopleIcon />,
      color: '#66BB6A',
    },
    {
      label: 'ساعات التدريب',
      value: data.totalTrainingHours.toLocaleString('ar-SA'),
      sub: 'إجمالي',
      icon: <TimeIcon />,
      color: '#FFA726',
    },
    {
      label: 'تقييم التدريب',
      value: `${data.avgRating}/5`,
      sub: 'متوسط التقييم',
      icon: <StarIcon />,
      color: '#AB47BC',
    },
    {
      label: 'معدل الإتمام',
      value: `${data.completionRate}%`,
      sub: 'من البرامج',
      icon: <TrendIcon />,
      color: '#26A69A',
    },
    {
      label: 'الميزانية المستخدمة',
      value: `${Math.round((data.budgetUsed / data.budgetTotal) * 100)}%`,
      sub: formatCurrency(data.budgetUsed),
      icon: <BudgetIcon />,
      color: '#EF5350',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🎓 لوحة تحكم التدريب والتطوير
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              نظرة شاملة على برامج التدريب والتطوير المهني
            </Typography>
          </Box>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={refresh} sx={{ color: 'white' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md={2} key={i}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${k.color}22`,
                    color: k.color,
                    mx: 'auto',
                    mb: 1,
                    width: 44,
                    height: 44,
                  }}
                >
                  {k.icon}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {k.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {k.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Budget Progress */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">ميزانية التدريب</Typography>
          <Typography variant="body2">
            {formatCurrency(data.budgetUsed)} من {formatCurrency(data.budgetTotal)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(data.budgetUsed / data.budgetTotal) * 100}
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              bgcolor: data.budgetUsed / data.budgetTotal > 0.85 ? '#EF5350' : '#42A5F5',
            },
          }}
        />
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="نظرة عامة" />
          <Tab label="التوزيع بالأقسام" />
          <Tab label="الفجوات المهارية" />
          <Tab label="الاتجاهات الشهرية" />
        </Tabs>
      </Paper>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  📊 الاتجاه الشهري للتدريب
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />
                    <Bar dataKey="programs" fill="#42A5F5" name="البرامج" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="participants"
                      fill="#66BB6A"
                      name="المشاركين"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🎯 توزيع الفئات
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={data.categoryDistribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ category, percent }) =>
                        `${category} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {data.categoryDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: By Department */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التدريب حسب الأقسام
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.departmentTraining} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="department" type="category" width={110} />
                    <ReTooltip />
                    <Legend />
                    <Bar
                      dataKey="employees"
                      fill="#42A5F5"
                      name="عدد المتدربين"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="hours"
                      fill="#FFA726"
                      name="ساعات التدريب"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تفاصيل الأقسام
                </Typography>
                <List dense>
                  {data.departmentTraining.map((d, i) => (
                    <ListItem
                      key={i}
                      sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: COLORS[i % COLORS.length] + '22',
                          color: COLORS[i % COLORS.length],
                          width: 36,
                          height: 36,
                          mr: 2,
                        }}
                      >
                        {d.programs}
                      </Avatar>
                      <ListItemText
                        primary={d.department}
                        secondary={`${d.employees} متدرب • ${d.hours} ساعة • ${d.programs} برامج`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Skill Gaps */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🎯 تحليل الفجوات المهارية
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={data.skillGaps}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="المستوى الحالي"
                      dataKey="current"
                      stroke="#42A5F5"
                      fill="#42A5F5"
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
                    <ReTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تفاصيل الفجوات
                </Typography>
                {data.skillGaps.map((s, i) => (
                  <Box key={i} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {s.skill}
                      </Typography>
                      <Chip
                        size="small"
                        label={`فجوة: ${s.gap}%`}
                        color={s.gap > 30 ? 'error' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ minWidth: 30 }}>
                        {s.current}%
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          position: 'relative',
                          height: 16,
                          bgcolor: '#e0e0e0',
                          borderRadius: 8,
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${s.target}%`,
                            bgcolor: '#EF535033',
                            borderRadius: 8,
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${s.current}%`,
                            bgcolor: '#42A5F5',
                            borderRadius: 8,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ minWidth: 30 }}>
                        {s.target}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Monthly Trends */}
      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الاتجاهات الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ReTooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="participants"
                      stroke="#66BB6A"
                      strokeWidth={2}
                      name="المشاركين"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="hours"
                      stroke="#42A5F5"
                      strokeWidth={2}
                      name="الساعات"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cost"
                      stroke="#FFA726"
                      strokeWidth={2}
                      name="التكلفة"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
