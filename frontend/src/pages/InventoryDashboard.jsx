import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Skeleton, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, Select, InputLabel, FormControl,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Glass ─── */
const Glass = memo(({ children, sx, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: 3, ...sx,
    }} {...rest}>{children}</Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0, alert }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPos = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{ p: 3, height: '100%', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
        {alert && <Box sx={{ position: 'absolute', top: 10, insetInlineStart: 10, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px #ef444433', animation: 'pulse 1.5s infinite' }} />}
        <Box sx={{ position: 'absolute', top: -20, insetInlineEnd: -20, width: 100, height: 100, borderRadius: '50%', background: gradient, opacity: 0.12, filter: 'blur(2px)' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `0 4px 16px ${gradient.includes('10b9') ? '#10b98144' : '#6366f144'}` }}>{icon}</Box>
          <Chip label={`${isPos ? '+' : ''}${trend}%`} size="small" sx={{ background: isPos ? '#22c55e22' : '#ef444422', color: isPos ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 11, border: `1px solid ${isPos ? '#22c55e44' : '#ef444444'}` }} />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>{value}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)', mb: 0.5 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, icon, badge }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ background: active ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent', border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '8px 18px', cursor: 'pointer', color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)', fontWeight: active ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, position: 'relative', whiteSpace: 'nowrap' }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {label}
      {badge > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800, marginInlineStart: 4 }}>{badge}</span>}
    </motion.button>
  );
});

/* ─── Stock Bar ─── */
const StockBar = memo(({ current, max, critical = 20 }) => {
  const pct = Math.min((current / max) * 100, 100);
  const color = pct <= critical ? '#ef4444' : pct <= 40 ? '#f59e0b' : '#22c55e';
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
          style={{ height: '100%', borderRadius: 3, background: color }} />
      </Box>
    </Box>
  );
});

/* ─── Item Card ─── */
const ItemCard = memo(({ item, onOrder }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pct = Math.min((item.stock / item.maxStock) * 100, 100);
  const statusColor = pct <= 20 ? '#ef4444' : pct <= 40 ? '#f59e0b' : '#22c55e';
  const statusLabel = pct <= 20 ? 'نفاد وشيك' : pct <= 40 ? 'منخفض' : 'متوفر';
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Glass sx={{ p: 2.5, height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${item.color}33` }}>{item.icon}</Box>
          <Chip label={statusLabel} size="small" sx={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`, fontWeight: 700, fontSize: 10 }} />
        </Box>
        <Typography variant="body2" fontWeight={700} mb={0.5} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{item.name}</Typography>
        <Typography variant="caption" mb={1.5} display="block" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{item.category} · {item.unit}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>المخزون</Typography>
          <Typography variant="caption" fontWeight={700} sx={{ color: statusColor }}>{item.stock} / {item.maxStock}</Typography>
        </Box>
        <StockBar current={item.stock} max={item.maxStock} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>انتهاء: {item.expiry}</Typography>
          {pct <= 40 && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onOrder(item)}
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 11 }}>
              طلب
            </motion.button>
          )}
        </Box>
      </Glass>
    </motion.div>
  );
});

/* ─── Supply Row ─── */
const SupplyRow = memo(({ item, onOrder }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pct = Math.min((item.stock / item.maxStock) * 100, 100);
  const statusColor = pct <= 20 ? '#ef4444' : pct <= 40 ? '#f59e0b' : '#22c55e';
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{item.name}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{item.sku}</Typography>
          </Box>
        </Box>
      </td>
      <td style={{ padding: '12px 16px' }}><Chip label={item.category} size="small" sx={{ background: `${item.color}22`, color: item.color, fontSize: 10 }} /></td>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ minWidth: 100 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: statusColor }}>{item.stock}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>/{item.maxStock}</Typography>
          </Box>
          <StockBar current={item.stock} max={item.maxStock} />
        </Box>
      </td>
      <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{item.expiry}</Typography></td>
      <td style={{ padding: '12px 16px' }}><Typography variant="body2" fontWeight={600} sx={{ color: '#10b981' }}>{item.price} ر.س</Typography></td>
      <td style={{ padding: '12px 16px' }}>
        <Tooltip title="طلب إعادة تعبئة">
          <IconButton size="small" onClick={() => onOrder(item)} sx={{ color: '#10b981', '&:hover': { background: '#10b98122' } }}>🛒</IconButton>
        </Tooltip>
      </td>
    </motion.tr>
  );
});

/* ─── Ring ─── */
const Ring = memo(({ value, max = 100, color, size = 80, label }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const r = 32; const circ = 2 * Math.PI * r; const pct = Math.min(value / max, 1);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth={8} />
          <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          <text x={40} y={45} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>{Math.round(pct * 100)}%</text>
        </svg>
      </Box>
      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', textAlign: 'center', fontSize: 10 }}>{label}</Typography>
    </Box>
  );
});

/* ─── DEMO DATA ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي الأصناف', value: '2,847', subtitle: 'صنف مسجّل', icon: '📦', gradient: 'linear-gradient(135deg,#10b981,#059669)', trend: 12 },
    { title: 'أصناف نقص وشيك', value: '43', subtitle: 'تحتاج إعادة طلب', icon: '⚠️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: -5, alert: true },
    { title: 'قيمة المخزون', value: '1.2M', subtitle: 'ريال سعودي', icon: '💰', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: 8 },
    { title: 'طلبات جارية', value: '18', subtitle: 'قيد التوريد', icon: '🚚', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: 3 },
    { title: 'منتهية الصلاحية', value: '7', subtitle: 'خلال 30 يوم', icon: '📅', gradient: 'linear-gradient(135deg,#ec4899,#db2777)', trend: -15, alert: true },
    { title: 'مستوى التغطية', value: '94%', subtitle: 'من الاحتياج الشهري', icon: '🎯', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 2 },
  ],
  items: [
    { id: 'INV-001', sku: 'MED-001', name: 'شاش طبي معقم', category: 'مستلزمات', icon: '🩹', color: '#06b6d4', stock: 120, maxStock: 500, unit: 'علبة', expiry: '12/2026', price: 45 },
    { id: 'INV-002', sku: 'MED-002', name: 'قفازات لاتكس', category: 'وقاية', icon: '🧤', color: '#6366f1', stock: 850, maxStock: 2000, unit: 'صندوق', expiry: '06/2027', price: 120 },
    { id: 'INV-003', sku: 'MED-003', name: 'محاقن 10 مل', category: 'أدوات طبية', icon: '💉', color: '#ef4444', stock: 45, maxStock: 500, unit: 'علبة', expiry: '03/2027', price: 80 },
    { id: 'INV-004', sku: 'PHY-001', name: 'جهاز ضغط الدم', category: 'أجهزة', icon: '🩺', color: '#10b981', stock: 8, maxStock: 20, unit: 'جهاز', expiry: 'لا ينتهي', price: 350 },
    { id: 'INV-005', sku: 'MED-004', name: 'محلول ملحي 0.9%', category: 'محاليل', icon: '🧪', color: '#f59e0b', stock: 200, maxStock: 800, unit: 'كيس', expiry: '09/2026', price: 25 },
    { id: 'INV-006', sku: 'REH-001', name: 'كرة علاج طبيعي', category: 'تأهيل', icon: '⚽', color: '#8b5cf6', stock: 15, maxStock: 50, unit: 'حبة', expiry: 'لا ينتهي', price: 180 },
    { id: 'INV-007', sku: 'MED-005', name: 'أشرطة لاصقة طبية', category: 'مستلزمات', icon: '🩹', color: '#ec4899', stock: 300, maxStock: 600, unit: 'لفة', expiry: '01/2028', price: 35 },
    { id: 'INV-008', sku: 'LAB-001', name: 'أنابيب تحليل دم', category: 'مختبر', icon: '🧬', color: '#06b6d4', stock: 60, maxStock: 400, unit: 'علبة', expiry: '11/2026', price: 95 },
  ],
  orders: [
    { id: 'ORD-001', supplier: 'مستلزمات الرياض', items: 8, total: '12,450', status: 'قيد الشحن', date: '28/03/2026', eta: '02/04/2026' },
    { id: 'ORD-002', supplier: 'مؤسسة الأمل الطبية', items: 3, total: '5,200', status: 'تم التأكيد', date: '27/03/2026', eta: '05/04/2026' },
    { id: 'ORD-003', supplier: 'شركة الصحة الذهبية', items: 12, total: '28,900', status: 'في الانتظار', date: '30/03/2026', eta: '10/04/2026' },
    { id: 'ORD-004', supplier: 'مستلزمات الخليج', items: 5, total: '8,700', status: 'تم التسليم', date: '20/03/2026', eta: '25/03/2026' },
  ],
  suppliers: [
    { name: 'مستلزمات الرياض', rating: 4.8, orders: 47, onTime: 96, color: '#10b981' },
    { name: 'شركة الصحة الذهبية', rating: 4.5, orders: 32, onTime: 91, color: '#6366f1' },
    { name: 'مؤسسة الأمل الطبية', rating: 4.2, orders: 28, onTime: 87, color: '#f59e0b' },
    { name: 'مستلزمات الخليج', rating: 4.6, orders: 19, onTime: 94, color: '#06b6d4' },
  ],
  categoryDist: [
    { label: 'مستلزمات', pct: 35, color: '#10b981' },
    { label: 'أدوية', pct: 22, color: '#6366f1' },
    { label: 'أجهزة', pct: 18, color: '#f59e0b' },
    { label: 'تأهيل', pct: 12, color: '#8b5cf6' },
    { label: 'مختبر', pct: 8, color: '#06b6d4' },
    { label: 'أخرى', pct: 5, color: '#ec4899' },
  ],
  gauges: [
    { label: 'كفاءة المخزون', value: 94, color: '#10b981' },
    { label: 'دقة الجرد', value: 98, color: '#6366f1' },
    { label: 'معدل التسليم', value: 92, color: '#f59e0b' },
    { label: 'تغطية الطلب', value: 87, color: '#06b6d4' },
  ],
  aiAlerts: [
    { icon: '⚠️', title: 'نقص وشيك', text: 'المحاقن 10 مل ستنفد خلال 5 أيام بناءً على معدل الاستهلاك الحالي. يُنصح بطلب 500 علبة فورًا.', color: '#ef4444', priority: 'عاجل' },
    { icon: '📅', title: 'انتهاء صلاحية', text: '7 أصناف ستنتهي صلاحيتها خلال 30 يومًا، منها محاليل ومستلزمات بقيمة إجمالية 8,400 ريال.', color: '#f59e0b', priority: 'تنبيه' },
    { icon: '💡', title: 'توصية ذكية', text: 'بناءً على نمط الاستهلاك، يُنصح بزيادة كميات الشاش الطبي بنسبة 30% قبل موسم الذروة.', color: '#6366f1', priority: 'اقتراح' },
    { icon: '📈', title: 'توقع الطلب', text: 'من المتوقع ارتفاع الطلب على مستلزمات التأهيل بنسبة 25% الشهر القادم بسبب افتتاح الجناح الجديد.', color: '#10b981', priority: 'معلومة' },
  ],
};

const TABS = [
  { label: 'نظرة عامة', icon: '📊', badge: 0 },
  { label: 'المخزون', icon: '📦', badge: 0 },
  { label: 'قائمة الأصناف', icon: '📋', badge: 0 },
  { label: 'طلبات التوريد', icon: '🚚', badge: 3 },
  { label: 'الموردون', icon: '🤝', badge: 0 },
  { label: 'تنبيهات ذكية', icon: '🤖', badge: 2 },
];

/* ═══════════════ MAIN ═══════════════ */
export default function InventoryDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('الكل');
  const [viewMode, setViewMode] = useState('cards');
  const [orderDialog, setOrderDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState('');

  const bg = isDark
    ? 'linear-gradient(135deg,#0a1a12 0%,#0f1a2e 50%,#0a120f 100%)'
    : 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 50%,#f0fdfa 100%)';
  const G = 'linear-gradient(135deg,#10b981,#059669)';

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { setData(DEMO); setLoading(false); }, 900);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const iv = setInterval(() => setRefresh(r => r + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const handleOrder = useCallback((item) => { setSelectedItem(item); setQty(''); setOrderDialog(true); }, []);

  const filtered = data?.items?.filter(it =>
    (catFilter === 'الكل' || it.category === catFilter) &&
    (it.name.includes(search) || it.sku.includes(search) || it.category.includes(search))
  ) || [];

  const lowStock = data?.items?.filter(it => (it.stock / it.maxStock) <= 0.4).length || 0;

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120 }}>
        <Glass sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px #10b98144' }}>📦</Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                إدارة المخزون والمستلزمات
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                نظام متكامل لمراقبة وإدارة المخزون الطبي
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {lowStock > 0 && (
              <Chip label={`⚠️ ${lowStock} صنف منخفض`} size="small" sx={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', fontWeight: 700 }} />
            )}
            <Chip label="● مباشر" size="small" sx={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', fontWeight: 700 }} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setRefresh(r => r + 1)}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'), borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: isDark ? '#fff' : '#000', fontSize: 13 }}>
              🔄 تحديث
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => { setSelectedItem(null); setOrderDialog(true); }}
              style={{ background: G, border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px #10b98144' }}>
              + طلب توريد
            </motion.button>
          </Box>
        </Glass>
      </motion.div>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} mb={3}>
        {(loading ? Array(6).fill(null) : data?.kpis || []).map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            {loading ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} /> : <KPICard {...kpi} delay={i * 0.07} />}
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map((t, i) => <TabBtn key={i} label={t.label} icon={t.icon} badge={t.badge} active={tab === i} onClick={() => setTab(i)} />)}
      </Glass>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

          {/* TAB 0: Overview */}
          {tab === 0 && !loading && (
            <Grid container spacing={3}>
              {/* Category Distribution */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🗂️ توزيع الأصناف</Typography>
                  {(data?.categoryDist || []).map((c, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{c.label}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: c.color }}>{c.pct}%</Typography>
                      </Box>
                      <Box sx={{ height: 7, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: i * 0.1, duration: 0.7 }}
                          style={{ height: '100%', borderRadius: 4, background: c.color }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>

              {/* Quality Gauges */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🎯 مؤشرات الأداء</Typography>
                  <Grid container spacing={2} justifyContent="center">
                    {(data?.gauges || []).map((g, i) => (
                      <Grid item xs={6} key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Ring value={g.value} color={g.color} label={g.label} size={85} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              {/* Recent Orders Summary */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🚚 آخر طلبات التوريد</Typography>
                  {(data?.orders || []).slice(0, 4).map((o, i) => {
                    const sc = o.status === 'تم التسليم' ? '#22c55e' : o.status === 'قيد الشحن' ? '#06b6d4' : o.status === 'تم التأكيد' ? '#6366f1' : '#f59e0b';
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{o.supplier}</Typography>
                            <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10 }}>{o.items} أصناف · {o.total} ر.س</Typography>
                          </Box>
                          <Chip label={o.status} size="small" sx={{ background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, fontSize: 9, height: 20 }} />
                        </Box>
                      </motion.div>
                    );
                  })}
                </Glass>
              </Grid>

              {/* Low Stock Alerts */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🔴 أصناف تحتاج إعادة طلب عاجل</Typography>
                  <Grid container spacing={2}>
                    {(data?.items || []).filter(it => (it.stock / it.maxStock) <= 0.4).map((item, i) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <ItemCard item={item} onOrder={handleOrder} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 1: Stock Cards */}
          {tab === 1 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField size="small" placeholder="بحث عن صنف..." value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ sx: { borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? '#fff' : '#000' } }} sx={{ minWidth: 200 }} />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                      sx={{ borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? '#fff' : '#000' }}>
                      {['الكل', 'مستلزمات', 'أدوات طبية', 'أجهزة', 'محاليل', 'تأهيل', 'مختبر', 'وقاية'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['cards', 'list'].map(m => (
                      <motion.button key={m} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewMode(m)}
                        style={{ background: viewMode === m ? G : 'transparent', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: viewMode === m ? '#fff' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 16 }}>
                        {m === 'cards' ? '⊞' : '☰'}
                      </motion.button>
                    ))}
                  </Box>
                </Box>
              </Grid>
              {viewMode === 'cards' ? (
                filtered.map((item, i) => (
                  <Grid item xs={12} sm={6} md={3} key={item.id}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <ItemCard item={item} onOrder={handleOrder} />
                    </motion.div>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Glass sx={{ p: 3, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                          {['الصنف', 'الفئة', 'المخزون', 'انتهاء الصلاحية', 'السعر', 'إجراء'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
{filtered.map((item, _i) => <SupplyRow key={item.id} item={item} onOrder={handleOrder} />)}
                        {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>لا توجد أصناف مطابقة</td></tr>}
                      </tbody>
                    </table>
                  </Glass>
                </Grid>
              )}
            </Grid>
          )}

          {/* TAB 2: All Items Table */}
          {tab === 2 && !loading && (
            <Glass sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📋 قائمة جميع الأصناف</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                      {['الصنف', 'الفئة', 'المخزون', 'الحد الأدنى', 'انتهاء الصلاحية', 'السعر', 'الحالة', 'إجراء'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items || []).map((item, i) => {
                      const pct = (item.stock / item.maxStock) * 100;
                      const sc = pct <= 20 ? '#ef4444' : pct <= 40 ? '#f59e0b' : '#22c55e';
                      const sl = pct <= 20 ? 'نفاد وشيك' : pct <= 40 ? 'منخفض' : 'متوفر';
                      return (
                        <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <span style={{ fontSize: 18 }}>{item.icon}</span>
                              <Box>
                                <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{item.name}</Typography>
                                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{item.sku}</Typography>
                              </Box>
                            </Box>
                          </td>
                          <td style={{ padding: '12px 16px' }}><Chip label={item.category} size="small" sx={{ background: `${item.color}22`, color: item.color, fontSize: 10 }} /></td>
                          <td style={{ padding: '12px 16px' }}><Typography variant="body2" fontWeight={700} sx={{ color: sc }}>{item.stock} {item.unit}</Typography></td>
                          <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{Math.round(item.maxStock * 0.2)} {item.unit}</Typography></td>
                          <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{item.expiry}</Typography></td>
                          <td style={{ padding: '12px 16px' }}><Typography variant="body2" fontWeight={600} sx={{ color: '#10b981' }}>{item.price} ر.س</Typography></td>
                          <td style={{ padding: '12px 16px' }}><Chip label={sl} size="small" sx={{ background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, fontWeight: 700, fontSize: 10 }} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <Tooltip title="طلب إعادة تعبئة">
                              <IconButton size="small" onClick={() => handleOrder(item)} sx={{ color: '#10b981' }}>🛒</IconButton>
                            </Tooltip>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            </Glass>
          )}

          {/* TAB 3: Orders */}
          {tab === 3 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🚚 طلبات التوريد الجارية</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                          {['رقم الطلب', 'المورد', 'الأصناف', 'الإجمالي', 'الحالة', 'تاريخ الطلب', 'موعد التسليم'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.orders || []).map((o, i) => {
                          const sc = o.status === 'تم التسليم' ? '#22c55e' : o.status === 'قيد الشحن' ? '#06b6d4' : o.status === 'تم التأكيد' ? '#6366f1' : '#f59e0b';
                          return (
                            <motion.tr key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                              style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                              <td style={{ padding: '14px 16px' }}><Typography variant="body2" fontWeight={700} sx={{ color: '#10b981' }}>{o.id}</Typography></td>
                              <td style={{ padding: '14px 16px' }}><Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{o.supplier}</Typography></td>
                              <td style={{ padding: '14px 16px' }}><Chip label={`${o.items} صنف`} size="small" sx={{ background: '#10b98122', color: '#10b981' }} /></td>
                              <td style={{ padding: '14px 16px' }}><Typography variant="body2" fontWeight={700} sx={{ color: '#f59e0b' }}>{o.total} ر.س</Typography></td>
                              <td style={{ padding: '14px 16px' }}><Chip label={o.status} size="small" sx={{ background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, fontWeight: 700, fontSize: 11 }} /></td>
                              <td style={{ padding: '14px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{o.date}</Typography></td>
                              <td style={{ padding: '14px 16px' }}><Typography variant="caption" fontWeight={600} sx={{ color: '#06b6d4' }}>{o.eta}</Typography></td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 4: Suppliers */}
          {tab === 4 && !loading && (
            <Grid container spacing={3}>
              {(data?.suppliers || []).map((s, i) => (
                <Grid item xs={12} md={6} key={i}>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Glass sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box sx={{ width: 50, height: 50, borderRadius: 2, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: `2px solid ${s.color}44` }}>🏭</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{s.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {Array(5).fill(null).map((_, si) => <span key={si} style={{ fontSize: 12, color: si < Math.floor(s.rating) ? '#f59e0b' : '#d1d5db' }}>★</span>)}
                            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, mr: 0.5 }}>{s.rating}</Typography>
                          </Box>
                        </Box>
                        <Chip label={`${s.orders} طلب`} size="small" sx={{ background: `${s.color}22`, color: s.color, fontWeight: 700 }} />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ p: 2, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                            <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.onTime}%</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>التسليم في الموعد</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ p: 2, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#f59e0b' }}>{s.orders}</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>إجمالي الطلبات</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>معدل الالتزام</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: s.color }}>{s.onTime}%</Typography>
                        </Box>
                        <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${s.onTime}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                            style={{ height: '100%', borderRadius: 4, background: s.color }} />
                        </Box>
                      </Box>
                    </Glass>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}

          {/* TAB 5: AI Alerts */}
          {tab === 5 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>تنبيهات الذكاء الاصطناعي للمخزون</Typography>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>تحليل ذكي لأنماط الاستهلاك والمخاطر</Typography>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    {(data?.aiAlerts || []).map((a, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2.5, borderRadius: 2, background: `${a.color}0d`, border: `1px solid ${a.color}33` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: 22 }}>{a.icon}</span>
                                <Typography variant="body2" fontWeight={700} sx={{ color: a.color }}>{a.title}</Typography>
                              </Box>
                              <Chip label={a.priority} size="small" sx={{ background: `${a.color}22`, color: a.color, fontSize: 9, height: 20, border: `1px solid ${a.color}44` }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', lineHeight: 1.7 }}>{a.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
              {/* Prediction */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 توقعات المخزون - الشهر القادم</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'الطلب المتوقع', value: '+15%', detail: 'بسبب افتتاح الجناح الجديد', icon: '📈', color: '#10b981' },
                      { label: 'توفير التكاليف', value: '12K ر.س', detail: 'بتحسين الطلبات', icon: '💰', color: '#f59e0b' },
                      { label: 'أصناف للتجديد', value: '43 صنف', detail: 'خلال 2 أسبوع', icon: '📦', color: '#ef4444' },
                      { label: 'مدة التغطية', value: '47 يوم', detail: 'بالمخزون الحالي', icon: '📅', color: '#6366f1' },
                    ].map((p, i) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2.5, borderRadius: 2, background: `${p.color}0d`, border: `1px solid ${p.color}33`, textAlign: 'center' }}>
                            <span style={{ fontSize: 28 }}>{p.icon}</span>
                            <Typography variant="h5" fontWeight={800} sx={{ color: p.color, mt: 1 }}>{p.value}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)', mt: 0.5 }}>{p.label}</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{p.detail}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {loading && (
            <Grid container spacing={3}>
              {Array(4).fill(null).map((_, i) => <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} /></Grid>)}
            </Grid>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Order Dialog ── */}
      <Dialog open={orderDialog} onClose={() => setOrderDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: isDark ? '#0d1a12' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 3, direction: 'rtl' } }}>
        <DialogTitle sx={{ background: G, color: '#fff', fontWeight: 700, borderRadius: '12px 12px 0 0' }}>
          🛒 {selectedItem ? `طلب: ${selectedItem.name}` : 'طلب توريد جديد'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {selectedItem && (
            <Box sx={{ p: 2, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 28 }}>{selectedItem.icon}</span>
              <Box>
                <Typography variant="body2" fontWeight={700}>{selectedItem.name}</Typography>
                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>المخزون الحالي: {selectedItem.stock} {selectedItem.unit} | السعر: {selectedItem.price} ر.س</Typography>
              </Box>
            </Box>
          )}
          <FormControl fullWidth size="small">
            <InputLabel sx={{ right: 14, left: 'auto', transformOrigin: 'right top' }}>المورد</InputLabel>
            <Select defaultValue="مستلزمات الرياض" label="المورد">
              {(DEMO.suppliers || []).map(s => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="الكمية المطلوبة" type="number" fullWidth size="small" value={qty} onChange={e => setQty(e.target.value)}
            InputLabelProps={{ sx: { right: 14, left: 'auto', transformOrigin: 'right top' } }} />
          <TextField label="ملاحظات" fullWidth size="small" multiline rows={2}
            InputLabelProps={{ sx: { right: 14, left: 'auto', transformOrigin: 'right top' } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOrderDialog(false)} sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button variant="contained" disabled={!qty} onClick={() => setOrderDialog(false)}
            sx={{ background: G, borderRadius: 2, fontWeight: 700 }}>
            ✅ تأكيد الطلب
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
