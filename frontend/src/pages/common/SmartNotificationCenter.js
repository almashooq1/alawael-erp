import { useState, useEffect } from 'react';
import smartNotificationsService from '../../services/smartNotifications.service';
import { useRealTimeNotifications, useSocketEmit } from '../../contexts/SocketContext';




import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors } from '../../theme/palette';

const demoNotifications = [
  {
    _id: 'n1',
    title: 'تذكير بموعد جلسة',
    body: 'لديك جلسة تأهيلية بعد ساعة مع المريض أحمد',
    type: 'reminder',
    read: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'n2',
    title: 'تم اعتماد طلب الإجازة',
    body: 'تم اعتماد طلب الإجازة الخاص بك من قبل المدير المباشر',
    type: 'approval',
    read: false,
    priority: 'normal',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'n3',
    title: 'تحديث النظام',
    body: 'سيتم تحديث النظام الليلة الساعة 11 مساءً',
    type: 'system',
    read: true,
    priority: 'low',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'n4',
    title: 'تقرير شهري جاهز',
    body: 'تقرير أداء شهر يناير جاهز للمراجعة',
    type: 'report',
    read: true,
    priority: 'normal',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    _id: 'n5',
    title: 'اعتماد أمر شراء',
    body: 'يرجى اعتماد أمر الشراء رقم PO-2026-045',
    type: 'approval',
    read: false,
    priority: 'high',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const typeIcons = {
  reminder: <ReminderIcon color="warning" />,
  approval: <ApprovalIcon color="success" />,
  system: <SystemIcon color="info" />,
  report: <NotifIcon color="primary" />,
};
const priorityColors = { high: 'error', normal: 'primary', low: 'default' };

export default function SmartNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    push: true,
    inApp: true,
  });
  const showSnackbar = useSnackbar();

  // ─── Real-time notifications via Socket.IO ───────────────────────────
  const { notifications: rtNotifications } = useRealTimeNotifications();
  const emit = useSocketEmit();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await smartNotificationsService.getAll();
        setNotifications(res.data || []);
      } catch {
        setNotifications(demoNotifications);
      }
    };
    loadData();
    // Request latest notifications via socket
    emit('notification:request', { limit: 50 });
  }, [emit]);

  // Merge real-time notifications into state
  useEffect(() => {
    if (rtNotifications.length > 0) {
      setNotifications(prev => {
        const ids = new Set(prev.map(n => n._id));
        const newOnes = rtNotifications.filter(n => !ids.has(n._id || n.id));
        if (newOnes.length > 0) {
          showSnackbar(`${newOnes.length} إشعار جديد`, 'info');
          return [...newOnes.map(n => ({ ...n, _id: n._id || n.id })), ...prev];
        }
        return prev;
      });
    }
  }, [rtNotifications, showSnackbar]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async id => {
    try {
      await smartNotificationsService.markAsRead(id);
    } catch {
      /* fallback: local-only */
    }
    setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    try {
      await smartNotificationsService.markAllAsRead();
    } catch {
      /* fallback: local-only */
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showSnackbar('تم تعليم جميع الإشعارات كمقروءة', 'success');
  };

  const deleteNotif = async id => {
    try {
      await smartNotificationsService.delete(id);
    } catch {
      /* fallback: local-only */
    }
    setNotifications(prev => prev.filter(n => n._id !== id));
    showSnackbar('تم حذف الإشعار', 'info');
  };

  const filtered =
    tab === 0
      ? notifications
      : tab === 1
        ? notifications.filter(n => !n.read)
        : tab === 2
          ? notifications.filter(n => n.type === 'approval')
          : notifications.filter(n => n.type === 'reminder');

  const timeSince = dateStr => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NotifIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              مركز الإشعارات الذكي
            </Typography>
            <Typography variant="body2">إدارة ومتابعة الإشعارات والتنبيهات</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
            <NotificationsActive />
          </Badge>
          مركز الإشعارات الذكي
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<MarkEmailRead />}
            onClick={markAllRead}
            sx={{ mr: 1 }}
          >
            تعليم الكل كمقروء
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsOpen(true)}
          >
            التفضيلات
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الإشعارات',
            value: notifications.length,
            color: statusColors.primaryBlue,
          },
          { label: 'غير مقروءة', value: unreadCount, color: statusColors.errorDark },
          {
            label: 'اعتمادات معلقة',
            value: notifications.filter(n => n.type === 'approval' && !n.read).length,
            color: statusColors.warningDarker,
          },
          {
            label: 'تذكيرات',
            value: notifications.filter(n => n.type === 'reminder').length,
            color: statusColors.successDeep,
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: s.color, fontWeight: 'bold' }}>
                  {s.value}
                </Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="الكل" />
          <Tab label={`غير مقروءة (${unreadCount})`} />
          <Tab label="اعتمادات" />
          <Tab label="تذكيرات" />
        </Tabs>
      </Paper>

      <Paper>
        <List>
          {filtered.map((n, i) => (
            <React.Fragment key={n._id}>
              {i > 0 && <Divider />}
              <ListItem
                sx={{ bgcolor: n.read ? 'transparent' : 'action.hover', cursor: 'pointer' }}
                onClick={() => markRead(n._id)}
              >
                <ListItemIcon>{typeIcons[n.type] || <NotifIcon />}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={n.read ? 'normal' : 'bold'}>{n.title}</Typography>
                      <Chip
                        label={
                          n.priority === 'high' ? 'عاجل' : n.priority === 'low' ? 'منخفض' : 'عادي'
                        }
                        color={priorityColors[n.priority]}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {n.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {timeSince(n.createdAt)}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    aria-label="حذف"
                    size="small"
                    color="error"
                    onClick={() => deleteNotif(n._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
          {filtered.length === 0 && (
            <ListItem>
              <ListItemText primary="لا توجد إشعارات" sx={{ textAlign: 'center' }} />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تفضيلات الإشعارات</DialogTitle>
        <DialogContent>
          {[
            { key: 'email', label: 'البريد الإلكتروني' },
            { key: 'sms', label: 'الرسائل النصية' },
            { key: 'push', label: 'إشعارات الدفع' },
            { key: 'inApp', label: 'داخل التطبيق' },
          ].map(ch => (
            <FormControlLabel
              key={ch.key}
              control={
                <Switch
                  checked={preferences[ch.key]}
                  onChange={e => setPreferences({ ...preferences, [ch.key]: e.target.checked })}
                />
              }
              label={ch.label}
              sx={{ display: 'block', mb: 1 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>إغلاق</Button>
          <Button
            variant="contained"
            onClick={() => {
              setSettingsOpen(false);
              showSnackbar('تم حفظ التفضيلات', 'success');
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
