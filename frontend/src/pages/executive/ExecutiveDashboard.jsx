/**
 * ExecutiveDashboard — لوحة القيادة التنفيذية
 *
 * Layout:
 *   - Header: title + date filter + branch selector
 *   - Row 1: KPI cards
 *   - Row 2: Bar chart (branch comparison)
 *   - Row 3: Line chart (financial trend)
 *   - Row 4: Therapist leaderboard table
 *   - Row 5: Recent alerts
 *
 * Uses recharts, framer-motion, MUI 6, Tailwind. RTL Arabic. Mock data for dev.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Skeleton,
  Avatar,
} from '@mui/material';
import {
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  LocalHospital as TherapyIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  Refresh as RefreshIcon,
  NotificationsActive as AlertIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  CalendarMonth as CalendarIcon,
  Business as BranchIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { motion } from 'framer-motion';
import executiveService from '../../services/executiveService';

/* ───────────────────────────────────────────────
   MOCK DATA (for development / fallback)
   ─────────────────────────────────────────────── */
const MOCK_OVERVIEW = {
  beneficiaries: { total: 342, active: 287, discharged: 55, newThisMonth: 12, dischargeRate: 16.1 },
  financial: {
    revenueThisMonth: 485000, revenueFormatted: '٤٨٥٬٠٠٠ ر.س',
    outstandingPayments: 42000, outstandingFormatted: '٤٢٬٠٠٠ ر.س',
    expensesThisMonth: 310000, expensesFormatted: '٣١٠٬٠٠٠ ر.س',
    costPerBeneficiary: 1078.5, costPerBeneficiaryFormatted: '١٬٠٧٨ ر.س',
    netThisMonth: 175000, netFormatted: '١٧ٵ٬٠٠٠ ر.س',
    trend: { revenue: { percent: 8.5, direction: 'up' } },
  },
  staff: { totalTherapists: 28, activeTherapists: 24, avgSessionsPerTherapist: 42.3, attendanceRate: 94.2, attendanceRateFormatted: '٩٤.٢٪' },
  clinical: { avgICFScore: 72.4, goalsAchievedRate: 68.5, goalsAchievedRateFormatted: '٦٨.٥٪', dischargeRate: 16.1, completedSessions: 1012, avgSessionDuration: 52 },
};

const MOCK_BRANCHES = {
  branches: [
    { branchId: 'b1', branchName: 'فرع الرياض الرئيسي', city: 'الرياض', totalBeneficiaries: 142, activeBeneficiaries: 120, revenue: 210000, revenueFormatted: '٢١٠٬٠٠٠ ر.س', sessionsCompleted: 420, staffCount: 12, compositeScore: 8.7 },
    { branchId: 'b2', branchName: 'فرع جدة', city: 'جدة', totalBeneficiaries: 98, activeBeneficiaries: 85, revenue: 155000, revenueFormatted: '١٥٥٬٠٠٠ ر.س', sessionsCompleted: 310, staffCount: 8, compositeScore: 7.2 },
    { branchId: 'b3', branchName: 'فرع الدمام', city: 'الدمام', totalBeneficiaries: 65, activeBeneficiaries: 58, revenue: 98000, revenueFormatted: '٩٨٬٠٠٠ ر.س', sessionsCompleted: 210, staffCount: 6, compositeScore: 6.1 },
    { branchId: 'b4', branchName: 'فرع مكة', city: 'مكة', totalBeneficiaries: 37, activeBeneficiaries: 24, revenue: 22000, revenueFormatted: '٢٢٬٠٠٠ ر.س', sessionsCompleted: 72, staffCount: 4, compositeScore: 3.4 },
  ],
  best: { branchName: 'فرع الرياض الرئيسي', highlight: 'إيرادات: ٢١٠٬٠٠٠ ر.س · جلسات: ٤٢٠' },
  worst: { branchName: 'فرع مكة', highlight: 'إيرادات: ٢٢٬٠٠٠ ر.س · جلسات: ٧٢' },
};

const MOCK_FINANCIAL = {
  revenueByMonth: [
    { month: '2026-01', monthAr: 'يناير ٢٠٢٦', revenue: 420000 },
    { month: '2026-02', monthAr: 'فبراير ٢٠٢٦', revenue: 445000 },
    { month: '2026-03', monthAr: 'مارس ٢٠٢٦', revenue: 485000 },
  ],
  revenueByService: [
    { serviceType: 'علاج طبيعي', revenue: 195000 },
    { serviceType: 'علاج وظيفي', revenue: 120000 },
    { serviceType: 'علاج نطق', revenue: 85000 },
    { serviceType: 'علاج نفسي', revenue: 85000 },
  ],
  totalRevenue: 485000,
  expenses: 310000,
  net: 175000,
};

const MOCK_STAFF = {
  leaderboard: [
    { therapistId: 't1', name: 'أحمد العمري', role: 'therapist', sessionsCompleted: 52, goalsAchieved: 18, patientSatisfaction: 96.2, attendanceRate: 98.0, avgSessionDuration: 55, compositeScore: 42.1 },
    { therapistId: 't2', name: 'سارة القحطاني', role: 'specialist', sessionsCompleted: 48, goalsAchieved: 16, patientSatisfaction: 94.5, attendanceRate: 96.0, avgSessionDuration: 50, compositeScore: 38.8 },
    { therapistId: 't3', name: 'خالد الزهراني', role: 'therapist', sessionsCompleted: 45, goalsAchieved: 14, patientSatisfaction: 92.0, attendanceRate: 95.0, avgSessionDuration: 48, compositeScore: 35.6 },
    { therapistId: 't4', name: 'نورة السبيعي', role: 'doctor', sessionsCompleted: 42, goalsAchieved: 15, patientSatisfaction: 95.0, attendanceRate: 97.0, avgSessionDuration: 60, compositeScore: 35.4 },
    { therapistId: 't5', name: 'فهد الدوسري', role: 'therapist', sessionsCompleted: 40, goalsAchieved: 12, patientSatisfaction: 89.5, attendanceRate: 94.0, avgSessionDuration: 45, compositeScore: 32.7 },
  ],
  averages: { avgSessionsPerTherapist: 42.3, avgAttendanceRate: 94.2, avgSessionDuration: 52, avgPatientSatisfaction: 91.2 },
};

const MOCK_ALERTS = [
  { id: 1, severity: 'critical', title: 'تجاوز ميزانية قسم الأشعة', description: 'تجاوز قسم الأشعة الميزانية المخصصة بنسبة 12%', createdAt: '2026-03-22' },
  { id: 2, severity: 'warning', title: 'نقص كادر العلاج الطبيعي', description: 'عدد أخصائيي العلاج الطبيعي أقل من المطلوب بـ 3 موظفين', createdAt: '2026-03-21' },
  { id: 3, severity: 'warning', title: 'انخفاض نسبة حضور الجلسات', description: 'انخفضت نسبة حضور الجلسات العلاجية بنسبة 8% هذا الأسبوع', createdAt: '2026-03-20' },
  { id: 4, severity: 'info', title: 'تحسن درجة رضا الأسر', description: 'ارتفعت درجة رضا أسر المستفيدين إلى 91.2%', createdAt: '2026-03-19' },
  { id: 5, severity: 'critical', title: 'عطل في نظام التبريد', description: 'عطل في نظام التبريد المركزي - المبنى B', createdAt: '2026-03-23' },
];

const BRANCHES = [
  { id: '', name: 'جميع الفروع' },
  { id: 'b1', name: 'فرع الرياض الرئيسي' },
  { id: 'b2', name: 'فرع جدة' },
  { id: 'b3', name: 'فرع الدمام' },
  { id: 'b4', name: 'فرع مكة' },
];

const PERIODS = [
  { id: 'this-month', name: 'هذا الشهر' },
  { id: 'last-month', name: 'الشهر الماضي' },
  { id: 'this-quarter', name: 'هذا الربع' },
  { id: 'this-year', name: 'هذا العام' },
];

/* ───────────────────────────────────────────────
   Animation variants
   ─────────────────────────────────────────────── */
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ───────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────── */
function TrendIndicator({ percent, direction }) {
  if (!percent && !direction) return null;
  const dir = direction || (percent >= 0 ? 'up' : 'down');
  const color = dir === 'up' ? 'success.main' : 'error.main';
  const Icon = dir === 'up' ? TrendUpIcon : TrendDownIcon;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color }}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="caption" fontWeight="bold">
        {percent > 0 ? '+' : ''}{percent}%
      </Typography>
    </Box>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color, index, trend }) {
  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible">
      <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}20`, color, width: 48, height: 48 }}>
              <Icon />
            </Avatar>
          </Box>
          {trend && <TrendIndicator {...trend} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectionCard({ title, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay }}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {Icon && <Icon color="primary" />}
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
          </Box>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchId, setBranchId] = useState('');
  const [period, setPeriod] = useState('this-month');
  const [overview, setOverview] = useState(null);
  const [branches, setBranches] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [staff, setStaff] = useState(null);
  const [alerts] = useState(MOCK_ALERTS);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, brRes, finRes, stRes] = await Promise.allSettled([
        executiveService.getOverview(branchId || null),
        executiveService.getBranches(),
        executiveService.getFinancial(),
        executiveService.getStaff(),
      ]);

      setOverview(ovRes.status === 'fulfilled' ? ovRes.value?.data?.data : null);
      setBranches(brRes.status === 'fulfilled' ? brRes.value?.data?.data : null);
      setFinancial(finRes.status === 'fulfilled' ? finRes.value?.data?.data : null);
      setStaff(stRes.status === 'fulfilled' ? stRes.value?.data?.data : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [branchId, period]);

  /* ── Use mock data when API data is missing (development) ── */
  const data = useMemo(() => ({
    overview: overview || MOCK_OVERVIEW,
    branches: branches || MOCK_BRANCHES,
    financial: financial || MOCK_FINANCIAL,
    staff: staff || MOCK_STAFF,
  }), [overview, branches, financial, staff]);

  const { overview: ov, branches: br, financial: fin, staff: st } = data;

  /* ── Severity chip color ── */
  const severityColor = (s) => {
    if (s === 'critical') return 'error';
    if (s === 'warning') return 'warning';
    return 'info';
  };

  const severityIcon = (s) => {
    if (s === 'critical') return <ErrorIcon fontSize="small" color="error" />;
    if (s === 'warning') return <WarningIcon fontSize="small" color="warning" />;
    return <CheckIcon fontSize="small" color="info" />;
  };

  return (
    <Box dir="rtl" sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ═══════ HEADER ═══════ */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            لوحة القيادة التنفيذية
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الفرع</InputLabel>
            <Select value={branchId} label="الفرع" onChange={(e) => setBranchId(e.target.value)}>
              {BRANCHES.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الفترة</InputLabel>
            <Select value={period} label="الفترة" onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="تحديث">
            <IconButton onClick={fetchAll} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ═══════ ROW 1: KPI CARDS ═══════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <KPICard
              index={0}
              title="إجمالي المستفيدين"
              value={ov.beneficiaries.total.toLocaleString('ar-SA')}
              subtitle={`نشط: ${ov.beneficiaries.active.toLocaleString('ar-SA')} · جديد: ${ov.beneficiaries.newThisMonth}`}
              icon={PeopleIcon}
              color="#1976d2"
              trend={ov.beneficiaries.trend?.newBeneficiaries}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <KPICard
              index={1}
              title="الإيرادات (الشهر)"
              value={ov.financial.revenueFormatted}
              subtitle={`الصافي: ${ov.financial.netFormatted}`}
              icon={MoneyIcon}
              color="#2e7d32"
              trend={ov.financial.trend?.revenue}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <KPICard
              index={2}
              title="المعالجون النشطون"
              value={ov.staff.activeTherapists.toLocaleString('ar-SA')}
              subtitle={`إجمالي: ${ov.staff.totalTherapists} · متوسط جلسات: ${ov.staff.avgSessionsPerTherapist}`}
              icon={TherapyIcon}
              color="#9c27b0"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <KPICard
              index={3}
              title="متوسط تقييم ICF"
              value={ov.clinical.avgICFScore}
              subtitle={`تحقيق الأهداف: ${ov.clinical.goalsAchievedRateFormatted}`}
              icon={AssessmentIcon}
              color="#ed6c02"
            />
          )}
        </Grid>
      </Grid>

      {/* ═══════ ROW 2: BRANCH COMPARISON (Bar Chart) ═══════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="مقارنة الفروع" icon={BranchIcon} delay={0.2}>
            {loading ? (
              <Skeleton variant="rounded" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={br.branches} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branchName" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip
                    formatter={(value, name) => [value.toLocaleString('ar-SA'), name === 'revenue' ? 'الإيرادات' : name === 'sessionsCompleted' ? 'الجلسات' : name]}
                    labelStyle={{ textAlign: 'right' }}
                  />
                  <Legend wrapperStyle={{ textAlign: 'center' }} />
                  <Bar dataKey="revenue" name="الإيرادات" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sessionsCompleted" name="الجلسات" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <SectionCard title="أفضل / أقل فرع" icon={TrendUpIcon} delay={0.3}>
            {loading ? (
              <Skeleton variant="rounded" height={300} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold">
                      <TrendUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      أفضل فرع
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {br.best?.branchName}
                    </Typography>
                    <Typography variant="body2">{br.best?.highlight}</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold">
                      <TrendDownIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      أقل فرع أداءً
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {br.worst?.branchName}
                    </Typography>
                    <Typography variant="body2">{br.worst?.highlight}</Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ═══════ ROW 3: FINANCIAL TREND (Line Chart) ═══════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <SectionCard title="الاتجاه المالي" icon={CalendarIcon} delay={0.4}>
            {loading ? (
              <Skeleton variant="rounded" height={300} />
            ) : (
              <Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">إجمالي الإيرادات</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {fin.totalRevenue.toLocaleString('ar-SA')} ر.س
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">المصروفات</Typography>
                    <Typography variant="h5" fontWeight="bold" color="error">
                      {fin.expenses.toLocaleString('ar-SA')} ر.س
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">الصافي</Typography>
                    <Typography variant="h5" fontWeight="bold" color="success">
                      {fin.net.toLocaleString('ar-SA')} ر.س
                    </Typography>
                  </Grid>
                </Grid>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={fin.revenueByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthAr" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ReTooltip
                      formatter={(value) => [`${value.toLocaleString('ar-SA')} ر.س`, 'الإيرادات']}
                      labelStyle={{ textAlign: 'right' }}
                    />
                    <Legend wrapperStyle={{ textAlign: 'center' }} />
                    <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#1976d2" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ═══════ ROW 4: THERAPIST LEADERBOARD ═══════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <SectionCard title="ترتيب المعالجين" icon={PeopleIcon} delay={0.5}>
            {loading ? (
              <Skeleton variant="rounded" height={300} />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>#</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>المعالج</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>الجلسات</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>الأهداف المحققة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>رضا المستفيدين</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>نسبة الحضور</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>متوسط المدة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>الدرجة المركبة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {st.leaderboard.map((t, i) => (
                      <TableRow key={t.therapistId} hover>
                        <TableCell align="right">
                          <Chip size="small" label={i + 1} color={i === 0 ? 'success' : i === 1 ? 'primary' : 'default'} />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {t.name}
                            </Typography>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                              {t.name.charAt(0)}
                            </Avatar>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{t.sessionsCompleted}</TableCell>
                        <TableCell align="center">{t.goalsAchieved}</TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={`${t.patientSatisfaction}%`} color={t.patientSatisfaction >= 95 ? 'success' : t.patientSatisfaction >= 90 ? 'primary' : 'warning'} />
                        </TableCell>
                        <TableCell align="center">{t.attendanceRate}%</TableCell>
                        <TableCell align="center">{t.avgSessionDuration} د</TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color={t.compositeScore >= 40 ? 'success.main' : t.compositeScore >= 35 ? 'primary.main' : 'text.secondary'}>
                            {t.compositeScore}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {st.leaderboard.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" py={4}>لا توجد بيانات كوادر</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ═══════ ROW 5: ALERTS ═══════ */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <SectionCard title="التنبيهات والإشعارات الإدارية" icon={AlertIcon} delay={0.6}>
            {loading ? (
              <Skeleton variant="rounded" height={200} />
            ) : (
              <Grid container spacing={2}>
                {alerts.map((alert) => (
                  <Grid item xs={12} md={6} key={alert.id}>
                    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                      <Alert severity={severityColor(alert.severity)} icon={severityIcon(alert.severity)} variant="outlined" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {alert.title}
                        </Typography>
                        <Typography variant="body2">{alert.description}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alert.createdAt}
                        </Typography>
                      </Alert>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
