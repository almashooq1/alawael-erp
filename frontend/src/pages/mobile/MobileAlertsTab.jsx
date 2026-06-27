/**
 * MobileAlertsTab.jsx — التنبيهات
 * Notification list with badges, filtering, and quick actions
 */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Tabs,
  Tab,
  Badge,
  Avatar,
} from '@mui/material';
import {
  Notifications as AlertIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  DoneAll as MarkReadIcon,
  DeleteOutline as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { mockAlerts } from './mockData';

const alertTypeConfig = {
  error: { icon: <ErrorIcon />, color: 'error', label: 'خطأ' },
  warning: { icon: <WarningIcon />, color: 'warning', label: 'تنبيه' },
  success: { icon: <SuccessIcon />, color: 'success', label: 'نجاح' },
  info: { icon: <InfoIcon />, color: 'info', label: 'معلومة' },
};

export default function MobileAlertsTab({ onRefresh, refreshing }) {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [filterTab, setFilterTab] = useState('all');

  const filtered = alerts.filter((a) => {
    if (filterTab === 'unread') return !a.read;
    if (filterTab === 'read') return a.read;
    return true;
  });

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const markOneRead = (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const deleteAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <Box sx={{ px: 2, py: 2, pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
          التنبيهات
        </Typography>
        <Button
          size="small"
          startIcon={<MarkReadIcon />}
          onClick={markAllRead}
          disabled={unreadCount === 0}
          sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Tajawal, Cairo, sans-serif' }}
        >
          تعليم الكل مقروء
        </Button>
      </Box>

      {/* Filter Tabs */}
      <Tabs
        value={filterTab}
        onChange={(_e, v) => setFilterTab(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{ mb: 2, minHeight: 40, '& .MuiTabs-flexContainer': { gap: 0.5 } }}
      >
        {[
          { value: 'all', label: `الكل (${alerts.length})` },
          { value: 'unread', label: `غير مقروء (${unreadCount})` },
          { value: 'read', label: `مقروء (${alerts.length - unreadCount})` },
        ].map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={t.label}
            sx={{
              minHeight: 36,
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              fontFamily: 'Tajawal, Cairo, sans-serif',
            }}
          />
        ))}
      </Tabs>

      {/* Alerts List */}
      <AnimatePresence>
        {filtered.map((alert, i) => {
          const cfg = alertTypeConfig[alert.type] || alertTypeConfig.info;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              layout
            >
              <Card
                sx={{
                  borderRadius: 3,
                  mb: 1.5,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  bgcolor: alert.read ? 'background.paper' : 'action.hover',
                  borderRight: `3px solid`,
                  borderColor: `${cfg.color}.main`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } } }>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: `${cfg.color}.light`,
                        color: `${cfg.color}.main`,
                      }}
                    >
                      {React.cloneElement(cfg.icon, { fontSize: 'small' })}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={alert.read ? 500 : 700}
                          sx={{ fontFamily: 'Tajawal, Cairo, sans-serif', flex: 1 }}
                        >
                          {alert.title}
                        </Typography>
                        {!alert.read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: `${cfg.color}.main`,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontFamily: 'Tajawal, Cairo, sans-serif',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {alert.message}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                      {alert.time}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!alert.read && (
                        <IconButton
                          size="small"
                          onClick={() => markOneRead(alert.id)}
                          sx={{ width: 32, height: 32 }}
                          aria-label="تعليم مقروء"
                        >
                          <MarkReadIcon fontSize="small" color="action" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => deleteAlert(alert.id)}
                        sx={{ width: 32, height: 32 }}
                        aria-label="حذف"
                      >
                        <DeleteIcon fontSize="small" color="action" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AlertIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
            لا توجد تنبيهات
          </Typography>
        </Box>
      )}
    </Box>
  );
}
