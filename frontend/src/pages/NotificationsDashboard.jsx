import { useState, useEffect, useCallback, memo } from 'react';

import { useTheme } from '@mui/material/styles';

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
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPos = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{ p: 3, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -20, insetInlineEnd: -20, width: 100, height: 100, borderRadius: '50%', background: gradient, opacity: 0.12 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</Box>
          <Chip label={`${isPos ? '+' : ''}${trend}%`} size="small" sx={{ background: isPos ? '#22c55e22' : '#ef444422', color: isPos ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 11 }} />
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
      style={{ background: active ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent', border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '8px 18px', cursor: 'pointer', color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)', fontWeight: active ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {label}
      {badge > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{badge}</span>}
    </motion.button>
  );
});

/* ─── Notification Item ─── */
const NotifItem = memo(({ notif, onRead, onDelete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const typeColors = {
    'تنبيه': '#ef4444', 'تحذير': '#f59e0b', 'معلومة': '#06b6d4',
    'نجاح': '#22c55e', 'نظام': '#6366f1', 'أمان': '#ec4899'
  };
  const color = typeColors[notif.type] || '#6366f1';
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ scale: 1.005 }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 2, p: 2.5, mb: 1.5,
        borderRadius: 2,
        background: notif.read
          ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
          : (isDark ? `${color}0d` : `${color}08`),
        border: `1px solid ${notif.read ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : `${color}33`}`,
        position: 'relative',
        transition: 'all 0.2s'
      }}>
        {!notif.read && (
          <Box sx={{ position: 'absolute', top: 12, insetInlineEnd: 12, width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 0 3px ${color}33` }} />
        )}
        <Box sx={{ width: 42, height: 42, borderRadius: 2, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: `1px solid ${color}33`, flexShrink: 0 }}>{notif.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{notif.title}</Typography>
            <Chip label={notif.type} size="small" sx={{ background: `${color}22`, color, fontSize: 9, height: 18 }} />
            {notif.priority === 'عاجل' && <Chip label="🔴 عاجل" size="small" sx={{ background: '#ef444422', color: '#ef4444', fontSize: 9, height: 18 }} />}
          </Box>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', lineHeight: 1.6, mb: 0.5 }}>{notif.message}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>🕒 {notif.time}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>· {notif.source}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
          {!notif.read && <Tooltip title="تعليم كمقروء"><IconButton size="small" onClick={() => onRead(notif.id)} sx={{ color: '#22c55e', p: 0.5 }}>✓</IconButton></Tooltip>}
          <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(notif.id)} sx={{ color: '#ef4444', p: 0.5 }}>🗑</IconButton></Tooltip>
        </Box>
      </Box>
    </motion.div>
  );
});

/* ─── Channel Card ─── */
const ChannelCard = memo(({ channel }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [enabled, setEnabled] = useState(channel.enabled);
  return (
    <Glass sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: 2, background: `${channel.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${channel.color}33` }}>{channel.icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{channel.name}</Typography>
          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{channel.desc}</Typography>
        </Box>
        <Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} size="small"
          sx={{ '& .MuiSwitch-thumb': { background: channel.color }, '& .Mui-checked + .MuiSwitch-track': { background: `${channel.color}88` } }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={`${channel.sent} مُرسَل`} size="small" sx={{ background: `${channel.color}22`, color: channel.color, fontSize: 10 }} />
        <Chip label={`${channel.delivered}% وصل`} size="small" sx={{ background: '#22c55e22', color: '#22c55e', fontSize: 10 }} />
      </Box>
    </Glass>
  );
});

/* ─── DEMO DATA ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي الإشعارات', value: '3,842', subtitle: 'هذا الشهر', icon: '🔔', gradient: 'linear-gradient(135deg,#f97316,#ea580c)', trend: 15 },
    { title: 'غير مقروءة', value: '47', subtitle: 'تنتظر المراجعة', icon: '📬', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: -8 },
    { title: 'معدل القراءة', value: '94%', subtitle: 'من الإجمالي', icon: '👁️', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 3 },
    { title: 'تنبيهات عاجلة', value: '12', subtitle: 'تحتاج استجابة', icon: '🚨', gradient: 'linear-gradient(135deg,#ec4899,#db2777)', trend: -12 },
    { title: 'قنوات نشطة', value: '6', subtitle: 'WhatsApp، Email، SMS...', icon: '📡', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: 0 },
    { title: 'المستخدمون المشتركون', value: '521', subtitle: 'من 620 موظف', icon: '👥', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 5 },
  ],
  notifications: [
    { id: 1, title: 'انتهاء صلاحية دواء', message: 'محلول ملحي 0.9% سينتهي خلال 30 يومًا. يرجى مراجعة المخزون واتخاذ الإجراء اللازم.', type: 'تنبيه', icon: '💊', source: 'نظام المخزون', time: 'منذ 5 دقائق', read: false, priority: 'عاجل' },
    { id: 2, title: 'موعد مريض جديد', message: 'تم حجز موعد للمريض: أحمد الحارثي - الدكتور محمد العمري - 2026/04/01 الساعة 10:00', type: 'معلومة', icon: '🗓️', source: 'نظام الجدولة', time: 'منذ 12 دقيقة', read: false, priority: 'عادي' },
    { id: 3, title: 'تقرير مالي جاهز', message: 'تم إنشاء التقرير المالي الشهري لمارس 2026. يمكنك الاطلاع عليه الآن.', type: 'نجاح', icon: '📊', source: 'نظام التقارير', time: 'منذ 25 دقيقة', read: false, priority: 'عادي' },
    { id: 4, title: 'محاولة دخول مشبوهة', message: 'تم رصد محاولة تسجيل دخول فاشلة متكررة من IP: 192.168.1.45 للمستخدم: admin', type: 'أمان', icon: '🔐', source: 'نظام الأمان', time: 'منذ 1 ساعة', read: false, priority: 'عاجل' },
    { id: 5, title: 'إضافة موظف جديد', message: 'تم إضافة الموظف نورة الزهراني إلى قسم التمريض برقم الموظف: EMP-2847', type: 'نجاح', icon: '👤', source: 'نظام HR', time: 'منذ 2 ساعة', read: true, priority: 'عادي' },
    { id: 6, title: 'تحديث النظام', message: 'سيتم إجراء صيانة مجدولة للنظام يوم الجمعة 03/04/2026 من 02:00 - 04:00 صباحًا.', type: 'نظام', icon: '⚙️', source: 'فريق IT', time: 'منذ 3 ساعات', read: true, priority: 'عادي' },
    { id: 7, title: 'طلب إجازة', message: 'قدّم د. خالد العمري طلب إجازة سنوية من 05/04 حتى 12/04/2026. بانتظار الموافقة.', type: 'تحذير', icon: '🏖️', source: 'نظام HR', time: 'منذ 5 ساعات', read: true, priority: 'عادي' },
    { id: 8, title: 'مخزون منخفض', message: 'وصل مخزون المحاقن 10 مل إلى 9% من الطاقة القصوى. يُنصح بطلب إعادة تعبئة فوري.', type: 'تنبيه', icon: '📦', source: 'نظام المخزون', time: 'منذ 6 ساعات', read: false, priority: 'عاجل' },
  ],
  channels: [
    { name: 'واتساب', icon: '💬', color: '#22c55e', desc: 'إشعارات فورية عبر واتساب', enabled: true, sent: 1842, delivered: 98 },
    { name: 'البريد الإلكتروني', icon: '📧', color: '#6366f1', desc: 'رسائل تفصيلية بالبريد', enabled: true, sent: 2341, delivered: 95 },
    { name: 'SMS', icon: '📱', color: '#f59e0b', desc: 'رسائل نصية قصيرة', enabled: true, sent: 967, delivered: 99 },
    { name: 'إشعارات التطبيق', icon: '🔔', color: '#06b6d4', desc: 'Push notifications', enabled: true, sent: 3421, delivered: 87 },
    { name: 'Slack', icon: '💼', color: '#8b5cf6', desc: 'إشعارات قناة العمل', enabled: false, sent: 234, delivered: 100 },
    { name: 'الفاكس', icon: '📠', color: '#ec4899', desc: 'إشعارات طارئة فقط', enabled: false, sent: 12, delivered: 100 },
  ],
  templates: [
    { name: 'تنبيه موعد المريض', type: 'جدولة', channel: 'واتساب + SMS', trigger: 'قبل 24 ساعة', status: 'نشط', icon: '🗓️' },
    { name: 'تقرير يومي للإدارة', type: 'تقارير', channel: 'بريد إلكتروني', trigger: 'يوميًا 08:00', status: 'نشط', icon: '📊' },
    { name: 'تنبيه مخزون منخفض', type: 'مخزون', channel: 'واتساب', trigger: 'عند النقص', status: 'نشط', icon: '📦' },
    { name: 'تحذير أمني', type: 'أمان', channel: 'جميع القنوات', trigger: 'فوري', status: 'نشط', icon: '🔐' },
    { name: 'موعد صيانة النظام', type: 'نظام', channel: 'بريد إلكتروني', trigger: 'قبل 48 ساعة', status: 'غير نشط', icon: '⚙️' },
  ],
  stats: [
    { label: 'واتساب', pct: 48, color: '#22c55e', count: 1842 },
    { label: 'التطبيق', pct: 35, color: '#06b6d4', count: 1342 },
    { label: 'بريد', pct: 12, color: '#6366f1', count: 461 },
    { label: 'SMS', pct: 5, color: '#f59e0b', count: 197 },
  ],
};

const TABS = [
  { label: 'الكل', icon: '🔔', badge: 4 },
  { label: 'غير مقروءة', icon: '📬', badge: 4 },
  { label: 'قنوات الإرسال', icon: '📡', badge: 0 },
  { label: 'القوالب', icon: '📝', badge: 0 },
  { label: 'الإحصائيات', icon: '📊', badge: 0 },
  { label: 'الإعدادات', icon: '⚙️', badge: 0 },
];

/* ═══════════════ MAIN ═══════════════ */
export default function NotificationsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [sendDialog, setSendDialog] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'معلومة', channel: 'واتساب' });

  const bg = isDark
    ? 'linear-gradient(135deg,#1a0f05 0%,#1a0a0a 50%,#0f0a1a 100%)'
    : 'linear-gradient(135deg,#fff7ed 0%,#fff1dc 50%,#fef3c7 100%)';
  const G = 'linear-gradient(135deg,#f97316,#ea580c)';

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { setData(DEMO); setLoading(false); }, 800);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const iv = setInterval(() => setRefresh(r => r + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const handleRead = useCallback((id) => {
    setData(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  }, []);

  const handleDelete = useCallback((id) => {
    setData(prev => ({ ...prev, notifications: prev.notifications.filter(n => n.id !== id) }));
  }, []);

  const handleReadAll = useCallback(() => {
    setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({ ...n, read: true })) }));
  }, []);

  const unread = data?.notifications?.filter(n => !n.read) || [];
  const filtered = (tab === 1 ? unread : data?.notifications || [])
    .filter(n => typeFilter === 'الكل' || n.type === typeFilter);

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120 }}>
        <Glass sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px #f9731644', position: 'relative' }}>
              🔔
              {unread.length > 0 && !loading && <Box sx={{ position: 'absolute', top: -4, insetInlineEnd: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>{unread.length}</Box>}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                مركز الإشعارات والتنبيهات
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                إدارة شاملة لجميع إشعارات المنظومة
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {!loading && unread.length > 0 && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={handleReadAll}
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'), borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: isDark ? '#fff' : '#000', fontSize: 12 }}>
                ✓ تعليم الكل كمقروء
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setRefresh(r => r + 1)}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'), borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: isDark ? '#fff' : '#000', fontSize: 13 }}>
              🔄 تحديث
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setSendDialog(true)}
              style={{ background: G, border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px #f9731644' }}>
              + إرسال إشعار
            </motion.button>
          </Box>
        </Glass>
      </motion.div>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {(loading ? Array(6).fill(null) : data?.kpis || []).map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            {loading ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} /> : <KPICard {...kpi} delay={i * 0.07} />}
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map((t, i) => <TabBtn key={i} label={t.label} icon={t.icon} badge={t.badge} active={tab === i} onClick={() => setTab(i)} />)}
      </Glass>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

          {/* TAB 0 & 1: Notifications List */}
          {(tab === 0 || tab === 1) && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ flex: 1, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>
                      {tab === 1 ? '📬 غير المقروءة' : '🔔 جميع الإشعارات'}
                      <Chip label={filtered.length} size="small" sx={{ mr: 1, background: '#f9731622', color: '#f97316', fontWeight: 700, fontSize: 11 }} />
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        sx={{ borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? '#fff' : '#000' }}>
                        {['الكل', 'تنبيه', 'تحذير', 'معلومة', 'نجاح', 'نظام', 'أمان'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <AnimatePresence>
                    {filtered.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="h2">🎉</Typography>
                        <Typography variant="body1" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mt: 1 }}>لا توجد إشعارات!</Typography>
                      </Box>
                    ) : (
                      filtered.map(n => <NotifItem key={n.id} notif={n} onRead={handleRead} onDelete={handleDelete} />)
                    )}
                  </AnimatePresence>
                </Glass>
              </Grid>
              {/* Side panel */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Glass sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 توزيع حسب النوع</Typography>
                    {[
                      { label: 'تنبيهات', count: 14, color: '#ef4444' },
                      { label: 'معلومات', count: 23, color: '#06b6d4' },
                      { label: 'نجاح', count: 18, color: '#22c55e' },
                      { label: 'أمان', count: 5, color: '#ec4899' },
                      { label: 'نظام', count: 9, color: '#6366f1' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <Typography variant="caption" fontWeight={600} sx={{ flex: 1, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}>{s.label}</Typography>
                        <Box sx={{ flex: 2, height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / 23) * 100}%` }} transition={{ delay: i * 0.1, duration: 0.7 }}
                            style={{ height: '100%', borderRadius: 3, background: s.color }} />
                        </Box>
                        <Typography variant="caption" fontWeight={700} sx={{ color: s.color, minWidth: 24, textAlign: 'right' }}>{s.count}</Typography>
                      </Box>
                    ))}
                  </Glass>
                  <Glass sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>⚡ الإشعارات العاجلة</Typography>
                    {(data?.notifications || []).filter(n => n.priority === 'عاجل').map((n, i) => (
                      <Box key={i} sx={{ p: 1.5, mb: 1, borderRadius: 2, background: '#ef444411', border: '1px solid #ef444433' }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                          <span style={{ fontSize: 16 }}>{n.icon}</span>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#ef4444' }}>{n.title}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontSize: 10 }}>{n.time}</Typography>
                      </Box>
                    ))}
                  </Glass>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: Channels */}
          {tab === 2 && !loading && (
            <Grid container spacing={3}>
              {(data?.channels || []).map((ch, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <ChannelCard channel={ch} />
                  </motion.div>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 أداء القنوات</Typography>
                  {(data?.stats || []).map((s, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{s.label}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: s.color }}>{s.count.toLocaleString()} إشعار ({s.pct}%)</Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ delay: i * 0.1, duration: 0.8 }}
                          style={{ height: '100%', borderRadius: 4, background: s.color }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 3: Templates */}
          {tab === 3 && !loading && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📝 قوالب الإشعارات</Typography>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{ background: G, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 12 }}>
                  + قالب جديد
                </motion.button>
              </Box>
              {(data?.templates || []).map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{t.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>📡 {t.channel}</Typography>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>· ⏰ {t.trigger}</Typography>
                      </Box>
                    </Box>
                    <Chip label={t.type} size="small" sx={{ background: '#f9731622', color: '#f97316', fontSize: 10 }} />
                    <Chip label={t.status} size="small" sx={{ background: t.status === 'نشط' ? '#22c55e22' : '#94a3b822', color: t.status === 'نشط' ? '#22c55e' : '#94a3b8', fontWeight: 700, fontSize: 10 }} />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" sx={{ color: '#6366f1' }}>✏️</IconButton>
                      <IconButton size="small" sx={{ color: '#ef4444' }}>🗑</IconButton>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </Glass>
          )}

          {/* TAB 4: Stats */}
          {tab === 4 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📈 إحصائيات الأسبوع</Typography>
                  {[
                    { day: 'الأحد', sent: 187, read: 175 },
                    { day: 'الاثنين', sent: 243, read: 231 },
                    { day: 'الثلاثاء', sent: 198, read: 189 },
                    { day: 'الأربعاء', sent: 312, read: 298 },
                    { day: 'الخميس', sent: 276, read: 261 },
                    { day: 'الجمعة', sent: 134, read: 127 },
                    { day: 'السبت', sent: 98, read: 94 },
                  ].map((d, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ minWidth: 60, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>{d.day}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden', mb: 0.5 }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(d.sent / 312) * 100}%` }} transition={{ delay: i * 0.07, duration: 0.7 }}
                            style={{ height: '100%', borderRadius: 4, background: '#f97316' }} />
                        </Box>
                        <Box sx={{ height: 5, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(d.read / 312) * 100}%` }} transition={{ delay: i * 0.07 + 0.1, duration: 0.7 }}
                            style={{ height: '100%', borderRadius: 4, background: '#22c55e' }} />
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'left', minWidth: 60 }}>
                        <Typography variant="caption" sx={{ color: '#f97316', fontWeight: 700 }}>{d.sent}</Typography>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}> / </Typography>
                        <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700 }}>{d.read}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 8, borderRadius: 2, background: '#f97316' }} /><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>مُرسَل</Typography></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 5, borderRadius: 2, background: '#22c55e' }} /><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>مقروء</Typography></Box>
                  </Box>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🏆 ملخص الأداء الشهري</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'إجمالي المُرسَل', value: '3,842', icon: '📤', color: '#f97316' },
                      { label: 'معدل الوصول', value: '97.3%', icon: '✅', color: '#22c55e' },
                      { label: 'معدل القراءة', value: '94.1%', icon: '👁️', color: '#6366f1' },
                      { label: 'متوسط وقت القراءة', value: '4.2 دق', icon: '⏱️', color: '#f59e0b' },
                      { label: 'إشعارات عاجلة', value: '12', icon: '🚨', color: '#ef4444' },
                      { label: 'اشتراكات جديدة', value: '+34', icon: '🔔', color: '#06b6d4' },
                    ].map((m, i) => (
                      <Grid item xs={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                          <Box sx={{ p: 2, borderRadius: 2, background: `${m.color}11`, border: `1px solid ${m.color}22`, textAlign: 'center' }}>
                            <span style={{ fontSize: 24 }}>{m.icon}</span>
                            <Typography variant="h6" fontWeight={800} sx={{ color: m.color, mt: 0.5 }}>{m.value}</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: 10 }}>{m.label}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 5: Settings */}
          {tab === 5 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>⚙️ إعدادات الإشعارات</Typography>
                  {[
                    { label: 'تنبيهات المخزون المنخفض', desc: 'إشعار عند وصول مخزون لأقل من 20%', enabled: true },
                    { label: 'إشعارات المواعيد', desc: 'تذكير قبل موعد المريض بـ 24 ساعة', enabled: true },
                    { label: 'تقارير يومية تلقائية', desc: 'إرسال ملخص يومي للمديرين', enabled: true },
                    { label: 'تنبيهات الأمان', desc: 'إشعار فوري عند اكتشاف تهديد أمني', enabled: true },
                    { label: 'إشعارات HR', desc: 'طلبات الإجازة وانتهاء العقود', enabled: false },
                    { label: 'تنبيهات الصيانة', desc: 'إشعار قبل عمليات الصيانة', enabled: false },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, mb: 1, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{s.label}</Typography>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{s.desc}</Typography>
                      </Box>
                      <Switch defaultChecked={s.enabled} size="small"
                        sx={{ '& .Mui-checked + .MuiSwitch-track': { background: '#f9731688' }, '& .Mui-checked .MuiSwitch-thumb': { background: '#f97316' } }} />
                    </Box>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🕒 ساعات الإشعارات</Typography>
                  {[
                    { label: 'الإشعارات العاجلة', from: '00:00', to: '23:59', color: '#ef4444' },
                    { label: 'الإشعارات المهمة', from: '07:00', to: '22:00', color: '#f59e0b' },
                    { label: 'الإشعارات العادية', from: '08:00', to: '18:00', color: '#22c55e' },
                  ].map((h, i) => (
                    <Box key={i} sx={{ p: 2, mb: 1.5, borderRadius: 2, background: `${h.color}0d`, border: `1px solid ${h.color}22` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: h.color }}>{h.label}</Typography>
                        <Chip label={`${h.from} - ${h.to}`} size="small" sx={{ background: `${h.color}22`, color: h.color, fontWeight: 700, fontSize: 11 }} />
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ mt: 3, p: 2, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <Typography variant="body2" fontWeight={700} mb={1} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>🌙 وضع عدم الإزعاج</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>من 23:00 حتى 07:00</Typography>
                      <Switch size="small" sx={{ '& .Mui-checked + .MuiSwitch-track': { background: '#6366f188' }, '& .Mui-checked .MuiSwitch-thumb': { background: '#6366f1' } }} />
                    </Box>
                  </Box>
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

      {/* Send Dialog */}
      <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: isDark ? '#1a0f05' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 3, direction: 'rtl' } }}>
        <DialogTitle sx={{ background: G, color: '#fff', fontWeight: 700, borderRadius: '12px 12px 0 0' }}>
          🔔 إرسال إشعار جديد
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="عنوان الإشعار" fullWidth value={newNotif.title} onChange={e => setNewNotif(p => ({ ...p, title: e.target.value }))}
            InputLabelProps={{ sx: { right: 14, left: 'auto', transformOrigin: 'right top' } }} />
          <TextField label="نص الإشعار" fullWidth multiline rows={3} value={newNotif.message} onChange={e => setNewNotif(p => ({ ...p, message: e.target.value }))}
            InputLabelProps={{ sx: { right: 14, left: 'auto', transformOrigin: 'right top' } }} />
          <FormControl fullWidth>
            <Select value={newNotif.type} onChange={e => setNewNotif(p => ({ ...p, type: e.target.value }))}>
              {['تنبيه', 'تحذير', 'معلومة', 'نجاح', 'نظام', 'أمان'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <Select value={newNotif.channel} onChange={e => setNewNotif(p => ({ ...p, channel: e.target.value }))}>
              {['واتساب', 'بريد إلكتروني', 'SMS', 'إشعارات التطبيق', 'جميع القنوات'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setSendDialog(false)} sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button variant="contained" disabled={!newNotif.title || !newNotif.message} onClick={() => setSendDialog(false)}
            sx={{ background: G, borderRadius: 2, fontWeight: 700 }}>
            📤 إرسال الآن
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
