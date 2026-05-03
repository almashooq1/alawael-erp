/**
 * GosiDashboard — لوحة التأمينات الاجتماعية (GOSI) (Professional v2)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Avatar,
  Button,
  Stack,
  useTheme,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Security as GosiIcon,
  Calculate as CalcIcon,
  Assessment as ReportIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import gosiApi from '../../services/gosi.service';
import { gradients } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';

const useCounter = (end, dur = 1000) => {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !end) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        const t0 = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          setV(Math.floor((1 - Math.pow(2, -10 * p)) * end));
          if (p < 1) requestAnimationFrame(step);
          else setV(end);
        };
        requestAnimationFrame(step);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return [v, ref];
};

const KPICard = ({ label, value, icon, gradient, delay = 0 }) => {
  const [count, ref] = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.12 }}
    >
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -16,
            right: -16,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
              {count.toLocaleString('ar-SA')}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5, display: 'block' }}>
              {label}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
      </Paper>
    </motion.div>
  );
};

const PIE_COLORS = ['#004d40', '#00695c', '#00796b', '#00897b', '#009688', '#26a69a'];
const statusLabels = { compliant: 'ممتثل', pending: 'معلق', overdue: 'متأخر', exempt: 'معفى' };
const statusColors = {
  compliant: 'success',
  pending: 'warning',
  overdue: 'error',
  exempt: 'default',
};
const empTypeLabels = { saudi: 'سعودي', expat: 'غير سعودي' };

const DEMO = {
  registered: 261,
  compliant: 248,
  pendingCerts: 8,
  monthlyContribution: 68400,
  byStatus: [
    { name: 'ممتثل', value: 248, color: PIE_COLORS[0] },
    { name: 'معلق', value: 8, color: PIE_COLORS[2] },
    { name: 'متأخر', value: 3, color: '#c62828' },
    { name: 'معفى', value: 2, color: PIE_COLORS[4] },
  ],
  contributionByMonth: [
    { month: 'يناير', amount: 62000 },
    { month: 'فبراير', amount: 63500 },
    { month: 'مارس', amount: 65000 },
    { month: 'أبريل', amount: 66200 },
    { month: 'مايو', amount: 67500 },
    { month: 'يونيو', amount: 68400 },
  ],
  employees: [
    {
      _id: '1',
      name: 'أحمد محمد العسيري',
      empNo: 'EMP-001',
      type: 'saudi',
      basic: 8000,
      housing: 2400,
      contribution: 934,
      status: 'compliant',
    },
    {
      _id: '2',
      name: 'خالد سالم الغامدي',
      empNo: 'EMP-002',
      type: 'saudi',
      basic: 6500,
      housing: 1950,
      contribution: 759,
      status: 'compliant',
    },
    {
      _id: '3',
      name: 'محمد أحمد الزهراني',
      empNo: 'EMP-003',
      type: 'saudi',
      basic: 10000,
      housing: 3000,
      contribution: 1170,
      status: 'compliant',
    },
    {
      _id: '4',
      name: 'عمر عبدالله القحطاني',
      empNo: 'EMP-004',
      type: 'saudi',
      basic: 7200,
      housing: 2160,
      contribution: 842,
      status: 'pending',
    },
    {
      _id: '5',
      name: 'سارة علي الشمري',
      empNo: 'EMP-005',
      type: 'saudi',
      basic: 5800,
      housing: 1740,
      contribution: 678,
      status: 'compliant',
    },
  ],
};

export default function GosiDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcForm, setCalcForm] = useState({
    basicSalary: '',
    housingAllowance: '',
    type: 'saudi',
  });
  const [calcResult, setCalcResult] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = (await gosiApi.getCompliance?.()) || (await gosiApi.get?.('/compliance'));
      const d = r?.data || r || {};
      if (d.registered) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('GosiDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCalc = () => {
    const basic = parseFloat(calcForm.basicSalary) || 0;
    const housing = parseFloat(calcForm.housingAllowance) || 0;
    const base = basic + housing;
    const empShare = base * 0.0975;
    const emplShare = base * (calcForm.type === 'saudi' ? 0.1175 : 0.02);
    const total = empShare + emplShare;
    setCalcResult({ base, empShare, emplShare, total });
  };

  const filtered = (dash.employees || []).filter(e => {
    const ms =
      !search || [e.name, e.empNo].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const ms2 = !filterStatus || e.status === filterStatus;
    return ms && ms2;
  });

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg,#004d40,#00695c)',
            py: 3,
            px: 3,
            mb: -3,
            borderRadius: '0 0 24px 24px',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={800} color="#fff">
                التأمينات الاجتماعية (GOSI)
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                تسجيل الموظفين، الاشتراكات، الامتثال، والشهادات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`مسجلون: ${dash.registered}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`شهادات معلقة: ${dash.pendingCerts}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,200,0,0.3)', color: '#fff', fontSize: 11 }}
                />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="تحديث">
                <IconButton
                  onClick={loadData}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<CalcIcon />}
                onClick={() => setCalcOpen(true)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                حساب الاشتراك
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="موظفون مسجلون"
                value={dash.registered}
                icon={<GosiIcon />}
                gradient="linear-gradient(135deg,#004d40,#00695c)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="ممتثلون"
                value={dash.compliant}
                icon={<CheckIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="شهادات معلقة"
                value={dash.pendingCerts}
                icon={<WarnIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="اشتراك هذا الشهر (ر.س)"
                value={dash.monthlyContribution}
                icon={<CalcIcon />}
                gradient={gradients.ocean}
                delay={3}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  حالة الامتثال
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dash.byStatus || DEMO.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byStatus || DEMO.byStatus).map((e, i) => (
                        <Cell key={i} fill={e.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الاشتراكات الشهرية (ر.س)
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={dash.contributionByMonth || DEMO.contributionByMonth}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="amount"
                      name="الاشتراك (ر.س)"
                      fill="#00695c"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث باسم الموظف أو الرقم..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} موظف`}
                  sx={{ fontWeight: 700, bgcolor: '#004d40', color: '#fff' }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                سجل الاشتراكات
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا يوجد موظفون" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'الموظف',
                        'الرقم الوظيفي',
                        'النوع',
                        'الراتب الأساسي',
                        'بدل السكن',
                        'اشتراك الموظف',
                        'الحالة',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((emp, i) => (
                      <TableRow
                        key={emp._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                            {emp.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 11, fontFamily: 'monospace' }}
                          >
                            {emp.empNo || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={empTypeLabels[emp.type] || emp.type || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#00695c', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {(emp.basic || 0).toLocaleString('ar-SA')} ر.س
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {(emp.housing || 0).toLocaleString('ar-SA')} ر.س
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ fontSize: 12, color: 'success.main' }}
                          >
                            {(emp.contribution || 0).toLocaleString('ar-SA')} ر.س
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[emp.status] || emp.status || '—'}
                            color={statusColors[emp.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/gosi/${emp._id}`)}
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              <ViewIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* حاسبة الاشتراك */}
      <Dialog
        open={calcOpen}
        onClose={() => {
          setCalcOpen(false);
          setCalcResult(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          حاسبة اشتراك GOSI
          <IconButton
            size="small"
            onClick={() => {
              setCalcOpen(false);
              setCalcResult(null);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="الراتب الأساسي (ر.س)"
              value={calcForm.basicSalary}
              onChange={e => setCalcForm(p => ({ ...p, basicSalary: e.target.value }))}
              size="small"
              type="number"
              fullWidth
            />
            <TextField
              label="بدل السكن (ر.س)"
              value={calcForm.housingAllowance}
              onChange={e => setCalcForm(p => ({ ...p, housingAllowance: e.target.value }))}
              size="small"
              type="number"
              fullWidth
            />
            <TextField
              select
              label="جنسية الموظف"
              value={calcForm.type}
              onChange={e => setCalcForm(p => ({ ...p, type: e.target.value }))}
              size="small"
              fullWidth
            >
              <MenuItem value="saudi">سعودي</MenuItem>
              <MenuItem value="expat">غير سعودي</MenuItem>
            </TextField>
            {calcResult && (
              <Paper sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                  نتيجة الحساب:
                </Typography>
                <Typography variant="body2">
                  وعاء الاشتراك: {calcResult.base.toLocaleString('ar-SA')} ر.س
                </Typography>
                <Typography variant="body2">
                  حصة الموظف (9.75%): {calcResult.empShare.toFixed(2)} ر.س
                </Typography>
                <Typography variant="body2">
                  حصة صاحب العمل ({calcForm.type === 'saudi' ? '11.75%' : '2%'}):{' '}
                  {calcResult.emplShare.toFixed(2)} ر.س
                </Typography>
                <Typography variant="body2" fontWeight={800} color="success.dark">
                  الإجمالي: {calcResult.total.toFixed(2)} ر.س
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCalcOpen(false);
              setCalcResult(null);
            }}
          >
            إغلاق
          </Button>
          <Button variant="contained" onClick={handleCalc} sx={{ bgcolor: '#004d40' }}>
            احسب
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardErrorBoundary>
  );
}
