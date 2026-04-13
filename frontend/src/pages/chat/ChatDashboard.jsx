import { useState, useEffect, useCallback } from 'react';




import { useNavigate } from 'react-router-dom';
import chatService from '../../services/chatService';

// ── Status Colors ──
const STATUS_COLORS = { online: '#4caf50', away: '#ff9800', busy: '#f44336', offline: '#9e9e9e' };
const STATUS_LABELS = { online: 'متصل', away: 'بعيد', busy: 'مشغول', offline: 'غير متصل' };
const _MSG_TYPE_ICONS = { text: <Chat fontSize="small" />, file: <InsertDriveFile fontSize="small" />, image: <Image fontSize="small" />, audio: <MicNone fontSize="small" />, video: <Videocam fontSize="small" /> };

// ── KPI Card ──
function KPICard({ title, value, icon, color = '#1976d2', subtitle }) {
  return (
    <Card sx={{ height: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' } }}>
      <Box sx={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Avatar sx={{ bgcolor: `${color}15`, color, mx: 'auto', mb: 1, width: 48, height: 48 }}>{icon}</Avatar>
        <Typography variant="h4" fontWeight={800}>{value}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.disabled">{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
}

export default function ChatDashboard() {
  const _navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Dialogs
  const [groupDialog, setGroupDialog] = useState(false);
  const [directDialog, setDirectDialog] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', participants: [], type: 'group' });

  // ── Load Data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, convRes, userRes] = await Promise.all([
        chatService.getDashboard(),
        chatService.getConversations(),
        chatService.getUsers(),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data);
      setConversations(convRes.data?.data || []);
      setUsers(userRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showMsg = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // ── Conversation Selection ──
  const handleSelectConversation = async (conv) => {
    setSelectedConv(conv);
    setMsgLoading(true);
    try {
      const res = await chatService.getMessages(conv.id);
      setMessages(res.data?.messages || res.data?.data || []);
      await chatService.markAsRead(conv.id);
      // Refresh conversation list to update unread counts
      const convRes = await chatService.getConversations();
      setConversations(convRes.data?.data || []);
    } catch (err) {
      showMsg('خطأ في تحميل الرسائل', 'error');
    } finally {
      setMsgLoading(false);
    }
  };

  // ── Send Message ──
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    try {
      await chatService.sendMessage(selectedConv.id, { content: newMessage, type: 'text' });
      setNewMessage('');
      // Reload messages
      const res = await chatService.getMessages(selectedConv.id);
      setMessages(res.data?.messages || res.data?.data || []);
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في إرسال الرسالة', 'error');
    }
  };

  // ── Create Direct Conversation ──
  const handleCreateDirect = async (userId) => {
    try {
      const res = await chatService.createDirectConversation(userId);
      setDirectDialog(false);
      showMsg('تم بدء المحادثة');
      loadData();
      handleSelectConversation(res.data?.data || res.data);
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ', 'error');
    }
  };

  // ── Create Group ──
  const handleCreateGroup = async () => {
    try {
      await chatService.createGroupConversation(groupForm);
      setGroupDialog(false);
      setGroupForm({ name: '', description: '', participants: [], type: 'group' });
      showMsg('تم إنشاء المجموعة بنجاح');
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في إنشاء المجموعة', 'error');
    }
  };

  // ── Search Messages ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await chatService.searchMessages(searchQuery);
      setSearchResults(res.data?.data || []);
    } catch (err) {
      showMsg('خطأ في البحث', 'error');
    }
  };

  // ── Reaction ──
  const handleReaction = async (msgId, emoji) => {
    try {
      await chatService.addReaction(msgId, emoji);
      if (selectedConv) {
        const res = await chatService.getMessages(selectedConv.id);
        setMessages(res.data?.messages || res.data?.data || []);
      }
    } catch (err) {
      showMsg('خطأ في التفاعل', 'error');
    }
  };

  // ── Delete Message ──
  const handleDeleteMessage = async (msgId) => {
    try {
      await chatService.deleteMessage(msgId);
      showMsg('تم حذف الرسالة');
      if (selectedConv) {
        const res = await chatService.getMessages(selectedConv.id);
        setMessages(res.data?.messages || res.data?.data || []);
      }
    } catch (err) {
      showMsg('خطأ في حذف الرسالة', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mr: 2 }}>جاري التحميل...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Alert severity="error" action={<Button onClick={loadData} startIcon={<Refresh />}>إعادة المحاولة</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const kpis = dashboard?.kpis || {};

  // ════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════
  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48 }}><Chat /></Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">الدردشة الفورية</Typography>
            <Typography variant="body2" color="text.secondary">تواصل فوري بين الموظفين — مجموعات ومحادثات خاصة</Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<Add />} onClick={() => setGroupDialog(true)}>
            مجموعة جديدة
          </Button>
          <Button variant="outlined" startIcon={<Person />} onClick={() => setDirectDialog(true)}>
            محادثة جديدة
          </Button>
          <IconButton onClick={loadData}><Refresh /></IconButton>
        </Stack>
      </Box>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="المحادثات" value={kpis.totalConversations || 0} icon={<Forum />} color="#1976d2" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="الرسائل" value={kpis.totalMessages || 0} icon={<Chat />} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="المتصلون" value={kpis.onlineUsers || 0} icon={<Person />} color="#4caf50" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="غير مقروءة" value={kpis.totalUnread || 0} icon={<MarkChatRead />} color="#ed6c02" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="المرفقات" value={kpis.totalAttachments || 0} icon={<AttachFile />} color="#9c27b0" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="محادثات خاصة" value={kpis.directChats || 0} icon={<Person />} color="#0288d1" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="مجموعات" value={kpis.groupChats || 0} icon={<Group />} color="#7b1fa2" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="نشطة هذا الأسبوع" value={kpis.activeConversations || 0} icon={<Campaign />} color="#c62828" />
        </Grid>
      </Grid>

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 2, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52, transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } },
            '& .Mui-selected': { fontWeight: 700 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<Chat />} label="المحادثات" />
          <Tab icon={<Person />} label="المتصلون" />
          <Tab icon={<Search />} label="بحث الرسائل" />
        </Tabs>
      </Paper>

      {/* ═══ Tab 0: Conversations + Chat ═══ */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {/* Conversation List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: 600, overflow: 'auto', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <Box sx={{ p: 1.5, borderBottom: '1px solid #eee' }}>
                <TextField
                  size="small" fullWidth placeholder="بحث في المحادثات..."
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
              </Box>
              <List dense>
                {conversations.map(conv => (
                  <ListItem
                    key={conv.id} button
                    selected={selectedConv?.id === conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    sx={{ borderBottom: '1px solid #f5f5f5', '&:hover': { bgcolor: '#f0f7ff' } }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={conv.unread || 0} color="error"
                        overlap="circular" anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                      >
                        <Avatar sx={{ bgcolor: conv.type === 'direct' ? '#1976d2' : conv.type === 'channel' ? '#7b1fa2' : '#2e7d32' }}>
                          {conv.type === 'direct' ? <Person /> : conv.type === 'channel' ? <Campaign /> : <Group />}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>{conv.displayName || conv.name || 'محادثة'}</Typography>
                          {conv.otherUser && (
                            <Circle sx={{ fontSize: 10, color: STATUS_COLORS[conv.otherUser.status] || '#9e9e9e' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        conv.lastMessage ? (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {conv.lastMessage.senderName}: {conv.lastMessage.content}
                          </Typography>
                        ) : 'لا توجد رسائل بعد'
                      }
                    />
                  </ListItem>
                ))}
                {conversations.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">لا توجد محادثات</Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Chat Area */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {selectedConv ? (
                <>
                  {/* Chat Header */}
                  <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: selectedConv.type === 'direct' ? '#1976d2' : '#2e7d32' }}>
                      {selectedConv.type === 'direct' ? <Person /> : <Group />}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{selectedConv.displayName || selectedConv.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedConv.type === 'direct'
                          ? STATUS_LABELS[selectedConv.otherUser?.status] || 'غير متصل'
                          : `${selectedConv.participantCount || selectedConv.participants?.length || 0} مشارك`}
                      </Typography>
                    </Box>
                    <Tooltip title="الرسائل المثبتة"><IconButton size="small"><PushPin /></IconButton></Tooltip>
                    <Tooltip title="المرفقات"><IconButton size="small"><AttachFile /></IconButton></Tooltip>
                  </Box>

                  {/* Messages */}
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#fafafa' }}>
                    {msgLoading ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : (
                      messages.map(msg => (
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
                              maxWidth: '70%', p: 1.5, borderRadius: '14px',
                              bgcolor: msg.senderId === 'u1' ? '#e3f2fd' : '#fff',
                              border: '1px solid rgba(0,0,0,0.06)',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
                              {msg.reactions && msg.reactions.length > 0 && (
                                <Stack direction="row" spacing={0.25}>
                                  {msg.reactions.map((r, i) => (
                                    <Chip key={i} label={r.emoji} size="small" variant="outlined" sx={{ height: 20, fontSize: 12 }} />
                                  ))}
                                </Stack>
                              )}
                            </Box>
                            {/* Quick Actions */}
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                              <Tooltip title="إعجاب">
                                <IconButton size="small" onClick={() => handleReaction(msg.id, '👍')}>
                                  <EmojiEmotions sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              {msg.senderId === 'u1' && (
                                <Tooltip title="حذف">
                                  <IconButton size="small" onClick={() => handleDeleteMessage(msg.id)}>
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Box>
                        </Box>
                      ))
                    )}
                    {!msgLoading && messages.length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Chat sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                        <Typography color="text.secondary">لا توجد رسائل بعد — ابدأ المحادثة!</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Message Input */}
                  <Box sx={{ p: 1.5, borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
                    <IconButton size="small"><AttachFile /></IconButton>
                    <TextField
                      size="small" fullWidth placeholder="اكتب رسالة..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    />
                    <IconButton color="primary" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send />
                    </IconButton>
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Forum sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">اختر محادثة للبدء</Typography>
                  <Typography variant="body2" color="text.disabled">أو أنشئ محادثة جديدة من الأزرار أعلاه</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ═══ Tab 1: Online Users ═══ */}
      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>المستخدمون المتصلون ({dashboard?.onlineUsers?.length || 0})</Typography>
          <Grid container spacing={2}>
            {(dashboard?.onlineUsers || []).map(user => (
              <Grid item xs={12} sm={6} md={4} key={user.id}>
                <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                  <Badge
                    overlap="circular" variant="dot"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    sx={{ '& .MuiBadge-dot': { bgcolor: '#4caf50', width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff' } }}
                  >
                    <Avatar sx={{ bgcolor: '#1976d2' }}>{user.name?.[0]}</Avatar>
                  </Badge>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.department}</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => handleCreateDirect(user.id)}>
                    <Chat sx={{ fontSize: 18 }} />
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
          {(!dashboard?.onlineUsers || dashboard.onlineUsers.length === 0) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">لا يوجد مستخدمون متصلون حالياً</Typography>
            </Box>
          )}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>جميع المستخدمين</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الدور</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2', fontSize: 14 }}>{user.name?.[0]}</Avatar>
                        {user.name}
                      </Box>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell><Chip size="small" label={user.role} /></TableCell>
                    <TableCell>
                      <Chip
                        size="small" icon={<Circle sx={{ fontSize: '10px !important' }} />}
                        label={STATUS_LABELS[user.status] || user.status}
                        sx={{ '& .MuiChip-icon': { color: STATUS_COLORS[user.status] } }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleCreateDirect(user.id)}>محادثة</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ═══ Tab 2: Search ═══ */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small" fullWidth placeholder="ابحث في جميع الرسائل..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            />
            <Button variant="contained" sx={{ borderRadius: '12px' }} onClick={handleSearch}>بحث</Button>
          </Box>
          {searchResults.length > 0 ? (
            <List>
              {searchResults.map(msg => (
                <ListItem key={msg.id} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
                      {msg.senderName?.[0] || <Person />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={msg.content}
                    secondary={`${msg.senderName} — ${msg.conversationName} — ${new Date(msg.createdAt).toLocaleDateString('ar-SA')}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Search sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="text.secondary">ابحث عن رسائل بالكلمات المفتاحية</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* ═══ Create Group Dialog ═══ */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="اسم المجموعة" sx={{ mt: 1, mb: 2 }}
            value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextField
            fullWidth label="الوصف" multiline rows={2} sx={{ mb: 2 }}
            value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>النوع</InputLabel>
            <Select
              value={groupForm.type} label="النوع"
              onChange={e => setGroupForm(f => ({ ...f, type: e.target.value }))}
            >
              <MenuItem value="group">مجموعة</MenuItem>
              <MenuItem value="channel">قناة</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>المشاركون</InputLabel>
            <Select
              multiple value={groupForm.participants} label="المشاركون"
              onChange={e => setGroupForm(f => ({ ...f, participants: e.target.value }))}
              renderValue={sel => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {sel.map(v => {
                    const u = users.find(u => u.id === v);
                    return <Chip key={v} label={u?.name || v} size="small" />;
                  })}
                </Box>
              )}
            >
              {users.filter(u => u.id !== 'u1').map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name} — {u.department}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!groupForm.name || groupForm.participants.length === 0}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Direct Chat Dialog ═══ */}
      <Dialog open={directDialog} onClose={() => setDirectDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>محادثة جديدة</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>اختر مستخدم لبدء محادثة خاصة</Typography>
          <List>
            {users.filter(u => u.id !== 'u1').map(user => (
              <ListItem key={user.id} button onClick={() => handleCreateDirect(user.id)}>
                <ListItemAvatar>
                  <Badge
                    overlap="circular" variant="dot"
                    sx={{ '& .MuiBadge-dot': { bgcolor: STATUS_COLORS[user.status] || '#9e9e9e' } }}
                  >
                    <Avatar sx={{ bgcolor: '#1976d2' }}>{user.name?.[0]}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText primary={user.name} secondary={user.department} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDirectDialog(false)}>إلغاء</Button>
        </DialogActions>
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
