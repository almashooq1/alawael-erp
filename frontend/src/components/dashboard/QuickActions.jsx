/**
 * ⚡ QuickActions v4 — Premium Dashboard Quick Navigation
 * إجراءات سريعة محسّنة بتصميم بريميوم مع تأثيرات متطورة
 */

import React from 'react';
import { Box, Paper, Typography, Grid, ButtonBase, useTheme, Chip, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { gradients } from 'theme/palette';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import SchoolIcon from '@mui/icons-material/School';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BadgeIcon from '@mui/icons-material/Badge';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import BoltIcon from '@mui/icons-material/Bolt';

const QUICK_ACTIONS = [
  {
    label: 'مستخدم جديد',
    desc: 'إضافة مستخدم للنظام',
    icon: <PersonAddIcon />,
    path: '/admin-portal/users',
    gradient: gradients.primary,
    iconBg: 'rgba(99,102,241,0.12)',
    iconColor: '#6366F1',
    tag: null,
  },
  {
    label: 'تسجيل طالب',
    desc: 'تسجيل مستفيد جديد',
    icon: <SchoolIcon />,
    path: '/student-registration',
    gradient: gradients.accent,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    tag: 'جديد',
  },
  {
    label: 'إدارة الطلاب',
    desc: 'عرض وإدارة الطلاب',
    icon: <GroupsIcon />,
    path: '/student-management',
    gradient: gradients.success,
    iconBg: 'rgba(16,185,129,0.12)',
    iconColor: '#10B981',
    tag: null,
  },
  {
    label: 'المستفيدون',
    desc: 'إدارة بيانات المستفيدين',
    icon: <GroupsIcon />,
    path: '/beneficiaries',
    gradient: gradients.success,
    iconBg: 'rgba(16,185,129,0.12)',
    iconColor: '#10B981',
    tag: null,
  },
  {
    label: 'الجلسات',
    desc: 'جدولة وإدارة الجلسات',
    icon: <CalendarMonthIcon />,
    path: '/sessions',
    gradient: gradients.info,
    iconBg: 'rgba(14,165,233,0.12)',
    iconColor: '#0EA5E9',
    tag: null,
  },
  {
    label: 'المدفوعات',
    desc: 'متابعة الفواتير',
    icon: <ReceiptLongIcon />,
    path: '/finance',
    gradient: gradients.warning,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    tag: null,
  },
  {
    label: 'التقارير',
    desc: 'تقارير وتحليلات شاملة',
    icon: <AssessmentIcon />,
    path: '/reports',
    gradient: gradients.ocean,
    iconBg: 'rgba(14,165,233,0.12)',
    iconColor: '#0EA5E9',
    tag: 'مُحدّث',
  },
  {
    label: 'الموارد البشرية',
    desc: 'الموظفون والحضور',
    icon: <BadgeIcon />,
    path: '/hr',
    gradient: gradients.info,
    iconBg: 'rgba(99,102,241,0.12)',
    iconColor: '#6366F1',
    tag: null,
  },
  {
    label: 'سلسلة التوريد',
    desc: 'الموردون والمخزون',
    icon: <LocalShippingIcon />,
    path: '/procurement',
    gradient: gradients.orange,
    iconBg: 'rgba(249,115,22,0.12)',
    iconColor: '#F97316',
    tag: null,
  },
  {
    label: 'التعليم',
    desc: 'المنصة التعليمية',
    icon: <SchoolIcon />,
    path: '/elearning',
    gradient: gradients.accent,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    tag: null,
  },
  {
    label: 'المراقبة',
    desc: 'مراقبة أداء النظام',
    icon: <MonitorHeartIcon />,
    path: '/monitoring',
    gradient: gradients.success,
    iconBg: 'rgba(16,185,129,0.12)',
    iconColor: '#10B981',
    tag: null,
  },
  {
    label: 'الإعدادات',
    desc: 'إعدادات الحساب',
    icon: <SettingsIcon />,
    path: '/profile',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
    iconBg: 'rgba(100,116,139,0.12)',
    iconColor: '#64748B',
    tag: null,
  },
];

// ─── Single Action Card ────────────────────────────────────────────────────────
function ActionCard({ action, index, isDark }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      <ButtonBase
        onClick={() => navigate(action.path)}
        aria-label={`${action.label} — ${action.desc}`}
        sx={{
          width: '100%',
          borderRadius: '14px',
          p: 0,
          display: 'block',
          textAlign: 'right',
          overflow: 'hidden',
          position: 'relative',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
          background: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
          boxShadow: isDark
            ? '0 1px 3px rgba(0,0,0,0.3)'
            : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.25s ease',
          '&:hover': {
            border: `1px solid ${action.iconColor}40`,
            boxShadow: isDark
              ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${action.iconColor}20`
              : `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${action.iconColor}20`,
            '& .action-arrow': { opacity: 1, transform: 'translateX(-3px)' },
            '& .action-icon-wrap': {
              background: action.gradient,
              '& svg': { color: '#FFFFFF !important' },
            },
          },
        }}
      >
        {/* Top color bar */}
        <Box
          sx={{
            height: 3,
            background: action.gradient,
            opacity: 0.8,
          }}
        />

        {/* Tag badge */}
        {action.tag && (
          <Chip
            label={action.tag}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 10,
              height: 17,
              fontSize: '0.57rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #F43F5E, #EC4899)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(244,63,94,0.4)',
              '& .MuiChip-label': { px: 0.75 },
              zIndex: 1,
            }}
          />
        )}

        {/* Content */}
        <Box sx={{ p: 2, pt: 1.75, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.25 }}>
          {/* Icon */}
          <Box
            className="action-icon-wrap"
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: action.iconBg,
              border: `1px solid ${action.iconColor}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              '& svg': {
                fontSize: 20,
                color: `${action.iconColor} !important`,
                transition: 'color 0.25s ease',
              },
            }}
          >
            {action.icon}
          </Box>

          {/* Text */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: isDark ? '#F1F5F9' : '#1E293B',
                lineHeight: 1.3,
                mb: 0.35,
              }}
            >
              {action.label}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
                lineHeight: 1.4,
              }}
            >
              {action.desc}
            </Typography>
          </Box>

          {/* Arrow */}
          <ArrowForwardIosIcon
            className="action-arrow"
            sx={{
              fontSize: 10,
              color: action.iconColor,
              opacity: 0,
              transition: 'all 0.25s ease',
              transform: 'translateX(0)',
              alignSelf: 'flex-end',
            }}
          />
        </Box>
      </ButtonBase>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const QuickActions = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          p: 3,
          background: isDark
            ? 'rgba(15, 23, 42, 0.7)'
            : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)'}`,
          boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.3)'
            : '0 4px 24px rgba(99,102,241,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background accent */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundImage: isDark
              ? 'radial-gradient(circle at 100% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)'
              : 'radial-gradient(circle at 100% 0%, rgba(99,102,241,0.04) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}
              >
                <BoltIcon sx={{ fontSize: 16, color: '#FFFFFF' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: isDark ? '#F1F5F9' : '#1E293B',
                  letterSpacing: '-0.01em',
                }}
              >
                إجراءات سريعة
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                pr: 0.5,
              }}
            >
              وصول مباشر لأهم وظائف النظام
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.15,
                  borderRadius: '5px',
                  backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : alpha('#6366F1', 0.08),
                  color: '#6366F1',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {QUICK_ACTIONS.length}
              </Box>
            </Typography>
          </Box>
        </Box>

        {/* Grid */}
        <Grid container spacing={1.5}>
          {QUICK_ACTIONS.map((action, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <ActionCard action={action} index={i} isDark={isDark} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default React.memo(QuickActions);
