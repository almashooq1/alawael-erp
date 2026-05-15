/**
 * SessionCenterPage — مركز الجلسات العلاجية
 *
 * يتيح للأخصائي والمشرف الإكلينيكي:
 *  Tab 0 — لوحة التحكم (KPIs + توزيعات + اتجاهات)
 *  Tab 1 — التقويم الشهري (فتحات الجلسات)
 *  Tab 2 — حمل المعالجين (workload analysis)
 *  Tab 3 — تقرير الحضور (attendance analytics)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  TextField,
  LinearProgress,
  Alert,
  Avatar,
  Tooltip,
  Paper,
  Divider,
  CircularProgress as _CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  EventNote as SessionIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as TherapistIcon,
  CheckCircle as AttendanceIcon,
  Refresh as RefreshIcon,
  TrendingUp as _TrendIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Assignment as _SOAPIcon,
} from '@mui/icons-material';
import { sessionCenterAPI } from '../../services/ddd';

/* ── palette ─────────────────────────────────────────────────────────── */
const PRIMARY = '#0d47a1';
const BG = '#e3f2fd';

/* ── helpers ─────────────────────────────────────────────────────────── */
const now = new Date();
const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const defaultTo = now.toISOString().slice(0, 10);

function StatCard({ label, value, icon, color, sub }) {
  return (
    <Card elevation={2} sx={{ borderTop: `4px solid ${color || PRIMARY}` }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: color || PRIMARY, width: 44, height: 44 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 0 — Dashboard
 * ════════════════════════════════════════════════════════════════════════ */
function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ from: defaultFrom, to: defaultTo });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionCenterAPI.dashboard(dateRange);
      setData(res.data?.data || res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis || {};
  const dist = data?.distributions || {};

  return (
    <Box>
      {/* Date range filter */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          label="من تاريخ"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.from}
          onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
        />
        <TextField
          label="إلى تاريخ"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.to}
          onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
        />
        <Button variant="outlined" onClick={load} startIcon={<RefreshIcon />} size="small">
          تحديث
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="إجمالي الجلسات"
            value={kpis.totalSessions}
            icon={<SessionIcon />}
            color="#0d47a1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="الجلسات المكتملة"
            value={kpis.completed}
            icon={<CheckCircleIcon />}
            color="#1b5e20"
            sub={kpis.completionRate ? `${kpis.completionRate}% إتمام` : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="متوسط مدة الجلسة"
            value={kpis.avgDurationMin ? `${kpis.avgDurationMin} د` : '—'}
            icon={<TimeIcon />}
            color="#e65100"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="نسبة الحضور"
            value={kpis.attendanceRate ? `${kpis.attendanceRate}%` : '—'}
            icon={<AttendanceIcon />}
            color="#6a1b9a"
          />
        </Grid>
      </Grid>

      {/* Status distribution */}
      {dist.byStatus && (
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardHeader
            title="توزيع الجلسات حسب الحالة"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <CardContent>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {dist.byStatus.map(item => (
                <Chip
                  key={item.status}
                  label={`${item.status}: ${item.count}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Discipline distribution */}
      {dist.byDiscipline && (
        <Card elevation={1}>
          <CardHeader
            title="توزيع الجلسات حسب التخصص"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <CardContent>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {dist.byDiscipline.map(item => (
                <Chip
                  key={item.discipline}
                  label={`${item.discipline}: ${item.count}`}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!loading && !data && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: BG }}>
          <SessionIcon sx={{ fontSize: 56, color: PRIMARY, opacity: 0.4 }} />
          <Typography color="text.secondary" mt={1}>
            لا توجد بيانات للفترة المحددة
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 1 — Calendar
 * ════════════════════════════════════════════════════════════════════════ */
function CalendarTab() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionCenterAPI.calendar(params);
      setSlots(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const MONTHS = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField
          select
          label="الشهر"
          size="small"
          value={params.month}
          onChange={e => setParams(p => ({ ...p, month: +e.target.value }))}
          sx={{ minWidth: 120 }}
        >
          {MONTHS.map((m, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="السنة"
          type="number"
          size="small"
          value={params.year}
          onChange={e => setParams(p => ({ ...p, year: +e.target.value }))}
          sx={{ width: 100 }}
        />
        <Tooltip title="تحديث">
          <IconButton onClick={load} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {slots.length > 0 ? (
        <Paper elevation={1} sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>الوقت</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المعالج</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المستفيد</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slots.map((s, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{s.date || s.scheduledAt?.slice(0, 10)}</TableCell>
                  <TableCell>{s.time || s.scheduledAt?.slice(11, 16)}</TableCell>
                  <TableCell>{s.therapistName || s.therapistId}</TableCell>
                  <TableCell>{s.beneficiaryName || s.beneficiaryId}</TableCell>
                  <TableCell>
                    <Chip
                      label={s.status || 'مجدولة'}
                      size="small"
                      color={s.status === 'completed' ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: BG }}>
            <CalendarIcon sx={{ fontSize: 56, color: PRIMARY, opacity: 0.4 }} />
            <Typography color="text.secondary" mt={1}>
              لا توجد جلسات مجدولة لهذا الشهر
            </Typography>
          </Paper>
        )
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 2 — Therapist Load
 * ════════════════════════════════════════════════════════════════════════ */
function TherapistLoadTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ from: defaultFrom, to: defaultTo });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionCenterAPI.therapistLoad(dateRange);
      setData(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField
          label="من تاريخ"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.from}
          onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
        />
        <TextField
          label="إلى تاريخ"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.to}
          onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
        />
        <Button variant="outlined" onClick={load} startIcon={<RefreshIcon />} size="small">
          تحديث
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data.length > 0 ? (
        <Grid container spacing={2}>
          {data.map((t, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card elevation={2}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                    <Avatar sx={{ bgcolor: PRIMARY }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography fontWeight={700}>{t.therapistName || t.therapistId}</Typography>
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      إجمالي الجلسات: <strong>{t.totalSessions}</strong>
                    </Typography>
                    <Typography variant="body2">
                      مكتملة: <strong>{t.completed}</strong>
                    </Typography>
                    <Typography variant="body2">
                      إجمالي الساعات: <strong>{t.totalHours ?? '—'}</strong>
                    </Typography>
                    {t.specialties && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                        {t.specialties.map(s => (
                          <Chip key={s} label={s} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: BG }}>
            <TherapistIcon sx={{ fontSize: 56, color: PRIMARY, opacity: 0.4 }} />
            <Typography color="text.secondary" mt={1}>
              لا توجد بيانات لهذه الفترة
            </Typography>
          </Paper>
        )
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 3 — Attendance Report
 * ════════════════════════════════════════════════════════════════════════ */
function AttendanceTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ from: defaultFrom, to: defaultTo });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionCenterAPI.attendance(dateRange);
      setRows(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField
          label="من تاريخ"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.from}
          onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
        />
        <TextField
          label="إلى تاريخ"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.to}
          onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
        />
        <Button variant="outlined" onClick={load} startIcon={<RefreshIcon />} size="small">
          تحديث
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {rows.length > 0 ? (
        <Paper elevation={1} sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المستفيد</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>إجمالي الجلسات</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>حضر</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>غياب</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>نسبة الحضور</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{r.beneficiaryName || r.beneficiaryId}</TableCell>
                  <TableCell>{r.total}</TableCell>
                  <TableCell>{r.attended}</TableCell>
                  <TableCell>{r.absent}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${r.rate ?? Math.round((r.attended / r.total) * 100)}%`}
                      size="small"
                      color={r.rate >= 80 ? 'success' : r.rate >= 60 ? 'warning' : 'error'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: BG }}>
            <AttendanceIcon sx={{ fontSize: 56, color: PRIMARY, opacity: 0.4 }} />
            <Typography color="text.secondary" mt={1}>
              لا توجد بيانات حضور لهذه الفترة
            </Typography>
          </Paper>
        )
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Root Page
 * ════════════════════════════════════════════════════════════════════════ */
const CheckCircleIcon = AttendanceIcon; // alias

export default function SessionCenterPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 48, height: 48 }}>
          <SessionIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color={PRIMARY}>
            مركز الجلسات العلاجية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تتبع الجلسات — التقويم — حمل المعالجين — تقارير الحضور
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="لوحة التحكم" />
          <Tab icon={<CalendarIcon />} iconPosition="start" label="التقويم" />
          <Tab icon={<TherapistIcon />} iconPosition="start" label="حمل المعالجين" />
          <Tab icon={<AttendanceIcon />} iconPosition="start" label="تقرير الحضور" />
        </Tabs>
      </Paper>

      {tab === 0 && <DashboardTab />}
      {tab === 1 && <CalendarTab />}
      {tab === 2 && <TherapistLoadTab />}
      {tab === 3 && <AttendanceTab />}
    </Box>
  );
}
