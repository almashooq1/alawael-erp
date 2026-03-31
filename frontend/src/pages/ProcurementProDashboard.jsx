/**
 * ProcurementProDashboard — لوحة المشتريات والعقود البريميوم
 * Premium Glassmorphism + Framer Motion
 * Gradient: #8b5cf6 → #f59e0b → #22c55e
 */

import {
  Box, Typography, Grid, Card, useTheme, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// ─── Data ──────────────────────────────────────────────────────────────────────
const kpiData = [
  { title: 'طلبات الشراء', value: '٢٤٧', sub: '+١٨ هذا الأسبوع', icon: ShoppingCartIcon, trend: 'up', color: '#8b5cf6' },
  { title: 'العقود النشطة', value: '٦٤', sub: '١٢ تنتهي قريباً', icon: DescriptionIcon, trend: 'up', color: '#f59e0b' },
  { title: 'الموردون', value: '١٨٦', sub: '+٥ موردين جدد', icon: LocalShippingIcon, trend: 'up', color: '#22c55e' },
  { title: 'إجمالي المشتريات', value: '٢.٤م ر.س', sub: '-٨٪ عن الشهر السابق', icon: AccountBalanceWalletIcon, trend: 'down', color: '#06b6d4' },
];

const monthlyData = [
  { month: 'يناير', orders: 180, amount: 320, savings: 45 },
  { month: 'فبراير', orders: 210, amount: 380, savings: 52 },
  { month: 'مارس', orders: 195, amount: 350, savings: 48 },
  { month: 'أبريل', orders: 240, amount: 420, savings: 60 },
  { month: 'مايو', orders: 225, amount: 395, savings: 55 },
  { month: 'يونيو', orders: 247, amount: 440, savings: 65 },
];

const categoryData = [
  { name: 'مستلزمات طبية', value: 35, color: '#8b5cf6' },
  { name: 'أجهزة ومعدات', value: 25, color: '#f59e0b' },
  { name: 'أدوية', value: 20, color: '#22c55e' },
  { name: 'خدمات صيانة', value: 12, color: '#06b6d4' },
  { name: 'أخرى', value: 8, color: '#ec4899' },
];

const supplierRating = [
  { subject: 'الجودة', A: 92 },
  { subject: 'التسليم', A: 88 },
  { subject: 'السعر', A: 78 },
  { subject: 'الدعم', A: 85 },
  { subject: 'المرونة', A: 80 },
  { subject: 'الموثوقية', A: 90 },
];

const topSuppliers = [
  { name: 'شركة المعدات الطبية المتقدمة', orders: 48, rating: 4.8, status: 'ممتاز' },
  { name: 'مؤسسة الإمداد الصحي', orders: 42, rating: 4.6, status: 'جيد جداً' },
  { name: 'شركة التوريدات العامة', orders: 38, rating: 4.5, status: 'جيد جداً' },
  { name: 'مصنع الأدوية الوطني', orders: 35, rating: 4.7, status: 'ممتاز' },
];

const recentOrders = [
  { id: 'PO-2024-0247', supplier: 'المعدات الطبية', items: 12, total: '٤٥,٠٠٠', status: 'مُعتمد', date: '٢٠٢٤/٠٣/٢٨' },
  { id: 'PO-2024-0246', supplier: 'الإمداد الصحي', items: 8, total: '٢٨,٥٠٠', status: 'قيد المراجعة', date: '٢٠٢٤/٠٣/٢٧' },
  { id: 'PO-2024-0245', supplier: 'التوريدات العامة', items: 15, total: '٦٧,٢٠٠', status: 'مُعتمد', date: '٢٠٢٤/٠٣/٢٦' },
  { id: 'PO-2024-0244', supplier: 'الأدوية الوطني', items: 20, total: '٩٢,٠٠٠', status: 'تم التسليم', date: '٢٠٢٤/٠٣/٢٥' },
  { id: 'PO-2024-0243', supplier: 'المعدات الطبية', items: 6, total: '١٨,٣٠٠', status: 'قيد المراجعة', date: '٢٠٢٤/٠٣/٢٤' },
];

const GRADIENT = 'linear-gradient(135deg, #8b5cf6 0%, #f59e0b 50%, #22c55e 100%)';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const glass = (isDark) => ({
  borderRadius: '20px',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
});

const statusColor = (s) =>
  s === 'مُعتمد' ? '#22c55e' : s === 'تم التسليم' ? '#06b6d4' : '#f59e0b';

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ProcurementProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : '#64748B';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          ...glass(isDark), mb: 3, p: { xs: 2.5, md: 4 }, position: 'relative', overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(245,158,11,0.2) 50%, rgba(34,197,94,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(245,158,11,0.08) 50%, rgba(34,197,94,0.06) 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '16px',
              background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
            }}>
              <ShoppingCartIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة المشتريات والعقود
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: sub }}>
                إدارة طلبات الشراء والموردين والعقود
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {kpiData.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.78rem', color: sub, mb: 0.5 }}>{kpi.title}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                        {kpi.value}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        {kpi.trend === 'up'
                          ? <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} />
                          : <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                        <Typography sx={{ fontSize: '0.7rem', color: kpi.trend === 'up' ? '#22c55e' : '#ef4444' }}>
                          {kpi.sub}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '14px',
                      background: `${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon sx={{ fontSize: 22, color: kpi.color }} />
                    </Box>
                  </Box>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row 1 ──────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Monthly Procurement */}
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                المشتريات الشهرية
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="procGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="procGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: sub }} />
                  <YAxis tick={{ fontSize: 11, fill: sub }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="orders" name="الطلبات" stroke="#8b5cf6" fill="url(#procGrad1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="amount" name="المبالغ (ألف)" stroke="#f59e0b" fill="url(#procGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        {/* Categories Pie */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                توزيع المشتريات
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3} stroke="none">
                    {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ──────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Supplier Rating Radar */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                تقييم الموردين
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={supplierRating}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: sub }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: sub }} />
                  <Radar name="التقييم" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        {/* Top Suppliers */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                أفضل الموردين
              </Typography>
              {topSuppliers.map((s, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: '12px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                }}>
                  <Avatar sx={{ width: 36, height: 36, background: GRADIENT, fontSize: '0.8rem', fontWeight: 700 }}>
                    {i + 1}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {s.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: sub }}>
                      {s.orders} طلب • تقييم {s.rating}
                    </Typography>
                  </Box>
                  <Chip label={s.status} size="small" sx={{
                    height: 22, fontSize: '0.65rem', fontWeight: 600,
                    backgroundColor: s.status === 'ممتاز' ? '#22c55e22' : '#f59e0b22',
                    color: s.status === 'ممتاز' ? '#22c55e' : '#f59e0b',
                  }} />
                </Box>
              ))}
            </Card>
          </motion.div>
        </Grid>

        {/* Savings Bar */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                التوفير الشهري (ألف ر.س)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: sub }} />
                  <YAxis tick={{ fontSize: 11, fill: sub }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="savings" name="التوفير" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Orders Table ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
            آخر طلبات الشراء
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الطلب', 'المورد', 'الأصناف', 'المبلغ', 'الحالة', 'التاريخ'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: sub, border: 'none' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id} sx={{ '&:hover': { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#8b5cf6', border: 'none' }}>{o.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{o.supplier}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: sub, border: 'none' }}>{o.items}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{o.total}</TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={o.status} size="small" sx={{
                        height: 22, fontSize: '0.65rem', fontWeight: 600,
                        backgroundColor: `${statusColor(o.status)}22`, color: statusColor(o.status),
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: sub, border: 'none' }}>{o.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </motion.div>
    </Box>
  );
}
