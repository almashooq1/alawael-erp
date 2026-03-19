import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Badge,
  Popover,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  ListItemAvatar,
  Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  EventNote as EventNoteIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
// Helper to get icon for notification type
function getNotificationIcon(type) {
  switch (type) {
    case 'attendance':
      return <EventNoteIcon />;
    case 'absence':
      return <CancelIcon color="error" />;
    case 'document':
      return <DescriptionIcon color="primary" />;
    case 'task':
      return <DoneAllIcon color="action" />;
    case 'urgent':
      return <NotificationsIcon color="error" />;
    case 'success':
      return <DoneAllIcon color="success" />;
    case 'approval':
      return <InfoIcon color="info" />;
    case 'sla_breach':
      return <InfoIcon color="warning" />;
    default:
      return <NotificationsIcon />;
  }
}

/**
 * Smart Notification Panel Component
 * مكون لوحة النوتيفيكيشنات الذكية
 */
function SmartNotificationPanel({ userId = 'user1' }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    hasMore,
    page,
    setPage,
    preferences,
    updatePreferences,
    notify,
    error,
  } = useNotifications();


  const handleClearAll = () => {
    // Optional: implement clear all via context if available
    notify('تم مسح جميع الإشعارات (تجريبي)', 'info');
  };

  // Stats calculation can be derived from notifications if needed
  const stats = React.useMemo(() => {
    const s = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {},
      urgent: 0,
      today: 0
    };
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    notifications.forEach((n) => {
      s.byType[n.type] = (s.byType[n.type] || 0) + 1;
      if (n.priority >= 4) s.urgent++;
      if (n.createdAt && (now - new Date(n.createdAt).getTime() < oneDay)) s.today++;
    });
    return s;
  }, [notifications]);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      notify('تم وضع علامة على أنها مقروءة', 'success');
    } catch (error) {
      notify('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    notify('حذف الإشعار غير مدعوم في السياق الحالي', 'info');
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.isRead).map(n => markAsRead(n.id)));
      notify('تم وضع علامة على الكل كمقروء', 'success');
    } catch (error) {
      notify('خطأ في التحديث', 'error');
    }
  };

  const handleOpenDetails = (notification) => {
    setSelectedNotification(notification);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedNotification(null);
  };

  // Snackbar handled by NotificationContext

  const getPriorityColor = (priority) => {
    if (priority >= 4) return 'error';
    if (priority >= 3) return 'warning';
    return 'info';
  };

  const open = Boolean(anchorEl);

  // Filtered notifications
  const filteredNotifications = notifications.filter(n =>
    (filterType === 'all' || n.type === filterType) &&
    (search.trim() === '' || (n.title && n.title.includes(search)) || (n.message && n.message.includes(search)))
  );

  return (
    <>
      {/* Notification Button */}
      <IconButton
        onClick={handleOpenMenu}
        sx={{ position: 'relative', color: 'primary.main' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      {/* Notification Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 480, maxHeight: 650, overflow: 'auto' }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">الإشعارات</Typography>
              <Box>
                <IconButton size="small" onClick={handleMarkAllAsRead} title="تعليم الكل كمقروء">
                  <DoneAllIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleClearAll} title="مسح الكل">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            {/* Search and Filter */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
              />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
              >
                <option value="all">الكل</option>
                <option value="attendance">الحضور</option>
                <option value="absence">الغياب</option>
                <option value="document">المستندات</option>
                <option value="task">المهام</option>
                <option value="urgent">عاجل</option>
                <option value="success">نجاح</option>
                <option value="approval">موافقة</option>
                <option value="sla_breach">SLA</option>
              </select>
            </Box>
            {/* Stats */}
            {stats && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={`الإجمالي: ${stats.total}`} variant="outlined" />
                <Chip size="small" label={`غير مقروء: ${stats.unread}`} color="primary" variant="outlined" />
                {stats.urgent > 0 && (
                  <Chip size="small" label={`عاجل: ${stats.urgent}`} color="error" variant="outlined" />
                )}
              </Box>
            )}
          </Box>
          {/* Loading and Error States */}
          {loading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">Loading...</Typography>
            </Box>
          )}
          {error && !loading && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{typeof error === 'string' ? error : (error && error.message) || 'Failed to load'}</Typography>
            </Box>
          )}
          {/* Notification List */}
          {!loading && !error && filteredNotifications.length > 0 && (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: notification.isRead ? 'transparent' : '#f5f5f5',
                    '&:hover': { backgroundColor: '#f0f0f0' },
                    cursor: 'pointer',
                  }}
                  onClick={() => handleOpenDetails(notification)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getPriorityColor(notification.priority) }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={notification.title}
                    secondary={notification.message}
                    primaryTypographyProps={{ fontWeight: notification.isRead ? 'normal' : 'bold' }}
                  />
                  <Box>
                    {!notification.isRead && (
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title="وضع علامة كمقروء"
                      >
                        <DoneAllIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      title="حذف"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
          {!loading && !error && filteredNotifications.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <InfoIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="textSecondary">لا توجد إشعارات</Typography>
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  );
}

export default SmartNotificationPanel;
