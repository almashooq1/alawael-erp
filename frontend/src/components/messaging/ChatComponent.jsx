/**
 * Chat Component — مكون المحادثات
 * Professional messaging interface for AlAwael ERP
 */

import { useState, useRef, useEffect } from 'react';
import {
  useTheme,
} from '@mui/material';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import { AttachIcon } from 'utils/iconAliases';

const DEMO_MESSAGES = [
  {
    id: 1,
    sender: 'أحمد محمد',
    avatar: 'أ',
    text: 'مرحباً، هل تم تحديث ملف المستفيد؟',
    time: '10:30 ص',
    isOwn: false,
  },
  {
    id: 2,
    sender: 'أنت',
    avatar: 'م',
    text: 'نعم، تم التحديث بنجاح ✅',
    time: '10:32 ص',
    isOwn: true,
  },
  {
    id: 3,
    sender: 'أحمد محمد',
    avatar: 'أ',
    text: 'ممتاز! شكراً لك.',
    time: '10:33 ص',
    isOwn: false,
  },
];

const DEMO_CONTACTS = [
  { id: 1, name: 'أحمد محمد', role: 'معالج', online: true },
  { id: 2, name: 'سارة خالد', role: 'إدارة', online: true },
  { id: 3, name: 'محمد علي', role: 'أخصائي', online: false },
  { id: 4, name: 'فاطمة يوسف', role: 'محاسبة', online: false },
];

const ChatComponent = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState(DEMO_CONTACTS[0]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'أنت',
        avatar: 'م',
        text: newMessage,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      },
    ]);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
      {/* Contacts Panel */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          borderLeft: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ mb: 1 }}>جهات الاتصال</Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="بحث..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {DEMO_CONTACTS.map((contact) => (
            <ListItem
              key={contact.id}
              button
              selected={selectedContact?.id === contact.id}
              onClick={() => setSelectedContact(contact)}
              sx={{ px: 2 }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: contact.online ? 'success.main' : 'grey.400' }}>
                  {contact.name[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={contact.name}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      label={contact.role}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    {contact.online && (
                      <Chip label="متصل" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Chat Panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.main' }}>{selectedContact?.name[0]}</Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {selectedContact?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedContact?.role} — {selectedContact?.online ? 'متصل الآن' : 'غير متصل'}
            </Typography>
          </Box>
        </Box>

        {/* Messages Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          }}
        >
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: msg.isOwn ? 'flex-start' : 'flex-end',
                mb: 0.5,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  px: 2,
                  maxWidth: '70%',
                  borderRadius: 2,
                  bgcolor: msg.isOwn ? 'primary.main' : theme.palette.background.paper,
                  color: msg.isOwn ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2">{msg.text}</Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.7, display: 'block', textAlign: 'left', mt: 0.5 }}
                >
                  {msg.time}
                </Typography>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input Area */}
        <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton size="small" color="primary" aria-label="إرفاق">
            <AttachIcon />
          </IconButton>
          <IconButton size="small" color="primary" aria-label="رموز تعبيرية">
            <EmojiIcon />
          </IconButton>
          <TextField
            fullWidth
            size="small"
            placeholder="اكتب رسالة..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={3}
          />
          <IconButton color="primary" aria-label="إرسال" onClick={handleSend} disabled={!newMessage.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatComponent;
