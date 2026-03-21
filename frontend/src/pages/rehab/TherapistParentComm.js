import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors } from '../../theme/palette';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MessageIcon from '@mui/icons-material/Message';
import InboxIcon from '@mui/icons-material/Inbox';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const MESSAGE_TYPES = [
  { value: 'general', label: 'عام', color: '#3b82f6' },
  { value: 'progress_update', label: 'تحديث تقدم', color: '#10b981' },
  { value: 'appointment', label: 'موعد', color: '#f59e0b' },
  { value: 'recommendation', label: 'توصية', color: '#8b5cf6' },
  { value: 'emergency', label: 'طارئ', color: '#ef4444' },
  { value: 'follow_up', label: 'متابعة', color: '#06b6d4' },
];

const TherapistParentComm = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0=all, 1=unread, 2=sent
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    parentName: '',
    parentPhone: '',
    patientName: '',
    messageType: 'general',
    subject: '',
    content: '',
    priority: 'normal',
  });

  useEffect(() => {
    loadMessages();
  }, []); // eslint-disable-line

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getParentMessages();
      setMessages(res?.messages || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      await therapistService.sendParentMessage(form);
      showSnackbar('تم إرسال الرسالة بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        parentName: '',
        parentPhone: '',
        patientName: '',
        messageType: 'general',
        subject: '',
        content: '',
        priority: 'normal',
      });
      loadMessages();
    } catch {
      showSnackbar('خطأ في إرسال الرسالة', 'error');
    }
  };

  const handleMarkRead = async id => {
    try {
      await therapistService.markMessageRead(id);
      loadMessages();
    } catch {
      showSnackbar('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteParentMessage(id);
      showSnackbar('تم حذف الرسالة', 'success');
      loadMessages();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = messages.filter(m => {
    const matchSearch =
      !search ||
      m.parentName?.includes(search) ||
      m.patientName?.includes(search) ||
      m.subject?.includes(search);
    if (tabValue === 1) return matchSearch && !m.read;
    if (tabValue === 2) return matchSearch && m.direction === 'outgoing';
    return matchSearch;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FamilyIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                التواصل مع الأهل
              </Typography>
              <Typography variant="body2">إدارة التواصل مع أولياء أمور المرضى</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            رسالة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الرسائل',
            value: stats.totalMessages || 0,
            color: statusColors.info,
            icon: <MessageIcon />,
          },
          {
            label: 'غير مقروءة',
            value: stats.unread || 0,
            color: statusColors.warning,
            icon: <UnreadIcon />,
          },
          {
            label: 'المرسلة',
            value: stats.sent || 0,
            color: statusColors.success,
            icon: <SendIcon />,
          },
          { label: 'الواردة', value: stats.received || 0, color: '#8b5cf6', icon: <InboxIcon /> },
          {
            label: 'الأهالي',
            value: stats.uniqueParents || 0,
            color: '#ec4899',
            icon: <PeopleIcon />,
          },
          {
            label: 'الطارئة',
            value: stats.emergency || 0,
            color: statusColors.error,
            icon: <NotifIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs & Search */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="الكل" icon={<MessageIcon />} iconPosition="start" />
          <Tab
            label={
              <Badge badgeContent={stats.unread || 0} color="error">
                غير مقروءة
              </Badge>
            }
            icon={<UnreadIcon />}
            iconPosition="start"
          />
          <Tab label="المرسلة" icon={<SendIcon />} iconPosition="start" />
        </Tabs>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث بالاسم أو الموضوع..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Messages */}
      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <MessageIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد رسائل</Typography>
        </Paper>
      ) : (
        filtered.map(msg => {
          const mt = MESSAGE_TYPES.find(t => t.value === msg.messageType) || MESSAGE_TYPES[0];
          const isOutgoing = msg.direction === 'outgoing';
          return (
            <Card
              key={msg.id}
              sx={{
                mb: 1.5,
                borderRadius: 2,
                borderRight: `4px solid ${mt.color}`,
                bgcolor: msg.read ? 'inherit' : '#f0f7ff',
              }}
            >
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    sx={{ bgcolor: isOutgoing ? '#10b981' : '#3b82f6', width: 40, height: 40 }}
                  >
                    {isOutgoing ? <SendIcon fontSize="small" /> : <InboxIcon fontSize="small" />}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {msg.parentName}
                        </Typography>
                        <Chip
                          label={isOutgoing ? 'مرسلة' : 'واردة'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={mt.label}
                          size="small"
                          sx={{ bgcolor: mt.color + '20', color: mt.color, fontWeight: 'bold' }}
                        />
                        {msg.priority === 'urgent' && (
                          <Chip label="طارئ" size="small" color="error" />
                        )}
                        {!msg.read && <Chip label="جديدة" size="small" color="primary" />}
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(msg.createdAt).toLocaleDateString('ar')}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {msg.subject}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                      {msg.content?.slice(0, 150)}
                      {msg.content?.length > 150 ? '...' : ''}
                    </Typography>
                    {msg.patientName && (
                      <Typography variant="caption" color="textSecondary">
                        👤 المريض: {msg.patientName}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {!msg.read && (
                      <Tooltip title="تحديد كمقروءة">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleMarkRead(msg.id)}
                        >
                          <ReadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error" onClick={() => handleDelete(msg.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Send Message Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SendIcon color="primary" />
            <Typography variant="h6">رسالة جديدة</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم ولي الأمر"
                value={form.parentName}
                onChange={e => setForm(p => ({ ...p, parentName: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="هاتف ولي الأمر"
                value={form.parentPhone}
                onChange={e => setForm(p => ({ ...p, parentPhone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المريض"
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الرسالة</InputLabel>
                <Select
                  value={form.messageType}
                  label="نوع الرسالة"
                  onChange={e => setForm(p => ({ ...p, messageType: e.target.value }))}
                >
                  {MESSAGE_TYPES.map(t => (
                    <MenuItem value={t.value} key={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={8}>
              <TextField
                fullWidth
                size="small"
                label="الموضوع"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  label="الأولوية"
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                >
                  <MenuItem value="normal">عادي</MenuItem>
                  <MenuItem value="high">مرتفع</MenuItem>
                  <MenuItem value="urgent">طارئ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={4}
                label="محتوى الرسالة"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={!form.parentName || !form.subject || !form.content}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistParentComm;
