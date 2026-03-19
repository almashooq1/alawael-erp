import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  AttachFile as AttachIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
} from '@mui/icons-material';

const MessagingPanel = ({ conversations = [], messages = [], onSendMessage, selectedConversation, onSelectConversation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [filteredConversations, setFilteredConversations] = useState(conversations);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);

  useEffect(() => {
    if (searchQuery) {
      const filtered = conversations.filter(
        conv =>
          conv.participant.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      // تحميل رسائل المحادثة
      loadConversationMessages(selectedConversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const loadConversationMessages = async conversationId => {
    try {
      const response = await fetch(`/api/ai-communications/conversations/${conversationId}/messages`);
      const data = await response.json();

      if (data.success) {
        setConversationMessages(data.messages);
      } else {
        // استخدام بيانات تجريبية
        setConversationMessages(getMockMessages(conversationId));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setConversationMessages(getMockMessages(conversationId));
    }
  };

  const getMockMessages = conversationId => {
    const now = Date.now();
    return [
      {
        id: 1,
        sender: 'other',
        text: 'مرحباً، كيف يمكنني مساعدتك؟',
        timestamp: new Date(now - 3600000),
        read: true,
      },
      {
        id: 2,
        sender: 'me',
        text: 'أحتاج معلومات عن نظام التأهيل',
        timestamp: new Date(now - 3000000),
        read: true,
      },
      {
        id: 3,
        sender: 'other',
        text: 'بالتأكيد! نظام التأهيل يوفر متابعة شاملة للطلاب',
        timestamp: new Date(now - 2400000),
        read: true,
      },
    ];
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: messageInput,
      timestamp: new Date(),
      read: false,
    };

    setConversationMessages(prev => [...prev, newMessage]);
    onSendMessage(selectedConversation.id, messageInput);
    setMessageInput('');
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = timestamp => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} د`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} س`;
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = status => {
    return status === 'online' ? 'success' : 'default';
  };

  return (
    <Grid container sx={{ height: '600px' }}>
      {/* قائمة المحادثات */}
      <Grid item xs={12} md={4} sx={{ borderRight: 1, borderColor: 'divider', height: '100%' }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="بحث في المحادثات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List sx={{ overflowY: 'auto', maxHeight: 'calc(100% - 80px)' }}>
          {filteredConversations.map(conversation => (
            <ListItem
              key={conversation.id}
              button
              selected={selectedConversation?.id === conversation.id}
              onClick={() => onSelectConversation(conversation)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                },
              }}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  color={getStatusColor(conversation.status)}
                >
                  <Avatar sx={{ bgcolor: 'primary.main' }}>{conversation.avatar}</Avatar>
                </Badge>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" noWrap>
                      {conversation.participant}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(conversation.timestamp)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
                      {conversation.lastMessage}
                    </Typography>
                    {conversation.unread > 0 && (
                      <Chip label={conversation.unread} color="primary" size="small" sx={{ height: 20, fontSize: '0.75rem' }} />
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}

          {filteredConversations.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد محادثات</Typography>
            </Box>
          )}
        </List>
      </Grid>

      {/* منطقة الرسائل */}
      <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedConversation ? (
          <>
            {/* رأس المحادثة */}
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  color={getStatusColor(selectedConversation.status)}
                >
                  <Avatar sx={{ bgcolor: 'primary.main' }}>{selectedConversation.avatar}</Avatar>
                </Badge>
                <Box>
                  <Typography variant="h6">{selectedConversation.participant}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedConversation.status === 'online' ? 'متصل الآن' : 'غير متصل'}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Tooltip title="تمييز بنجمة">
                  <IconButton size="small">
                    <StarIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="أرشفة">
                  <IconButton size="small">
                    <ArchiveIcon />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                  <MenuItem onClick={() => setMenuAnchor(null)}>
                    <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                    حذف المحادثة
                  </MenuItem>
                </Menu>
              </Box>
            </Box>

            {/* منطقة الرسائل */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: '#f5f5f5',
                backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              }}
            >
              {conversationMessages.map(message => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.sender === 'me' ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      bgcolor: message.sender === 'me' ? 'primary.main' : 'white',
                      color: message.sender === 'me' ? 'white' : 'text.primary',
                      borderRadius: message.sender === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.text}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        textAlign: 'right',
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>

            {/* حقل الإدخال */}
            <Box
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton>
                  <AttachIcon />
                </IconButton>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="اكتب رسالتك..."
                  variant="outlined"
                  size="small"
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&:disabled': { bgcolor: 'action.disabledBackground' },
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </>
        ) : (
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
            <GroupIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary">
              اختر محادثة للبدء
            </Typography>
            <Typography variant="body2" color="text.secondary">
              اختر محادثة من القائمة أو ابدأ محادثة جديدة
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  );
};

export default MessagingPanel;
