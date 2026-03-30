/**
 * PatientsDashboard.jsx — لوحة إدارة المرضى المتقدمة
 * تصميم Glassmorphism بريميوم | Framer Motion | RTL | Dark/Light
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Avatar, Chip, LinearProgress,
  Skeleton, Tooltip, IconButton, Badge, Divider,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, useTheme, alpha,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HealingIcon from '@mui/icons-material/Healing';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

/* ─── Glass ─── */
const Glass = memo(({ children, sx = {}, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: 3,
      ...sx,
    }} {...rest}>{children}</Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const up = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{
        p: 2.5, height: '100%', position: 'relative', overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px ${alpha(theme.palette.common.black, .15)}` },
      }}>
        <Box sx={{ position: 'absolute', insetInlineEnd: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: gradient, opacity: .12 }} />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{icon}</Box>
          <Chip size="small"
            icon={up ? <TrendingUpIcon sx={{ fontSize: 13 }} /> : <TrendingDownIcon sx={{ fontSize: 13 }} />}
            label={`${up ? '+' : ''}${trend}%`}
            sx={{ background: alpha(up ? '#22c55e' : '#ef4444', .15), color: up ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 11 }}
          />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</Typography>
        <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, count }) => {
  const theme = useTheme();
  return (
    <motion.button onClick={onClick} whileTap={{ scale: .96 }} style={{
      background: active ? 'linear-gradient(135deg,#06b6d4,#0891b2)' : 'transparent',
      color: active ? '#fff' : theme.palette.text.secondary,
      border: active ? 'none' : `1px solid ${alpha(theme.palette.divider, .5)}`,
      borderRadius: 10, padding: '7px 16px', cursor: 'pointer',
      fontWeight: active ? 700 : 500, fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
    }}>
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ background: active ? 'rgba(255,255,255,.25)' : alpha('#06b6d4', .15), borderRadius: 10, px: .8, py: .1, fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#06b6d4' }}>{count}</Box>
      )}
    </motion.button>
  );
});

/* ─── Patient Card ─── */
const PatientCard = memo(({ name, id, age, condition, status, progress, branch, lastVisit, delay = 0 }) => {
  const theme = useTheme();
  const statusColors = { نشط: '#22c55e', مكتمل: '#6366f1', معلق: '#f59e0b', طارئ: '#ef4444', 'في الانتظار': '#06b6d4' };
  const c = statusColors[status] || '#6366f1';
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring' }}>
      <Glass sx={{ p: 2.5, height: '100%', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 32px ${alpha(c, .15)}` } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg,${c},${c}88)`, fontWeight: 700, fontSize: 16 }}>{name.charAt(0)}</Avatar>
            <Box>
              <Typography variant="body1" fontWeight={700}>{name}</Typography>
              <Typography variant="caption" color="text.secondary">{id} · {age} سنة</Typography>
            </Box>
          </Box>
          <Chip size="small" label={status} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
        </Box>

        <Box sx={{ p: 1.5, background: alpha(c, .07), borderRadius: 2, mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block">الحالة:</Typography>
          <Typography variant="body2" fontWeight={600}>{condition}</Typography>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
            <Typography variant="caption" color="text.secondary">تقدم العلاج</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: c }}>{progress}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress}
            sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${c},${c}99)` } }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
            <LocalHospitalIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{branch}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
            <EventNoteIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{lastVisit}</Typography>
          </Box>
        </Box>
      </Glass>
    </motion.div>
  );
});

/* ─── Patient Row ─── */
const PatientRow = memo(({ name, id, age, condition, status, progress, branch }) => {
  const theme = useTheme();
  const statusColors = { نشط: '#22c55e', مكتمل: '#6366f1', معلق: '#f59e0b', طارئ: '#ef4444', 'في الانتظار': '#06b6d4' };
  const c = statusColors[status] || '#6366f1';
  return (
    <TableRow sx={{ '&:hover': { background: alpha(theme.palette.primary.main, .04) }, transition: 'background .2s' }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg,${c},${c}88)`, fontSize: 13, fontWeight: 700 }}>{name.charAt(0)}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{name}</Typography>
            <Typography variant="caption" color="text.secondary">{id}</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell><Typography variant="body2">{age} سنة</Typography></TableCell>
      <TableCell><Typography variant="body2" fontWeight={500}>{condition}</Typography></TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ width: 60, height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: c } }} />
          <Typography variant="caption" fontWeight={700}>{progress}%</Typography>
        </Box>
      </TableCell>
      <TableCell><Chip size="small" label={status} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} /></TableCell>
      <TableCell><Typography variant="caption" color="text.secondary">{branch}</Typography></TableCell>
    </TableRow>
  );
});

/* ─── Alert Item ─── */
const AlertItem = memo(({ type, msg, patient, time }) => {
  const theme = useTheme();
  const colors = { critical: '#ef4444', warning: '#f59e0b', info: '#06b6d4', success: '#22c55e' };
  const c = colors[type] || colors.info;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderInlineStart: `3px solid ${c}`, background: alpha(c, .06), borderRadius: '0 8px 8px 0', mb: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>{msg}</Typography>
        <Typography variant="caption" color="text.secondary">{patient} · {time}</Typography>
      </Box>
      <Chip size="small" label={type === 'critical' ? 'عاجل' : type === 'warning' ? 'تنبيه' : type === 'success' ? 'إنجاز' : 'معلومة'}
        sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
    </Box>
  );
});

/* ─── Ring Gauge ─── */
const RingGauge = memo(({ value, max = 100, color, label, size = 80 }) => {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / max, 1) * circ;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
        <text x="40" y="45" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">{Math.round((value / max) * 100)}%</text>
      </svg>
      <Typography variant="caption" color="text.secondary" fontWeight={600} textAlign="center">{label}</Typography>
    </Box>
  );
});

/* ─── Appointment Row ─── */
const AppointmentRow = memo(({ patient, doctor, time, type, status }) => {
  const theme = useTheme();
  const statusColors = { مؤكد: '#22c55e', معلق: '#f59e0b', ملغى: '#ef4444', مكتمل: '#6366f1' };
  const c = statusColors[status] || '#06b6d4';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, background: alpha(c, .05), borderRadius: 2, mb: 1, border: `1px solid ${alpha(c, .12)}` }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `linear-gradient(135deg,${c},${c}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
        <EventNoteIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={700}>{patient}</Typography>
        <Typography variant="caption" color="text.secondary">{doctor} · {type}</Typography>
      </Box>
      <Box sx={{ textAlign: 'left' }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: c }}>{time}</Typography>
        <Chip size="small" label={status} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10, mt: .3 }} />
      </Box>
    </Box>
  );
});

/* ─── Demo Data ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي المرضى', value: '12,840', subtitle: 'في جميع الفروع', icon: <MedicalServicesIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 8.7 },
    { title: 'مرضى جدد', value: '284', subtitle: 'هذا الشهر', icon: <PersonAddIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 12.4 },
    { title: 'جلسات اليوم', value: '148', subtitle: 'مجدولة', icon: <HealingIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', trend: 5.2 },
    { title: 'معدل التعافي', value: '87%', subtitle: 'هذا الربع', icon: <AccessibilityNewIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: 3.8 },
    { title: 'رضا المرضى', value: '94%', subtitle: 'تقييمات الشهر', icon: <StarIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ec4899,#be185d)', trend: 2.1 },
    { title: 'حالات طارئة', value: '6', subtitle: 'اليوم', icon: <FavoriteIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: -33.3 },
  ],
  patients: [
    { name: 'محمد الزهراني', id: 'P-10421', age: 45, condition: 'إصابة في الركبة - تأهيل ما بعد الجراحة', status: 'نشط', progress: 72, branch: 'الرياض', lastVisit: 'اليوم' },
    { name: 'فاطمة العمري', id: 'P-10420', age: 32, condition: 'آلام الظهر المزمنة', status: 'نشط', progress: 55, branch: 'جدة', lastVisit: 'أمس' },
    { name: 'خالد الحربي', id: 'P-10419', age: 58, condition: 'السكتة الدماغية - تأهيل حركي', status: 'طارئ', progress: 30, branch: 'الرياض', lastVisit: 'اليوم' },
    { name: 'نورا السبيعي', id: 'P-10418', age: 28, condition: 'تمزق الأربطة', status: 'مكتمل', progress: 100, branch: 'الدمام', lastVisit: '2026-03-20' },
    { name: 'عبدالله المطيري', id: 'P-10417', age: 67, condition: 'التهاب المفاصل', status: 'نشط', progress: 45, branch: 'مكة', lastVisit: '2026-03-28' },
    { name: 'سارة القرني', id: 'P-10416', age: 19, condition: 'كسر في الساق - تأهيل', status: 'في الانتظار', progress: 15, branch: 'الرياض', lastVisit: '2026-03-29' },
    { name: 'أحمد الشهري', id: 'P-10415', age: 41, condition: 'ضعف العضلات', status: 'نشط', progress: 60, branch: 'جدة', lastVisit: 'اليوم' },
    { name: 'هيا الدوسري', id: 'P-10414', age: 54, condition: 'إصابة في العمود الفقري', status: 'معلق', progress: 35, branch: 'المدينة', lastVisit: '2026-03-15' },
  ],
  appointments: [
    { patient: 'محمد الزهراني', doctor: 'د. سمر الأحمد', time: '09:00 ص', type: 'جلسة تأهيل', status: 'مؤكد' },
    { patient: 'فاطمة العمري', doctor: 'د. وليد الشمري', time: '10:30 ص', type: 'مراجعة دورية', status: 'مؤكد' },
    { patient: 'أحمد الشهري', doctor: 'د. سمر الأحمد', time: '11:00 ص', type: 'جلسة تأهيل', status: 'معلق' },
    { patient: 'هيا الدوسري', doctor: 'د. ناصر العتيبي', time: '01:30 م', type: 'تقييم أولي', status: 'مؤكد' },
    { patient: 'سارة القرني', doctor: 'د. وليد الشمري', time: '03:00 م', type: 'جلسة تأهيل', status: 'ملغى' },
    { patient: 'عبدالله المطيري', doctor: 'د. ناصر العتيبي', time: '04:30 م', type: 'مراجعة شهرية', status: 'مكتمل' },
  ],
  alerts: [
    { type: 'critical', msg: 'المريض خالد الحربي يحتاج مراجعة طارئة', patient: 'P-10419', time: 'الآن' },
    { type: 'warning', msg: 'المريضة هيا الدوسري لم تحضر جلستين متتاليتين', patient: 'P-10414', time: 'منذ ساعة' },
    { type: 'warning', msg: 'تجاوز 4 مرضى مدة العلاج المخططة', patient: 'أقسام متعددة', time: 'اليوم' },
    { type: 'success', msg: 'اكتمال علاج المريضة نورا السبيعي بنجاح', patient: 'P-10418', time: 'أمس' },
    { type: 'info', msg: 'مراجعة شهرية لـ 24 مريضاً مجدولة الأسبوع القادم', patient: 'متعدد', time: 'تذكير' },
  ],
  conditionDist: [
    { name: 'إصابات العظام والمفاصل', count: 3840, color: '#06b6d4' },
    { name: 'إعادة تأهيل ما بعد الجراحة', count: 2560, color: '#6366f1' },
    { name: 'أمراض مزمنة', count: 2180, color: '#f59e0b' },
    { name: 'الجهاز العصبي', count: 1920, color: '#ef4444' },
    { name: 'الأطراف الصناعية', count: 1440, color: '#22c55e' },
    { name: 'أخرى', count: 900, color: '#ec4899' },
  ],
  recoveryRings: [
    { label: 'معدل التعافي', value: 87, color: '#22c55e' },
    { label: 'الرضا', value: 94, color: '#06b6d4' },
    { label: 'الالتزام', value: 78, color: '#6366f1' },
    { label: 'جودة الخدمة', value: 91, color: '#f59e0b' },
  ],
  aiInsights: [
    { icon: '🧬', text: 'المرضى الذين يلتزمون بجدول الجلسات يحققون تعافياً أسرع بنسبة 34% مقارنة بمن يتغيبون.' },
    { icon: '⚠️', text: 'ارتفاع ملحوظ في إصابات الركبة (+22%) — يُنصح بمراجعة بروتوكول الوقاية.' },
    { icon: '📊', text: 'متوسط مدة التأهيل للإصابات العضلية انخفض من 21 إلى 17 يوماً بفضل البروتوكول الجديد.' },
    { icon: '💡', text: 'إضافة 3 أخصائيين في تأهيل الجهاز العصبي سيقلل قائمة الانتظار الحالية بنسبة 40%.' },
  ],
};

const TABS = ['نظرة عامة', 'قائمة المرضى', 'المواعيد', 'التحليلات', 'التنبيهات', 'ذكاء اصطناعي'];

/* ─── Main ─── */
export default function PatientsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [addDialog, setAddDialog] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // cards | table

  const bg = isDark
    ? 'radial-gradient(ellipse at 0% 0%, rgba(6,182,212,.12) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(8,145,178,.1) 0%, transparent 55%), #0f0f1a'
    : 'radial-gradient(ellipse at 0% 0%, rgba(6,182,212,.07) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(8,145,178,.06) 0%, transparent 55%), #f1f5f9';

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setLastRefresh(new Date()); }, 700);
  }, []);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => { const id = setInterval(refresh, 5 * 60 * 1000); return () => clearInterval(id); }, [refresh]);

  const filteredPatients = DEMO.patients.filter(p =>
    !searchQ || p.name.includes(searchQ) || p.id.includes(searchQ) || p.condition.includes(searchQ)
  );

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <Glass sx={{
          p: { xs: 2.5, md: 3 }, mb: 3, overflow: 'hidden', position: 'relative',
          background: isDark ? 'linear-gradient(135deg,rgba(6,182,212,.2),rgba(8,145,178,.14))' : 'linear-gradient(135deg,rgba(6,182,212,.11),rgba(8,145,178,.08))',
        }}>
          <Box sx={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', opacity: .08 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 3, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(6,182,212,.4)' }}>
                <MedicalServicesIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  إدارة المرضى المتقدمة
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  تتبع ذكي وشامل لكل مرضى المنظمة · آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialog(true)}
                  sx={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', borderRadius: 2, fontWeight: 700, boxShadow: '0 4px 14px rgba(6,182,212,.4)', fontSize: 13 }}
                >
                  مريض جديد
                </Button>
              </motion.div>
              <Badge badgeContent={DEMO.alerts.filter(a => a.type === 'critical').length} color="error">
                <IconButton size="small" sx={{ background: alpha(theme.palette.error.main, .1) }}>
                  <NotificationsActiveIcon fontSize="small" color="error" />
                </IconButton>
              </Badge>
              <Tooltip title="تحديث">
                <IconButton onClick={refresh} size="small" sx={{ background: alpha('#06b6d4', .1) }}>
                  <RefreshIcon fontSize="small" sx={{ color: '#06b6d4' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, mt: 2.5, flexWrap: 'wrap' }}>
            {[
              { label: 'حضور اليوم', value: '148 جلسة' },
              { label: 'في الانتظار', value: '24' },
              { label: 'حالات طارئة', value: '6' },
              { label: 'نسبة التعافي', value: '87%' },
            ].map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }} />
                <Typography variant="caption" color="text.secondary">{s.label}:</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#06b6d4' }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </Glass>
      </motion.div>

      {/* ─── KPI Cards ─── */}
      {loading ? (
        <Grid container spacing={2} mb={3}>
          {[...Array(6)].map((_, i) => <Grid item xs={12} sm={6} md={4} lg={2} key={i}><Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : (
        <Grid container spacing={2} mb={3}>
          {DEMO.kpis.map((k, i) => <Grid item xs={12} sm={6} md={4} lg={2} key={i}><KPICard {...k} delay={i * .07} /></Grid>)}
        </Grid>
      )}

      {/* ─── Tabs ─── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={i} label={t} active={tab === i} onClick={() => setTab(i)} count={i === 4 ? DEMO.alerts.length : undefined} />
        ))}
      </Glass>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .3 }}>

          {/* ─── Tab 0: نظرة عامة ─── */}
          {tab === 0 && (
            <Grid container spacing={3}>
              {/* توزيع الحالات */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توزيع الحالات المرضية</Typography>
                  {DEMO.conditionDist.map((d, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                        <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: d.color }}>{d.count.toLocaleString()}</Typography>
                      </Box>
                      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * .08, type: 'spring' }} style={{ transformOrigin: 'right' }}>
                        <LinearProgress variant="determinate" value={(d.count / 3840) * 100}
                          sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${d.color},${d.color}99)` } }}
                        />
                      </motion.div>
                    </Box>
                  ))}
                </Glass>
              </Grid>

              {/* مؤشرات الجودة */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>مؤشرات جودة الرعاية</Typography>
                  <Grid container spacing={2}>
                    {DEMO.recoveryRings.map((r, i) => (
                      <Grid item xs={6} key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .1 }}>
                          <RingGauge value={r.value} color={r.color} label={r.label} />
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { label: 'متوسط مدة العلاج', value: '17 يوم', color: '#06b6d4' },
                      { label: 'نسبة الإكمال', value: '91%', color: '#22c55e' },
                      { label: 'الانتكاسات', value: '3.2%', color: '#ef4444' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ textAlign: 'center', p: 1.5, background: alpha(s.color, .08), borderRadius: 2, minWidth: 90 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>

              {/* مواعيد اليوم */}
              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <EventNoteIcon sx={{ color: '#06b6d4' }} />
                    <Typography variant="h6" fontWeight={700}>مواعيد اليوم</Typography>
                    <Chip size="small" label={`${DEMO.appointments.length} موعد`} sx={{ background: alpha('#06b6d4', .12), color: '#06b6d4', fontWeight: 700 }} />
                  </Box>
                  {DEMO.appointments.slice(0, 4).map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .07 }}>
                      <AppointmentRow {...a} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>

              {/* أحدث التنبيهات */}
              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>تنبيهات مهمة</Typography>
                  {DEMO.alerts.slice(0, 4).map((a, i) => <AlertItem key={i} {...a} />)}
                </Glass>
              </Grid>

              {/* أفضل المرضى تقدماً */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <EmojiEventsIcon sx={{ color: '#f59e0b' }} />
                    <Typography variant="h6" fontWeight={700}>أبرز المرضى تقدماً هذا الشهر</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {DEMO.patients.sort((a, b) => b.progress - a.progress).slice(0, 4).map((p, i) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .08 }}>
                          <Box sx={{ p: 2, background: alpha('#22c55e', .07), borderRadius: 2, border: `1px solid ${alpha('#22c55e', .15)}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <Box sx={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</Box>
                              <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', fontSize: 13, fontWeight: 700 }}>{p.name.charAt(0)}</Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.id}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                              <Typography variant="caption" color="text.secondary">التقدم</Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#22c55e' }}>{p.progress}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={p.progress} sx={{ height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#22c55e,#16a34a)' } }} />
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 1: قائمة المرضى ─── */}
          {tab === 1 && (
            <Box>
              <Glass sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TextField
                    size="small"
                    placeholder="بحث بالاسم، الرقم، أو الحالة..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} /> }}
                    sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <IconButton size="small" sx={{ background: alpha(theme.palette.primary.main, .1) }}>
                    <FilterListIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['cards', 'table'].map((m) => (
                    <Chip key={m} label={m === 'cards' ? 'بطاقات' : 'جدول'} onClick={() => setViewMode(m)}
                      sx={{ background: viewMode === m ? alpha('#06b6d4', .2) : 'transparent', color: viewMode === m ? '#06b6d4' : 'text.secondary', fontWeight: viewMode === m ? 700 : 400, border: `1px solid ${alpha('#06b6d4', .3)}`, cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Glass>

              {viewMode === 'cards' ? (
                <Grid container spacing={2}>
                  {filteredPatients.map((p, i) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                      <PatientCard {...p} delay={i * .06} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Glass sx={{ p: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['المريض', 'العمر', 'الحالة', 'التقدم', 'الوضع', 'الفرع'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPatients.map((p, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .05 }}>
                          <PatientRow {...p} />
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </Glass>
              )}
            </Box>
          )}

          {/* ─── Tab 2: المواعيد ─── */}
          {tab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700}>جدول المواعيد — اليوم</Typography>
                    <Chip label={`${DEMO.appointments.length} موعد`} icon={<EventNoteIcon />} sx={{ background: alpha('#06b6d4', .12), color: '#06b6d4', fontWeight: 700 }} />
                  </Box>
                  {DEMO.appointments.map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
                      <AppointmentRow {...a} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص المواعيد</Typography>
                  {[
                    { label: 'مؤكدة', count: DEMO.appointments.filter(a => a.status === 'مؤكد').length, color: '#22c55e' },
                    { label: 'معلقة', count: DEMO.appointments.filter(a => a.status === 'معلق').length, color: '#f59e0b' },
                    { label: 'مكتملة', count: DEMO.appointments.filter(a => a.status === 'مكتمل').length, color: '#6366f1' },
                    { label: 'ملغاة', count: DEMO.appointments.filter(a => a.status === 'ملغى').length, color: '#ef4444' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1.5, background: alpha(s.color, .1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ p: 2, background: alpha('#06b6d4', .08), borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#06b6d4' }}>الأسبوع القادم</Typography>
                    <Typography variant="h5" fontWeight={800} color="primary.main" mt={.5}>86 موعد</Typography>
                    <Typography variant="caption" color="text.secondary">بزيادة 12% عن الأسبوع الماضي</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 3: التحليلات ─── */}
          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(6,182,212,.18),rgba(8,145,178,.12))' : 'linear-gradient(135deg,rgba(6,182,212,.1),rgba(8,145,178,.07))' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MonitorHeartIcon sx={{ color: '#fff' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>تحليل بيانات المرضى</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {[
                      { label: 'معدل التعافي الشهري', values: [78, 82, 80, 84, 86, 85, 87], color: '#22c55e' },
                      { label: 'جلسات يومية', values: [120, 135, 128, 142, 138, 145, 148], color: '#06b6d4' },
                      { label: 'مرضى جدد يومياً', values: [8, 11, 9, 13, 10, 12, 14], color: '#6366f1' },
                    ].map((chart, ci) => (
                      <Grid item xs={12} md={4} key={ci}>
                        <Box sx={{ p: 2, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)', borderRadius: 2 }}>
                          <Typography variant="body2" fontWeight={700} mb={1.5}>{chart.label}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: .7, height: 60 }}>
                            {chart.values.map((v, i) => {
                              const max = Math.max(...chart.values);
                              const pct = (v / max) * 100;
                              return (
                                <motion.div key={i}
                                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * .05, type: 'spring' }}
                                  style={{ flex: 1, borderRadius: '3px 3px 0 0', height: `${pct}%`, transformOrigin: 'bottom', background: i === chart.values.length - 1 ? chart.color : `${chart.color}66` }}
                                />
                              );
                            })}
                          </Box>
                          <Typography variant="h5" fontWeight={800} sx={{ color: chart.color, mt: 1 }}>{chart.values[chart.values.length - 1]}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توزيع الحالات حسب الفرع</Typography>
                  {[
                    { branch: 'الرياض', patients: 4200, color: '#6366f1' },
                    { branch: 'جدة', patients: 3100, color: '#06b6d4' },
                    { branch: 'الدمام', patients: 2400, color: '#22c55e' },
                    { branch: 'مكة', patients: 1800, color: '#f59e0b' },
                    { branch: 'المدينة', patients: 1340, color: '#ec4899' },
                  ].map((b, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                        <Typography variant="body2" fontWeight={600}>{b.branch}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: b.color }}>{b.patients.toLocaleString()}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(b.patients / 4200) * 100}
                        sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${b.color},${b.color}99)` } }}
                      />
                    </Box>
                  ))}
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>معدل التعافي حسب الحالة</Typography>
                  {[
                    { condition: 'إصابات العضلات', rate: 94, avg: 17, color: '#22c55e' },
                    { condition: 'إصابات العظام', rate: 88, avg: 24, color: '#06b6d4' },
                    { condition: 'ما بعد الجراحة', rate: 85, avg: 32, color: '#6366f1' },
                    { condition: 'الجهاز العصبي', rate: 72, avg: 45, color: '#f59e0b' },
                    { condition: 'الأمراض المزمنة', rate: 61, avg: 90, color: '#ef4444' },
                  ].map((c, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                        <Typography variant="body2" fontWeight={600}>{c.condition}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip size="small" label={`${c.avg} يوم`} sx={{ background: alpha(c.color, .12), color: c.color, fontSize: 9, height: 18 }} />
                          <Typography variant="caption" fontWeight={700} sx={{ color: c.color }}>{c.rate}%</Typography>
                        </Box>
                      </Box>
                      <LinearProgress variant="determinate" value={c.rate}
                        sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${c.color},${c.color}99)` } }}
                      />
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 4: التنبيهات ─── */}
          {tab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>تنبيهات المرضى</Typography>
                    <Chip label={DEMO.alerts.length} size="small" color="warning" />
                  </Box>
                  {DEMO.alerts.map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <AlertItem {...a} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص التنبيهات</Typography>
                  {[
                    { label: 'عاجل', count: DEMO.alerts.filter(a => a.type === 'critical').length, color: '#ef4444' },
                    { label: 'تنبيه', count: DEMO.alerts.filter(a => a.type === 'warning').length, color: '#f59e0b' },
                    { label: 'إنجاز', count: DEMO.alerts.filter(a => a.type === 'success').length, color: '#22c55e' },
                    { label: 'معلومة', count: DEMO.alerts.filter(a => a.type === 'info').length, color: '#6366f1' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1.5, background: alpha(s.color, .1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 2, background: alpha('#22c55e', .08), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="success.main">تم حل 9 تنبيهات هذا الأسبوع</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 5: ذكاء اصطناعي ─── */}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(6,182,212,.2),rgba(8,145,178,.14))' : 'linear-gradient(135deg,rgba(6,182,212,.1),rgba(8,145,178,.07))' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PsychologyIcon sx={{ color: '#fff' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>تحليل ذكاء اصطناعي — رعاية المرضى</Typography>
                      <Typography variant="caption" color="text.secondary">توصيات مبنية على بيانات الرعاية الصحية</Typography>
                    </Box>
                    <Chip label="AI-Powered" sx={{ ml: 'auto', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', color: '#fff', fontWeight: 700 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {DEMO.aiInsights.map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2.5, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)', borderRadius: 2, border: `1px solid ${alpha('#06b6d4', .2)}`, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Typography fontSize={24}>{ins.icon}</Typography>
                            <Typography variant="body2" color="text.primary" lineHeight={1.7}>{ins.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توقعات الشهر القادم</Typography>
                  {[
                    { label: 'مرضى جدد متوقعون', value: '310+', color: '#06b6d4' },
                    { label: 'معدل التعافي المتوقع', value: '89%', color: '#22c55e' },
                    { label: 'جلسات يومية متوقعة', value: '162', color: '#6366f1' },
                    { label: 'رضا المرضى المتوقع', value: '95%', color: '#f59e0b' },
                  ].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1, background: alpha(f.color, .08), borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight={600}>{f.label}</Typography>
                        <Typography variant="body1" fontWeight={800} sx={{ color: f.color }}>{f.value}</Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>المرضى في خطر تأخير التعافي</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>بناءً على نمط الحضور والاستجابة للعلاج</Typography>
                  {DEMO.patients.filter(p => p.progress < 50).map((p, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, background: p.progress < 30 ? '#ef4444' : '#f59e0b' }}>{p.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.condition}</Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ color: p.progress < 30 ? '#ef4444' : '#f59e0b' }}>{p.progress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={p.progress}
                        sx={{ height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: p.progress < 30 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#f59e0b,#d97706)' } }}
                      />
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Dialog: مريض جديد ─── */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1e1e2e' : '#fff' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonAddIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography fontWeight={700}>تسجيل مريض جديد</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={.5}>
            {[
              { label: 'الاسم الكامل', sm: 6 },
              { label: 'رقم الهوية', sm: 6 },
              { label: 'تاريخ الميلاد', sm: 6 },
              { label: 'رقم الجوال', sm: 6 },
            ].map((f, i) => (
              <Grid item xs={12} sm={f.sm} key={i}>
                <TextField fullWidth label={f.label} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="الفرع" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'].map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="نوع الحالة" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['إصابة عضلية', 'إصابة عظام', 'ما بعد الجراحة', 'أمراض مزمنة', 'تأهيل عصبي'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوصف والتشخيص" multiline rows={2} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialog(false)} color="inherit" sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button variant="contained" onClick={() => setAddDialog(false)}
            sx={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', borderRadius: 2, fontWeight: 700 }}>
            تسجيل المريض
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
