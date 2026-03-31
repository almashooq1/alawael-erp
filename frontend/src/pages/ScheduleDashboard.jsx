/**
 * ScheduleDashboard.jsx — لوحة الجدول الزمني والمواعيد
 * تصميم Glassmorphism بريميوم | Framer Motion | RTL | Dark/Light
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Avatar, Chip, LinearProgress,
  Skeleton, Tooltip, IconButton, Badge, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, useTheme, alpha,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EventNoteIcon from '@mui/icons-material/EventNote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
      background: active ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'transparent',
      color: active ? '#fff' : theme.palette.text.secondary,
      border: active ? 'none' : `1px solid ${alpha(theme.palette.divider, .5)}`,
      borderRadius: 10, padding: '7px 16px', cursor: 'pointer',
      fontWeight: active ? 700 : 500, fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
    }}>
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ background: active ? 'rgba(255,255,255,.25)' : alpha('#8b5cf6', .15), borderRadius: 10, px: .8, py: .1, fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#8b5cf6' }}>{count}</Box>
      )}
    </motion.button>
  );
});

/* ─── Appointment Block ─── */
const AppBlock = memo(({ patient, doctor, time, duration, type, status, room, delay = 0 }) => {
  const theme = useTheme();
  const statusColors = { مؤكد: '#22c55e', معلق: '#f59e0b', ملغى: '#ef4444', مكتمل: '#6366f1', 'قيد التنفيذ': '#06b6d4' };
  const c = statusColors[status] || '#8b5cf6';
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, type: 'spring' }}>
      <Box sx={{
        display: 'flex', gap: 2, p: 2,
        background: alpha(c, .06), borderRadius: 2,
        border: `1px solid ${alpha(c, .15)}`,
        borderInlineStart: `4px solid ${c}`,
        mb: 1.5, transition: 'transform .18s',
        '&:hover': { transform: 'translateX(-2px)', background: alpha(c, .1) },
      }}>
        <Box sx={{ minWidth: 56, textAlign: 'center' }}>
          <Typography variant="body2" fontWeight={800} sx={{ color: c }}>{time}</Typography>
          <Typography variant="caption" color="text.secondary">{duration} دق</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .5 }}>
            <Typography variant="body2" fontWeight={700}>{patient}</Typography>
            <Chip size="small" label={status} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
              <MedicalServicesIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{doctor}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
              <AccessTimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{type}</Typography>
            </Box>
            {room && (
              <Chip size="small" label={`غرفة ${room}`} sx={{ background: alpha(theme.palette.primary.main, .08), fontSize: 9, height: 18 }} />
            )}
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
});

/* ─── Doctor Card ─── */
const DoctorCard = memo(({ name, specialty, sessions, available, nextSlot, color, delay = 0 }) => {
  const _theme = useTheme();
  const pct = (sessions.done / sessions.total) * 100;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring' }}>
      <Glass sx={{ p: 2.5, transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg,${color},${color}88)`, fontWeight: 700, fontSize: 16 }}>{name.charAt(0)}</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={700}>{name}</Typography>
            <Typography variant="caption" color="text.secondary">{specialty}</Typography>
          </Box>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: available ? '#22c55e' : '#ef4444', boxShadow: `0 0 6px ${available ? '#22c55e' : '#ef4444'}` }} />
        </Box>
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
            <Typography variant="caption" color="text.secondary">الجلسات ({sessions.done}/{sessions.total})</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color }}>{Math.round(pct)}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${color},${color}99)` } }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">أول موعد متاح:</Typography>
          <Chip size="small" label={nextSlot} sx={{ background: alpha(color, .12), color, fontWeight: 700, fontSize: 10 }} />
        </Box>
      </Glass>
    </motion.div>
  );
});

/* ─── Weekly Calendar ─── */
const WeekCalendar = memo(({ events }) => {
  const theme = useTheme();
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const today = 2; // index of today
  const maxCount = Math.max(...events.map(d => d.count));
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {days.map((d, i) => (
          <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
            <Typography variant="caption" color={i === today ? 'primary.main' : 'text.secondary'} fontWeight={i === today ? 700 : 400} sx={{ fontSize: 11 }}>{d.slice(0, 3)}</Typography>
            <Box sx={{ width: '100%', position: 'relative' }}>
              <motion.div
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * .05, type: 'spring' }}
                style={{
                  transformOrigin: 'bottom',
                  width: '100%',
                  height: `${(events[i].count / maxCount) * 80}px`,
                  borderRadius: '4px 4px 0 0',
                  background: i === today
                    ? 'linear-gradient(180deg,#8b5cf6,#6366f1)'
                    : alpha('#8b5cf6', .25 + (events[i].count / maxCount) * .4),
                }}
              />
            </Box>
            <Box sx={{
              width: 28, height: 28, borderRadius: '50%',
              background: i === today ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: i === today ? 'none' : `1px solid ${alpha(theme.palette.divider, .4)}`,
            }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: i === today ? '#fff' : 'text.secondary', fontSize: 11 }}>
                {events[i].count}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
});

/* ─── Alert Item ─── */
const AlertItem = memo(({ type, msg, detail, time }) => {
  const _theme = useTheme();
  const colors = { critical: '#ef4444', warning: '#f59e0b', info: '#8b5cf6', success: '#22c55e' };
  const c = colors[type] || colors.info;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderInlineStart: `3px solid ${c}`, background: alpha(c, .06), borderRadius: '0 8px 8px 0', mb: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>{msg}</Typography>
        <Typography variant="caption" color="text.secondary">{detail} · {time}</Typography>
      </Box>
      <Chip size="small" label={type === 'critical' ? 'عاجل' : type === 'warning' ? 'تنبيه' : type === 'success' ? 'تم' : 'معلومة'}
        sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
    </Box>
  );
});

/* ─── Demo Data ─── */
const DEMO = {
  kpis: [
    { title: 'مواعيد اليوم', value: '148', subtitle: 'في جميع الفروع', icon: <EventNoteIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)', trend: 8.5 },
    { title: 'مكتملة', value: '89', subtitle: 'من مواعيد اليوم', icon: <EventAvailableIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 12.4 },
    { title: 'ملغاة', value: '11', subtitle: 'هذا الأسبوع', icon: <EventBusyIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: -18.5 },
    { title: 'الأطباء النشطون', value: '24', subtitle: 'اليوم', icon: <PersonIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 4.3 },
    { title: 'متوسط وقت الانتظار', value: '12 دق', subtitle: 'تحسّن 4 دقائق', icon: <AccessTimeIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: 25 },
    { title: 'مواعيد الأسبوع', value: '842', subtitle: 'إجمالي الأسبوع', icon: <CalendarMonthIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ec4899,#be185d)', trend: 6.2 },
  ],
  todayAppts: [
    { patient: 'محمد الزهراني', doctor: 'د. سمر الأحمد', time: '08:30', duration: 45, type: 'جلسة تأهيل', status: 'مكتمل', room: 'A1' },
    { patient: 'فاطمة العمري', doctor: 'د. وليد الشمري', time: '09:00', duration: 30, type: 'مراجعة دورية', status: 'مكتمل', room: 'B2' },
    { patient: 'خالد الحربي', doctor: 'د. سمر الأحمد', time: '10:00', duration: 60, type: 'جلسة مكثفة', status: 'قيد التنفيذ', room: 'A1' },
    { patient: 'أحمد الشهري', doctor: 'د. ناصر العتيبي', time: '11:00', duration: 45, type: 'جلسة تأهيل', status: 'مؤكد', room: 'C3' },
    { patient: 'هيا الدوسري', doctor: 'د. وليد الشمري', time: '12:30', duration: 30, type: 'تقييم أولي', status: 'مؤكد', room: 'B2' },
    { patient: 'سارة القرني', doctor: 'د. ناصر العتيبي', time: '14:00', duration: 45, type: 'جلسة تأهيل', status: 'معلق', room: 'C3' },
    { patient: 'عبدالله المطيري', doctor: 'د. سمر الأحمد', time: '15:30', duration: 30, type: 'مراجعة شهرية', status: 'مؤكد', room: 'A2' },
    { patient: 'ريم الحارثي', doctor: 'د. لمياء الغامدي', time: '16:00', duration: 45, type: 'جلسة تأهيل', status: 'ملغى', room: 'D1' },
  ],
  doctors: [
    { name: 'د. سمر الأحمد', specialty: 'تأهيل حركي', sessions: { done: 12, total: 15 }, available: true, nextSlot: '16:30 م', color: '#8b5cf6' },
    { name: 'د. وليد الشمري', specialty: 'علاج طبيعي', sessions: { done: 9, total: 12 }, available: false, nextSlot: '09:00 ص غداً', color: '#06b6d4' },
    { name: 'د. ناصر العتيبي', specialty: 'تأهيل عصبي', sessions: { done: 7, total: 10 }, available: true, nextSlot: '11:30 ص', color: '#22c55e' },
    { name: 'د. لمياء الغامدي', specialty: 'علاج وظيفي', sessions: { done: 5, total: 8 }, available: true, nextSlot: '02:00 م', color: '#f59e0b' },
    { name: 'د. هاني القحطاني', specialty: 'تأهيل رياضي', sessions: { done: 10, total: 12 }, available: false, nextSlot: '08:00 ص غداً', color: '#ec4899' },
    { name: 'د. نوف الزهراني', specialty: 'علاج تنفسي', sessions: { done: 6, total: 8 }, available: true, nextSlot: '03:30 م', color: '#ef4444' },
  ],
  weekEvents: [
    { count: 112 }, { count: 98 }, { count: 148 }, { count: 135 },
    { count: 142 }, { count: 156 }, { count: 51 },
  ],
  alerts: [
    { type: 'critical', msg: 'المريض خالد الحربي يحتاج مراجعة طارئة', detail: 'غرفة A1', time: 'الآن' },
    { type: 'warning', msg: '5 مواعيد بدون تأكيد — تحتاج متابعة', detail: 'فرع الرياض', time: 'منذ ساعة' },
    { type: 'warning', msg: 'تعارض في مواعيد د. سمر الأحمد في الساعة 10:00', detail: 'الجدولة', time: 'منذ 30 دقيقة' },
    { type: 'success', msg: 'اكتمال 89 موعد بنجاح حتى الآن', detail: 'اليوم', time: 'آخر تحديث' },
    { type: 'info', msg: '35 موعد مجدول للغد — يحتاج مراجعة', detail: 'الجدولة', time: 'تذكير' },
  ],
  aiInsights: [
    { icon: '📅', text: 'الثلاثاء والأربعاء الأعلى طلباً — يُنصح بزيادة الأطباء المتاحين في هذين اليومين.' },
    { icon: '⚠️', text: 'معدل الإلغاء ارتفع 8% هذا الأسبوع — الأسباب الرئيسية: النسيان وصعوبة التنقل.' },
    { icon: '💡', text: 'إرسال تذكير تلقائي قبل 24 ساعة أقلّ الإلغاء في المنشآت المشابهة بنسبة 31%.' },
    { icon: '🎯', text: 'الطاقة الاستيعابية القصوى هي 165 جلسة/يوم — الاستغلال الحالي 89.7% (الأمثل).' },
  ],
  roomUtil: [
    { room: 'A1 - التأهيل الحركي', util: 92, color: '#8b5cf6' },
    { room: 'A2 - التأهيل الحركي', util: 78, color: '#6366f1' },
    { room: 'B1 - العلاج الطبيعي', util: 85, color: '#06b6d4' },
    { room: 'B2 - العلاج الطبيعي', util: 70, color: '#0891b2' },
    { room: 'C1 - التأهيل العصبي', util: 95, color: '#22c55e' },
    { room: 'D1 - العلاج الوظيفي', util: 61, color: '#f59e0b' },
  ],
};

const TABS = ['نظرة عامة', 'جدول اليوم', 'الأطباء', 'الغرف', 'التنبيهات', 'ذكاء اصطناعي'];

/* ─── Main ─── */
export default function ScheduleDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
const [_lastRefresh, setLastRefresh] = useState(new Date());
  const [addDialog, setAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('الكل');

  const bg = isDark
    ? 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,.12) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(99,102,241,.1) 0%, transparent 55%), #0f0f1a'
    : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,.07) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(99,102,241,.06) 0%, transparent 55%), #f1f5f9';

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setLastRefresh(new Date()); }, 700);
  }, []);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => { const id = setInterval(refresh, 3 * 60 * 1000); return () => clearInterval(id); }, [refresh]);

  const filteredAppts = filterStatus === 'الكل'
    ? DEMO.todayAppts
    : DEMO.todayAppts.filter(a => a.status === filterStatus);

  const statusOptions = ['الكل', 'مؤكد', 'قيد التنفيذ', 'مكتمل', 'معلق', 'ملغى'];

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <Glass sx={{
          p: { xs: 2.5, md: 3 }, mb: 3, overflow: 'hidden', position: 'relative',
          background: isDark ? 'linear-gradient(135deg,rgba(139,92,246,.2),rgba(99,102,241,.14))' : 'linear-gradient(135deg,rgba(139,92,246,.11),rgba(99,102,241,.08))',
        }}>
          <Box sx={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', opacity: .08 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 3, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(139,92,246,.4)' }}>
                <CalendarMonthIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  الجدول الزمني والمواعيد
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إدارة ذكية لجميع المواعيد والجلسات · {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialog(true)}
                  sx={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', borderRadius: 2, fontWeight: 700, boxShadow: '0 4px 14px rgba(139,92,246,.4)', fontSize: 13 }}
                >
                  موعد جديد
                </Button>
              </motion.div>
              <Badge badgeContent={DEMO.alerts.filter(a => a.type === 'critical' || a.type === 'warning').length} color="warning">
                <IconButton size="small" sx={{ background: alpha(theme.palette.warning.main, .1) }}>
                  <NotificationsActiveIcon fontSize="small" color="warning" />
                </IconButton>
              </Badge>
              <Tooltip title="تحديث">
                <IconButton onClick={refresh} size="small" sx={{ background: alpha('#8b5cf6', .1) }}>
                  <RefreshIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 3, mt: 2.5, flexWrap: 'wrap' }}>
            {[
              { label: 'قيد التنفيذ', value: DEMO.todayAppts.filter(a => a.status === 'قيد التنفيذ').length },
              { label: 'في الانتظار', value: DEMO.todayAppts.filter(a => a.status === 'مؤكد').length },
              { label: 'مكتمل اليوم', value: DEMO.todayAppts.filter(a => a.status === 'مكتمل').length },
              { label: 'الأطباء المتاحون', value: DEMO.doctors.filter(d => d.available).length },
            ].map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }} />
                <Typography variant="caption" color="text.secondary">{s.label}:</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#8b5cf6' }}>{s.value}</Typography>
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
              {/* التقويم الأسبوعي */}
              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>الجدول الأسبوعي</Typography>
                      <Typography variant="caption" color="text.secondary">عدد الجلسات اليومية</Typography>
                    </Box>
                    <Chip label="842 جلسة هذا الأسبوع" sx={{ background: alpha('#8b5cf6', .12), color: '#8b5cf6', fontWeight: 700 }} />
                  </Box>
                  <WeekCalendar events={DEMO.weekEvents} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { label: 'أعلى يوم', value: 'الخميس 156', color: '#8b5cf6' },
                      { label: 'أقل يوم', value: 'الجمعة 51', color: '#ef4444' },
                      { label: 'اليوم', value: 'الاثنين 148', color: '#22c55e' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ textAlign: 'center', p: 1.5, background: alpha(s.color, .08), borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block">{s.label}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>

              {/* ملخص حالات المواعيد */}
              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>حالات مواعيد اليوم</Typography>
                  {[
                    { label: 'مكتمل', count: DEMO.todayAppts.filter(a => a.status === 'مكتمل').length, icon: <CheckCircleOutlineIcon />, color: '#22c55e' },
                    { label: 'قيد التنفيذ', count: DEMO.todayAppts.filter(a => a.status === 'قيد التنفيذ').length, icon: <PendingActionsIcon />, color: '#06b6d4' },
                    { label: 'مؤكد', count: DEMO.todayAppts.filter(a => a.status === 'مؤكد').length, icon: <EventAvailableIcon />, color: '#8b5cf6' },
                    { label: 'معلق', count: DEMO.todayAppts.filter(a => a.status === 'معلق').length, icon: <AccessTimeIcon />, color: '#f59e0b' },
                    { label: 'ملغى', count: DEMO.todayAppts.filter(a => a.status === 'ملغى').length, icon: <CancelOutlinedIcon />, color: '#ef4444' },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .07 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1, background: alpha(s.color, .08), borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: s.color }}>{s.icon}</Box>
                          <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <LinearProgress variant="determinate" value={(s.count / DEMO.todayAppts.length) * 100}
                            sx={{ width: 60, height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: s.color } }}
                          />
                          <Typography variant="h6" fontWeight={800} sx={{ color: s.color, minWidth: 20 }}>{s.count}</Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>

              {/* المواعيد التالية */}
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>آخر المواعيد اليوم</Typography>
                  {DEMO.todayAppts.slice(0, 5).map((a, i) => <AppBlock key={i} {...a} delay={i * .06} />)}
                </Glass>
              </Grid>

              {/* أحدث التنبيهات */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>تنبيهات الجدولة</Typography>
                  {DEMO.alerts.slice(0, 4).map((a, i) => <AlertItem key={i} {...a} />)}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 1: جدول اليوم ─── */}
          {tab === 1 && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>جدول يوم {new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}</Typography>
                  <Typography variant="caption" color="text.secondary">{DEMO.todayAppts.length} موعد إجمالاً</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {statusOptions.map(s => (
                    <Chip key={s} label={s} size="small" onClick={() => setFilterStatus(s)}
                      sx={{
                        cursor: 'pointer',
                        background: filterStatus === s ? alpha('#8b5cf6', .2) : 'transparent',
                        color: filterStatus === s ? '#8b5cf6' : 'text.secondary',
                        fontWeight: filterStatus === s ? 700 : 400,
                        border: `1px solid ${alpha('#8b5cf6', .25)}`,
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <AnimatePresence mode="wait">
                <motion.div key={filterStatus} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {filteredAppts.map((a, i) => <AppBlock key={i} {...a} delay={i * .05} />)}
                  {filteredAppts.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">لا توجد مواعيد بهذا الوضع</Typography>
                    </Box>
                  )}
                </motion.div>
              </AnimatePresence>
            </Glass>
          )}

          {/* ─── Tab 2: الأطباء ─── */}
          {tab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>الكادر الطبي النشط</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {DEMO.doctors.filter(d => d.available).length} متاح من أصل {DEMO.doctors.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .7 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                    <Typography variant="caption">متاح ({DEMO.doctors.filter(d => d.available).length})</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .7 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                    <Typography variant="caption">مشغول ({DEMO.doctors.filter(d => !d.available).length})</Typography>
                  </Box>
                </Box>
              </Box>
              <Grid container spacing={2}>
                {DEMO.doctors.map((d, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <DoctorCard {...d} delay={i * .07} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ─── Tab 3: الغرف ─── */}
          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3}>إشغال الغرف والقاعات</Typography>
                  {DEMO.roomUtil.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ mb: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                          <Typography variant="body2" fontWeight={600}>{r.room}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: r.color }}>{r.util}%</Typography>
                            {r.util >= 90 && <Chip size="small" label="ممتلئ تقريباً" sx={{ background: alpha('#ef4444', .12), color: '#ef4444', fontSize: 9, height: 18 }} />}
                          </Box>
                        </Box>
                        <LinearProgress variant="determinate" value={r.util}
                          sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { background: r.util >= 90 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : r.util >= 75 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : `linear-gradient(90deg,${r.color},${r.color}99)` } }}
                        />
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص الاستخدام</Typography>
                  {[
                    { label: 'معدل الإشغال الكلي', value: `${Math.round(DEMO.roomUtil.reduce((s, r) => s + r.util, 0) / DEMO.roomUtil.length)}%`, color: '#8b5cf6' },
                    { label: 'غرف ممتلئة (90%+)', value: `${DEMO.roomUtil.filter(r => r.util >= 90).length} غرف`, color: '#ef4444' },
                    { label: 'غرف متاحة للحجز', value: `${DEMO.roomUtil.filter(r => r.util < 75).length} غرف`, color: '#22c55e' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ p: 2, mb: 1.5, background: alpha(s.color, .08), borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ p: 2, background: alpha('#8b5cf6', .08), borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">التوصية</Typography>
                    <Typography variant="body2" fontWeight={600} mt={.5}>
                      غرفة C1 تحتاج موظفاً إضافياً — إشغال 95%
                    </Typography>
                  </Box>
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
                    <Typography variant="h6" fontWeight={700}>تنبيهات الجدولة</Typography>
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
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص</Typography>
                  {[
                    { label: 'عاجل', count: DEMO.alerts.filter(a => a.type === 'critical').length, color: '#ef4444' },
                    { label: 'تنبيه', count: DEMO.alerts.filter(a => a.type === 'warning').length, color: '#f59e0b' },
                    { label: 'تم', count: DEMO.alerts.filter(a => a.type === 'success').length, color: '#22c55e' },
                    { label: 'معلومة', count: DEMO.alerts.filter(a => a.type === 'info').length, color: '#8b5cf6' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1.5, background: alpha(s.color, .1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 5: ذكاء اصطناعي ─── */}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(139,92,246,.2),rgba(99,102,241,.14))' : 'linear-gradient(135deg,rgba(139,92,246,.1),rgba(99,102,241,.07))' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PsychologyIcon sx={{ color: '#fff' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>تحسين الجدولة بالذكاء الاصطناعي</Typography>
                      <Typography variant="caption" color="text.secondary">توصيات مبنية على أنماط الحضور والطلب</Typography>
                    </Box>
                    <Chip label="AI-Powered" sx={{ ml: 'auto', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontWeight: 700 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {DEMO.aiInsights.map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2.5, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)', borderRadius: 2, border: `1px solid ${alpha('#8b5cf6', .2)}`, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
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
                  <Typography variant="h6" fontWeight={700} mb={2}>توقعات الجدولة — الأسبوع القادم</Typography>
                  {[
                    { day: 'السبت', count: 118, trend: '+5%', color: '#6366f1' },
                    { day: 'الأحد', count: 105, trend: '+7%', color: '#8b5cf6' },
                    { day: 'الاثنين', count: 158, trend: '+7%', color: '#22c55e' },
                    { day: 'الثلاثاء', count: 142, trend: '+5%', color: '#06b6d4' },
                    { day: 'الأربعاء', count: 149, trend: '+5%', color: '#f59e0b' },
                    { day: 'الخميس', count: 163, trend: '+5%', color: '#ec4899' },
                  ].map((d, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p: 1, background: alpha(d.color, .07), borderRadius: 2 }}>
                      <Typography variant="body2" fontWeight={600}>{d.day}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LinearProgress variant="determinate" value={(d.count / 163) * 100} sx={{ width: 80, height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: d.color } }} />
                        <Typography variant="body2" fontWeight={700} sx={{ color: d.color, minWidth: 28 }}>{d.count}</Typography>
                        <Chip size="small" label={d.trend} sx={{ background: alpha('#22c55e', .12), color: '#16a34a', fontSize: 9, height: 18 }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>مقترحات التحسين الفوري</Typography>
                  {[
                    { title: 'إضافة وردية مسائية', impact: 'زيادة طاقة +15 موعد/يوم', priority: 'عالي', color: '#ef4444' },
                    { title: 'تفعيل التذكير التلقائي', impact: 'تقليل الإلغاء بـ 30%', priority: 'عالي', color: '#ef4444' },
                    { title: 'توزيع أفضل لمواعيد الثلاثاء', impact: 'تقليل الانتظار 8 دقائق', priority: 'متوسط', color: '#f59e0b' },
                    { title: 'تفعيل المواعيد الافتراضية', impact: 'خدمة 40+ مريض إضافي', priority: 'متوسط', color: '#f59e0b' },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ p: 2, mb: 1.5, background: alpha(s.color, .07), borderRadius: 2, border: `1px solid ${alpha(s.color, .15)}` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                          <Typography variant="body2" fontWeight={700}>{s.title}</Typography>
                          <Chip size="small" label={s.priority} sx={{ background: alpha(s.color, .15), color: s.color, fontWeight: 700, fontSize: 9, height: 18 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">{s.impact}</Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Dialog: موعد جديد ─── */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1e1e2e' : '#fff' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EventNoteIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography fontWeight={700}>إضافة موعد جديد</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={.5}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم المريض" size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="الطبيب" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {DEMO.doctors.map(d => <MenuItem key={d.name} value={d.name}>{d.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="التاريخ" type="date" size="small" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="الوقت" type="time" size="small" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="نوع الجلسة" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['جلسة تأهيل', 'مراجعة دورية', 'تقييم أولي', 'جلسة مكثفة', 'مراجعة شهرية'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="الغرفة" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {DEMO.roomUtil.map(r => <MenuItem key={r.room} value={r.room.split(' - ')[0]}>{r.room}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialog(false)} color="inherit" sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button variant="contained" onClick={() => setAddDialog(false)}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', borderRadius: 2, fontWeight: 700 }}>
            حجز الموعد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
