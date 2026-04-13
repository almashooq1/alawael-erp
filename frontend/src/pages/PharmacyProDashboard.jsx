/**
 * PharmacyProDashboard — لوحة الصيدلية والأدوية البريميوم
 * تصميم Glassmorphism احترافي مع Framer Motion
 *
 * Gradient: #ec4899 → #f59e0b → #10b981
 */

import { useTheme,
} from '@mui/material';

import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import MedicationIcon from '@mui/icons-material/Medication';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// ─── Gradient + Glass helpers ──────────────────────────────────────────────────
const GRAD = 'linear-gradient(135deg, #ec4899 0%, #f59e0b 50%, #10b981 100%)';
const glass = (isDark) => ({
  background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  borderRadius: '20px',
});

// ─── Static Data ───────────────────────────────────────────────────────────────
const KPI_CARDS = [
  { title: 'إجمالي الأدوية', value: '٣,٢٤٧', sub: '+١٢٤ هذا الشهر', icon: MedicationIcon, color: '#ec4899', trend: '+٣.٩٪' },
  { title: 'الوصفات اليومية', value: '١٨٧', sub: 'متوسط ١٥٢ يومياً', icon: LocalPharmacyIcon, color: '#f59e0b', trend: '+٢٣٪' },
  { title: 'أدوية منتهية قريباً', value: '٤٣', sub: 'خلال ٩٠ يوم', icon: WarningAmberIcon, color: '#ef4444', trend: '-٨٪' },
  { title: 'طلبات التوريد', value: '٢٨', sub: '١٢ قيد التسليم', icon: ShoppingCartIcon, color: '#10b981', trend: '+١٥٪' },
  { title: 'قيمة المخزون', value: '١.٢م', sub: 'ريال سعودي', icon: InventoryIcon, color: '#6366f1', trend: '+٥.٤٪' },
  { title: 'معدل الصرف', value: '٩٤٪', sub: 'دقة المطابقة', icon: TrendingUpIcon, color: '#8b5cf6', trend: '+٢.١٪' },
];

const MONTHLY_DISPENSING = [
  { month: 'يناير', وصفات: 4200, صرف: 3980, مرتجع: 120 },
  { month: 'فبراير', وصفات: 4500, صرف: 4280, مرتجع: 95 },
  { month: 'مارس', وصفات: 4800, صرف: 4620, مرتجع: 88 },
  { month: 'أبريل', وصفات: 5100, صرف: 4890, مرتجع: 110 },
  { month: 'مايو', وصفات: 5400, صرف: 5200, مرتجع: 76 },
  { month: 'يونيو', وصفات: 5700, صرف: 5520, مرتجع: 65 },
];

const CATEGORIES_PIE = [
  { name: 'مسكنات', value: 28, color: '#ec4899' },
  { name: 'مضادات حيوية', value: 22, color: '#f59e0b' },
  { name: 'أدوية مزمنة', value: 20, color: '#10b981' },
  { name: 'فيتامينات', value: 15, color: '#6366f1' },
  { name: 'أدوية تأهيل', value: 10, color: '#8b5cf6' },
  { name: 'أخرى', value: 5, color: '#64748B' },
];

const RADAR_DATA = [
  { subject: 'توافر المخزون', A: 92, fullMark: 100 },
  { subject: 'سرعة الصرف', A: 88, fullMark: 100 },
  { subject: 'دقة الجرعات', A: 96, fullMark: 100 },
  { subject: 'إدارة الصلاحية', A: 78, fullMark: 100 },
  { subject: 'رضا المرضى', A: 91, fullMark: 100 },
  { subject: 'كفاءة التوريد', A: 85, fullMark: 100 },
];

const LOW_STOCK_ITEMS = [
  { name: 'باراسيتامول 500mg', stock: 45, min: 200, status: 'حرج', supplier: 'الدواء المتحدة' },
  { name: 'أموكسيسيلين 250mg', stock: 78, min: 150, status: 'منخفض', supplier: 'فارما الخليج' },
  { name: 'إيبوبروفين 400mg', stock: 92, min: 180, status: 'منخفض', supplier: 'الدواء المتحدة' },
  { name: 'ميتفورمين 500mg', stock: 34, min: 120, status: 'حرج', supplier: 'النهدي الطبية' },
  { name: 'أوميبرازول 20mg', stock: 56, min: 100, status: 'منخفض', supplier: 'فارما الخليج' },
];

const RECENT_ORDERS = [
  { id: 'PO-2024-0891', supplier: 'الدواء المتحدة', items: 24, total: '٤٥,٢٠٠', status: 'تم التسليم', date: '٢٠٢٦/٠٣/٢٨' },
  { id: 'PO-2024-0892', supplier: 'فارما الخليج', items: 18, total: '٣٢,٨٠٠', status: 'قيد الشحن', date: '٢٠٢٦/٠٣/٢٩' },
  { id: 'PO-2024-0893', supplier: 'النهدي الطبية', items: 31, total: '٦٧,٥٠٠', status: 'قيد المراجعة', date: '٢٠٢٦/٠٣/٣٠' },
  { id: 'PO-2024-0894', supplier: 'الدواء المتحدة', items: 12, total: '٢١,٣٠٠', status: 'تم التسليم', date: '٢٠٢٦/٠٣/٣٠' },
];

// ─── Animation Variants ────────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function GlassCard({ children, sx = {}, delay = 0, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, ...sx }}>
        {children}
      </Card>
    </motion.div>
  );
}

function SectionHeader({ title, icon: Icon, action }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>
      </Box>
      {action}
    </Box>
  );
}

function StatusChip({ status }) {
  const map = {
    'تم التسليم': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    'قيد الشحن': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <LocalShippingIcon sx={{ fontSize: 14 }} /> },
    'قيد المراجعة': { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: <AccessTimeIcon sx={{ fontSize: 14 }} /> },
    'حرج': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
    'منخفض': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map['قيد المراجعة'];
  return (
    <Chip
      icon={s.icon}
      label={status}
      size="small"
      sx={{
        height: 24, fontSize: '0.7rem', fontWeight: 600,
        color: s.color, backgroundColor: s.bg,
        border: `1px solid ${s.color}33`,
        '& .MuiChip-icon': { color: s.color },
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PharmacyProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Box sx={{
          position: 'relative', borderRadius: '24px', overflow: 'hidden',
          mb: 3.5, p: { xs: 2.5, md: 4 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(236,72,153,0.25) 0%, rgba(245,158,11,0.18) 50%, rgba(16,185,129,0.12) 100%)'
            : 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(245,158,11,0.08) 50%, rgba(16,185,129,0.06) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(236,72,153,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Animated blobs */}
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 280, color: 'rgba(236,72,153,0.15)' },
              { right: '-3%', bottom: '-15%', size: 240, color: 'rgba(245,158,11,0.12)' },
              { left: '45%', top: '15%', size: 200, color: 'rgba(16,185,129,0.1)' },
            ].map((blob, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', ...blob, width: blob.size, height: blob.size,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </Box>

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: '18px',
                background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(236,72,153,0.35)',
              }}>
                <LocalPharmacyIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{
                  fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                  background: GRAD, WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2,
                }}>
                  لوحة الصيدلية والأدوية
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mt: 0.25 }}>
                  إدارة شاملة للمخزون الدوائي والوصفات والتوريد
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {['الأدوية', 'المخزون', 'الوصفات', 'التوريد', 'الصلاحية'].map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{
                  height: 26, fontSize: '0.73rem', fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.08)',
                  color: '#ec4899', border: '1px solid rgba(236,72,153,0.25)',
                  '& .MuiChip-label': { px: 1 },
                }} />
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={6} sm={4} md={2} key={kpi.title}>
              <motion.div custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Card elevation={0} sx={{
                  ...glass(isDark), p: 2, textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${kpi.color}33` },
                }}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: '14px', mx: 'auto', mb: 1.5,
                    background: `linear-gradient(135deg, ${kpi.color} 0%, ${kpi.color}BB 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 6px 16px ${kpi.color}40`,
                  }}>
                    <Icon sx={{ fontSize: 22, color: '#fff' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: kpi.color, fontFamily: 'monospace' }}>
                    {kpi.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#CBD5E1' : '#334155', mt: 0.25 }}>
                    {kpi.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mt: 0.25 }}>
                    {kpi.sub}
                  </Typography>
                  <Chip label={kpi.trend} size="small" sx={{
                    mt: 1, height: 20, fontSize: '0.62rem', fontWeight: 700,
                    color: kpi.trend.startsWith('+') ? '#10b981' : '#ef4444',
                    backgroundColor: kpi.trend.startsWith('+') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${kpi.trend.startsWith('+') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    '& .MuiChip-label': { px: 0.75 },
                  }} />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row 1 ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Area Chart - Monthly Dispensing */}
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark} delay={0.2}>
            <SectionHeader title="حركة الوصفات والصرف الشهرية" icon={TrendingUpIcon}
              action={<Tooltip title="تحديث"><IconButton size="small"><RefreshIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>} />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={MONTHLY_DISPENSING}>
                <defs>
                  <linearGradient id="pharmGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pharmGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{
                  backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none',
                  borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 12,
                }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="وصفات" stroke="#ec4899" fill="url(#pharmGrad1)" strokeWidth={2.5} dot={{ r: 4, fill: '#ec4899' }} />
                <Area type="monotone" dataKey="صرف" stroke="#10b981" fill="url(#pharmGrad2)" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                <Area type="monotone" dataKey="مرتجع" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#f59e0b' }} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        {/* Pie Chart - Categories */}
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} delay={0.3}>
            <SectionHeader title="تصنيفات الأدوية" icon={MedicationIcon} />
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={CATEGORIES_PIE} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={4} dataKey="value" stroke="none">
                  {CATEGORIES_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip formatter={(val) => `${val}٪`} contentStyle={{
                  backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none',
                  borderRadius: 12, fontSize: 12,
                }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Radar Chart - Performance */}
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark} delay={0.35}>
            <SectionHeader title="أداء الصيدلية" icon={AutoAwesomeIcon} />
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: isDark ? '#64748B' : '#94A3B8' }} />
                <Radar name="الأداء" dataKey="A" stroke="#ec4899" fill="rgba(236,72,153,0.2)" strokeWidth={2} dot={{ r: 4, fill: '#ec4899' }} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        {/* Low Stock Table */}
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark} delay={0.4}>
            <SectionHeader title="أدوية منخفضة المخزون" icon={WarningAmberIcon}
              action={<Chip label={`${LOW_STOCK_ITEMS.length} صنف`} size="small" sx={{
                height: 24, fontSize: '0.7rem', fontWeight: 600,
                color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
              }} />} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['الدواء', 'المخزون / الحد', 'المستوى', 'الحالة', 'المورد'].map((h) => (
                      <TableCell key={h} sx={{
                        fontWeight: 700, fontSize: '0.72rem',
                        color: isDark ? '#94A3B8' : '#64748B',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        py: 1.25,
                      }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {LOW_STOCK_ITEMS.map((item, i) => (
                    <motion.tr key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      style={{ display: 'table-row' }}
                    >
                      <TableCell sx={{
                        fontSize: '0.78rem', fontWeight: 600,
                        color: isDark ? '#E2E8F0' : '#1E293B',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      }}>{item.name}</TableCell>
                      <TableCell sx={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: item.status === 'حرج' ? '#ef4444' : '#f59e0b', fontFamily: 'monospace' }}>
                          {item.stock} / {item.min}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      }}>
                        <LinearProgress
                          variant="determinate"
                          value={(item.stock / item.min) * 100}
                          sx={{
                            height: 6, borderRadius: 3, width: 70,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background: item.status === 'حرج'
                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      }}>
                        <StatusChip status={item.status} />
                      </TableCell>
                      <TableCell sx={{
                        fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      }}>{item.supplier}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Recent Orders ─────────────────────────────────────────────────── */}
      <GlassCard isDark={isDark} delay={0.5}>
        <SectionHeader title="أحدث طلبات التوريد" icon={ShoppingCartIcon}
          action={<Tooltip title="المزيد"><IconButton size="small"><MoreVertIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['رقم الطلب', 'المورد', 'الأصناف', 'الإجمالي (ر.س)', 'الحالة', 'التاريخ'].map((h) => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, fontSize: '0.72rem',
                    color: isDark ? '#94A3B8' : '#64748B',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    py: 1.25,
                  }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {RECENT_ORDERS.map((order, i) => (
                <motion.tr key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  style={{ display: 'table-row' }}
                >
                  <TableCell sx={{
                    fontSize: '0.78rem', fontWeight: 700, color: '#ec4899', fontFamily: 'monospace',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{order.id}</TableCell>
                  <TableCell sx={{
                    fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{order.supplier}</TableCell>
                  <TableCell sx={{
                    fontSize: '0.78rem', fontFamily: 'monospace', color: isDark ? '#CBD5E1' : '#475569',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{order.items}</TableCell>
                  <TableCell sx={{
                    fontSize: '0.78rem', fontWeight: 700, fontFamily: 'monospace', color: '#10b981',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{order.total}</TableCell>
                  <TableCell sx={{
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <StatusChip status={order.status} />
                  </TableCell>
                  <TableCell sx={{
                    fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'monospace',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{order.date}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        <Box sx={{
          mt: 4, p: 2, borderRadius: '14px',
          background: isDark ? 'rgba(236,72,153,0.06)' : 'rgba(236,72,153,0.03)',
          border: `1px solid ${isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.1)'}`,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <LocalPharmacyIcon sx={{ fontSize: 18, color: '#ec4899' }} />
          <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }}>
            نظام الصيدلية — إدارة متكاملة للمخزون الدوائي والوصفات وسلسلة التوريد
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
