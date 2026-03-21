/**
 * WorkflowNotificationPrefs – تفضيلات الإشعارات
 * Per-user notification preferences for workflow events.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const CHANNELS = [
  { key: 'inApp', label: 'داخل التطبيق', icon: <DesktopWindows fontSize="small" /> },
  { key: 'email', label: 'البريد الإلكتروني', icon: <Email fontSize="small" /> },
  { key: 'sms', label: 'رسالة SMS', icon: <Sms fontSize="small" /> },
];

const EVENT_GROUPS = [
  {
    group: 'المهام',
    icon: <Assignment />,
    color: '#2563eb',
    events: [
      { key: 'task_assigned', label: 'تمّ تعيين مهمة لي' },
      { key: 'task_completed', label: 'مهمة أكملتها تمّ مراجعتها' },
      { key: 'task_overdue', label: 'مهمة تأخرت عن الموعد' },
      { key: 'task_reassigned', label: 'تمّ إعادة تعيين مهمة' },
    ],
  },
  {
    group: 'سير العمل',
    icon: <Description />,
    color: '#6366f1',
    events: [
      { key: 'instance_started', label: 'بدء سير عمل جديد' },
      { key: 'instance_completed', label: 'اكتمال سير عمل' },
      { key: 'instance_cancelled', label: 'إلغاء سير عمل' },
      { key: 'instance_suspended', label: 'تعليق سير عمل' },
    ],
  },
  {
    group: 'المواعيد و SLA',
    icon: <Flag />,
    color: '#dc2626',
    events: [
      { key: 'sla_warning', label: 'تحذير SLA (اقتراب الموعد)' },
      { key: 'sla_violated', label: 'انتهاك SLA' },
      { key: 'deadline_approaching', label: 'موعد نهائي يقترب' },
    ],
  },
  {
    group: 'التفويضات والتذكيرات',
    icon: <AccessAlarm />,
    color: '#f59e0b',
    events: [
      { key: 'delegation_activated', label: 'تفعيل تفويض' },
      { key: 'delegation_expired', label: 'انتهاء تفويض' },
      { key: 'reminder_triggered', label: 'تذكير' },
    ],
  },
  {
    group: 'التعليقات',
    icon: <Comment />,
    color: '#0891b2',
    events: [
      { key: 'comment_added', label: 'تعليق جديد على مهمتي' },
      { key: 'comment_reply', label: 'رد على تعليقي' },
      { key: 'comment_mention', label: 'تمّت الإشارة إليّ' },
    ],
  },
];

const buildDefaults = () => {
  const prefs = {};
  EVENT_GROUPS.forEach(g =>
    g.events.forEach(e => {
      prefs[e.key] = { inApp: true, email: false, sms: false };
    })
  );
  return prefs;
};

export default function WorkflowNotificationPrefs() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(buildDefaults);

  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getNotifPrefs();
      const data = res.data?.data?.preferences || res.data?.preferences || {};
      setPrefs(p => ({ ...p, ...data }));
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const toggle = (eventKey, channel) => {
    setPrefs(p => ({
      ...p,
      [eventKey]: { ...p[eventKey], [channel]: !p[eventKey]?.[channel] },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await workflowService.updateNotifPrefs({ preferences: prefs });
      showSnackbar('تم حفظ تفضيلات الإشعارات', 'success');
    } catch {
      showSnackbar('خطأ في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const enableAll = channel => {
    setPrefs(p => {
      const next = { ...p };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], [channel]: true };
      });
      return next;
    });
  };
  const disableAll = channel => {
    setPrefs(p => {
      const next = { ...p };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], [channel]: false };
      });
      return next;
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <Notifications sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              تفضيلات الإشعارات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تحكم في الإشعارات التي تتلقاها لأحداث سير العمل
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </Button>
          <Tooltip title="إعادة تحميل">
            <IconButton onClick={fetchPrefs}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        اختر قنوات الإشعار لكل نوع حدث. الإشعارات داخل التطبيق تظهر في لوحة الإشعارات.
      </Alert>

      {/* QUICK ACTIONS */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ mr: 2 }}>
          إجراءات سريعة:
        </Typography>
        {CHANNELS.map(ch => (
          <Box key={ch.key} sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={ch.icon}
              onClick={() => enableAll(ch.key)}
            >
              تفعيل كل {ch.label}
            </Button>
            <Button size="small" color="inherit" onClick={() => disableAll(ch.key)}>
              إلغاء
            </Button>
          </Box>
        ))}
      </Paper>

      {/* EVENT GROUPS */}
      {loading ? (
        <Box>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={200} sx={{ mb: 2, borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <Stack spacing={2}>
          {EVENT_GROUPS.map(group => (
            <Paper key={group.group}>
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: alpha(group.color, 0.04),
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: alpha(group.color, 0.15),
                    color: group.color,
                    width: 36,
                    height: 36,
                  }}
                >
                  {group.icon}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={700}>
                  {group.group}
                </Typography>
              </Box>
              <Divider />
              {group.events.map((ev, i) => (
                <Box key={ev.key}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {ev.label}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      {CHANNELS.map(ch => (
                        <Box
                          key={ch.key}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}
                        >
                          {ch.icon}
                          <Switch
                            size="small"
                            checked={!!prefs[ev.key]?.[ch.key]}
                            onChange={() => toggle(ev.key, ch.key)}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  {i < group.events.length - 1 && <Divider />}
                </Box>
              ))}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
