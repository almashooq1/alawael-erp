/**
 * ChatV2 — /chat page.
 *
 * Two-column chat: conversations list + active conversation thread.
 * Works for parents, therapists, and admins via contact-directory
 * logic on the backend.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Paper,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  CircularProgress,
  Divider,
  Badge,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import AddCommentIcon from '@mui/icons-material/AddComment';
import PersonIcon from '@mui/icons-material/Person';
import api from '../../services/api.client';

function displayName(u) {
  if (!u) return '—';
  return (
    u.firstName_ar || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '—'
  );
}
function initial(u) {
  const n = displayName(u);
  return (n || '?').trim().charAt(0);
}
function timeLabel(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString()) {
    return dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
  return dt.toLocaleDateString('ar-SA');
}

export default function ChatV2() {
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [draft, setDraft] = useState('');
  const [newDialog, setNewDialog] = useState({ open: false, contacts: [], loading: false });
  const [selectedContact, setSelectedContact] = useState(null);
  const threadRef = useRef(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser') ||
        localStorage.getItem('authUser');
      if (raw) setMe(JSON.parse(raw));
    } catch {
      setMe(null);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setErrMsg('');
    try {
      const { data } = await api.get('/chat-v2/conversations');
      const items = data?.items || [];
      setConversations(items);
      if (items.length > 0 && !activeId) setActiveId(items[0]._id);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل المحادثات');
    } finally {
      setLoadingConvs(false);
    }
  }, [activeId]);

  const loadMessages = useCallback(async id => {
    if (!id) return;
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/chat-v2/conversations/${id}/messages?limit=100`);
      setMessages(data?.items || []);
      // mark read
      await api.post(`/chat-v2/conversations/${id}/read`, {});
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل الرسائل');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const activeConv = useMemo(
    () => conversations.find(c => c._id === activeId) || null,
    [conversations, activeId]
  );

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat-v2/conversations/${activeId}/messages`, { text });
      setMessages(prev => [...prev, data?.data]);
      setDraft('');
      // Refresh sidebar lastActivity
      loadConversations();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  const openNew = async () => {
    setNewDialog({ open: true, contacts: [], loading: true });
    setSelectedContact(null);
    try {
      const { data } = await api.get('/chat-v2/contacts');
      setNewDialog({ open: true, contacts: data?.items || [], loading: false });
    } catch (err) {
      setNewDialog({ open: true, contacts: [], loading: false });
      setErrMsg(err?.response?.data?.message || 'فشل تحميل جهات الاتصال');
    }
  };

  const startConversation = async () => {
    if (!selectedContact?._id) return;
    try {
      const { data } = await api.post('/chat-v2/conversations', {
        withUserId: selectedContact._id,
      });
      const newId = data?.data?._id;
      setNewDialog({ open: false, contacts: [], loading: false });
      setSelectedContact(null);
      await loadConversations();
      if (newId) setActiveId(newId);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل إنشاء المحادثة');
    }
  };

  const myId = me?._id || me?.id;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الرسائل
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تواصل مباشر بين أولياء الأمور والمعالجين والإدارة.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={loadConversations}>
            <RefreshIcon />
          </IconButton>
          <Button variant="contained" startIcon={<AddCommentIcon />} onClick={openNew}>
            محادثة جديدة
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      <Paper sx={{ overflow: 'hidden', height: '70vh' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Conversations sidebar */}
          <Grid
            item
            xs={12}
            md={4}
            sx={{
              borderLeft: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '100%',
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                محادثاتي ({conversations.length})
              </Typography>
            </Box>
            {loadingConvs && <LinearProgress />}
            <List sx={{ overflow: 'auto', flex: 1, p: 0 }}>
              {conversations.length === 0 && !loadingConvs && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    لا توجد محادثات. ابدأ واحدة جديدة.
                  </Typography>
                </Box>
              )}
              {conversations.map(c => (
                <ListItem key={c._id} disablePadding>
                  <ListItemButton selected={c._id === activeId} onClick={() => setActiveId(c._id)}>
                    <ListItemAvatar>
                      <Badge badgeContent={c.unread} color="error">
                        <Avatar>{initial(c.other)}</Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={displayName(c.other)}
                      secondary={
                        <Stack direction="row" justifyContent="space-between" component="span">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 160 }}
                            component="span"
                          >
                            {c.lastMessage?.content || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {timeLabel(c.lastActivityAt)}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Thread */}
          <Grid
            item
            xs={12}
            md={8}
            sx={{ display: 'flex', flexDirection: 'column', maxHeight: '100%' }}
          >
            {!activeConv ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ height: '100%', color: 'text.secondary' }}
              >
                <PersonIcon sx={{ fontSize: 64, mb: 2 }} />
                <Typography>اختر محادثة من الجانب الأيمن</Typography>
              </Stack>
            ) : (
              <>
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar>{initial(activeConv.other)}</Avatar>
                    <Box>
                      <Typography fontWeight={600}>{displayName(activeConv.other)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activeConv.other?.email || activeConv.other?.role || ''}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Box
                  ref={threadRef}
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    bgcolor: 'grey.50',
                  }}
                >
                  {loadingMsgs && <LinearProgress />}
                  {messages.length === 0 && !loadingMsgs && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        لا توجد رسائل بعد. كن أوّل من يكتب.
                      </Typography>
                    </Box>
                  )}
                  {messages.map(m => {
                    const mine = String(m.sender?._id || m.sender) === String(myId);
                    return (
                      <Stack
                        key={m._id}
                        direction={mine ? 'row-reverse' : 'row'}
                        spacing={1}
                        sx={{ mb: 1.5 }}
                      >
                        <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>
                          {initial(m.sender)}
                        </Avatar>
                        <Box
                          sx={{
                            bgcolor: mine ? 'primary.main' : 'background.paper',
                            color: mine ? 'primary.contrastText' : 'text.primary',
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            maxWidth: '70%',
                            boxShadow: mine ? 0 : 1,
                          }}
                        >
                          {!mine && (
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, display: 'block', mb: 0.3 }}
                            >
                              {displayName(m.sender)}
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {m.content?.text || ''}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              opacity: 0.7,
                              textAlign: mine ? 'left' : 'right',
                            }}
                          >
                            {timeLabel(m.createdAt)}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Box>

                <Box
                  sx={{
                    p: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      maxRows={4}
                      placeholder="اكتب رسالتك…"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    <Button
                      variant="contained"
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      sx={{ minWidth: 64 }}
                    >
                      {sending ? <CircularProgress size={20} /> : <SendIcon />}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* New conversation dialog */}
      <Dialog
        open={newDialog.open}
        onClose={() => setNewDialog({ open: false, contacts: [], loading: false })}
        dir="rtl"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>محادثة جديدة</DialogTitle>
        <DialogContent dividers>
          {newDialog.loading ? (
            <LinearProgress />
          ) : newDialog.contacts.length === 0 ? (
            <Alert severity="info">
              لا توجد جهات اتصال متاحة لك حالياً. المعالجون يرون أولياء أمور حالاتهم؛ أولياء الأمور
              يرون معالجي أطفالهم.
            </Alert>
          ) : (
            <Autocomplete
              options={newDialog.contacts}
              value={selectedContact}
              onChange={(_, v) => setSelectedContact(v)}
              getOptionLabel={o => displayName(o)}
              isOptionEqualToValue={(a, b) => a?._id === b?._id}
              groupBy={o => o.category || 'أخرى'}
              renderInput={p => <TextField {...p} label="اختر جهة الاتصال" autoFocus />}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar sx={{ width: 28, height: 28, ml: 1, fontSize: 13 }}>
                    {initial(option)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">{displayName(option)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.email || option.role || ''}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialog({ open: false, contacts: [], loading: false })}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={startConversation} disabled={!selectedContact}>
            بدء المحادثة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
