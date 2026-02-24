/**
 * Notification Center Component
 * مركز الإشعارات
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  DoneAll as DoneAllIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import notificationService from '../../services/notificationService';
import './NotificationCenter.css';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statistics, setStatistics] = useState(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      setNotifications(response.notifications || []);

      const unread = response.notifications?.filter(n => !n.read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load preferences
  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const stats = await notificationService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();
    loadStatistics();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
      notificationService.playNotificationSound();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle delete
  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle preference update
  const handlePreferenceUpdate = async (updatedPrefs) => {
    try {
      await notificationService.updatePreferences(updatedPrefs);
      await loadPreferences();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  // Get icon by type
  const getIconByType = (type) => {
    switch (type) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // Get color by priority
  const getColorByPriority = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  // Filter notifications by tab
  const getFilteredNotifications = () => {
    switch (tabValue) {
      case 0: // All
        return notifications;
      case 1: // Unread
        return notifications.filter(n => !n.read);
      case 2: // Important
        return notifications.filter(n => n.priority === 'high' || n.priority === 'urgent');
      default:
        return notifications;
    }
  };

  // Render notification item
  const renderNotificationItem = (notification) => (
    <ListItem
      key={notification.id}
      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
      onClick={() => !notification.read && handleMarkAsRead(notification.id)}
    >
      <ListItemIcon>
        {getIconByType(notification.type)}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">{notification.title}</Typography>
            <Chip
              label={notification.priority}
              size="small"
              color={getColorByPriority(notification.priority)}
            />
          </Box>
        }
        secondary={
          <>
            <Typography variant="body2" color="text.secondary">
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(notification.created_at).toLocaleString('ar-SA')}
            </Typography>
          </>
        }
      />
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(notification.id);
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </ListItem>
  );

  // Render settings dialog
  const renderSettingsDialog = () => (
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">إعدادات الإشعارات</Typography>
          <IconButton onClick={() => setSettingsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {preferences && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>قنوات الإرسال</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.channels?.in_app || false}
                    onChange={(e) => handlePreferenceUpdate({
                      channels: { ...preferences.channels, in_app: e.target.checked }
                    })}
                  />
                }
                label="داخل التطبيق"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.channels?.email || false}
                    onChange={(e) => handlePreferenceUpdate({
                      channels: { ...preferences.channels, email: e.target.checked }
                    })}
                  />
                }
                label="البريد الإلكتروني"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.channels?.sms || false}
                    onChange={(e) => handlePreferenceUpdate({
                      channels: { ...preferences.channels, sms: e.target.checked }
                    })}
                  />
                }
                label="الرسائل النصية"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.channels?.push || false}
                    onChange={(e) => handlePreferenceUpdate({
                      channels: { ...preferences.channels, push: e.target.checked }
                    })}
                  />
                }
                label="الإشعارات الفورية"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>فئات الإشعارات</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.categories?.system || false}
                    onChange={(e) => handlePreferenceUpdate({
                      categories: { ...preferences.categories, system: e.target.checked }
                    })}
                  />
                }
                label="النظام"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.categories?.sales || false}
                    onChange={(e) => handlePreferenceUpdate({
                      categories: { ...preferences.categories, sales: e.target.checked }
                    })}
                  />
                }
                label="المبيعات"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.categories?.inventory || false}
                    onChange={(e) => handlePreferenceUpdate({
                      categories: { ...preferences.categories, inventory: e.target.checked }
                    })}
                  />
                }
                label="المخزون"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.categories?.hr || false}
                    onChange={(e) => handlePreferenceUpdate({
                      categories: { ...preferences.categories, hr: e.target.checked }
                    })}
                  />
                }
                label="الموارد البشرية"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.categories?.finance || false}
                    onChange={(e) => handlePreferenceUpdate({
                      categories: { ...preferences.categories, finance: e.target.checked }
                    })}
                  />
                }
                label="المالية"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>ساعات الهدوء</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.quiet_hours?.enabled || false}
                    onChange={(e) => handlePreferenceUpdate({
                      quiet_hours: { ...preferences.quiet_hours, enabled: e.target.checked }
                    })}
                  />
                }
                label="تفعيل ساعات الهدوء"
              />
              {preferences.quiet_hours?.enabled && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <TextField
                    label="من"
                    type="time"
                    value={preferences.quiet_hours?.start || '22:00'}
                    onChange={(e) => handlePreferenceUpdate({
                      quiet_hours: { ...preferences.quiet_hours, start: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="إلى"
                    type="time"
                    value={preferences.quiet_hours?.end || '08:00'}
                    onChange={(e) => handlePreferenceUpdate({
                      quiet_hours: { ...preferences.quiet_hours, end: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.sound || false}
                    onChange={(e) => handlePreferenceUpdate({ sound: e.target.checked })}
                  />
                }
                label="الصوت"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.vibration || false}
                    onChange={(e) => handlePreferenceUpdate({ vibration: e.target.checked })}
                  />
                }
                label="الاهتزاز"
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSettingsOpen(false)}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box className="notification-center">
      {/* Notification Bell Icon */}
      <IconButton
        color="inherit"
        onClick={handleMenuOpen}
        className="notification-bell"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Notification Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        className="notification-menu"
        PaperProps={{
          style: {
            width: 400,
            maxHeight: 600
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">الإشعارات</Typography>
            <Box>
              <IconButton size="small" onClick={handleMarkAllAsRead} title="تحديد الكل كمقروء">
                <DoneAllIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setSettingsOpen(true)} title="الإعدادات">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} variant="fullWidth">
            <Tab label={`الكل (${notifications.length})`} />
            <Tab label={`غير مقروءة (${unreadCount})`} />
            <Tab label="مهمة" />
          </Tabs>
        </Box>

        <Divider />

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {getFilteredNotifications().length > 0 ? (
            getFilteredNotifications().map(renderNotificationItem)
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">لا توجد إشعارات</Typography>
            </Box>
          )}
        </List>

        <Divider />

        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button size="small" fullWidth onClick={handleMenuClose}>
            إغلاق
          </Button>
        </Box>
      </Menu>

      {/* Settings Dialog */}
      {renderSettingsDialog()}

      {/* Statistics Section (for full page view) */}
      {statistics && window.location.pathname === '/notifications' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>الإحصائيات</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4">{statistics.total}</Typography>
                <Typography color="text.secondary">إجمالي الإشعارات</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">{statistics.read}</Typography>
                <Typography color="text.secondary">مقروءة</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">{statistics.unread}</Typography>
                <Typography color="text.secondary">غير مقروءة</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4">{Object.keys(statistics.by_category || {}).length}</Typography>
                <Typography color="text.secondary">الفئات</Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
