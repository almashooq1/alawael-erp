/**
 * ContractDashboard — لوحة إدارة العقود (Professional v2)
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
  alpha,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Description as ContractIcon,
  CheckCircle as ActiveIcon,
  Warning as ExpiringIcon,
  AttachMoney as ValueIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../services/contractManagement.service';
import { gradients } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';
import { formatDate as _fmtDate } from 'utils/dateUtils';

const useCounter = (end, dur = 1000) => {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !end) return;
    const obs = new IntersectionObserver(
      ([e]) => {
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
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return { v, ref };
};

const KPICard = ({ label, value, icon, gradient, delay }) => {
  const { v, ref } = useCounter(typeof value === 'number' ? value : parseInt(value) || 0);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}
        >
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {v.toLocaleString('ar-SA')}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

const typeLabels = {
  SERVICE_AGREEMENT: 'عقد خدمات',
  SUPPLY_AGREEMENT: 'عقد توريد',
  MAINTENANCE_AGREEMENT: 'عقد صيانة',
  FRAMEWORK_AGREEMENT: 'عقد إطاري',
  ONE_TIME_PURCHASE: 'شراء لمرة واحدة',
  DISTRIBUTION_AGREEMENT: 'عقد توزيع',
};
const statusLabels = {
  ACTIVE: 'نشط',
  DRAFT: 'مسودة',
  EXPIRED: 'منتهي',
  TERMINATED: 'ملغي',
  SUSPENDED: 'معلق',
};
const statusColors = {
  ACTIVE: 'success',
  DRAFT: 'default',
  EXPIRED: 'error',
  TERMINATED: 'error',
  SUSPENDED: 'warning',
};
const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

const DEMO = {
  total: 187,
  active: 124,
  expiringSoon: 14,
  totalValueSAR: 4820000,
  contracts: [
    {
      _id: '1',
      title: 'عقد صيانة المباني',
      type: 'MAINTENANCE_AGREEMENT',
      status: 'ACTIVE',
      vendor: 'شركة المتحدة',
      value: 320000,
      endDate: new Date(Date.now() + 90 * 86400000),
    },
    {
      _id: '2',
      title: 'عقد توريد أجهزة طبية',
      type: 'SUPPLY_AGREEMENT',
      status: 'ACTIVE',
      vendor: 'الشركة السعودية',
      value: 780000,
      endDate: new Date(Date.now() + 200 * 86400000),
    },
    {
      _id: '3',
      title: 'عقد خدمات تقنية',
      type: 'SERVICE_AGREEMENT',
      status: 'EXPIRED',
      vendor: 'تقنية الخليج',
      value: 180000,
      endDate: new Date(Date.now() - 30 * 86400000),
    },
    {
      _id: '4',
      title: 'عقد إطاري للتأمين',
      type: 'FRAMEWORK_AGREEMENT',
      status: 'ACTIVE',
      vendor: 'شركة التأمين الوطنية',
      value: 450000,
      endDate: new Date(Date.now() + 30 * 86400000),
    },
    {
      _id: '5',
      title: 'شراء معدات مختبر',
      type: 'ONE_TIME_PURCHASE',
      status: 'DRAFT',
      vendor: 'عالم الأجهزة',
      value: 95000,
      endDate: null,
    },
  ],
  byStatus: ['ACTIVE', 'DRAFT', 'EXPIRED', 'TERMINATED', 'SUSPENDED'].map((k, i) => ({
    name: statusLabels[k],
    value: [124, 18, 32, 8, 5][i],
    color: PIE_COLORS[i],
  })),
  byType: Object.keys(typeLabels).map((k, i) => ({
    name: typeLabels[k],
    value: [45, 38, 32, 22, 18, 15][i],
  })),
};

export default function ContractDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [contracts, setContracts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDashboard().catch(() => ({ data: {} }));
      const d = r.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setContracts(Array.isArray(d.contracts) && d.contracts.length ? d.contracts : DEMO.contracts);
    } catch (err) {
      logger.error('Contracts Dashboard error', err);
      setDash(DEMO);
      setContracts(DEMO.contracts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = contracts.filter(c => {
    const ms = !search || c.title?.includes(search) || c.vendor?.includes(search);
    const mv = !filterStatus || c.status === filterStatus;
    const mt = !filterType || c.type === filterType;
    return ms && mv && mt;
  });

  const fmtSAR = v => (v ? `${(v / 1000).toFixed(0)}K ﷼` : '-');

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
            background: 'linear-gradient(135deg,#1565c0,#0d47a1)',
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
                إدارة العقود
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                متابعة العقود والموردين والمواعيد النهائية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`نشطة: ${dash.active || 124}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`تنتهي قريباً: ${dash.expiringSoon || 14}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,152,0,0.3)', color: '#fff', fontSize: 11 }}
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
                startIcon={<AddIcon />}
                onClick={() => navigate('/contracts/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                عقد جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي العقود"
                value={dash.total || 187}
                icon={<ContractIcon />}
                gradient="linear-gradient(135deg,#1565c0,#0d47a1)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="عقود نشطة"
                value={dash.active || 124}
                icon={<ActiveIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="تنتهي قريباً"
                value={dash.expiringSoon || 14}
                icon={<ExpiringIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="القيمة (ألف ﷼)"
                value={Math.round((dash.totalValueSAR || 4820000) / 1000)}
                icon={<ValueIcon />}
                gradient={gradients.ocean}
                delay={3}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  العقود حسب الحالة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byStatus || DEMO.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
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
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  العقود حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byType || DEMO.byType}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={18}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#aaa' : '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
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
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالعنوان أو المورد..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex' }}>
                        <SearchIcon fontSize="small" color="action" />
                      </Box>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={2.5}>
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
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="النوع"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} عقد`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
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
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                قائمة العقود
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد عقود مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'العنوان',
                        'النوع',
                        'الحالة',
                        'المورد',
                        'القيمة (﷼)',
                        'تاريخ الانتهاء',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((c, i) => (
                      <TableRow
                        key={c._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: 12,
                                bgcolor: alpha('#1976d2', 0.1),
                                color: '#1976d2',
                              }}
                            >
                              <ContractIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {c.title || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {typeLabels[c.type] || c.type || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[c.status] || c.status || '-'}
                            color={statusColors[c.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {c.vendor || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, fontFamily: 'monospace' }}
                          >
                            {fmtSAR(c.value)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              color:
                                c.endDate &&
                                new Date(c.endDate) < new Date(Date.now() + 30 * 86400000)
                                  ? 'error.main'
                                  : 'text.secondary',
                            }}
                          >
                            {c.endDate ? _fmtDate(c.endDate) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض العقد">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/contracts/${c._id}`)}
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
    </DashboardErrorBoundary>
  );
}
