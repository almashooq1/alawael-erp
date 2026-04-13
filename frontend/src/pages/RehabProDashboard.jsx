/**
 * RehabProDashboard — لوحة التأهيل الشاملة البريميوم
 * Design: Premium Glassmorphism + Framer Motion
 * Gradient: #10b981 → #06b6d4 → #6366f1
 */

import { useState } from 'react';
import { useTheme,
} from '@mui/material';

import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import GroupsIcon from '@mui/icons-material/Groups';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// ─── Data ──────────────────────────────────────────────────────────────────────
const GRADIENT = 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #6366f1 100%)';
const GLOW = 'rgba(16,185,129,0.4)';

const monthlyProgress = [
  { month: 'يناير', مُحسّن: 42, مستقر: 28, محتاج_متابعة: 12 },
  { month: 'فبراير', مُحسّن: 48, مستقر: 32, محتاج_متابعة: 10 },
  { month: 'مارس', مُحسّن: 55, مستقر: 35, محتاج_متابعة: 8 },
  { month: 'أبريل', مُحسّن: 61, مستقر: 38, محتاج_متابعة: 7 },
  { month: 'مايو', مُحسّن: 68, مستقر: 40, محتاج_متابعة: 6 },
  { month: 'يونيو', مُحسّن: 74, مستقر: 42, محتاج_متابعة: 5 },
];

const rehabTypes = [
  { type: 'العلاج الطبيعي', مرضى: 145, جلسات: 620, نسبة_التعافي: 88 },
  { type: 'علاج النطق', مرضى: 98, جلسات: 412, نسبة_التعافي: 82 },
  { type: 'العلاج الوظيفي', مرضى: 112, جلسات: 487, نسبة_التعافي: 85 },
  { type: 'دعم نفسي', مرضى: 76, جلسات: 298, نسبة_التعافي: 79 },
  { type: 'تعديل السلوك', مرضى: 63, جلسات: 245, نسبة_التعافي: 76 },
];

const outcomeData = [
  { name: 'تعافٍ كامل', value: 32, color: '#10b981' },
  { name: 'تحسّن ملحوظ', value: 41, color: '#06b6d4' },
  { name: 'تحسّن جزئي', value: 18, color: '#6366f1' },
  { name: 'مستمر', value: 9, color: '#f59e0b' },
];

const radarData = [
  { area: 'الحركة', current: 82, target: 90 },
  { area: 'التواصل', current: 75, target: 85 },
  { area: 'الإدراك', current: 88, target: 92 },
  { area: 'السلوك', current: 71, target: 80 },
  { area: 'الاجتماعي', current: 78, target: 88 },
  { area: 'الاستقلالية', current: 65, target: 82 },
];

const activePatients = [
  { name: 'أحمد م.', program: 'العلاج الطبيعي', progress: 78, sessions: 24, status: 'محسّن', color: '#10b981' },
  { name: 'سارة ع.', program: 'علاج النطق', progress: 62, sessions: 18, status: 'مستقر', color: '#06b6d4' },
  { name: 'خالد ن.', program: 'العلاج الوظيفي', progress: 91, sessions: 31, status: 'ممتاز', color: '#6366f1' },
  { name: 'نورة ب.', program: 'دعم نفسي', progress: 45, sessions: 12, status: 'متابعة', color: '#f59e0b' },
  { name: 'فيصل ر.', program: 'تعديل السلوك', progress: 83, sessions: 28, status: 'محسّن', color: '#10b981' },
];

const KPI_CARDS = [
  { label: 'إجمالي المرضى النشطين', value: '٤٩٤', sub: '+٢٣ هذا الشهر', icon: GroupsIcon, color: '#10b981' },
  { label: 'جلسة مكتملة (الشهر)', value: '٢٠٦٢', sub: 'معدل ٦٨.٧/يوم', icon: AssignmentTurnedInIcon, color: '#06b6d4' },
  { label: 'معدل التحسّن العام', value: '٨٤٪', sub: '+٦٪ عن الربع الماضي', icon: TrendingUpIcon, color: '#6366f1' },
  { label: 'برنامج تأهيلي نشط', value: '١٨', sub: '٥ أضيفت حديثاً', icon: LocalHospitalIcon, color: '#8b5cf6' },
  { label: 'حالات تخرّج ناجح', value: '١٣٧', sub: 'هذا العام', icon: EmojiEventsIcon, color: '#f59e0b' },
  { label: 'مقياس تقييم مُطبَّق', value: '٣٤٢', sub: 'هذا الشهر', icon: AccessibilityNewIcon, color: '#ec4899' },
];

// ─── Sub Components ────────────────────────────────────────────────────────────
function GlassCard({ children, sx = {}, hoverGlow = GLOW }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '20px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
        background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        '&:hover': { boxShadow: `0 12px 40px ${hoverGlow}` },
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
      border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: '12px', p: 1.5, backdropFilter: 'blur(10px)',
    }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5, color: isDark ? '#F1F5F9' : '#0F172A' }}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography sx={{ fontSize: '0.72rem', color: p.color }}>{p.name}: <strong>{p.value}</strong></Typography>
        </Box>
      ))}
    </Box>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RehabProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <Box sx={{ minHeight: '100vh', direction: 'rtl' }}>

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          position: 'relative', borderRadius: '28px', overflow: 'hidden',
          mb: 3.5, p: { xs: 2.5, md: 3.5 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.15) 50%, rgba(99,102,241,0.12) 100%)'
            : 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.07) 50%, rgba(99,102,241,0.05) 100%)',
          border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Blobs */}
          {[
            { left: '-4%', top: '-15%', size: 280, color: 'rgba(16,185,129,0.15)' },
            { right: '-2%', bottom: '-10%', size: 220, color: 'rgba(6,182,212,0.12)' },
            { left: '45%', top: '10%', size: 180, color: 'rgba(99,102,241,0.1)' },
          ].map((b, i) => (
            <motion.div key={i}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 7 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', left: b.left, right: b.right, top: b.top, bottom: b.bottom,
                width: b.size, height: b.size, borderRadius: '50%',
                background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
          ))}

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '18px',
              background: GRADIENT, display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: `0 8px 24px ${GLOW}`, flexShrink: 0,
            }}>
              <AccessibilityNewIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' },
                background: GRADIENT,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                lineHeight: 1.2,
              }}>
                لوحة التأهيل الشاملة
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mt: 0.3 }}>
                متابعة شاملة لبرامج إعادة التأهيل والمرضى والنتائج العلاجية
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['التأهيل', 'Glassmorphism', 'RTL'].map((t, i) => (
                <Chip key={i} label={t} size="small" sx={{
                  fontSize: '0.72rem', fontWeight: 600, height: 24,
                  background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
                  color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
                }} />
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.5 }}
              >
                <GlassCard hoverGlow={`${kpi.color}44`} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '12px',
                      background: `${kpi.color}20`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${kpi.color}33`,
                    }}>
                      <Icon sx={{ fontSize: 20, color: kpi.color }} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
                    {kpi.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#CBD5E1' : '#374151', mt: 0.5, lineHeight: 1.3 }}>
                    {kpi.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', mt: 0.25 }}>
                    {kpi.sub}
                  </Typography>
                </GlassCard>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 2: Progress Chart + Outcome Pie ──────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Monthly Progress Chart */}
        <Grid item xs={12} md={7}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                📈 تقدم المرضى الشهري
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
                توزيع حالات المرضى خلال الأشهر الستة الماضية
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyProgress}>
                  <defs>
                    <linearGradient id="gMuhsin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gMustaqir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gMutabaah" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="مُحسّن" stroke="#10b981" strokeWidth={2.5} fill="url(#gMuhsin)" />
                  <Area type="monotone" dataKey="مستقر" stroke="#06b6d4" strokeWidth={2} fill="url(#gMustaqir)" />
                  <Area type="monotone" dataKey="محتاج_متابعة" stroke="#f59e0b" strokeWidth={2} fill="url(#gMutabaah)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>

        {/* Outcome Pie */}
        <Grid item xs={12} md={5}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                🎯 توزيع نتائج التأهيل
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 1 }}>
                النسب المئوية الحالية
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                      onMouseEnter={(_, idx) => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {outcomeData.map((entry, i) => (
                        <Cell
                          key={i} fill={entry.color}
                          opacity={activeIndex === null || activeIndex === i ? 1 : 0.5}
                          stroke={activeIndex === i ? '#fff' : 'transparent'}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}٪`} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {outcomeData.map((o, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: o.color }} />
                    <Typography sx={{ fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                      {o.name} ({o.value}٪)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Row 3: Radar + Bar Charts ──────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Radar: Rehab Areas */}
        <Grid item xs={12} md={5}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                🕸️ أداء مجالات التأهيل
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
                الحالي مقارنة بالمستهدف
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <Radar name="الحالي" dataKey="current" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                  <Radar name="المستهدف" dataKey="target" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={1.5} strokeDasharray="4 3" />
                  <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>

        {/* Bar: Rehab Types */}
        <Grid item xs={12} md={7}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                📊 إحصاءات أنواع التأهيل
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
                عدد المرضى والجلسات لكل نوع
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rehabTypes} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="type" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                  <Bar dataKey="مرضى" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="جلسات" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Row 4: Active Patients List ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <GlassCard sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
            👥 المرضى النشطون — تقدم التأهيل
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
            تفاصيل تقدم أبرز المرضى
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {activePatients.map((p, i) => (
              <Box key={i}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 40, height: 40, background: `${p.color}22`, color: p.color, fontWeight: 700, fontSize: '0.9rem', border: `2px solid ${p.color}44` }}>
                    {p.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                        {p.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>
                          {p.sessions} جلسة
                        </Typography>
                        <Chip label={p.status} size="small" sx={{
                          height: 18, fontSize: '0.6rem', fontWeight: 700,
                          backgroundColor: `${p.color}20`, color: p.color,
                          border: `1px solid ${p.color}33`,
                          '& .MuiChip-label': { px: 0.8 },
                        }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', whiteSpace: 'nowrap' }}>
                        {p.program}
                      </Typography>
                      <LinearProgress
                        variant="determinate" value={p.progress}
                        sx={{
                          flex: 1, height: 6, borderRadius: 3,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          '& .MuiLinearProgress-bar': { borderRadius: 3, background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}aa 100%)` },
                        }}
                      />
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: p.color, minWidth: 30 }}>
                        {p.progress}٪
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {i < activePatients.length - 1 && (
                  <Divider sx={{ mt: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
                )}
              </Box>
            ))}
          </Box>
        </GlassCard>
      </motion.div>
    </Box>
  );
}
