/**
 * ⚡ QuickActions v3 — Enhanced Dashboard Quick Navigation
 * إجراءات سريعة محسّنة مع وصف وتأثيرات
 */

import React from 'react';
import { useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { gradients, statusColors } from 'theme/palette';

const QUICK_ACTIONS = [
  { label: 'مستخدم جديد', desc: 'إضافة مستخدم للنظام', icon: <PersonAddIcon />, path: '/admin-portal/users', gradient: gradients.primary, tag: null },
  { label: 'تسجيل طالب', desc: 'تسجيل مستفيد جديد', icon: <SchoolIcon />, path: '/student-registration', gradient: gradients.accent, tag: 'جديد' },
  { label: 'إدارة الطلاب', desc: 'عرض وإدارة الطلاب', icon: <GroupsIcon />, path: '/student-management', gradient: gradients.success, tag: null },
  { label: 'المستفيدون', desc: 'إدارة بيانات المستفيدين', icon: <GroupsIcon />, path: '/beneficiaries', gradient: gradients.success, tag: null },
  { label: 'الجلسات', desc: 'جدولة وإدارة الجلسات', icon: <CalendarMonthIcon />, path: '/sessions', gradient: gradients.info, tag: null },
  { label: 'المدفوعات', desc: 'متابعة الفواتير والمدفوعات', icon: <ReceiptLongIcon />, path: '/finance', gradient: gradients.warning, tag: null },
  { label: 'التقارير', desc: 'تقارير وتحليلات شاملة', icon: <AssessmentIcon />, path: '/reports', gradient: gradients.ocean, tag: 'مُحدّث' },
  { label: 'الموارد البشرية', desc: 'الموظفون والحضور', icon: <BadgeIcon />, path: '/hr', gradient: gradients.info, tag: null },
  { label: 'سلسلة التوريد', desc: 'الموردون والمخزون', icon: <LocalShippingIcon />, path: '/procurement', gradient: gradients.orange, tag: null },
  { label: 'التعليم', desc: 'المنصة التعليمية', icon: <SchoolIcon />, path: '/elearning', gradient: gradients.accent, tag: null },
  { label: 'المراقبة', desc: 'مراقبة أداء النظام', icon: <MonitorHeartIcon />, path: '/monitoring', gradient: gradients.success, tag: null },
  { label: 'الإعدادات', desc: 'إعدادات الحساب والنظام', icon: <SettingsIcon />, path: '/profile', gradient: gradients.settings, tag: null },
];

const QuickActions = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            إجراءات سريعة
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            وصول سريع لأهم الوظائف — {QUICK_ACTIONS.length} إجراء متاح
          </Typography>
        </Box>

        <Grid container spacing={1.5}>
          {QUICK_ACTIONS.map((action, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
              >
                <ButtonBase
                  onClick={() => navigate(action.path)}
                  aria-label={`${action.label} — ${action.desc}`}
                  sx={{
                    width: '100%',
                    borderRadius: 3,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.8,
                    position: 'relative',
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.015)',
                    border: '1px solid transparent',
                    transition: 'all 0.3s',
                    '&:hover': {
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(102,126,234,0.05)',
                      borderColor: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(102,126,234,0.15)',
                      '& .action-arrow': {
                        opacity: 1,
                        transform: 'translateX(4px)',
                      },
                    },
                  }}
                >
                  {action.tag && (
                    <Chip
                      label={action.tag}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        height: 18,
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${statusColors.error}, ${statusColors.pink})`,
                        color: 'white',
                        '& .MuiChip-label': { px: 0.8 },
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2.5,
                      background: action.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      '& svg': { fontSize: 22 },
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'text.primary',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}
                  >
                    {action.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.62rem',
                      color: 'text.disabled',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {action.desc}
                  </Typography>
                  <ArrowBackIcon
                    className="action-arrow"
                    sx={{
                      fontSize: 14,
                      color: 'text.disabled',
                      opacity: 0,
                      transition: 'all 0.3s',
                      transform: 'translateX(0)',
                    }}
                  />
                </ButtonBase>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default React.memo(QuickActions);
