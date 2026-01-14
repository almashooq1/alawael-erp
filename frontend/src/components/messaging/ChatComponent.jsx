/**
 * Chat Component - Phase 3
 * مكون الدردشة الفورية
 *
 * Features:
 * - قائمة المحادثات
 * - نافذة الرسائل
 * - إرسال واستقبال الرسائل
 * - حالة الكتابة
 * - حالة القراءة
 * - مشاركة الملفات
 * - ردود على الرسائل
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Badge,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ChatComponent = () => {
  const { socket, isConnected, joinConversation, leaveConversation, on, off } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // تحميل المحادثات
  useEffect(() => {
    loadConversations();
  }, []);

  // الاستماع لأحداث Socket.IO
  useEffect(() => {
    if (!socket) return;

    // رسالة جديدة
    const handleNewMessage = data => {
      console.log('📨 New message received:', data);

      // إضافة الرسالة للقائمة إذا كانت من المحادثة الحالية
      if (data.conversationId === selectedConversation?._id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }

      // تحديث المحادثة في القائمة
      setConversations(prev =>
        prev.map(conv => (conv._id === data.conversationId ? { ...conv, lastMessage: data.message, unreadCount: (conv.unreadCount || 0) + 1 } : conv))
      );
    };

    // مستخدم يكتب
    const handleUserTyping = data => {
      if (data.conversationId === selectedConversation?._id) {
        setTypingUsers(prev => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
      }
    };

    // مستخدم توقف عن الكتابة
    const handleUserStoppedTyping = data => {
      if (data.conversationId === selectedConversation?._id) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    };

    // تحديث قراءة الرسالة
    const handleMessageReadUpdate = data => {
      if (data.conversationId === selectedConversation?._id) {
        setMessages(prev =>
          prev.map(msg => (msg._id === data.messageId ? { ...msg, readBy: [...(msg.readBy || []), { user: data.userId, readAt: new Date() }] } : msg))
        );
      }
    };

    on('new_message', handleNewMessage);
    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);
    on('message_read_update', handleMessageReadUpdate);

    return () => {
      off('new_message', handleNewMessage);
      off('user_typing', handleUserTyping);
      off('user_stopped_typing', handleUserStoppedTyping);
      off('message_read_update', handleMessageReadUpdate);
    };
  }, [socket, selectedConversation, on, off]);

  // تحميل الرسائل عند اختيار محادثة
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      joinConversation(selectedConversation._id);

      return () => {
        leaveConversation(selectedConversation._id);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  // تمرير للأسفل تلقائياً
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setConversations(response.data.data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async conversationId => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMessages(response.data.data.messages.reverse());

        // تحديد الرسائل كمقروءة
        await axios.post(
          `${API_URL}/api/messages/mark-read/${conversationId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/messages/send`,
        {
          conversationId: selectedConversation._id,
          content: messageInput,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessageInput('');
      handleStopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!socket || !selectedConversation) return;

    socket.emit('typing', { conversationId: selectedConversation._id });

    // إيقاف حالة الكتابة بعد 3 ثوانٍ
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (!socket || !selectedConversation) return;
    socket.emit('stop_typing', { conversationId: selectedConversation._id });
  };

  const formatTime = date => {
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredConversations = conversations.filter(
    conv =>
      conv.groupInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participants?.some(p => p.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', p: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* قائمة المحادثات */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                المحادثات
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث..."
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
              {!isConnected && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  غير متصل
                </Alert>
              )}
            </Box>

            <List sx={{ flex: 1, overflow: 'auto' }}>
              {filteredConversations.map(conv => (
                <ListItem key={conv._id} disablePadding>
                  <ListItemButton selected={selectedConversation?._id === conv._id} onClick={() => setSelectedConversation(conv)}>
                    <ListItemAvatar>
                      <Badge badgeContent={conv.unreadCount || 0} color="error">
                        <Avatar>{conv.groupInfo?.name?.charAt(0) || conv.participants?.[0]?.user?.fullName?.charAt(0) || '?'}</Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={conv.groupInfo?.name || conv.participants?.find(p => p.user)?.user?.fullName || 'محادثة'}
                      secondary={conv.lastMessage?.content?.substring(0, 30) || 'لا توجد رسائل'}
                      secondaryTypographyProps={{
                        noWrap: true,
                      }}
                    />
                    {conv.lastMessage?.sentAt && (
                      <Typography variant="caption" color="textSecondary">
                        {formatTime(conv.lastMessage.sentAt)}
                      </Typography>
                    )}
                  </ListItemButton>
                </ListItem>
              ))}

              {filteredConversations.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    لا توجد محادثات
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>

        {/* نافذة الرسائل */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>{selectedConversation.groupInfo?.name?.charAt(0) || selectedConversation.participants?.[0]?.user?.fullName?.charAt(0) || '?'}</Avatar>
                    <div>
                      <Typography variant="h6">{selectedConversation.groupInfo?.name || selectedConversation.participants?.[0]?.user?.fullName || 'محادثة'}</Typography>
                      {typingUsers.length > 0 && (
                        <Typography variant="caption" color="primary">
                          يكتب...
                        </Typography>
                      )}
                    </div>
                  </Box>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {/* الرسائل */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, backgroundColor: '#f5f5f5' }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {messages.map((msg, index) => {
                        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                        const isMyMessage = msg.sender?._id === currentUser._id;

                        return (
                          <Box
                            key={msg._id || index}
                            sx={{
                              display: 'flex',
                              justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                              mb: 2,
                            }}
                          >
                            <Paper
                              elevation={1}
                              sx={{
                                p: 1.5,
                                maxWidth: '70%',
                                backgroundColor: isMyMessage ? '#dcf8c6' : 'white',
                              }}
                            >
                              {!isMyMessage && (
                                <Typography variant="caption" color="primary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  {msg.sender?.fullName}
                                </Typography>
                              )}
                              <Typography variant="body1">{msg.content?.text}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                                <Typography variant="caption" color="textSecondary">
                                  {formatTime(msg.createdAt)}
                                </Typography>
                                {isMyMessage && (msg.readBy?.length > 0 ? <DoneAllIcon sx={{ fontSize: 16, color: '#4fc3f7' }} /> : <CheckIcon sx={{ fontSize: 16 }} />)}
                              </Box>
                            </Paper>
                          </Box>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </Box>

                {/* حقل الإدخال */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="اكتب رسالتك..."
                    value={messageInput}
                    onChange={e => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconButton size="small">
                            <AttachFileIcon />
                          </IconButton>
                          <IconButton size="small">
                            <EmojiIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton color="primary" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                            <SendIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography variant="h6" color="textSecondary">
                  اختر محادثة للبدء
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatComponent;
