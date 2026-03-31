import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Button, IconButton,
  TextField, Chip, Alert, CircularProgress, Tooltip, Avatar,
  Stack, Snackbar, List, ListItem, ListItemAvatar, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Badge, Menu, MenuItem,
} from '@mui/material';
import {
   Group, Person, Send, ArrowBack, AttachFile, PushPin, Delete, Edit, MoreVert, InsertDriveFile, Reply, GroupAdd, PersonRemove,
  AdminPanelSettings, Campaign,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import chatService from '../../services/chatService';

const _STATUS_COLORS = { online: '#4caf50', away: '#ff9800', busy: '#f44336', offline: '#9e9e9e' };
const STATUS_LABELS = { online: 'متصل', away: 'بعيد', busy: 'مشغول', offline: 'غير متصل' };

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Dialogs
  const [pinnedDialog, setPinnedDialog] = useState(false);
  const [attachDialog, setAttachDialog] = useState(false);
  const [membersDialog, setMembersDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  // Context menu
  const [msgMenu, setMsgMenu] = useState({ anchorEl: null, msg: null });

  const showMsg = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [convRes, msgRes, pinnedRes, attRes] = await Promise.all([
        chatService.getConversationById(id),
        chatService.getMessages(id, { limit: 100 }),
        chatService.getPinnedMessages(id),
        chatService.getConversationAttachments(id),
      ]);
      setConversation(convRes.data?.data || convRes.data);
      setMessages(msgRes.data?.messages || msgRes.data?.data || []);
      setPinnedMessages(pinnedRes.data?.data || []);
      setAttachments(attRes.data?.data || []);
      // Mark as read
      await chatService.markAsRead(id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'خطأ في تحميل المحادثة');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send Message ──
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      const data = { content: newMessage, type: 'text' };
      if (replyTo) data.replyTo = replyTo.id;
      await chatService.sendMessage(id, data);
      setNewMessage('');
      setReplyTo(null);
      const res = await chatService.getMessages(id, { limit: 100 });
      setMessages(res.data?.messages || res.data?.data || []);
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في إرسال الرسالة', 'error');
    }
  };

  // ── Edit Message ──
  const handleEdit = async () => {
    if (!editContent.trim() || !editingMsg) return;
    try {
      await chatService.editMessage(editingMsg.id, editContent);
      setEditingMsg(null);
      setEditContent('');
      showMsg('تم تعديل الرسالة');
      const res = await chatService.getMessages(id, { limit: 100 });
      setMessages(res.data?.messages || res.data?.data || []);
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في التعديل', 'error');
    }
  };

  // ── Delete Message ──
  const handleDelete = async (msgId) => {
    try {
      await chatService.deleteMessage(msgId);
      showMsg('تم حذف الرسالة');
      const res = await chatService.getMessages(id, { limit: 100 });
      setMessages(res.data?.messages || res.data?.data || []);
    } catch (err) {
      showMsg('خطأ في الحذف', 'error');
    }
    setMsgMenu({ anchorEl: null, msg: null });
  };

  // ── Reaction ──
  const handleReaction = async (msgId, emoji) => {
    try {
      await chatService.addReaction(msgId, emoji);
      const res = await chatService.getMessages(id, { limit: 100 });
      setMessages(res.data?.messages || res.data?.data || []);
    } catch { /* ignore */ }
    setMsgMenu({ anchorEl: null, msg: null });
  };

  // ── Pin/Unpin ──
  const handlePin = async (msgId) => {
    try {
      await chatService.pinMessage(id, msgId);
      showMsg('تم تثبيت الرسالة');
      const res = await chatService.getPinnedMessages(id);
      setPinnedMessages(res.data?.data || []);
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ', 'error');
    }
    setMsgMenu({ anchorEl: null, msg: null });
  };

  const handleUnpin = async (msgId) => {
    try {
      await chatService.unpinMessage(id, msgId);
      showMsg('تم إلغاء تثبيت الرسالة');
      const res = await chatService.getPinnedMessages(id);
      setPinnedMessages(res.data?.data || []);
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ', 'error');
    }
  };

  // ── Members ──
  const handleAddMember = async (userId) => {
    try {
      await chatService.addParticipant(id, userId);
      showMsg('تم إضافة العضو');
      setAddMemberDialog(false);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ', 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await chatService.removeParticipant(id, userId);
      showMsg('تم إزالة العضو');
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ', 'error');
    }
  };

  const handlePromoteAdmin = async (userId) => {
    try {
      await chatService.promoteToAdmin(id, userId);
      showMsg('تم ترقية العضو لمشرف');
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ', 'error');
    }
  };

  const openAddMember = async () => {
    try {
      const res = await chatService.getUsers();
      setAllUsers(res.data?.data || []);
      setAddMemberDialog(true);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} /><Typography sx={{ mr: 2 }}>جاري التحميل...</Typography>
      </Box>
    );
  }

  if (error || !conversation) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Alert severity="error" action={<Button onClick={() => navigate('/chat')}>العودة</Button>}>
          {error || 'المحادثة غير موجودة'}
        </Alert>
      </Box>
    );
  }

  const conv = conversation;
  const isGroup = conv.type === 'group' || conv.type === 'channel';

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <IconButton onClick={() => navigate('/chat')}><ArrowBack /></IconButton>
        <Avatar sx={{ bgcolor: isGroup ? '#2e7d32' : '#1976d2', width: 48, height: 48 }}>
          {isGroup ? (conv.type === 'channel' ? <Campaign /> : <Group />) : <Person />}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight="bold">{conv.displayName || conv.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isGroup
              ? `${conv.participantCount || conv.participants?.length || 0} مشارك`
              : STATUS_LABELS[conv.otherUser?.status] || 'غير متصل'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={`المثبتة (${pinnedMessages.length})`}>
            <IconButton onClick={() => setPinnedDialog(true)}>
              <Badge badgeContent={pinnedMessages.length} color="primary"><PushPin /></Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={`المرفقات (${attachments.length})`}>
            <IconButton onClick={() => setAttachDialog(true)}>
              <Badge badgeContent={attachments.length} color="secondary"><AttachFile /></Badge>
            </IconButton>
          </Tooltip>
          {isGroup && (
            <Tooltip title="الأعضاء">
              <IconButton onClick={() => setMembersDialog(true)}><Group /></IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Pinned message banner */}
      {pinnedMessages.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#fff3e0', display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={() => setPinnedDialog(true)}
        >
          <PushPin color="warning" />
          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
            📌 {pinnedMessages[0]?.message?.content || 'رسالة مثبتة'}
          </Typography>
          <Typography variant="caption" color="text.secondary">{pinnedMessages.length} مثبتة</Typography>
        </Paper>
      )}

      {/* ── Chat Area ── */}
      <Paper sx={{ height: 500, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#fafafa' }}>
          {messages.map(msg => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex', flexDirection: msg.senderId === 'u1' ? 'row-reverse' : 'row',
                mb: 1.5, gap: 1,
              }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: msg.senderId === 'u1' ? '#1976d2' : '#757575' }}>
                {msg.sender?.name?.[0] || <Person />}
              </Avatar>
              <Box
                sx={{
                  maxWidth: '70%', p: 1.5, borderRadius: 2,
                  bgcolor: msg.senderId === 'u1' ? '#e3f2fd' : '#fff',
                  border: '1px solid #e0e0e0', position: 'relative',
                }}
              >
                {msg.sender && msg.senderId !== 'u1' && (
                  <Typography variant="caption" color="primary" fontWeight="bold">{msg.sender.name}</Typography>
                )}
                {msg.replyToMessage && (
                  <Box sx={{ bgcolor: '#f5f5f5', p: 0.5, borderRadius: 1, mb: 0.5, borderRight: '3px solid #1976d2' }}>
                    <Typography variant="caption" color="text.secondary">{msg.replyToMessage.senderName}</Typography>
                    <Typography variant="caption" display="block" noWrap>{msg.replyToMessage.content}</Typography>
                  </Box>
                )}
                <Typography variant="body2">{msg.content}</Typography>
                {msg.attachment && (
                  <Chip icon={<InsertDriveFile />} label={msg.attachment.originalName} size="small" sx={{ mt: 0.5 }} />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="caption" color="text.disabled">
                    {new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  {msg.isEdited && <Typography variant="caption" color="text.disabled">(معدّلة)</Typography>}
                </Box>
                {msg.reactions && msg.reactions.length > 0 && (
                  <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
                    {msg.reactions.map((r, i) => (
                      <Chip key={i} label={`${r.emoji} ${r.userName}`} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                    ))}
                  </Stack>
                )}
                {/* Message actions */}
                <IconButton
                  size="small" sx={{ position: 'absolute', top: 2, left: 2, opacity: 0.5, '&:hover': { opacity: 1 } }}
                  onClick={e => setMsgMenu({ anchorEl: e.currentTarget, msg })}
                >
                  <MoreVert sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        {/* Reply banner */}
        {replyTo && (
          <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderTop: '2px solid #1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Reply color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="primary">الرد على {replyTo.sender?.name}</Typography>
              <Typography variant="caption" noWrap display="block">{replyTo.content}</Typography>
            </Box>
            <IconButton size="small" onClick={() => setReplyTo(null)}><Delete fontSize="small" /></IconButton>
          </Box>
        )}

        {/* Edit banner */}
        {editingMsg && (
          <Box sx={{ p: 1, bgcolor: '#fff3e0', borderTop: '2px solid #ed6c02', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="warning" />
            <TextField
              size="small" fullWidth value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEdit()}
            />
            <Button size="small" onClick={handleEdit}>حفظ</Button>
            <IconButton size="small" onClick={() => setEditingMsg(null)}><Delete fontSize="small" /></IconButton>
          </Box>
        )}

        {/* Message Input */}
        {!editingMsg && (
          <Box sx={{ p: 1.5, borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
            <IconButton size="small"><AttachFile /></IconButton>
            <TextField
              size="small" fullWidth placeholder="اكتب رسالة..."
              value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            />
            <IconButton color="primary" onClick={handleSend} disabled={!newMessage.trim()}>
              <Send />
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* ═══ Message Context Menu ═══ */}
      <Menu
        anchorEl={msgMenu.anchorEl} open={Boolean(msgMenu.anchorEl)}
        onClose={() => setMsgMenu({ anchorEl: null, msg: null })}
      >
        <MenuItem onClick={() => { setReplyTo(msgMenu.msg); setMsgMenu({ anchorEl: null, msg: null }); }}>
          <Reply sx={{ mr: 1 }} /> رد
        </MenuItem>
        <MenuItem onClick={() => handleReaction(msgMenu.msg?.id, '👍')}>👍 إعجاب</MenuItem>
        <MenuItem onClick={() => handleReaction(msgMenu.msg?.id, '❤️')}>❤️ حب</MenuItem>
        <MenuItem onClick={() => handleReaction(msgMenu.msg?.id, '😂')}>😂 ضحك</MenuItem>
        <MenuItem onClick={() => handlePin(msgMenu.msg?.id)}><PushPin sx={{ mr: 1 }} /> تثبيت</MenuItem>
        {msgMenu.msg?.senderId === 'u1' && (
          <MenuItem onClick={() => { setEditingMsg(msgMenu.msg); setEditContent(msgMenu.msg.content); setMsgMenu({ anchorEl: null, msg: null }); }}>
            <Edit sx={{ mr: 1 }} /> تعديل
          </MenuItem>
        )}
        {msgMenu.msg?.senderId === 'u1' && (
          <MenuItem onClick={() => handleDelete(msgMenu.msg?.id)} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} /> حذف
          </MenuItem>
        )}
      </Menu>

      {/* ═══ Pinned Messages Dialog ═══ */}
      <Dialog open={pinnedDialog} onClose={() => setPinnedDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>الرسائل المثبتة ({pinnedMessages.length})</DialogTitle>
        <DialogContent>
          {pinnedMessages.length > 0 ? (
            <List>
              {pinnedMessages.map(pin => (
                <ListItem key={pin.id} secondaryAction={
                  <IconButton size="small" onClick={() => handleUnpin(pin.messageId)}><Delete fontSize="small" /></IconButton>
                }>
                  <ListItemText
                    primary={pin.message?.content}
                    secondary={`${pin.message?.senderName || ''} — مثبتة بواسطة ${pin.pinnedBy}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>لا توجد رسائل مثبتة</Typography>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setPinnedDialog(false)}>إغلاق</Button></DialogActions>
      </Dialog>

      {/* ═══ Attachments Dialog ═══ */}
      <Dialog open={attachDialog} onClose={() => setAttachDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>المرفقات ({attachments.length})</DialogTitle>
        <DialogContent>
          {attachments.length > 0 ? (
            <List>
              {attachments.map(att => (
                <ListItem key={att.id}>
                  <ListItemAvatar><Avatar sx={{ bgcolor: '#e3f2fd' }}><InsertDriveFile color="primary" /></Avatar></ListItemAvatar>
                  <ListItemText
                    primary={att.originalName || att.filename}
                    secondary={`${att.mimeType} — ${(att.size / 1024).toFixed(1)} KB`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>لا توجد مرفقات</Typography>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAttachDialog(false)}>إغلاق</Button></DialogActions>
      </Dialog>

      {/* ═══ Members Dialog ═══ */}
      {isGroup && (
        <Dialog open={membersDialog} onClose={() => setMembersDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            أعضاء المجموعة ({conv.participants?.length || 0})
            <Button size="small" startIcon={<GroupAdd />} onClick={openAddMember} sx={{ mr: 2 }}>إضافة</Button>
          </DialogTitle>
          <DialogContent>
            <List>
              {(conv.participants || []).map(pid => {
                const isAdmin = conv.admins?.includes(pid);
                return (
                  <ListItem key={pid} secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      {!isAdmin && (
                        <Tooltip title="ترقية لمشرف">
                          <IconButton size="small" onClick={() => handlePromoteAdmin(pid)}><AdminPanelSettings /></IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="إزالة">
                        <IconButton size="small" onClick={() => handleRemoveMember(pid)} color="error"><PersonRemove /></IconButton>
                      </Tooltip>
                    </Stack>
                  }>
                    <ListItemAvatar><Avatar sx={{ bgcolor: '#1976d2' }}>{pid[0]?.toUpperCase()}</Avatar></ListItemAvatar>
                    <ListItemText primary={pid} secondary={isAdmin ? 'مشرف' : 'عضو'} />
                  </ListItem>
                );
              })}
            </List>
          </DialogContent>
          <DialogActions><Button onClick={() => setMembersDialog(false)}>إغلاق</Button></DialogActions>
        </Dialog>
      )}

      {/* ═══ Add Member Dialog ═══ */}
      <Dialog open={addMemberDialog} onClose={() => setAddMemberDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة عضو</DialogTitle>
        <DialogContent>
          <List>
            {allUsers.filter(u => !conv.participants?.includes(u.id)).map(user => (
              <ListItem key={user.id} button onClick={() => handleAddMember(user.id)}>
                <ListItemAvatar><Avatar sx={{ bgcolor: '#1976d2' }}>{user.name?.[0]}</Avatar></ListItemAvatar>
                <ListItemText primary={user.name} secondary={user.department} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setAddMemberDialog(false)}>إلغاء</Button></DialogActions>
      </Dialog>

      {/* ═══ Snackbar ═══ */}
      <Snackbar
        open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
