/**
 * SupplyChainDashboard — لوحة سلسلة الإمداد (Professional v2)
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
} from '@mui/material';
import {
  LocalShipping as ShipIcon,
  Inventory as InvIcon,
  Store as StoreIcon,
  Assessment as AssessIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
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

const CAT_LABELS = {
  medical: 'طبي وتأهيلي',
  office: 'مكتبي',
  cleaning: 'نظافة وتعقيم',
  food: 'غذاء',
  tech: 'تقني',
  other: 'أخرى',
};
const ORDER_STATUS = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  shipped: 'شحن',
  received: 'مستلم',
  cancelled: 'ملغي',
};
const ORDER_COLORS = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  received: 'success',
  cancelled: 'error',
};
const COLORS = ['#1565c0', '#00897b', '#f57f17', '#7b1fa2', '#e53935'];

const TREND_DATA = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map((m, i) => ({
  month: m,
  orders: [18, 22, 28, 25, 31, 35][i],
  value: [48, 65, 72, 61, 84, 91][i],
}));

const DEMO = {
  totalSuppliers: 48,
  activeOrders: 23,
  inventoryItems: 1250,
  shipmentsInTransit: 12,
  orders: [
    {
      _id: '1',
      orderNo: 'PO-2024-001',
      supplier: 'شركة الأمل للمستلزمات',
      category: 'medical',
      status: 'shipped',
      amount: 28400,
      date: new Date(Date.now() - 3 * 86400000),
    },
    {
      _id: '2',
      orderNo: 'PO-2024-002',
      supplier: 'مؤسسة التقنية الحديثة',
      category: 'tech',
      status: 'confirmed',
      amount: 15600,
      date: new Date(Date.now() - 1 * 86400000),
    },
    {
      _id: '3',
      orderNo: 'PO-2024-003',
      supplier: 'شركة النظافة المتكاملة',
      category: 'cleaning',
      status: 'received',
      amount: 8900,
      date: new Date(Date.now() - 7 * 86400000),
    },
    {
      _id: '4',
      orderNo: 'PO-2024-004',
      supplier: 'مورد الأثاث المكتبي',
      category: 'office',
      status: 'pending',
      amount: 12300,
      date: new Date(),
    },
    {
      _id: '5',
      orderNo: 'PO-2024-005',
      supplier: 'شركة التغذية الصحية',
      category: 'food',
      status: 'received',
      amount: 6800,
      date: new Date(Date.now() - 5 * 86400000),
    },
  ],
  byCategory: [
    { name: 'طبي', value: 38, color: '#1565c0' },
    { name: 'تقني', value: 22, color: '#00897b' },
    { name: 'نظافة', value: 15, color: '#f57f17' },
    { name: 'مكتبي', value: 14, color: '#7b1fa2' },
    { name: 'غذاء', value: 11, color: '#e53935' },
  ],
  trend: TREND_DATA,
};

const fmtSAR = v => `${(v || 0).toLocaleString('ar-SA')} ﷼`;

export default function SupplyChainDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [orders, setOrders] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/supply-chain/analytics').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setOrders(Array.isArray(d.orders) && d.orders.length ? d.orders : DEMO.orders);
    } catch (err) {
      logger.error('SupplyChain Dashboard error', err);
      setDash(DEMO);
      setOrders(DEMO.orders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = orders.filter(o => {
    const ms = !search || o.orderNo?.includes(search) || o.supplier?.includes(search);
    const mc = !filterCat || o.category === filterCat;
    const ms2 = !filterStatus || o.status === filterStatus;
    return ms && mc && ms2;
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
            background: 'linear-gradient(135deg,#e65100,#bf360c)',
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
                سلسلة الإمداد والمشتريات
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الموردون، طلبات الشراء، والمخزون
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`طلبات نشطة: ${dash.activeOrders || 23}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`موردون: ${dash.totalSuppliers || 48}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/supply-chain/orders/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                طلب شراء
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الموردين"
                value={dash.totalSuppliers || 48}
                icon={<StoreIcon />}
                gradient="linear-gradient(135deg,#e65100,#bf360c)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="طلبات نشطة"
                value={dash.activeOrders || 23}
                icon={<AssessIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="أصناف المخزون"
                value={dash.inventoryItems || 1250}
                icon={<InvIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="شحنات في الطريق"
                value={dash.shipmentsInTransit || 12}
                icon={<ShipIcon />}
                gradient={gradients.success}
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
                  المشتريات حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byCategory || DEMO.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byCategory || DEMO.byCategory).map((e, i) => (
                        <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />
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
                  اتجاه الطلبات والقيمة (6 أشهر)
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={dash.trend || DEMO.trend}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="scgO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e65100" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#e65100" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      name="عدد الطلبات"
                      stroke="#e65100"
                      fill="url(#scgO)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
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
                  placeholder="بحث برقم الطلب أو المورد..."
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
                  label="الفئة"
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(CAT_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
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
                  {Object.entries(ORDER_STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} طلب`}
                  sx={{ fontWeight: 700, bgcolor: '#e65100', color: '#fff' }}
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
                طلبات الشراء
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد طلبات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['رقم الطلب', 'المورد', 'الفئة', 'الحالة', 'القيمة', 'التاريخ', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((o, i) => (
                      <TableRow
                        key={o._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: '#e65100', fontSize: 12 }}
                          >
                            {o.orderNo || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {o.supplier || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={CAT_LABELS[o.category] || o.category || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ORDER_STATUS[o.status] || o.status || '-'}
                            color={ORDER_COLORS[o.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                            {fmtSAR(o.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {o.date ? new Date(o.date).toLocaleDateString('ar') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض الطلب">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/supply-chain/orders/${o._id}`)}
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
