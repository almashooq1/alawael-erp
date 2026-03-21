/**
 * Student Messages Page
 * صفحة الرسائل والمحادثات للطالب
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import { gradients, brandColors, surfaceColors, rankColors } from 'theme/palette';
import messagesService from 'services/messagesService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import MessageIcon from '@mui/icons-material/Message';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import MoreIcon from '@mui/icons-material/More';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const StudentMessages = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [openNewMessage, setOpenNewMessage] = useState(false);
  const [conversations, setConversations] = useState([]);
  const showSnackbar = useSnackbar();

  // Mock data for conversations (fallback)
  const mockConversations = useMemo(
    () => [
      {
        id: 1,
        name: 'أ. محمد أحمد',
        role: 'معلم الرياضيات',
        avatar: 'M',
        lastMessage: 'تم رفع واجب الوحدة الخامسة',
        time: '10:30 ص',
        unread: 2,
        starred: true,
        type: 'teacher',
        messages: [
          { id: 1, sender: 'me', text: 'السلام عليكم أستاذ، لدي سؤال عن الواجب', time: '09:15 ص' },
          { id: 2, sender: 'them', text: 'وعليكم السلام، تفضل ما هو سؤالك؟', time: '09:20 ص' },
          {
            id: 3,
            sender: 'me',
            text: 'بخصوص المسألة رقم 5، لم أفهم الخطوة الثالثة',
            time: '09:25 ص',
          },
          { id: 4, sender: 'them', text: 'تم رفع واجب الوحدة الخامسة', time: '10:30 ص' },
        ],
      },
      {
        id: 2,
        name: 'أ. فاطمة علي',
        role: 'معلمة اللغة العربية',
        avatar: 'ف',
        lastMessage: 'موعد اختبار القراءة يوم الأربعاء',
        time: 'أمس',
        unread: 0,
        starred: false,
        type: 'teacher',
        messages: [
          { id: 1, sender: 'them', text: 'موعد اختبار القراءة يوم الأربعاء', time: 'أمس' },
        ],
      },
      {
        id: 3,
        name: 'مجموعة الصف الثالث - أ',
        role: '25 عضو',
        avatar: 'ص',
        lastMessage: 'أحمد: هل يوجد واجب اليوم؟',
        time: 'أمس',
        unread: 5,
        starred: false,
        type: 'group',
        messages: [
          { id: 1, sender: 'أحمد', text: 'هل يوجد واجب اليوم؟', time: 'أمس' },
          { id: 2, sender: 'سارة', text: 'نعم، واجب الرياضيات', time: 'أمس' },
        ],
      },
      {
        id: 4,
        name: 'الإدارة المدرسية',
        role: 'قسم الشؤون الطلابية',
        avatar: 'إ',
        lastMessage: 'تذكير بموعد دفع الرسوم الدراسية',
        time: '15/1',
        unread: 1,
        starred: true,
        type: 'admin',
        messages: [
          { id: 1, sender: 'them', text: 'تذكير بموعد دفع الرسوم الدراسية', time: '15/1' },
        ],
      },
      {
        id: 5,
        name: 'أ. خالد حسن',
        role: 'معلم العلوم',
        avatar: 'خ',
        lastMessage: 'رائع! واصل التميز',
        time: '14/1',
        unread: 0,
        starred: false,
        type: 'teacher',
        messages: [
          { id: 1, sender: 'me', text: 'أستاذ، أكملت التجربة العملية', time: '14/1' },
          { id: 2, sender: 'them', text: 'رائع! واصل التميز', time: '14/1' },
        ],
      },
    ],
    []
  );

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await messagesService.getAll();
      const data = res?.data || res?.messages || res || [];
      if (Array.isArray(data) && data.length > 0) {
        setConversations(data);
      } else {
        setConversations(mockConversations);
      }
    } catch {
      setConversations(mockConversations);
      showSnackbar('تعذر تحميل المحادثات، تم استخدام بيانات محلية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, mockConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      try {
        await messagesService.send({
          conversationId: selectedConversation.id || selectedConversation._id,
          text: newMessage.trim(),
        });
        showSnackbar('تم إرسال الرسالة بنجاح', 'success');
        setSelectedConversation(prev => ({
          ...prev,
          messages: [
            ...(prev.messages || []),
            {
              id: Date.now(),
              sender: 'me',
              text: newMessage.trim(),
              time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }));
      } catch {
        showSnackbar('تعذر إرسال الرسالة', 'error');
        // Offline fallback — add locally
        setSelectedConversation(prev => ({
          ...prev,
          messages: [
            ...(prev.messages || []),
            {
              id: Date.now(),
              sender: 'me',
              text: newMessage.trim(),
              time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }));
      }
      setNewMessage('');
    }
  };

  const handleSelectConversation = conversation => {
    setSelectedConversation(conversation);
  };

  const handleToggleStar = conversationId => {
    setConversations(prev =>
      prev.map(c => ((c._id || c.id) === conversationId ? { ...c, starred: !c.starred } : c))
    );
    // Persist star toggle via API (fire-and-forget)
    messagesService.toggleStar?.(conversationId)?.catch?.(() => {});
  };

  const getTypeIcon = type => {
    switch (type) {
      case 'teacher':
        return <TeacherIcon />;
      case 'group':
        return <GroupIcon />;
      case 'admin':
        return <PersonIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getAvatarColor = name => {
    const colors = [
      brandColors.primaryStart,
      brandColors.primaryEnd,
      brandColors.accentPink,
      brandColors.accentSky,
      brandColors.accentGreen,
      brandColors.accentRose,
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          جاري التحميل...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          p: 3,
          background: gradients.primary,
          borderRadius: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ position: 'relative' }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 60, height: 60 }}>
              <MessageIcon sx={{ fontSize: 35 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                الرسائل والمحادثات
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                تواصل مع المعلمين وزملاء الدراسة
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setOpenNewMessage(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            رسالة جديدة
          </Button>
        </Stack>
      </Box>

      {/* Main Content */}
      <Grid container spacing={2} sx={{ height: 'calc(100% - 150px)' }}>
        {/* Conversations List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Search */}
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                placeholder="ابحث في المحادثات..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Divider />

            {/* Conversations */}
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {filteredConversations.map(conversation => (
                <Fragment key={conversation.id}>
                  <ListItemButton
                    selected={selectedConversation?.id === conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: surfaceColors.lightGray,
                        borderLeft: `4px solid ${brandColors.primaryStart}`,
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={conversation.unread} color="error" overlap="circular">
                        <Avatar sx={{ bgcolor: getAvatarColor(conversation.name) }}>
                          {conversation.avatar}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: conversation.unread > 0 ? 'bold' : 'normal' }}
                          >
                            {conversation.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {conversation.time}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {conversation.role}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontWeight: conversation.unread > 0 ? 'bold' : 'normal',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {conversation.lastMessage}
                          </Typography>
                        </Stack>
                      }
                    />
                    <IconButton
                      aria-label="إجراء"
                      size="small"
                      onClick={() => handleToggleStar(conversation.id)}
                    >
                      {conversation.starred ? (
                        <StarFilledIcon sx={{ color: rankColors.gold }} />
                      ) : (
                        <StarIcon />
                      )}
                    </IconButton>
                  </ListItemButton>
                  <Divider />
                </Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: `1px solid ${surfaceColors.divider}` }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: getAvatarColor(selectedConversation.name) }}>
                        {selectedConversation.avatar}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {selectedConversation.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getTypeIcon(selectedConversation.type)}
                          <Typography variant="caption" color="text.secondary">
                            {selectedConversation.role}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                    <IconButton aria-label="إجراء">
                      <MoreIcon />
                    </IconButton>
                  </Stack>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: surfaceColors.paperAlt }}>
                  <Stack spacing={2}>
                    {selectedConversation.messages.map(message => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: message.sender === 'me' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Paper
                          sx={{
                            p: 2,
                            maxWidth: '70%',
                            bgcolor: message.sender === 'me' ? brandColors.primaryStart : 'white',
                            color: message.sender === 'me' ? 'white' : 'text.primary',
                          }}
                        >
                          {message.sender !== 'me' && message.sender !== 'them' && (
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}
                            >
                              {message.sender}
                            </Typography>
                          )}
                          <Typography variant="body1">{message.text}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              opacity: 0.7,
                              textAlign: 'right',
                            }}
                          >
                            {message.time}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: `1px solid ${surfaceColors.divider}` }}>
                  <Stack direction="row" spacing={1}>
                    <IconButton aria-label="إرفاق ملف" color="primary">
                      <AttachFileIcon />
                    </IconButton>
                    <TextField
                      fullWidth
                      placeholder="اكتب رسالتك..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      endIcon={<SendIcon />}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      sx={{
                        background: gradients.primary,
                      }}
                    >
                      إرسال
                    </Button>
                  </Stack>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <Stack alignItems="center" spacing={2}>
                  <MessageIcon sx={{ fontSize: 80, opacity: 0.3 }} />
                  <Typography variant="h6">اختر محادثة للبدء</Typography>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* New Message Dialog */}
      <Dialog
        open={openNewMessage}
        onClose={() => setOpenNewMessage(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ background: gradients.primary, color: 'white' }}>
          رسالة جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="المستلم"
              placeholder="ابحث عن معلم أو طالب..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField fullWidth label="الموضوع" placeholder="موضوع الرسالة" />
            <TextField
              fullWidth
              label="الرسالة"
              placeholder="اكتب رسالتك هنا..."
              multiline
              rows={6}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewMessage(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            sx={{
              background: gradients.primary,
            }}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentMessages;
