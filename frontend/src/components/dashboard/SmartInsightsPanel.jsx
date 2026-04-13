/**
 * 🧠 SmartInsightsPanel — لوحة الرؤى الذكية بالذكاء الاصطناعي
 * Premium AI-powered insights with anomaly detection, predictions & recommendations
 */

import React, { useState } from 'react';
import {
  Box, Paper, Typography, Chip, useTheme,
  IconButton, Tooltip, Collapse,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';

/* ─────────────────────────────────────── */
const INSIGHT_TYPES = {
  prediction: {
    icon: <ShowChartRoundedIcon />,
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    glow:     '#667eea',
    label:    'توقع',
    bg:       'rgba(102,126,234,0.08)',
  },
  anomaly: {
    icon: <WarningAmberRoundedIcon />,
    gradient: 'linear-gradient(135deg,#f7971e,#ffd200)',
    glow:     '#f7971e',
    label:    'شذوذ',
    bg:       'rgba(247,151,30,0.08)',
  },
  recommendation: {
    icon: <LightbulbRoundedIcon />,
    gradient: 'linear-gradient(135deg,#43cea2,#185a9d)',
    glow:     '#43cea2',
    label:    'توصية',
    bg:       'rgba(67,206,162,0.08)',
  },
  alert: {
    icon: <NotificationsActiveRoundedIcon />,
    gradient: 'linear-gradient(135deg,#f5576c,#f093fb)',
    glow:     '#f5576c',
    label:    'تنبيه',
    bg:       'rgba(245,87,108,0.08)',
  },
};

const DEMO_INSIGHTS = [
  {
    id: 1,
    type: 'prediction',
    title: 'توقع ارتفاع الطلب الأسبوع القادم',
    desc: 'بناءً على الأنماط التاريخية وسجلات الحضور، يُتوقع زيادة بنسبة 18% في جلسات التأهيل خلال الأسبوع القادم.',
    confidence: 87,
    impact: 'high',
    action: 'مراجعة جدول الأخصائيين',
  },
  {
    id: 2,
    type: 'anomaly',
    title: 'انخفاض غير مألوف في فرع جدة',
    desc: 'تراجع الحضور في فرع جدة بنسبة 34% عن المعدل الطبيعي في الأيام الثلاثة الماضية — يُنصح بالمراجعة الفورية.',
    confidence: 94,
    impact: 'critical',
    action: 'فتح تحقيق',
  },
  {
    id: 3,
    type: 'recommendation',
    title: 'تحسين توزيع الأخصائيين',
    desc: 'نموذج التحسين يقترح إعادة توزيع 3 أخصائيين من الفروع الأقل إشغالاً لتحسين الطاقة الاستيعابية بنسبة 22%.',
    confidence: 79,
    impact: 'medium',
    action: 'مراجعة التوزيع',
  },
  {
    id: 4,
    type: 'alert',
    title: 'اقتراب انتهاء صلاحية 12 عقداً',
    desc: 'يوجد 12 عقدًا مزمعًا تجديدها خلال الـ 30 يومًا القادمة بقيمة إجمالية 480,000 ر.س.',
    confidence: 100,
    impact: 'high',
    action: 'بدء التجديد',
  },
];

const CONFIDENCE_COLOR = (v) =>
  v >= 90 ? '#4caf50' : v >= 70 ? '#ff9800' : '#f44336';

const IMPACT_CONFIG = {
  critical: { label: 'حرج',   color: '#f44336', bg: 'rgba(244,67,54,0.1)'   },
  high:     { label: 'عالي',  color: '#ff9800', bg: 'rgba(255,152,0,0.1)'   },
  medium:   { label: 'متوسط', color: '#2196f3', bg: 'rgba(33,150,243,0.1)'  },
  low:      { label: 'منخفض', color: '#4caf50', bg: 'rgba(76,175,80,0.1)'   },
};

/* ─────────────────────────────────────── */
/*  Single Insight Card                    */
/* ─────────────────────────────────────── */
const InsightCard = ({ insight, index, isDark }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = INSIGHT_TYPES[insight.type] || INSIGHT_TYPES.recommendation;
  const imp = IMPACT_CONFIG[insight.impact] || IMPACT_CONFIG.medium;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <Box
        onClick={() => setExpanded(e => !e)}
        sx={{
          borderRadius: '14px',
          border: '1px solid',
          borderColor: isDark ? `${cfg.glow}22` : `${cfg.glow}18`,
          background: isDark
            ? `linear-gradient(135deg,rgba(15,20,40,0.8),rgba(20,15,45,0.8))`
            : `linear-gradient(135deg,rgba(255,255,255,0.9),rgba(250,250,255,0.9))`,
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          '&:hover': {
            borderColor: `${cfg.glow}40`,
            boxShadow: `0 8px 24px ${cfg.glow}18`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        {/* Glow accent line */}
        <Box sx={{
          height: '2px',
          background: cfg.gradient,
          opacity: 0.8,
        }} />

        <Box sx={{ p: 1.8 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
            {/* Icon */}
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: cfg.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 12px ${cfg.glow}35`,
              '& svg': { fontSize: 18, color: 'white' },
            }}>
              {cfg.icon}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Badges */}
              <Box sx={{ display: 'flex', gap: 0.6, mb: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={cfg.label}
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.58rem', fontWeight: 800,
                    background: cfg.bg,
                    color: cfg.glow,
                    border: `1px solid ${cfg.glow}30`,
                  }}
                />
                <Chip
                  label={imp.label}
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.58rem', fontWeight: 800,
                    background: imp.bg,
                    color: imp.color,
                    border: `1px solid ${imp.color}30`,
                  }}
                />
                {/* Confidence bar */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 0.8, borderRadius: '6px',
                  background: `${CONFIDENCE_COLOR(insight.confidence)}12`,
                  border: `1px solid ${CONFIDENCE_COLOR(insight.confidence)}25`,
                  height: 18,
                }}>
                  <Box sx={{
                    width: 28, height: 4, borderRadius: 2,
                    background: 'rgba(128,128,128,0.2)',
                    overflow: 'hidden',
                  }}>
                    <Box sx={{
                      width: `${insight.confidence}%`,
                      height: '100%',
                      background: CONFIDENCE_COLOR(insight.confidence),
                      borderRadius: 2,
                    }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: CONFIDENCE_COLOR(insight.confidence) }}>
                    {insight.confidence}%
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{
                fontSize: '0.78rem',
                fontWeight: 700,
                lineHeight: 1.3,
                color: isDark ? 'rgba(255,255,255,0.9)' : '#1a1a2e',
              }}>
                {insight.title}
              </Typography>
            </Box>

            <Box sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', flexShrink: 0, mt: 0.5 }}>
              {expanded
                ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} />
                : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />
              }
            </Box>
          </Box>

          {/* Expandable body */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 1.5, pl: '48px' }}>
              <Typography sx={{
                fontSize: '0.72rem',
                color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                lineHeight: 1.6,
                mb: 1.2,
              }}>
                {insight.desc}
              </Typography>

              {insight.action && (
                <Box
                  component={motion.div}
                  whileHover={{ x: -3 }}
                  whileTap={{ scale: 0.97 }}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.8,
                    px: 1.5, py: 0.6, borderRadius: '10px',
                    background: cfg.gradient,
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px ${cfg.glow}30`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>
                    {insight.action}
                  </Typography>
                  <ArrowForwardIosRoundedIcon sx={{ fontSize: 10, color: 'white' }} />
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      </Box>
    </motion.div>
  );
};

/* ─────────────────────────────────────── */
/*  Brain animation header                 */
/* ─────────────────────────────────────── */
const BrainOrb = ({ isDark }) => (
  <Box sx={{
    position: 'relative',
    width: 44, height: 44, flexShrink: 0,
  }}>
    {/* Rings */}
    {[0, 1, 2].map(i => (
      <Box key={i} sx={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        border: '1px solid rgba(102,126,234,0.3)',
        animation: `brainRing${i} ${2 + i * 0.6}s ease-in-out infinite`,
        [`@keyframes brainRing${i}`]: {
          '0%,100%': { transform: 'scale(1)', opacity: 0.3 },
          '50%': { transform: `scale(${1.2 + i * 0.15})`, opacity: 0.1 },
        },
      }} />
    ))}
    {/* Core */}
    <Box sx={{
      position: 'absolute', inset: 4,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,#667eea,#764ba2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(102,126,234,0.5)',
      animation: 'brainPulse 3s ease-in-out infinite',
      '@keyframes brainPulse': {
        '0%,100%': { boxShadow: '0 4px 16px rgba(102,126,234,0.5)' },
        '50%': { boxShadow: '0 6px 24px rgba(102,126,234,0.8)' },
      },
    }}>
      <PsychologyRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
    </Box>
  </Box>
);

/* ─────────────────────────────────────── */
/*  Main Component                         */
/* ─────────────────────────────────────── */
const SmartInsightsPanel = ({ insights, onRefresh, loading = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeFilter, setActiveFilter] = useState('all');

  const items = insights?.length ? insights : DEMO_INSIGHTS;

  const filtered = activeFilter === 'all'
    ? items
    : items.filter(i => i.type === activeFilter);

  const filters = [
    { key: 'all',            label: 'الكل',    count: items.length },
    { key: 'prediction',     label: 'توقعات',  count: items.filter(i => i.type === 'prediction').length },
    { key: 'anomaly',        label: 'شذوذات',  count: items.filter(i => i.type === 'anomaly').length },
    { key: 'recommendation', label: 'توصيات',  count: items.filter(i => i.type === 'recommendation').length },
    { key: 'alert',          label: 'تنبيهات', count: items.filter(i => i.type === 'alert').length },
  ].filter(f => f.count > 0 || f.key === 'all');

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          p: 2.5,
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(145deg,rgba(12,16,36,0.97),rgba(18,12,42,0.97))'
            : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,246,255,0.97))',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(102,126,234,0.2)' : 'rgba(102,126,234,0.12)',
          boxShadow: isDark
            ? '0 12px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(102,126,234,0.1)'
            : '0 12px 48px rgba(102,126,234,0.1), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Gradient top bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg,#667eea,#764ba2,#f093fb,#667eea)',
          backgroundSize: '200% auto',
          animation: 'aiBar 3s linear infinite',
          '@keyframes aiBar': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        }} />

        {/* Background mesh pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: isDark
            ? 'radial-gradient(circle at 20% 80%, rgba(102,126,234,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(240,147,251,0.04) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 80%, rgba(102,126,234,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(240,147,251,0.03) 0%, transparent 50%)',
        }} />

        {/* ── Header ────────────────────── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          mb: 2, position: 'relative', zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BrainOrb isDark={isDark} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>
                  الرؤى الذكية
                </Typography>
                <Chip
                  label="AI"
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.58rem', fontWeight: 900,
                    background: 'linear-gradient(135deg,#667eea,#764ba2)',
                    color: 'white', border: 'none',
                    boxShadow: '0 2px 8px rgba(102,126,234,0.4)',
                    letterSpacing: 0.5,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
                تحليل ذكي مستمر للبيانات والأنماط
              </Typography>
            </Box>
          </Box>

          <Tooltip title="تحديث التحليل">
            <IconButton
              onClick={onRefresh}
              size="small"
              sx={{
                width: 32, height: 32, borderRadius: '10px',
                border: '1px solid rgba(102,126,234,0.2)',
                background: 'rgba(102,126,234,0.08)',
                '&:hover': { background: 'rgba(102,126,234,0.15)' },
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
              }}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16, color: '#667eea' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Filter Pills ──────────────── */}
        <Box sx={{
          display: 'flex', gap: 0.7, mb: 2, flexWrap: 'wrap',
          position: 'relative', zIndex: 1,
        }}>
          {filters.map(f => {
            const isActive = activeFilter === f.key;
            const cfg = f.key !== 'all' ? INSIGHT_TYPES[f.key] : null;
            return (
              <motion.div key={f.key} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Box
                  onClick={() => setActiveFilter(f.key)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.6,
                    px: 1.2, py: 0.4, borderRadius: '10px',
                    cursor: 'pointer',
                    background: isActive
                      ? (cfg ? cfg.gradient : 'linear-gradient(135deg,#667eea,#764ba2)')
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    border: '1px solid',
                    borderColor: isActive
                      ? 'transparent'
                      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    transition: 'all 0.2s',
                    boxShadow: isActive
                      ? `0 3px 10px ${cfg?.glow || '#667eea'}35`
                      : 'none',
                  }}
                >
                  <Typography sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: isActive ? 'white' : 'text.secondary',
                  }}>
                    {f.label}
                  </Typography>
                  <Box sx={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography sx={{
                      fontSize: '0.55rem', fontWeight: 900,
                      color: isActive ? 'white' : 'text.disabled',
                    }}>
                      {f.count}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            );
          })}
        </Box>

        {/* ── Insight Cards ─────────────── */}
        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 1,
          position: 'relative', zIndex: 1,
          maxHeight: 400, overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            background: 'rgba(102,126,234,0.3)',
          },
        }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((insight, i) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                index={i}
                isDark={isDark}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 32, color: '#4caf50', mb: 1 }} />
              <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled', fontWeight: 600 }}>
                لا توجد رؤى في هذه الفئة
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── Footer: AI status ─────────── */}
        <Box sx={{
          mt: 2, pt: 1.5,
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#4caf50',
              boxShadow: '0 0 8px rgba(76,175,80,0.6)',
              animation: 'aiStatus 2s ease-in-out infinite',
              '@keyframes aiStatus': {
                '0%,100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }} />
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontWeight: 500 }}>
              نموذج الذكاء الاصطناعي نشط · يتعلم من بياناتك
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
            آخر تحليل: الآن
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default React.memo(SmartInsightsPanel);
