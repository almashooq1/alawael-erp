/**
 * WhatsAppDashboard — لوحة تحكم واتساب بالذكاء الاصطناعي
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * شاشة موحدة لإدارة محادثات واتساب مع المستفيدين وذويهم:
 *  - قائمة المحادثات مع شارات الرسائل غير المقروءة
 *  - عرض الرسائل مع AI intent badges
 *  - مقترحات الردود الذكية
 *  - إرسال الرسائل والقوالب
 *  - لوحة التحليلات والمؤشرات
 *  - تنبيهات الطوارئ والشكاوى
 *
 * @module pages/whatsapp/WhatsAppDashboard
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  IconButton,
  Badge,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  SmartToy as AIIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Analytics as AnalyticsIcon,
  Assignment as TemplateIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Inbox as InboxIcon,
  AutoAwesome as AutoAwesomeIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import apiClient from 'services/api.client';
import { useAuth } from 'contexts/AuthContext';
import { useSocket } from 'contexts/SocketContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const URGENCY_COLOR = {
  low: 'default',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

const INTENT_LABEL = {
  session_inquiry: 'استفسار جلسة',
  progress_inquiry: 'استفسار تقدم',
  complaint: 'شكوى',
  homework_feedback: 'ملاحظة واجب',
  absent_notification: 'إشعار غياب',
  emergency: 'طارئ',
  positive_feedback: 'تقييم إيجابي',
  document_request: 'طلب وثيقة',
  general_question: 'سؤال عام',
};

const INTENT_COLOR = {
  emergency: 'error',
  complaint: 'warning',
  positive_feedback: 'success',
  absent_notification: 'warning',
  session_inquiry: 'info',
  progress_inquiry: 'info',
  homework_feedback: 'default',
  document_request: 'default',
  general_question: 'default',
};

const _SENTIMENT_COLOR = {
  positive: 'success',
  neutral: 'default',
  negative: 'error',
  urgent: 'error',
};

const TEMPLATES = [
  { key: 'session-reminder', label: 'تذكير جلسة' },
  { key: 'progress-report', label: 'تقرير التقدم' },
  { key: 'homework', label: 'واجب منزلي' },
  { key: 'appointment-confirm', label: 'تأكيد موعد' },
  { key: 'welcome', label: 'ترحيب' },
];

// ─── Analytics Card ───────────────────────────────────────────────────────────
function AnalyticsCard({ label, value, icon, color = 'primary', loading }) {
  return (
    <Card elevation={2}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {loading ? '…' : (value ?? 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Delivery status icon ───────────────────────────────────────────────────
function DeliveryStatusIcon({ status }) {
  const sx = { fontSize: 12, opacity: 0.8, ml: 0.25 };
  switch (status) {
    case 'failed':
      return <ErrorIcon aria-label="failed" sx={{ ...sx, color: 'error.light' }} />;
    case 'read':
      return <DoneAllIcon aria-label="read" sx={{ ...sx, color: 'info.light' }} />;
    case 'delivered':
      return <DoneAllIcon aria-label="delivered" sx={sx} />;
    case 'sent':
    case 'accepted':
      return <CheckIcon aria-label="sent" sx={sx} />;
    default:
      return null;
  }
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outgoing';
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOut ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: '75%',
          bgcolor: isOut ? 'primary.main' : 'grey.100',
          color: isOut ? 'white' : 'text.primary',
          borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          px: 2,
          py: 1,
          position: 'relative',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {msg.text || `[${msg.type || 'media'}]`}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.5,
            justifyContent: 'flex-end',
          }}
        >
          {msg.intent && (
            <Chip
              label={INTENT_LABEL[msg.intent] || msg.intent}
              color={INTENT_COLOR[msg.intent] || 'default'}
              size="small"
              sx={{
                fontSize: '0.6rem',
                height: 16,
                bgcolor: isOut ? 'rgba(255,255,255,0.25)' : undefined,
              }}
            />
          )}
          <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem' }}>
            {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
          </Typography>
          {isOut && <DeliveryStatusIcon status={msg.deliveryStatus} />}
          {msg.isAutoReply && (
            <Tooltip title="رد تلقائي بالذكاء الاصطناعي">
              <AIIcon sx={{ fontSize: 12, opacity: 0.8 }} />
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Conversation List Item ────────────────────────────────────────────────────
function ConvListItem({ conv, selected, onClick }) {
  const lastMsg = conv.messages?.[conv.messages?.length - 1];
  const initials = (conv.senderName || conv.phone || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <ListItem
      button
      selected={selected}
      onClick={() => onClick(conv)}
      alignItems="flex-start"
      sx={{ borderRadius: 1, mb: 0.5, bgcolor: selected ? 'action.selected' : undefined }}
    >
      <ListItemAvatar>
        <Badge
          badgeContent={conv.unreadCount || 0}
          color="error"
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Avatar
            sx={{ bgcolor: conv.urgencyLevel === 'critical' ? 'error.main' : 'success.main' }}
          >
            {initials}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
              {conv.senderName || conv.phone}
            </Typography>
            {conv.urgencyLevel !== 'low' && (
              <Chip
                label={conv.urgencyLevel === 'critical' ? 'طارئ' : 'عاجل'}
                color={URGENCY_COLOR[conv.urgencyLevel]}
                size="small"
                sx={{ height: 16, fontSize: '0.6rem' }}
              />
            )}
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {lastMsg?.text?.slice(0, 50) || 'لا توجد رسائل'}
            </Typography>
            {conv.lastMessageAt && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ar })}
              </Typography>
            )}
          </Box>
        }
      />
      {conv.requiresHumanReview && (
        <ListItemSecondaryAction>
          <Tooltip title="يحتاج مراجعة">
            <WarningIcon color="warning" fontSize="small" />
          </Tooltip>
        </ListItemSecondaryAction>
      )}
    </ListItem>
  );
}

// ─── Send Template Dialog ─────────────────────────────────────────────────────
function TemplateDialog({ open, phone, onClose, onSend }) {
  const [selected, setSelected] = useState('');
  const [fields, setFields] = useState({});
  const [loading, setSending] = useState(false);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await onSend(selected, { phone, ...fields });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TemplateIcon color="primary" />
        إرسال قالب رسالة
        <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>نوع القالب</InputLabel>
          <Select value={selected} label="نوع القالب" onChange={e => setSelected(e.target.value)}>
            {TEMPLATES.map(t => (
              <MenuItem key={t.key} value={t.key}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selected === 'session-reminder' && (
          <>
            <TextField
              label="اسم ولي الأمر"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, guardianName: e.target.value }))}
            />
            <TextField
              label="اسم المستفيد"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, beneficiaryName: e.target.value }))}
            />
            <TextField
              label="تاريخ الجلسة"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, sessionDate: e.target.value }))}
            />
            <TextField
              label="وقت الجلسة"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, sessionTime: e.target.value }))}
            />
            <TextField
              label="اسم المعالج"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, therapistName: e.target.value }))}
            />
          </>
        )}
        {selected === 'homework' && (
          <>
            <TextField
              label="اسم ولي الأمر"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, guardianName: e.target.value }))}
            />
            <TextField
              label="اسم المستفيد"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, beneficiaryName: e.target.value }))}
            />
            <TextField
              label="عنوان الواجب"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, homeworkTitle: e.target.value }))}
            />
            <TextField
              label="تاريخ التسليم"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, dueDate: e.target.value }))}
            />
            <TextField
              label="التعليمات"
              fullWidth
              multiline
              rows={3}
              onChange={e => setFields(f => ({ ...f, instructions: e.target.value }))}
            />
          </>
        )}
        {selected === 'welcome' && (
          <>
            <TextField
              label="اسم ولي الأمر"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, guardianName: e.target.value }))}
            />
            <TextField
              label="اسم المستفيد"
              fullWidth
              sx={{ mb: 1 }}
              onChange={e => setFields(f => ({ ...f, beneficiaryName: e.target.value }))}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
          onClick={handleSend}
          disabled={loading || !selected}
        >
          إرسال القالب
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── AI Suggestions Panel ─────────────────────────────────────────────────────
function AISuggestPanel({ _conversationId, intent, context, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!intent) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post('/whatsapp/ai/suggest-replies', {
        intent,
        context: context || {},
        count: 3,
      });
      setSuggestions(data.data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [intent, context]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!intent) return null;
  return (
    <Box
      sx={{
        p: 1,
        bgcolor: 'primary.50',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'primary.200',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <AutoAwesomeIcon fontSize="small" color="primary" />
        <Typography variant="caption" color="primary" fontWeight={600}>
          ردود مقترحة بالذكاء الاصطناعي
        </Typography>
        {loading && <CircularProgress size={12} />}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {suggestions.map((s, i) => (
          <Chip
            key={i}
            label={s}
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => onSelect(s)}
            sx={{
              cursor: 'pointer',
              maxWidth: 200,
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
          />
        ))}
        {!loading && !suggestions.length && (
          <Typography variant="caption" color="text.secondary">
            لا توجد اقتراحات
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function WhatsAppDashboard() {
  const [tab, setTab] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
  const [statusEnabled, setStatusEnabled] = useState(null);
  const messagesEndRef = useRef(null);

  const notify = useCallback((msg, severity = 'success') => setSnackbar({ open: true, msg, severity }), []);

  // ── Document title unread badge ────────────────────────────────────────────
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  useEffect(() => {
    const originalTitle = document.title;
    const base = 'واتساب — مركز التواصل الذكي';
    document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
    return () => {
      document.title = originalTitle;
    };
  }, [totalUnread]);

  // ── Escalation sound alert (best-effort; browsers may block until user interaction)
  const playEscalationBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore audio errors
    }
  }, []);

  // ── Browser notification for escalations when tab is hidden
  const showEscalationNotification = useCallback(({ senderName, phone, reason }) => {
    if (typeof Notification === 'undefined' || document.visibilityState === 'visible') return;
    const title = '⚠️ تصعيد واتساب';
    const body = `${senderName || phone || 'محادثة جديدة'} — ${reason || 'تحتاج مراجعة بشرية'}`;
    const show = () => {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `whatsapp-escalation-${Date.now()}`,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    };
    if (Notification.permission === 'granted') {
      show();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') show();
      });
    }
  }, []);

  // ── Fetch status ───────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient
      .get('/whatsapp/status')
      .then(({ data }) => setStatusEnabled(data.data?.enabled))
      .catch(() => setStatusEnabled(false));
  }, [notify]);

  // ── Fetch conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterUrgency) params.urgency = filterUrgency;
      const { data } = await apiClient.get('/whatsapp/conversations', { params });
      setConversations(data.data || []);
    } catch {
      notify('فشل تحميل المحادثات', 'error');
    } finally {
      setLoadingList(false);
    }
  }, [filterStatus, filterUrgency, notify]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // ── Fetch analytics ────────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const { data } = await apiClient.get('/whatsapp/analytics');
      setAnalytics(data.data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 1) void loadAnalytics();
  }, [tab, loadAnalytics]);

  // ── Open conversation ──────────────────────────────────────────────────────
  const openConversation = useCallback(async conv => {
    setSelectedConv(null);
    setLoadingConv(true);
    try {
      const { data } = await apiClient.get(`/whatsapp/conversations/${conv._id}?withInsights=true`);
      setSelectedConv(data.data);
      // Mark read
      await apiClient.post(`/whatsapp/conversations/${conv._id}/mark-read`).catch(() => {});
    } catch {
      notify('فشل تحميل المحادثة', 'error');
    } finally {
      setLoadingConv(false);
    }
  }, [notify]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConv?.messages?.length]);

  // ── Real-time WhatsApp socket updates ──────────────────────────────────────
  const { currentUser } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !currentUser) return;

    const branchId = currentUser.branchId || currentUser.branch;
    const organizationId = currentUser.organizationId || currentUser.organization;
    const scopes = {};
    if (branchId) scopes.branchId = String(branchId);
    if (organizationId) scopes.organizationId = String(organizationId);
    if (!scopes.branchId && !scopes.organizationId) return;

    socket.emit('whatsapp:subscribe', scopes);

    const handleMessage = payload => {
      if (!payload?.conversationId || !payload.message) return;
      const conversationId = payload.conversationId;
      const incoming = payload.message;

      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversationId);
        let next;
        if (existingIndex >= 0) {
          const updated = { ...prev[existingIndex] };
          updated.messages = [...(updated.messages || []), incoming];
          updated.lastMessageAt = incoming.timestamp || new Date().toISOString();
          updated.lastIntent = incoming.intent || updated.lastIntent;
          updated.lastSentiment = incoming.sentiment || updated.lastSentiment;
          updated.unreadCount = (updated.unreadCount || 0) + 1;
          if (incoming.urgencyLevel) updated.urgencyLevel = incoming.urgencyLevel;
          next = [updated, ...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
        } else if (payload.conversation) {
          next = [payload.conversation, ...prev];
        } else {
          return prev;
        }
        return next;
      });

      setSelectedConv(prev => {
        if (!prev || prev._id !== conversationId) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), incoming],
          unreadCount: 0,
        };
      });
    };

    const handleStatus = payload => {
      if (!payload?.conversationId || !payload?.providerMessageId) return;
      const { providerMessageId, status } = payload;

      const updateMessages = messages =>
        messages?.map(m =>
          m.providerMessageId === providerMessageId ? { ...m, deliveryStatus: status } : m
        );

      setConversations(prev =>
        prev.map(c =>
          c._id === payload.conversationId ? { ...c, messages: updateMessages(c.messages) } : c
        )
      );

      setSelectedConv(prev => {
        if (!prev || prev._id !== payload.conversationId) return prev;
        return { ...prev, messages: updateMessages(prev.messages) };
      });
    };

    const handleConversation = payload => {
      if (!payload?.conversationId || !payload?.changes) return;
      setConversations(prev =>
        prev.map(c => (c._id === payload.conversationId ? { ...c, ...payload.changes } : c))
      );
      setSelectedConv(prev => {
        if (!prev || prev._id !== payload.conversationId) return prev;
        return { ...prev, ...payload.changes };
      });
    };

    const handleEscalation = payload => {
      if (!payload?.conversationId) return;
      handleConversation({ conversationId: payload.conversationId, changes: payload.conversation });
      notify(
        `⚠️ محادثة واتساب مصعّدة: ${payload.conversation?.senderName || payload.conversation?.phone || ''}`,
        'warning'
      );
      playEscalationBeep();
      showEscalationNotification({
        senderName: payload.conversation?.senderName,
        phone: payload.conversation?.phone,
        reason: payload.reason,
      });
    };

    socket.on('whatsapp:message', handleMessage);
    socket.on('whatsapp:status', handleStatus);
    socket.on('whatsapp:conversation', handleConversation);
    socket.on('whatsapp:escalation', handleEscalation);

    return () => {
      socket.off('whatsapp:message', handleMessage);
      socket.off('whatsapp:status', handleStatus);
      socket.off('whatsapp:conversation', handleConversation);
      socket.off('whatsapp:escalation', handleEscalation);
      socket.emit('whatsapp:unsubscribe');
    };
  }, [socket, currentUser, notify, playEscalationBeep, showEscalationNotification]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!message.trim() || !selectedConv) return;
    const text = message.trim();
    setMessage('');
    setSending(true);
    try {
      await apiClient.post('/whatsapp/send/text', {
        to: selectedConv.phone,
        text,
        beneficiaryId: selectedConv.beneficiaryId?._id,
        familyMemberId: selectedConv.familyMemberId?._id,
      });
      notify('تم الإرسال');
      // Optimistically update UI
      setSelectedConv(c => ({
        ...c,
        messages: [
          ...(c.messages || []),
          {
            direction: 'outgoing',
            type: 'text',
            text,
            timestamp: new Date(),
            deliveryStatus: 'sent',
          },
        ],
      }));
    } catch {
      notify('فشل الإرسال', 'error');
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  // ── Send template ──────────────────────────────────────────────────────────
  const sendTemplate = async (templateKey, fields) => {
    try {
      await apiClient.post(`/whatsapp/templates/${templateKey}`, fields);
      notify('تم إرسال القالب');
      setShowTemplate(false);
    } catch {
      notify('فشل إرسال القالب', 'error');
    }
  };

  // ── Resolve conversation ──────────────────────────────────────────────────
  const resolveConversation = async () => {
    if (!selectedConv) return;
    try {
      await apiClient.post(`/whatsapp/conversations/${selectedConv._id}/resolve`);
      notify('تم تحديد المحادثة كمحلولة');
      setSelectedConv(c => ({ ...c, status: 'resolved', requiresHumanReview: false }));
      await loadConversations();
    } catch {
      notify('فشل', 'error');
    }
  };

  const lastIncoming = selectedConv?.messages
    ? [...selectedConv.messages].reverse().find(m => m.direction === 'incoming')
    : null;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0 }}
      >
        <WhatsAppIcon sx={{ color: '#25D366', fontSize: 32 }} />
        <Typography variant="h6" fontWeight={700}>
          واتساب — مركز التواصل الذكي
        </Typography>
        {statusEnabled === false && <Chip label="غير مفعّل" color="error" size="small" />}
        {statusEnabled === true && (
          <Chip label="مفعّل" color="success" size="small" icon={<CheckCircleIcon />} />
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث">
            <IconButton onClick={loadConversations} disabled={loadingList}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab icon={<InboxIcon />} label="المحادثات" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab: Conversations */}
      {tab === 0 && (
        <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Left: Conversation List */}
          <Grid
            item
            xs={12}
            md={4}
            sx={{
              borderLeft: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Filters */}
            <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filterStatus}
                  label="الحالة"
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="active">نشطة</MenuItem>
                  <MenuItem value="pending_review">تحتاج مراجعة</MenuItem>
                  <MenuItem value="escalated">مصعّدة</MenuItem>
                  <MenuItem value="resolved">محلولة</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={filterUrgency}
                  label="الأولوية"
                  onChange={e => setFilterUrgency(e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="critical">طارئ</MenuItem>
                  <MenuItem value="high">عالي</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="low">منخفض</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Divider />
            {loadingList && <LinearProgress />}
            <List sx={{ overflow: 'auto', flex: 1, px: 1 }}>
              {conversations.length === 0 && !loadingList && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'center', mt: 4 }}
                >
                  لا توجد محادثات
                </Typography>
              )}
              {conversations.map(conv => (
                <ConvListItem
                  key={conv._id}
                  conv={conv}
                  selected={selectedConv?._id === conv._id}
                  onClick={openConversation}
                />
              ))}
            </List>
          </Grid>

          {/* Right: Chat View */}
          <Grid
            item
            xs={12}
            md={8}
            sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {!selectedConv && !loadingConv && (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <WhatsAppIcon sx={{ fontSize: 80, color: 'grey.300' }} />
                <Typography variant="h6" color="text.secondary">
                  اختر محادثة للبدء
                </Typography>
              </Box>
            )}
            {loadingConv && (
              <Box
                sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <CircularProgress />
              </Box>
            )}
            {selectedConv && !loadingConv && (
              <>
                {/* Conversation header */}
                <Paper
                  elevation={1}
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 0,
                  }}
                >
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedConv.senderName || selectedConv.phone}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={selectedConv.phone} size="small" variant="outlined" />
                      {selectedConv.status && (
                        <Chip
                          label={
                            selectedConv.status === 'resolved'
                              ? 'محلولة'
                              : selectedConv.status === 'active'
                                ? 'نشطة'
                                : selectedConv.status
                          }
                          color={selectedConv.status === 'resolved' ? 'success' : 'default'}
                          size="small"
                        />
                      )}
                      {selectedConv.urgencyLevel !== 'low' && (
                        <Chip
                          label={selectedConv.urgencyLevel}
                          color={URGENCY_COLOR[selectedConv.urgencyLevel]}
                          size="small"
                          icon={<WarningIcon />}
                        />
                      )}
                      {selectedConv.lastIntent && (
                        <Chip
                          label={INTENT_LABEL[selectedConv.lastIntent] || selectedConv.lastIntent}
                          color={INTENT_COLOR[selectedConv.lastIntent] || 'default'}
                          size="small"
                          icon={<AIIcon />}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {selectedConv.status !== 'resolved' && (
                      <Tooltip title="تحديد كمحلولة">
                        <IconButton color="success" onClick={resolveConversation} size="small">
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="إرسال قالب">
                      <IconButton
                        color="primary"
                        onClick={() => setShowTemplate(true)}
                        size="small"
                      >
                        <TemplateIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>

                {/* Warning banner */}
                {selectedConv.requiresHumanReview && (
                  <Alert severity="warning" sx={{ borderRadius: 0 }} icon={<WarningIcon />}>
                    هذه المحادثة تحتاج مراجعة بشرية — تم تصنيفها بالذكاء الاصطناعي
                  </Alert>
                )}

                {/* Messages area */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {(selectedConv.messages || []).map((msg, i) => (
                    <MessageBubble key={msg._id || i} msg={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </Box>

                {/* AI Suggestions */}
                {lastIncoming?.intent && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <AISuggestPanel
                      conversationId={selectedConv._id}
                      intent={lastIncoming.intent}
                      context={{ senderName: selectedConv.senderName }}
                      onSelect={s => setMessage(s)}
                    />
                  </Box>
                )}

                {/* Input area */}
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'grey.50',
                    display: 'flex',
                    gap: 1,
                    alignItems: 'flex-end',
                  }}
                >
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="اكتب رسالتك هنا…"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    size="small"
                    variant="outlined"
                    sx={{ bgcolor: 'white' }}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={sending || !message.trim()}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 40,
                      height: 40,
                    }}
                  >
                    {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  </IconButton>
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab: Analytics */}
      {tab === 1 && (
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {loadingAnalytics && <LinearProgress sx={{ mb: 2 }} />}
          {analytics && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <AnalyticsCard
                    label="إجمالي المحادثات"
                    value={analytics.totalConversations}
                    icon={<WhatsAppIcon />}
                    color="success"
                    loading={loadingAnalytics}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <AnalyticsCard
                    label="إجمالي الرسائل"
                    value={analytics.totalMessages}
                    icon={<SendIcon />}
                    color="primary"
                    loading={loadingAnalytics}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <AnalyticsCard
                    label="تحتاج مراجعة"
                    value={analytics.pendingReview}
                    icon={<WarningIcon />}
                    color="warning"
                    loading={loadingAnalytics}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <AnalyticsCard
                    label="حالات طارئة"
                    value={analytics.critical}
                    icon={<WarningIcon />}
                    color="error"
                    loading={loadingAnalytics}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      المحادثات المحلولة
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h4" color="success.main" fontWeight={700}>
                        {analytics.resolvedCount || 0}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={
                          analytics.totalConversations
                            ? ((analytics.resolvedCount || 0) / analytics.totalConversations) * 100
                            : 0
                        }
                        color="success"
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      متوسط الرسائل غير المقروءة
                    </Typography>
                    <Typography variant="h4" color="warning.main" fontWeight={700}>
                      {analytics.avgUnread?.toFixed(1) || '0'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
          {!analytics && !loadingAnalytics && (
            <Alert severity="info">اضغط على تبويب التحليلات لتحميل البيانات</Alert>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAnalytics}
            disabled={loadingAnalytics}
            sx={{ mt: 2 }}
          >
            تحديث التحليلات
          </Button>
        </Box>
      )}

      {/* Template Dialog */}
      <TemplateDialog
        open={showTemplate}
        phone={selectedConv?.phone}
        onClose={() => setShowTemplate(false)}
        onSend={sendTemplate}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
