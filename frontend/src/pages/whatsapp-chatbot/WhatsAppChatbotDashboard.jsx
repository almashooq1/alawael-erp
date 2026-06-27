/**
 * WhatsApp Chatbot Dashboard — لوحة تحكم روبوت واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * RTL, MUI 6, WhatsApp green (#25D366), mock data.
 *
 * Tabs: المحادثات | القوالب | التحليلات
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Badge,
  IconButton,
  TextField,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  WhatsApp as WhatsAppIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AutoFixHigh as AutoFixHighIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  ChatBubble as ChatBubbleIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const WHATSAPP_GREEN = '#25D366';

// ─── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_CONVERSATIONS = [
  {
    id: '1',
    phone: '966512345678',
    name: 'أحمد السالم',
    lastMessage: 'موعد الجلسة القادمة متى؟',
    lastMessageAt: '2026-06-27T14:30:00Z',
    unread: 2,
    botEnabled: true,
    status: 'active',
  },
  {
    id: '2',
    phone: '966523456789',
    name: 'فاطمة الزهراني',
    lastMessage: 'شكراً على التقرير',
    lastMessageAt: '2026-06-27T13:15:00Z',
    unread: 0,
    botEnabled: true,
    status: 'active',
  },
  {
    id: '3',
    phone: '966534567890',
    name: 'خالد العمري',
    lastMessage: 'أحب أتواصل مع موظف',
    lastMessageAt: '2026-06-27T12:00:00Z',
    unread: 1,
    botEnabled: false,
    status: 'escalated',
  },
  {
    id: '4',
    phone: '966545678901',
    name: 'نورة الشمري',
    lastMessage: 'هل تم تحقيق الهدف الثالث؟',
    lastMessageAt: '2026-06-26T18:45:00Z',
    unread: 0,
    botEnabled: true,
    status: 'active',
  },
  {
    id: '5',
    phone: '966556789012',
    name: 'عبدالله القحطاني',
    lastMessage: 'فاتورة الشهر الماضي',
    lastMessageAt: '2026-06-26T10:20:00Z',
    unread: 0,
    botEnabled: true,
    status: 'active',
  },
];

const MOCK_MESSAGES = {
  '966512345678': [
    { id: 'm1', direction: 'incoming', text: 'السلام عليكم', timestamp: '2026-06-27T14:25:00Z' },
    { id: 'm2', direction: 'outgoing', text: 'وعليكم السلام ورحمة الله، كيف يمكنني مساعدتك؟', timestamp: '2026-06-27T14:25:10Z', isAutoReply: true },
    { id: 'm3', direction: 'incoming', text: 'موعد الجلسة القادمة متى؟', timestamp: '2026-06-27T14:30:00Z' },
  ],
  '966523456789': [
    { id: 'm1', direction: 'incoming', text: 'شكراً على التقرير', timestamp: '2026-06-27T13:15:00Z' },
    { id: 'm2', direction: 'outgoing', text: 'على الرحب والسعة! نحن هنا لخدمتكم في أي وقت.', timestamp: '2026-06-27T13:15:05Z', isAutoReply: true },
  ],
  '966534567890': [
    { id: 'm1', direction: 'incoming', text: 'أحب أتواصل مع موظف', timestamp: '2026-06-27T12:00:00Z' },
    { id: 'm2', direction: 'outgoing', text: 'تم إرسال طلبك للتواصل مع موظف. سيتم الرد عليك في أقرب وقت ممكن.', timestamp: '2026-06-27T12:00:05Z', isAutoReply: true },
  ],
};

const MOCK_TEMPLATES = [
  {
    id: 't1',
    name: 'تذكير بالموعد',
    category: 'reminder',
    body: 'مرحباً {{name}}، نذكرك بموعد الجلسة غداً {{date}} الساعة {{time}}. نتطلع لرؤيتكم.',
    variables: ['name', 'date', 'time'],
    isActive: true,
  },
  {
    id: 't2',
    name: 'تقرير التقدم الأسبوعي',
    category: 'follow_up',
    body: 'السلام عليكم {{name}}،\n\nتقرير التقدم الأسبوعي:\n{{progressSummary}}\n\nللاستفسار: 920000000',
    variables: ['name', 'progressSummary'],
    isActive: true,
  },
  {
    id: 't3',
    name: 'رسالة ترحيب',
    category: 'greeting',
    body: 'أهلاً وسهلاً بكم في مركز الأوائل للتأهيل. نسعد بخدمتكم.',
    variables: [],
    isActive: true,
  },
  {
    id: 't4',
    name: 'تذكير بالدفع',
    category: 'notification',
    body: 'عزيزي {{name}}،\nنذكركم بسداد الرسوم قبل {{dueDate}}.\nشكراً لتعاونكم.',
    variables: ['name', 'dueDate'],
    isActive: false,
  },
];

const MOCK_ANALYTICS = {
  totalMessages: 1248,
  autoReplyRate: 78.5,
  handoffRate: 12.3,
  avgResponseTimeSec: 4,
  dailyTimeline: [
    { date: '2026-06-21', incoming: 45, outgoing: 38 },
    { date: '2026-06-22', incoming: 52, outgoing: 41 },
    { date: '2026-06-23', incoming: 38, outgoing: 35 },
    { date: '2026-06-24', incoming: 60, outgoing: 50 },
    { date: '2026-06-25', incoming: 55, outgoing: 48 },
    { date: '2026-06-26', incoming: 70, outgoing: 58 },
    { date: '2026-06-27', incoming: 42, outgoing: 36 },
  ],
  typeCounts: { incoming: 362, outgoing: 306, auto_reply: 240, template: 66 },
};

// ─── Components ────────────────────────────────────────────────────────────

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function StatusChip({ status }) {
  const config = {
    active: { label: 'نشط', color: 'success' },
    escalated: { label: 'محول للموظف', color: 'warning' },
    resolved: { label: 'مغلق', color: 'default' },
  };
  const c = config[status] || config.active;
  return <Chip size="small" label={c.label} color={c.color} sx={{ fontWeight: 600 }} />;
}

function AnalyticsCard({ title, value, sub, icon, color }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}.100`,
              color: `${color}.700`,
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function WhatsAppChatbotDashboard() {
  const [tab, setTab] = useState(0);
  const [selectedPhone, setSelectedPhone] = useState(MOCK_CONVERSATIONS[0]?.phone || null);
  const [replyText, setReplyText] = useState('');
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.phone === selectedPhone),
    [conversations, selectedPhone]
  );
  const messages = useMemo(() => MOCK_MESSAGES[selectedPhone] || [], [selectedPhone]);

  const handleToggleBot = (phone) => {
    setConversations((prev) =>
      prev.map((c) => (c.phone === phone ? { ...c, botEnabled: !c.botEnabled } : c))
    );
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    // In real app: call API
    setReplyText('');
  };

  const handleDeleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveTemplate = (template) => {
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? { ...template, id: t.id } : t))
      );
    } else {
      setTemplates((prev) => [...prev, { ...template, id: `t${Date.now()}` }]);
    }
    setTemplateDialog(false);
    setEditingTemplate(null);
  };

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: '#fff',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <WhatsAppIcon sx={{ color: WHATSAPP_GREEN, fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>
            روبوت واتساب
          </Typography>
          <Chip
            size="small"
            label="يعمل"
            sx={{
              bgcolor: `${WHATSAPP_GREEN}20`,
              color: WHATSAPP_GREEN,
              fontWeight: 700,
              borderRadius: 1,
            }}
            icon={<CheckCircleIcon sx={{ fontSize: 14, color: `${WHATSAPP_GREEN} !important` }} />}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <BotIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            البوت نشط — ٥ محادثات حالية
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: '#fff', px: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor={WHATSAPP_GREEN}
          sx={{ '& .MuiTabs-indicator': { bgcolor: WHATSAPP_GREEN } }}
        >
          <Tab
            icon={<ChatBubbleIcon />}
            iconPosition="start"
            label="المحادثات"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<AutoFixHighIcon />}
            iconPosition="start"
            label="القوالب"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<TrendingUpIcon />}
            iconPosition="start"
            label="التحليلات"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* Tab 1: Conversations */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={2}>
          {/* Conversation List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ height: 'calc(100vh - 220px)', overflow: 'auto', borderRadius: 3 }}>
              <List sx={{ p: 0 }}>
                {conversations.map((conv) => (
                  <React.Fragment key={conv.id}>
                    <ListItem
                      button
                      selected={conv.phone === selectedPhone}
                      onClick={() => setSelectedPhone(conv.phone)}
                      sx={{
                        bgcolor:
                          conv.phone === selectedPhone ? `${WHATSAPP_GREEN}10` : 'inherit',
                        '&:hover': { bgcolor: `${WHATSAPP_GREEN}08` },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={conv.unread || 0}
                          color="error"
                          overlap="circular"
                          invisible={!conv.unread}
                        >
                          <Avatar sx={{ bgcolor: WHATSAPP_GREEN }}>
                            <PersonIcon sx={{ color: '#fff' }} />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontWeight={700} variant="body1">
                              {conv.name}
                            </Typography>
                            <StatusChip status={conv.status} />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {conv.lastMessage}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {conv.phone}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box display="flex" flexDirection="column" alignItems="end" gap={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(conv.lastMessageAt).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={conv.botEnabled}
                              onChange={() => handleToggleBot(conv.phone)}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: WHATSAPP_GREEN,
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  bgcolor: WHATSAPP_GREEN,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography variant="caption" color="text.secondary">
                              بوت
                            </Typography>
                          }
                          labelPlacement="start"
                          sx={{ m: 0 }}
                        />
                      </Box>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Chat View */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              sx={{
                height: 'calc(100vh - 220px)',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
              }}
            >
              {/* Chat header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Avatar sx={{ bgcolor: WHATSAPP_GREEN }}>
                    <PersonIcon sx={{ color: '#fff' }} />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>{selectedConversation?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedConversation?.phone}
                    </Typography>
                  </Box>
                </Box>
                <StatusChip status={selectedConversation?.status} />
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
                {messages.map((msg) => {
                  const isIncoming = msg.direction === 'incoming';
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        justifyContent: isIncoming ? 'flex-start' : 'flex-end',
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: isIncoming ? '#fff' : `${WHATSAPP_GREEN}15`,
                          color: isIncoming ? 'text.primary' : 'text.primary',
                          boxShadow: 1,
                          borderTopRightRadius: isIncoming ? 2 : 0.5,
                          borderTopLeftRadius: isIncoming ? 0.5 : 2,
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {msg.text}
                        </Typography>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent={isIncoming ? 'flex-start' : 'flex-end'}
                          gap={0.5}
                          mt={0.5}
                        >
                          {msg.isAutoReply && (
                            <Chip
                              size="small"
                              label="بوت"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: `${WHATSAPP_GREEN}20`,
                                color: WHATSAPP_GREEN,
                              }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Reply field */}
              <Box
                sx={{
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 1,
                  bgcolor: '#fff',
                }}
              >
                <TextField
                  fullWidth
                  placeholder="اكتب رسالة..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: 'grey.50',
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  sx={{
                    borderRadius: 3,
                    bgcolor: WHATSAPP_GREEN,
                    '&:hover': { bgcolor: '#1ebe5c' },
                    minWidth: 48,
                    px: 1,
                  }}
                >
                  <SendIcon />
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Templates */}
      <TabPanel value={tab} index={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            قوالب الرسائل
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingTemplate(null);
              setTemplateDialog(true);
            }}
            sx={{
              borderRadius: 3,
              bgcolor: WHATSAPP_GREEN,
              '&:hover': { bgcolor: '#1ebe5c' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            قالب جديد
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المحتوى</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المتغيرات</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{t.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.category}
                      sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 300,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        direction: 'rtl',
                      }}
                    >
                      {t.body}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {t.variables.map((v) => (
                        <Chip
                          key={v}
                          size="small"
                          label={`{{${v}}}`}
                          sx={{ fontFamily: 'monospace', fontSize: 12 }}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                      {!t.variables.length && (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.isActive ? 'نشط' : 'غير نشط'}
                      color={t.isActive ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="left">
                    <Tooltip title="معاينة">
                      <IconButton
                        size="small"
                        onClick={() => setPreviewTemplate(t)}
                        sx={{ color: WHATSAPP_GREEN }}
                      >
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTemplate(t);
                          setTemplateDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" onClick={() => handleDeleteTemplate(t.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 3: Analytics */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="إجمالي الرسائل"
              value={MOCK_ANALYTICS.totalMessages.toLocaleString('ar-SA')}
              sub="هذا الأسبوع"
              icon={<MessageIcon fontSize="small" />}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="نسبة الرد الآلي"
              value={`${MOCK_ANALYTICS.autoReplyRate}%`}
              sub="↑ ٤٪ عن الأسبوع الماضي"
              icon={<AutoFixHighIcon fontSize="small" />}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="نسبة التحويل للموظف"
              value={`${MOCK_ANALYTICS.handoffRate}%`}
              sub="↓ ٢٪ عن الأسبوع الماضي"
              icon={<ErrorOutlineIcon fontSize="small" />}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="متوسط وقت الرد"
              value={`${MOCK_ANALYTICS.avgResponseTimeSec} ث`}
              sub="سريع جداً"
              icon={<ScheduleIcon fontSize="small" />}
              color="info"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  الرسائل عبر الوقت
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_ANALYTICS.dailyTimeline} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                      <defs>
                        <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={WHATSAPP_GREEN} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={WHATSAPP_GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ReTooltip />
                      <Legend />
                      <Area type="monotone" dataKey="incoming" name="واردة" stroke="#1976d2" fill="url(#colorIncoming)" strokeWidth={2} />
                      <Area type="monotone" dataKey="outgoing" name="صادرة" stroke={WHATSAPP_GREEN} fill="url(#colorOutgoing)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  توزيع أنواع الرسائل
                </Typography>
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'واردة', value: MOCK_ANALYTICS.typeCounts.incoming },
                          { name: 'صادرة', value: MOCK_ANALYTICS.typeCounts.outgoing },
                          { name: 'رد آلي', value: MOCK_ANALYTICS.typeCounts.auto_reply },
                          { name: 'قوالب', value: MOCK_ANALYTICS.typeCounts.template },
                        ]}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label
                      >
                        {[
                          { name: 'واردة', value: MOCK_ANALYTICS.typeCounts.incoming },
                          { name: 'صادرة', value: MOCK_ANALYTICS.typeCounts.outgoing },
                          { name: 'رد آلي', value: MOCK_ANALYTICS.typeCounts.auto_reply },
                          { name: 'قوالب', value: MOCK_ANALYTICS.typeCounts.template },
                        ].map((entry, index) => {
                          const colors = ['#1976d2', WHATSAPP_GREEN, '#ff9800', '#9c27b0'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <ReTooltip />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Template Dialog */}
      <TemplateDialog
        open={templateDialog}
        onClose={() => setTemplateDialog(false)}
        onSave={handleSaveTemplate}
        initial={editingTemplate}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>معاينة القالب</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              mt: 1,
            }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}>
              {previewTemplate?.body}
            </Typography>
          </Box>
          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            {previewTemplate?.variables.map((v) => (
              <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTemplate(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Template Dialog Component ─────────────────────────────────────────────
function TemplateDialog({ open, onClose, onSave, initial }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState('');

  React.useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setCategory(initial?.category || 'custom');
      setBody(initial?.body || '');
      setVariables(initial?.variables ? initial.variables.join(', ') : '');
    }
  }, [open, initial]);

  const handleSubmit = () => {
    const vars = variables
      .split(/[,،]/)
      .map((v) => v.trim())
      .filter(Boolean);
    onSave({ name, category, body, variables: vars, isActive: true });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{initial ? 'تعديل قالب' : 'قالب جديد'}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="اسم القالب"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="dense"
          sx={{ direction: 'rtl' }}
        />
        <TextField
          fullWidth
          select
          label="الفئة"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          margin="dense"
          SelectProps={{ native: true }}
          sx={{ direction: 'rtl' }}
        >
          <option value="greeting">ترحيب</option>
          <option value="reminder">تذكير</option>
          <option value="notification">إشعار</option>
          <option value="follow_up">متابعة</option>
          <option value="custom">مخصص</option>
        </TextField>
        <TextField
          fullWidth
          label="نص الرسالة"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          margin="dense"
          multiline
          rows={4}
          sx={{ direction: 'rtl' }}
          helperText="استخدم {{variable}} للمتغيرات"
        />
        <TextField
          fullWidth
          label="المتغيرات (مفصولة بفاصلة)"
          value={variables}
          onChange={(e) => setVariables(e.target.value)}
          margin="dense"
          placeholder="name, date, time"
          sx={{ direction: 'ltr' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || !body.trim()}
          sx={{ bgcolor: WHATSAPP_GREEN, '&:hover': { bgcolor: '#1ebe5c' } }}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
