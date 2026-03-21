/**
 * 🔔 NotificationCenter — مركز الإشعارات المتقدم
 * Professional notification management panel with categories, search, and actions
 */
import { useState, useMemo, useCallback } from 'react';
import { useTheme,
} from '@mui/material';
import { gradients, statusColors } from 'theme/palette';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import PaymentIcon from '@mui/icons-material/Payment';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: <NotificationsActiveIcon fontSize="small" /> },
  { id: 'system', label: 'النظام', icon: <InfoOutlinedIcon fontSize="small" /> },
  { id: 'security', label: 'الأمان', icon: <SecurityIcon fontSize="small" /> },
  { id: 'finance', label: 'المالية', icon: <PaymentIcon fontSize="small" /> },
  { id: 'hr', label: 'الموارد البشرية', icon: <GroupIcon fontSize="small" /> },
  { id: 'appointments', label: 'المواعيد', icon: <EventIcon fontSize="small" /> },
];

const SEVERITY_CONFIG = {
  critical: { color: statusColors.error, icon: <ErrorOutlineIcon />, label: 'حرج', gradient: gradients.danger },
  warning: { color: statusColors.warning, icon: <WarningAmberIcon />, label: 'تحذير', gradient: gradients.warning },
  info: { color: statusColors.info, icon: <InfoOutlinedIcon />, label: 'معلومة', gradient: gradients.info },
  success: { color: statusColors.success, icon: <CheckCircleOutlineIcon />, label: 'نجاح', gradient: gradients.success },
};

// Sample notifications for demo
const SAMPLE_NOTIFICATIONS = [
  { id: 1, title: 'تحديث أمني مهم', message: 'تم تطبيق تحديث أمني جديد على النظام. يرجى مراجعة سياسات الأمان.', category: 'security', severity: 'critical', time: new Date(Date.now() - 300000), read: false },
  { id: 2, title: 'فاتورة جديدة معلقة', message: 'فاتورة #INV-2026-0412 بقيمة 25,000 ر.س بانتظار الموافقة.', category: 'finance', severity: 'warning', time: new Date(Date.now() - 1800000), read: false },
  { id: 3, title: 'موعد جلسة قادم', message: 'جلسة علاج طبيعي للمستفيد أحمد محمد خلال 30 دقيقة.', category: 'appointments', severity: 'info', time: new Date(Date.now() - 3600000), read: false },
  { id: 4, title: 'نسخة احتياطية مكتملة', message: 'تمت النسخة الاحتياطية اليومية بنجاح. الحجم: 2.4 جيجا.', category: 'system', severity: 'success', time: new Date(Date.now() - 7200000), read: true },
  { id: 5, title: 'طلب إجازة جديد', message: 'طلب إجازة من الموظف فاطمة العلي بانتظار الموافقة.', category: 'hr', severity: 'info', time: new Date(Date.now() - 10800000), read: true },
  { id: 6, title: 'تنبيه حد الميزانية', message: 'اقتربت ميزانية قسم التأهيل من 85% من الحد المسموح.', category: 'finance', severity: 'warning', time: new Date(Date.now() - 14400000), read: false },
  { id: 7, title: 'محاولة تسجيل دخول مشبوهة', message: 'تم رصد 3 محاولات فاشلة من عنوان IP غير معروف.', category: 'security', severity: 'critical', time: new Date(Date.now() - 18000000), read: false },
  { id: 8, title: 'اكتمال تقرير الأداء', message: 'تم إنشاء تقرير الأداء الشهري لشهر فبراير 2026.', category: 'system', severity: 'success', time: new Date(Date.now() - 21600000), read: true },
];

const formatNotificationTime = (date) => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
};

const NotificationCenter = ({ alerts = [], onMarkAllRead }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  // Merge external alerts with sample data
  const allNotifications = useMemo(() => {
    const external = alerts.map((a, i) => ({
      id: `ext-${a.id || i}`,
      title: a.title || a.message?.substring(0, 40),
      message: a.message,
      category: a.category || 'system',
      severity: a.severity || 'info',
      time: a.time ? new Date(a.time) : new Date(),
      read: a.read || false,
    }));
    return [...external, ...SAMPLE_NOTIFICATIONS].sort((a, b) => b.time - a.time);
  }, [alerts]);

  const filtered = useMemo(() => {
    let result = allNotifications;
    if (activeTab !== 'all') result = result.filter(n => n.category === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allNotifications, activeTab, searchQuery]);

  const unreadCount = useMemo(
    () => allNotifications.filter(n => !n.read).length,
    [allNotifications]
  );

  const toggleItem = useCallback((id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: gradients.primary,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsActiveIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Badge>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                مركز الإشعارات
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
                {unreadCount} إشعار غير مقروء من أصل {allNotifications.length}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}>
              <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="تعيين الكل كمقروء">
              <IconButton size="small" sx={{ color: '#fff' }} onClick={onMarkAllRead}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={expanded ? 'طي' : 'توسيع'}>
              <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={expanded}>
          {/* Search */}
          <Box sx={{ p: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث في الإشعارات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, fontSize: '0.85rem' },
              }}
            />
          </Box>

          {/* Category Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 1,
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0 },
            }}
          >
            {CATEGORIES.map(cat => (
              <Tab
                key={cat.id}
                value={cat.id}
                icon={cat.icon}
                iconPosition="start"
                label={cat.label}
              />
            ))}
          </Tabs>
          <Divider />

          {/* Notification List */}
          <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
            <AnimatePresence>
              {filtered.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">لا توجد إشعارات</Typography>
                </Box>
              )}
              {filtered.map((notif, i) => {
                const severity = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <ListItem
                      alignItems="flex-start"
                      onClick={() => toggleItem(notif.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: !notif.read
                          ? isDark ? 'rgba(102, 126, 234, 0.08)' : 'rgba(102, 126, 234, 0.04)'
                          : 'transparent',
                        borderRight: !notif.read ? `3px solid ${severity.color}` : '3px solid transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            background: `${severity.color}18`,
                            color: severity.color,
                          }}
                        >
                          {severity.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                            <Typography variant="body2" sx={{ fontWeight: notif.read ? 500 : 700, fontSize: '0.85rem' }}>
                              {notif.title}
                            </Typography>
                            <Chip
                              label={severity.label}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: `${severity.color}18`,
                                color: severity.color,
                                fontWeight: 700,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Collapse in={!!expandedItems[notif.id]}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                {notif.message}
                              </Typography>
                            </Collapse>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                              {formatNotificationTime(notif.time)}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {i < filtered.length - 1 && <Divider variant="inset" component="li" />}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </List>

          {/* Footer */}
          <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
            <Button size="small" sx={{ fontSize: '0.75rem' }}>
              عرض جميع الإشعارات ({allNotifications.length})
            </Button>
          </Box>
        </Collapse>
      </Paper>
    </motion.div>
  );
};

export default NotificationCenter;
