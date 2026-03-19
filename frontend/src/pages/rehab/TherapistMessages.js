import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  Add as AddIcon,
  More as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  EmojiEmotions as EmojiEmotionsIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import messagesService from 'services/messagesService';
import logger from 'utils/logger';
import { gradients, brandColors, neutralColors, surfaceColors, statusColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const TherapistMessages = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [newMessageDialog, setNewMessageDialog] = useState(false);
  const showSnackbar = useSnackbar();

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await therapistService.getTherapistMessages(userId);
        setConversations(data);
        if (data.length > 0) {
          setSelectedConversation(data[0]);
        }
        setLoading(false);
      } catch (error) {
        logger.error('Error loading conversations:', error);
        showSnackbar('خطأ في تحميل المحادثات', 'error');
        setLoading(false);
      }
    };
    loadConversations();
  }, [userId, showSnackbar]);

  const filteredConversations = conversations.filter(
    c => c.name.includes(searchText) || c.lastMessage.includes(searchText)
  );

  const handleSendMessage = async () => {
    if (messageText.trim() && selectedConversation) {
      try {
        await messagesService.send({
          conversationId: selectedConversation._id || selectedConversation.id,
          content: messageText,
          type: 'reply',
        });
        showSnackbar('تم إرسال الرسالة بنجاح', 'success');
        setMessageText('');
      } catch (err) {
        logger.error('Failed to send message:', err);
        showSnackbar('تعذر إرسال الرسالة', 'error');
      }
    }
  };

  const toggleStarred = conversationId => {
    setConversations(
      conversations.map(c => (c.id === conversationId ? { ...c, starred: !c.starred } : c))
    );
  };

  const getAvatarColor = type => {
    switch (type) {
      case 'teacher':
        return gradients.primary;
      case 'group':
        return gradients.info;
      case 'admin':
        return gradients.success;
      default:
        return gradients.accent;
    }
  };

  const getTypeLabel = type => {
    switch (type) {
      case 'teacher':
        return '👨‍🏫 معلم';
      case 'group':
        return '👥 مجموعة';
      case 'admin':
        return '🏛️ إدارة';
      default:
        return '📞 آخر';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل الرسائل...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        💬 الرسائل والتواصل
      </Typography>

      <Grid container spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* قائمة المحادثات */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <CardContent sx={{ pb: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  المحادثات ({conversations.length})
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setNewMessageDialog(true)}
                >
                  جديدة
                </Button>
              </Box>

              <TextField
                placeholder="ابحث..."
                variant="outlined"
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </CardContent>

            <Divider />

            {/* قائمة المحادثات */}
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {filteredConversations.map(conversation => (
                <ListItem
                  key={conversation.id}
                  button
                  selected={selectedConversation?.id === conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  sx={{
                    backgroundColor:
                      selectedConversation?.id === conversation.id
                        ? surfaceColors.lightGray
                        : 'transparent',
                    borderLeft:
                      selectedConversation?.id === conversation.id
                        ? `4px solid ${brandColors.primaryStart}`
                        : 'none',
                    '&:hover': { backgroundColor: surfaceColors.paperAlt },
                  }}
                >
                  <ListItemIcon>
                    <Badge badgeContent={conversation.unread} color="error">
                      <Avatar
                        sx={{
                          background: getAvatarColor(conversation.type),
                          width: 40,
                          height: 40,
                        }}
                      >
                        {conversation.name.charAt(0)}
                      </Avatar>
                    </Badge>
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {conversation.name}
                        </Typography>
                        <Tooltip
                          title={conversation.starred ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                          <IconButton
                            aria-label="إجراء"
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              toggleStarred(conversation.id);
                            }}
                          >
                            {conversation.starred ? (
                              <StarIcon sx={{ fontSize: 16, color: statusColors.starAmber }} />
                            ) : (
                              <StarBorderIcon sx={{ fontSize: 16 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: neutralColors.textMuted, display: 'block', mb: 0.5 }}
                        >
                          {getTypeLabel(conversation.type)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: neutralColors.textSecondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {conversation.lastMessage}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: neutralColors.textMuted, display: 'block', mt: 0.5 }}
                        >
                          {conversation.time}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>

        {/* منطقة الدردشة */}
        {selectedConversation ? (
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header المحادثة */}
              <CardContent sx={{ pb: 1, borderBottom: `1px solid ${surfaceColors.borderSubtle}` }}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        background: getAvatarColor(selectedConversation.type),
                        width: 45,
                        height: 45,
                      }}
                    >
                      {selectedConversation.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {selectedConversation.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                        {getTypeLabel(selectedConversation.type)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton aria-label="إجراء" size="small">
                    <MoreIcon />
                  </IconButton>
                </Box>
              </CardContent>

              {/* الرسائل */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {selectedConversation.messages.map((message, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender === 'me' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: '70%',
                        backgroundColor:
                          message.sender === 'me'
                            ? brandColors.primaryStart
                            : surfaceColors.softGray,
                        color: message.sender === 'me' ? 'white' : neutralColors.textDark,
                        borderRadius: 2,
                      }}
                    >
                      {message.sender !== 'me' && (
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}
                        >
                          {message.senderName}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {message.text}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          display: 'block',
                          textAlign: 'right',
                        }}
                      >
                        {message.time}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
              </Box>

              <Divider />

              {/* حقل الإدخال */}
              <CardContent sx={{ pt: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <IconButton aria-label="إرفاق ملف" size="small">
                    <AttachFileIcon />
                  </IconButton>
                  <IconButton aria-label="إجراء" size="small">
                    <EmojiEmotionsIcon />
                  </IconButton>
                  <TextField
                    placeholder="اكتب رسالتك..."
                    fullWidth
                    size="small"
                    variant="outlined"
                    multiline
                    maxRows={3}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                  >
                    إرسال
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 3,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="textSecondary">اختر محادثة للبدء</Typography>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dialog رسالة جديدة */}
      <Dialog
        open={newMessageDialog}
        onClose={() => setNewMessageDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>إنشاء محادثة جديدة</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="البحث عن مستقبل الرسالة"
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField label="الموضوع" fullWidth variant="outlined" size="small" />
            <TextField
              label="الرسالة"
              fullWidth
              variant="outlined"
              size="small"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNewMessageDialog(false)}>إلغاء</Button>
          <Button variant="contained">إرسال</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistMessages;
