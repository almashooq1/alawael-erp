/**
 * AdminBIAnalytics — /admin/analytics page.
 *
 * Cross-module executive dashboard sourced from /api/admin/bi.
 * Charts: recharts (bar / line / pie). RTL-safe with key metric cards.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Paper,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip as MTooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import api from '../../services/api.client';

const COLORS = [
  '#1976d2',
  '#9c27b0',
  '#ed6c02',
  '#2e7d32',
  '#d32f2f',
  '#0288d1',
  '#7b1fa2',
  '#f57c00',
  '#388e3c',
  '#c62828',
];

function KpiCard({ label, value, icon, color, subtle }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color }}>
              {value ?? '—'}
            </Typography>
            {subtle && (
              <Typography variant="caption" color="text.secondary">
                {subtle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, fontSize: 36 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AdminBIAnalytics() {
  const [tab, setTab] = useState(0);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState(null);
  const [sessionsData, setSessionsData] = useState(null);
  const [beneficiariesData, setBeneficiariesData] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [branchesData, setBranchesData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const [ov, ses, ben, gl, br] = await Promise.all([
        api.get('/admin/bi/overview'),
        api.get('/admin/bi/sessions?days=30'),
        api.get('/admin/bi/beneficiaries'),
        api.get('/admin/bi/goals'),
        api.get('/admin/bi/branches'),
      ]);
      setOverview(ov.data);
      setSessionsData(ses.data);
      setBeneficiariesData(ben.data);
      setGoalsData(gl.data);
      setBranchesData(br.data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل التحليلات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = overview?.kpis || {};

  const kpiCards = useMemo(
    () => [
      {
        label: 'إجمالي المستفيدين',
        value: kpis.totalBeneficiaries,
        icon: <PeopleIcon />,
        color: '#1976d2',
        subtle: `${kpis.activeBeneficiaries || 0} نشط`,
      },
      {
        label: 'جديد آخر 30 يوماً',
        value: kpis.newBeneficiaries30d,
        icon: <TrendingUpIcon />,
        color: '#2e7d32',
      },
      {
        label: 'جلسات اليوم',
        value: kpis.sessionsToday,
        icon: <CalendarTodayIcon />,
        color: '#ed6c02',
        subtle: `${kpis.sessionsThisWeek || 0} هذا الأسبوع`,
      },
      {
        label: 'معدّل الإكمال (30د)',
        value: kpis.completionRate30d != null ? `${kpis.completionRate30d}%` : '—',
        icon: <CheckCircleIcon />,
        color: '#388e3c',
        subtle: `عدم حضور: ${kpis.noShowRate30d ?? 0}%`,
      },
      {
        label: 'إجمالي التقييمات',
        value: kpis.totalAssessments,
        icon: <AssessmentIcon />,
        color: '#9c27b0',
      },
      {
        label: 'خطط رعاية نشطة',
        value: kpis.activeCarePlans,
        icon: <AssignmentIcon />,
        color: '#7b1fa2',
      },
      {
        label: 'إجمالي الجلسات',
        value: kpis.totalSessions,
        icon: <EventIcon />,
        color: '#0288d1',
      },
      {
        label: 'مكتمل هذا الشهر',
        value: kpis.completedThisMonth,
        icon: <TrendingUpIcon />,
        color: '#c62828',
      },
    ],
    [kpis]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تحليلات ذكاء الأعمال (BI)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مؤشرات أداء تنفيذية عبر الوحدات — المستفيدون، الجلسات، التقييمات، الخطط، الفروع.
          </Typography>
        </Box>
        <IconButton onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI grid */}
      <Grid container spacing={2} mb={3}>
        {kpiCards.map((k, i) => (
          <Grid item xs={6} md={3} key={i}>
            <KpiCard {...k} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="الجلسات" />
          <Tab label="المستفيدون" />
          <Tab label="الأهداف" />
          <Tab label="الفروع" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                عدد الجلسات اليومي (آخر 30 يوماً)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={sessionsData?.daily || []}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="إجمالي"
                    stroke="#1976d2"
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="مكتملة"
                    stroke="#2e7d32"
                    fill="url(#colorDone)"
                  />
                  <Line
                    type="monotone"
                    dataKey="noShow"
                    name="لم يحضر"
                    stroke="#d32f2f"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                الجلسات حسب النوع
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sessionsData?.byType || []}
                    dataKey="count"
                    nameKey="type"
                    outerRadius={100}
                    label={e => e.type}
                  >
                    {(sessionsData?.byType || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                ذُروة الساعات (حسب ساعة البدء)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sessionsData?.peakHours || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ed6c02" name="عدد" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                التسجيل خلال آخر 90 يوماً
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={beneficiariesData?.enrollment90d || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="مستفيدون جُدد"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                توزيع الفئات العمرية
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={beneficiariesData?.byAgeGroup || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#9c27b0" name="عدد" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                أنواع الإعاقة (Top 15)
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={beneficiariesData?.byDisability || []}
                  layout="vertical"
                  margin={{ right: 20, left: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0288d1" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                توزيع الجنس
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={beneficiariesData?.byGender || []}
                    dataKey="count"
                    nameKey="gender"
                    outerRadius={120}
                    label={e => `${e.gender}: ${e.count}`}
                  >
                    {(beneficiariesData?.byGender || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                إجمالي الأهداف في الخطط النشطة
              </Typography>
              <Typography variant="h2" fontWeight="bold" sx={{ color: 'primary.main' }}>
                {goalsData?.total ?? 0}
              </Typography>
              <Typography variant="body2" color="success.main" mt={1}>
                محقَّقة: <strong>{goalsData?.achieved ?? 0}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                معدّل الإنجاز:{' '}
                <strong>
                  {goalsData?.achievementRate != null ? `${goalsData.achievementRate}%` : '—'}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                متوسط التقدّم: <strong>{goalsData?.avgProgress ?? 0}%</strong>
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                توزيع التقدّم
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={goalsData?.progressDist || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7b1fa2" name="عدد الأهداف" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                الحالات حسب الفئة
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={goalsData?.byType || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#1976d2" name="عدد" />
                  <Bar dataKey="avgProgress" fill="#2e7d32" name="متوسط التقدّم %" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                الأهداف حسب الحالة
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={goalsData?.byStatus || []}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={110}
                    label={e => `${e.status}: ${e.count}`}
                  >
                    {(goalsData?.byStatus || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            مقارنة بين الفروع
          </Typography>
          {branchesData?.items?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={branchesData.items}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="beneficiaries" fill="#1976d2" name="مستفيدون" />
                  <Bar dataKey="assessments" fill="#9c27b0" name="تقييمات" />
                </BarChart>
              </ResponsiveContainer>
              <TableContainer sx={{ mt: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الفرع</TableCell>
                      <TableCell>الرمز</TableCell>
                      <TableCell align="right">المستفيدون</TableCell>
                      <TableCell align="right">التقييمات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {branchesData.items.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{b.name}</TableCell>
                        <TableCell>{b.code || '—'}</TableCell>
                        <TableCell align="right">{b.beneficiaries}</TableCell>
                        <TableCell align="right">{b.assessments}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography color="text.secondary">لا توجد بيانات فروع.</Typography>
          )}
        </Paper>
      )}
    </Container>
  );
}
