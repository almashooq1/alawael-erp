/**
 * 📋 ActivityFeed v4 — Premium Activity Feed
 * سجل الأنشطة بريميوم مع glassmorphism + gradient avatars + micro-animations
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  useTheme,
  Tabs,
  Tab,
  ButtonBase,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DynamicFeedRoundedIcon from '@mui/icons-material/DynamicFeedRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

/* ─────────────────────────────────────── */
const ACTION_CONFIG = {
  create:   { icon: <AddCircleRoundedIcon />,  gradient: 'linear-gradient(135deg,#43cea2,#185a9d)', glow: '#43cea2', label: 'إنشاء'         },
  update:   { icon: <EditRoundedIcon />,        gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', glow: '#4facfe', label: 'تعديل'         },
  delete:   { icon: <DeleteRoundedIcon />,      gradient: 'linear-gradient(135deg,#f5576c,#f093fb)', glow: '#f5576c', label: 'حذف'           },
  login:    { icon: <LoginRoundedIcon />,       gradient: 'linear-gradient(135deg,#667eea,#764ba2)', glow: '#667eea', label: 'تسجيل دخول'   },
  logout:   { icon: <LoginRoundedIcon />,       gradient: 'linear-gradient(135deg,#f7971e,#ffd200)', glow: '#f7971e', label: 'تسجيل خروج'   },
  security: { icon: <SecurityRoundedIcon />,    gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', glow: '#a18cd1', label: 'أمان'          },
  settings: { icon: <SettingsRoundedIcon />,    gradient: 'linear-gradient(135deg,#868f96,#596164)', glow: '#868f96', label: 'إعدادات'       },
  default:  { icon: <PersonIcon />,             gradient: 'linear-gradient(135deg,#667eea,#764ba2)', glow: '#667eea', label: 'نشاط'          },
};

const FILTER_TABS = [
  { key: 'all',    label: 'الكل'  },
  { key: 'data',   label: 'بيانات' },
  { key: 'auth',   label: 'تسجيل' },
  { key: 'system', label: 'نظام'  },
];

const getActionCategory = (action) => {
  if (!action) return 'data';
  const key = action.toLowerCase();
  if (['login', 'logout'].some(a => key.includes(a))) return 'auth';
  if (['security', 'settings'].some(a => key.includes(a))) return 'system';
  return 'data';
};

const getActionConfig = (action) => {
  if (!action) return ACTION_CONFIG.default;
  const key = action.toLowerCase();
  for (const [k, v] of Object.entries(ACTION_CONFIG)) {
    if (key.includes(k)) return v;
  }
  return ACTION_CONFIG.default;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ي`;
  return new Date(timestamp).toLocaleDateString('ar-SA');
};

const INITIAL_VISIBLE = 7;
const LOAD_MORE_STEP  = 5;

/* ─────────────────────────────────────── */
/*  Activity Row Item                      */
/* ─────────────────────────────────────── */
const ActivityItem = React.memo(({ activity, index, isDark }) => {
  const config = getActionConfig(activity.action);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25, delay: index * 0.035 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.2,
          mx: 0.5,
          my: 0.2,
          borderRadius: '12px',
          borderInlineStart: `3px solid transparent`,
          background: 'transparent',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          cursor: 'default',
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(102,126,234,0.04)',
            borderInlineStartColor: config.glow,
            transform: 'translateX(-2px)',
          },
        }}
      >
        {/* Gradient Avatar */}
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: config.gradient,
            boxShadow: `0 4px 12px ${config.glow}40`,
            flexShrink: 0,
            '& svg': { fontSize: 18, color: 'white' },
          }}
        >
          {config.icon}
        </Avatar>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Top row: user + badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.2 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}
              noWrap
            >
              {activity.user || 'النظام'}
            </Typography>
            <Chip
              label={config.label}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.58rem',
                fontWeight: 800,
                background: `${config.glow}18`,
                color: config.glow,
                border: `1px solid ${config.glow}30`,
                flexShrink: 0,
              }}
            />
          </Box>

          {/* Description */}
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block', lineHeight: 1.3 }}
            noWrap
          >
            {activity.description || activity.action || 'نشاط في النظام'}
          </Typography>
        </Box>

        {/* Timestamp */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.4,
          flexShrink: 0,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          borderRadius: '8px',
          px: 0.8, py: 0.3,
        }}>
          <AccessTimeRoundedIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem', fontWeight: 600 }}>
            {formatTimeAgo(activity.timestamp)}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
});

/* ─────────────────────────────────────── */
/*  Main Component                         */
/* ─────────────────────────────────────── */
const ActivityFeed = ({ activities = [], maxItems = 30 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [filterTab, setFilterTab] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const handleFilterChange = (_, v) => {
    setFilterTab(v);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const allFiltered = useMemo(() => {
    const filterKey = FILTER_TABS[filterTab]?.key || 'all';
    const all = activities.slice(0, maxItems);
    return filterKey === 'all' ? all : all.filter(a => getActionCategory(a.action) === filterKey);
  }, [activities, maxItems, filterTab]);

  const filteredItems = allFiltered.slice(0, visibleCount);
  const hasMore = visibleCount < allFiltered.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: isDark
            ? 'linear-gradient(145deg,rgba(15,20,40,0.97),rgba(20,15,45,0.97))'
            : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,248,255,0.97))',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 8px 32px rgba(102,126,234,0.08), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Top accent bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg,#667eea,#f093fb,#43cea2,#667eea)',
          backgroundSize: '200% auto',
          animation: 'afBar 4s linear infinite',
          '@keyframes afBar': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        }} />

        {/* Background orb */}
        <Box sx={{
          position: 'absolute', bottom: -60, insetInlineEnd: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          opacity: isDark ? 0.06 : 0.04,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        {/* ── Header ─────────────────────── */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 0, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: '12px',
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 14px rgba(102,126,234,0.4)',
              }}>
                <DynamicFeedRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>
                  آخر الأنشطة
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                  أحدث العمليات في النظام
                </Typography>
              </Box>
            </Box>

            {activities.length > 0 && (
              <Chip
                icon={<HistoryRoundedIcon sx={{ fontSize: '13px !important' }} />}
                label={`${activities.length}`}
                size="small"
                sx={{
                  height: 24, fontWeight: 800, fontSize: '0.72rem',
                  background: 'linear-gradient(135deg,#667eea,#764ba2)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 3px 10px rgba(102,126,234,0.35)',
                  '& .MuiChip-icon': { color: 'white' },
                }}
              />
            )}
          </Box>

          {/* ── Filter Tabs ──────────────── */}
          <Tabs
            value={filterTab}
            onChange={handleFilterChange}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 30,
              '& .MuiTabs-flexContainer': { gap: 0.5 },
              '& .MuiTab-root': {
                minHeight: 28,
                py: 0.3,
                px: 1.4,
                fontSize: '0.7rem',
                fontWeight: 700,
                minWidth: 'auto',
                borderRadius: '8px',
                color: 'text.secondary',
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  color: '#667eea',
                  background: 'rgba(102,126,234,0.1)',
                },
              },
              '& .MuiTabs-indicator': {
                display: 'none',
              },
            }}
          >
            {FILTER_TABS.map((tab) => (
              <Tab key={tab.key} label={tab.label} disableRipple={false} />
            ))}
          </Tabs>
        </Box>

        {/* ── Activity List ──────────────── */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          py: 0.5,
          position: 'relative', zIndex: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            background: 'rgba(102,126,234,0.25)',
          },
        }}>
          {filteredItems.length === 0 ? (
            <Box sx={{
              p: 5, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
            }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: '16px',
                background: 'rgba(102,126,234,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HistoryRoundedIcon sx={{ fontSize: 26, color: 'text.disabled' }} />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                لا توجد أنشطة {FILTER_TABS[filterTab]?.key !== 'all' ? 'في هذا التصنيف' : 'حديثة'}
              </Typography>
            </Box>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredItems.map((activity, i) => (
                <ActivityItem
                  key={activity.id || `${activity.action}-${i}`}
                  activity={activity}
                  index={i}
                  isDark={isDark}
                />
              ))}
            </AnimatePresence>
          )}
        </Box>

        {/* ── Load More ─────────────────── */}
        {hasMore && (
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <ButtonBase
              onClick={() => setVisibleCount(v => v + LOAD_MORE_STEP)}
              onKeyDown={(e) => { if (e.key === 'Enter') setVisibleCount(v => v + LOAD_MORE_STEP); }}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.6,
                py: 1.2,
                borderTop: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(102,126,234,0.1)',
                background: isDark ? 'rgba(102,126,234,0.05)' : 'rgba(102,126,234,0.03)',
                transition: 'all 0.2s',
                '&:hover': {
                  background: isDark ? 'rgba(102,126,234,0.1)' : 'rgba(102,126,234,0.07)',
                },
                position: 'relative', zIndex: 1,
              }}
            >
              <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: '#667eea' }} />
              <Typography variant="caption" sx={{
                fontWeight: 700,
                color: '#667eea',
                fontSize: '0.72rem',
              }}>
                عرض المزيد ({allFiltered.length - visibleCount} متبقي)
              </Typography>
            </ButtonBase>
          </motion.div>
        )}
      </Paper>
    </motion.div>
  );
};

export default React.memo(ActivityFeed);
