/**
 * 📋 ActivityFeed v3 — Enhanced Activity Feed with Filter Tabs
 * سجل الأنشطة المحسّن مع تصنيف وفلترة
 */

import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, List, ListItem, ListItemAvatar, ListItemText,
  Avatar, Chip, Divider, useTheme, Tabs, Tab,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import LoginIcon from '@mui/icons-material/Login';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import { gradients, brandColors, statusColors, neutralColors } from '../../theme/palette';

const ACTION_CONFIG = {
  create: { icon: <AddCircleIcon />, color: brandColors.accentGreen, label: 'إنشاء' },
  update: { icon: <EditIcon />, color: brandColors.accentSky, label: 'تعديل' },
  delete: { icon: <DeleteIcon />, color: statusColors.error, label: 'حذف' },
  login:  { icon: <LoginIcon />, color: brandColors.primaryStart, label: 'تسجيل دخول' },
  logout: { icon: <LoginIcon />, color: statusColors.warning, label: 'تسجيل خروج' },
  security: { icon: <SecurityIcon />, color: statusColors.purple, label: 'أمان' },
  settings: { icon: <SettingsIcon />, color: neutralColors.fallback, label: 'إعدادات' },
  default: { icon: <PersonIcon />, color: brandColors.primaryStart, label: 'نشاط' },
};

const FILTER_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'data', label: 'بيانات' },
  { key: 'auth', label: 'تسجيل' },
  { key: 'system', label: 'نظام' },
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
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(timestamp).toLocaleDateString('ar-SA');
};

const INITIAL_VISIBLE = 6;
const LOAD_MORE_STEP = 6;

const ActivityFeed = ({ activities = [], maxItems = 30 }) => {
  const theme = useTheme();
  const [filterTab, setFilterTab] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  // Reset visible count when filter changes
  const handleFilterChange = (_, v) => {
    setFilterTab(v);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const allFiltered = useMemo(() => {
    const filterKey = FILTER_TABS[filterTab]?.key || 'all';
    const all = activities.slice(0, maxItems);
    if (filterKey === 'all') return all;
    return all.filter(a => getActionCategory(a.action) === filterKey);
  }, [activities, maxItems, filterTab]);

  const filteredItems = allFiltered.slice(0, visibleCount);
  const hasMore = visibleCount < allFiltered.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          height: '100%',
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
      >
        {/* Header + Count Badge */}
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                آخر الأنشطة
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                أحدث العمليات في النظام
              </Typography>
            </Box>
            {activities.length > 0 && (
              <Chip
                icon={<HistoryIcon sx={{ fontSize: '14px !important' }} />}
                label={`${activities.length} نشاط`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.7rem', borderColor: 'rgba(102,126,234,0.2)' }}
              />
            )}
          </Box>

          {/* Filter Tabs */}
          <Tabs
            value={filterTab}
            onChange={handleFilterChange}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              mt: 1,
              minHeight: 32,
              '& .MuiTab-root': {
                minHeight: 32,
                py: 0.5,
                px: 1.5,
                fontSize: '0.72rem',
                fontWeight: 700,
                minWidth: 'auto',
                borderRadius: 2,
                mr: 0.5,
              },
              '& .MuiTabs-indicator': {
                height: 2,
                borderRadius: 1,
                background: gradients.primary,
              },
            }}
          >
            {FILTER_TABS.map((tab) => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {filteredItems.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              لا توجد أنشطة {FILTER_TABS[filterTab]?.key !== 'all' ? 'في هذا التصنيف' : 'حديثة'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            <AnimatePresence mode="popLayout">
              {filteredItems.map((activity, i) => {
                const config = getActionConfig(activity.action);
                return (
                  <motion.div
                    key={activity.id || `${activity.action}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <ListItem
                      sx={{
                        py: 1.5,
                        px: 2.5,
                        transition: 'background 0.2s',
                        '&:hover': {
                          background: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.02)',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            background: `${config.color}15`,
                            color: config.color,
                          }}
                        >
                          {config.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {activity.user || 'النظام'}
                            </Typography>
                            <Chip
                              label={config.label}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: `${config.color}15`,
                                color: config.color,
                                border: 'none',
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.3 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: '70%' }} noWrap>
                              {activity.description || activity.action || ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', flexShrink: 0 }}>
                              {formatTimeAgo(activity.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {i < filteredItems.length - 1 && <Divider variant="inset" component="li" />}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </List>
        )}

        {/* Load More */}
        {hasMore && (
          <Box sx={{ textAlign: 'center', py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              onClick={() => setVisibleCount(v => v + LOAD_MORE_STEP)}
              sx={{
                cursor: 'pointer',
                fontWeight: 700,
                color: brandColors.primaryStart,
                fontSize: '0.75rem',
                '&:hover': { textDecoration: 'underline' },
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setVisibleCount(v => v + LOAD_MORE_STEP); }}
            >
              عرض المزيد ({allFiltered.length - visibleCount} متبقي)
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

export default React.memo(ActivityFeed);
