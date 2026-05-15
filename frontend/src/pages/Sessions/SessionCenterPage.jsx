/**
 * Session Center Page — مركز الجلسات العلاجية الموحد
 * ══════════════════════════════════════════════════════════════════
 * Tabs: 1) لوحة التحكم  2) التقويم  3) حمل المعالجين  4) تقرير الحضور
 * ══════════════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  LinearProgress,
  Paper as _Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip as _Tooltip,
  IconButton,
  Button as _Button,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import TodayIcon from '@mui/icons-material/Today';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import sessionCenterService from '../../services/sessionCenterService';
import { formatDate } from 'utils/dateUtils';

// ─── Colors ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  COMPLETED: '#4caf50',
  SCHEDULED: '#2196f3',
  CONFIRMED: '#03a9f4',
  IN_PROGRESS: '#ff9800',
  CANCELLED_BY_PATIENT: '#f44336',
  CANCELLED_BY_CENTER: '#e91e63',
  NO_SHOW: '#9e9e9e',
  RESCHEDULED: '#9c27b0',
};
const STATUS_AR = {
  COMPLETED: 'مكتملة',
  SCHEDULED: 'مجدولة',
  CONFIRMED: 'مؤكدة',
  IN_PROGRESS: 'جارية',
  CANCELLED_BY_PATIENT: 'ملغاة (مستفيد)',
  CANCELLED_BY_CENTER: 'ملغاة (مركز)',
  NO_SHOW: 'غياب',
  RESCHEDULED: 'معادة جدولة',
};
const CHART_COLORS = [
  '#6c63ff',
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dda0dd',
  '#98d8c8',
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function TabPanel({ children, value, index }) {
  return value === index ? <Box pt={2}>{children}</Box> : null;
}

function KpiCard({ title, value, subtitle, icon, color = '#6c63ff', loading }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} sx={{ mt: 1 }} />
            ) : (
              <Typography variant="h4" fontWeight={700} color={color}>
                {value ?? '—'}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color + '20', color }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }) {
  return (
    <Chip
      label={STATUS_AR[status] || status}
      size="small"
      sx={{
        bgcolor: (STATUS_COLORS[status] || '#9e9e9e') + '20',
        color: STATUS_COLORS[status] || '#9e9e9e',
        fontWeight: 600,
      }}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SessionCenterPage() {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [calendarSlots, setCalendarSlots] = useState([]);
  const [therapistLoad, setTherapistLoad] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, cal, load_, att] = await Promise.all([
        sessionCenterService.getDashboard(),
        sessionCenterService.getCalendarSlots({ year: calYear, month: calMonth }),
        sessionCenterService.getTherapistLoad(),
        sessionCenterService.getAttendanceReport(),
      ]);
      setDashboard(dash.data || dash);
      setCalendarSlots(cal.data || []);
      setTherapistLoad(load_.data || []);
      setAttendance(att.data || att);
    } catch (e) {
      setError('تعذر تحميل بيانات مركز الجلسات');
    } finally {
      setLoading(false);
    }
  }, [calYear, calMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = dashboard?.kpis || {};

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            مركز الجلسات العلاجية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحليلات وتقارير الجلسات العلاجية — {formatDate(now)}
          </Typography>
        </Box>
        <IconButton onClick={load} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="لوحة التحكم" icon={<BarChartIcon />} iconPosition="start" />
        <Tab label="التقويم الشهري" icon={<TodayIcon />} iconPosition="start" />
        <Tab label="حمل المعالجين" icon={<PersonIcon />} iconPosition="start" />
        <Tab label="تقرير الحضور" icon={<CheckCircleIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Dashboard */}
      <TabPanel value={tab} index={0}>
        {/* KPI Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              title="إجمالي الجلسات"
              value={kpis.totalInRange}
              icon={<AccessTimeIcon />}
              color="#6c63ff"
              loading={loading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              title="مكتملة"
              value={kpis.completedInRange}
              subtitle={`${kpis.completionRate ?? 0}%`}
              icon={<CheckCircleIcon />}
              color="#4caf50"
              loading={loading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              title="ملغاة"
              value={kpis.cancelledInRange}
              subtitle={`${kpis.cancelRate ?? 0}%`}
              icon={<CancelIcon />}
              color="#f44336"
              loading={loading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              title="غياب"
              value={kpis.noShowInRange}
              subtitle={`${kpis.noShowRate ?? 0}%`}
              icon={<PersonOffIcon />}
              color="#9e9e9e"
              loading={loading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              title="اليوم (نشطة)"
              value={kpis.activeNow}
              icon={<TodayIcon />}
              color="#ff9800"
              loading={loading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <KpiCard
              title="عن بُعد"
              value={kpis.teleCount}
              icon={<VideoCallIcon />}
              color="#03a9f4"
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={2} mb={3}>
          {/* Daily Trend */}
          <Grid item xs={12} md={8}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  الاتجاه اليومي (آخر 30 يوم)
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dashboard?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="إجمالي"
                        stroke="#6c63ff"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        name="مكتملة"
                        stroke="#4caf50"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* By Type Pie */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  توزيع النوع
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dashboard?.byType || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      >
                        {(dashboard?.byType || []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Status Bar Chart */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  توزيع الحالة
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dashboard?.byStatus || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={120}
                        tickFormatter={v => STATUS_AR[v] || v}
                      />
                      <ChartTooltip formatter={(val, name) => [val, STATUS_AR[name] || name]} />
                      <Bar dataKey="value" name="العدد" radius={[0, 4, 4, 0]}>
                        {(dashboard?.byStatus || []).map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Therapists */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  أكثر المعالجين جلسات
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>المعالج</TableCell>
                          <TableCell align="center">الجلسات</TableCell>
                          <TableCell align="center">متوسط المدة (د)</TableCell>
                          <TableCell>نسبة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(dashboard?.byTherapist || []).map((t, i) => {
                          const maxCount = dashboard?.byTherapist[0]?.count || 1;
                          return (
                            <TableRow key={i}>
                              <TableCell>{t.name}</TableCell>
                              <TableCell align="center">{t.count}</TableCell>
                              <TableCell align="center">{Math.round(t.avgDuration || 0)}</TableCell>
                              <TableCell sx={{ minWidth: 80 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.round((t.count / maxCount) * 100)}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 1: Calendar */}
      <TabPanel value={tab} index={1}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              جلسات {calYear}/{String(calMonth).padStart(2, '0')} ({calendarSlots.length} جلسة)
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>المستفيد</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>المعالج</TableCell>
                      <TableCell>المدة (د)</TableCell>
                      <TableCell>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calendarSlots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          لا توجد جلسات لهذا الشهر
                        </TableCell>
                      </TableRow>
                    ) : (
                      calendarSlots.map((s, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{formatDate(s.date)}</TableCell>
                          <TableCell>
                            {s.beneficiary?.arabicName || s.beneficiary?.name || '—'}
                          </TableCell>
                          <TableCell>{s.sessionType || '—'}</TableCell>
                          <TableCell>{s.therapist?.name || '—'}</TableCell>
                          <TableCell>{s.duration || '—'}</TableCell>
                          <TableCell>
                            <StatusChip status={s.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: Therapist Load */}
      <TabPanel value={tab} index={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              حمل المعالجين (آخر 7 أيام)
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : therapistLoad.length === 0 ? (
              <Alert severity="info">لا توجد بيانات</Alert>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={therapistLoad}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip />
                    <Legend />
                    <Bar dataKey="total" name="الكل" fill="#6c63ff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="مكتملة" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Divider sx={{ my: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>المعالج</TableCell>
                        <TableCell>اليوم</TableCell>
                        <TableCell align="center">إجمالي</TableCell>
                        <TableCell align="center">مكتملة</TableCell>
                        <TableCell align="center">مجموع الدقائق</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {therapistLoad.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{r.therapistName}</TableCell>
                          <TableCell>{r.day}</TableCell>
                          <TableCell align="center">{r.total}</TableCell>
                          <TableCell align="center">{r.completed}</TableCell>
                          <TableCell align="center">{r.totalMin}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: Attendance Report */}
      <TabPanel value={tab} index={3}>
        {loading ? (
          <CircularProgress />
        ) : (
          attendance && (
            <>
              {/* Summary KPIs */}
              <Grid container spacing={2} mb={2}>
                {[
                  { label: 'إجمالي الجلسات', value: attendance.summary?.total, color: '#6c63ff' },
                  { label: 'حضر', value: attendance.summary?.attended, color: '#4caf50' },
                  { label: 'غياب', value: attendance.summary?.absent, color: '#9e9e9e' },
                  { label: 'إلغاء', value: attendance.summary?.cancelled, color: '#f44336' },
                  {
                    label: 'نسبة الحضور',
                    value: `${attendance.summary?.attendanceRate ?? 0}%`,
                    color: '#ff9800',
                  },
                ].map((k, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <KpiCard title={k.label} value={k.value} color={k.color} />
                  </Grid>
                ))}
              </Grid>

              {/* Detail Table */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>
                    تفاصيل الحضور
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>المستفيد</TableCell>
                          <TableCell>اليوم</TableCell>
                          <TableCell align="center">جلسات</TableCell>
                          <TableCell align="center">حضر</TableCell>
                          <TableCell align="center">غياب</TableCell>
                          <TableCell align="center">إلغاء</TableCell>
                          <TableCell align="center">دقائق تأخر</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(attendance.detail || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              لا توجد بيانات
                            </TableCell>
                          </TableRow>
                        ) : (
                          (attendance.detail || []).map((r, i) => (
                            <TableRow key={i} hover>
                              <TableCell>{r.beneficiaryName || '—'}</TableCell>
                              <TableCell>{r.day}</TableCell>
                              <TableCell align="center">{r.sessions}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={r.attended}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                {r.absent > 0 && (
                                  <Chip
                                    label={r.absent}
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {r.cancelled > 0 && (
                                  <Chip
                                    label={r.cancelled}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">{r.lateMin || 0}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </>
          )
        )}
      </TabPanel>
    </Box>
  );
}
