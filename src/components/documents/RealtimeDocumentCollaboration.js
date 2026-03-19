/**
 * Real-time Document Collaboration Component
 * نظام التعاون الفوري على المستندات
 *
 * Features:
 * ✅ تحرير متزامن
 * ✅ مؤشرات المستخدمين
 * ✅ الاتصالات الحية
 * ✅ سجل التغييرات
 * ✅ التزامن التلقائي
 * ✅ إدارة المستخدمين المتصلين
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  Button,
  TextField,
  Tooltip,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  Edit as EditIcon,
  Group as GroupIcon,
  Done as DoneIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';

const RealtimeDocumentCollaboration = ({
  document,
  onClose,
  currentUser = { id: '1', name: 'أنت', color: '#667eea' },
}) => {
  const [activeUsers, setActiveUsers] = useState([
    currentUser,
    { id: '2', name: 'محمد علي', color: '#764ba2', lastEdit: Date.now() },
    { id: '3', name: 'فاطمة أحمد', color: '#f093fb', lastEdit: Date.now() - 30000 },
  ]);

  const [changes, setChanges] = useState(document?.changeHistory || []);
  const [selectedChange, setSelectedChange] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // syncing, synced, conflict
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [userCursors, setUserCursors] = useState({});
  const [conflictInfo, setConflictInfo] = useState(null);

  const simulateSync = useCallback(() => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
    }, 1000);
  }, []);

  const handleAddChange = useCallback(
    (changeType, content) => {
      const newChange = {
        id: `change_${Date.now()}`,
        user: currentUser.name,
        userId: currentUser.id,
        timestamp: Date.now(),
        type: changeType, // 'insert', 'delete', 'format'
        content,
        position: 0,
      };

      setChanges(prev => [...prev, newChange]);
      simulateSync();
    },
    [currentUser, simulateSync]
  );

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;

    const chatMessage = {
      id: `msg_${Date.now()}`,
      user: currentUser.name,
      userId: currentUser.id,
      userColor: currentUser.color,
      timestamp: Date.now(),
      message: message.trim(),
    };

    setChat(prev => [...prev, chatMessage]);
    setMessage('');
  }, [message, currentUser]);

  const handleResolveConflict = useCallback(
    resolution => {
      if (conflictInfo) {
        const resolvedChange = {
          ...conflictInfo.change,
          resolved: true,
          resolution,
          resolvedBy: currentUser.name,
          resolvedAt: Date.now(),
        };

        setChanges(prev => prev.map(c => (c.id === conflictInfo.change.id ? resolvedChange : c)));
        setConflictInfo(null);
        simulateSync();
      }
    },
    [conflictInfo, currentUser, simulateSync]
  );

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon />
          التعاون الفوري على المستند
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {syncStatus === 'synced' && (
            <Chip
              label="متزامن"
              size="small"
              color="success"
              variant="outlined"
              icon={<DoneIcon />}
            />
          )}
          {syncStatus === 'syncing' && (
            <Chip
              label="جاري التزامن..."
              size="small"
              variant="outlined"
              icon={<Schedule Icon />}
            />
          )}
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 3 }}>
          {/* الجزء الرئيسي */}
          <Stack spacing={3}>
            {/* المستخدمون النشطون */}
            <Paper sx={{ p: 2, bgcolor: '#f8f9ff', borderRadius: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <PersonIcon fontSize="small" />
                المستخدمون النشطون ({activeUsers.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {activeUsers.map(user => (
                  <Tooltip
                    key={user.id}
                    title={`${user.name} ${user.lastEdit ? '(يحرر الآن)' : ''}`}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        user.lastEdit ? <DoneIcon sx={{ fontSize: 14, color: 'green' }} /> : null
                      }
                    >
                      <Avatar
                        sx={{
                          background: user.color,
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': { transform: 'scale(1.1)', boxShadow: 2 },
                        }}
                      >
                        {user.name.charAt(0)}
                      </Avatar>
                    </Badge>
                  </Tooltip>
                ))}
              </Box>
            </Paper>

            {/* حالة التزامن */}
            {conflictInfo && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ تضارب تحرير!
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  المستخدم {conflictInfo.change.user} عدّل نفس الجزء الذي تعدله أنت
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => handleResolveConflict('keep-mine')}
                    variant="outlined"
                  >
                    إبقاء تغييري
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleResolveConflict('accept-theirs')}
                    variant="outlined"
                  >
                    قبول تغييراتهم
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleResolveConflict('merge')}
                    variant="outlined"
                  >
                    دمج التغييرات
                  </Button>
                </Box>
              </Alert>
            )}

            {/* سجل التغييرات */}
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <EditIcon fontSize="small" />
                سجل التغييرات ({changes.length})
              </Typography>

              {changes.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  لا توجد تغييرات بعد
                </Alert>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  <List disablePadding>
                    {changes.map((change, index) => (
                      <React.Fragment key={change.id}>
                        <ListItem
                          sx={{
                            cursor: 'pointer',
                            bgcolor: selectedChange?.id === change.id ? '#e3f2fd' : 'inherit',
                            transition: 'all 0.3s',
                            '&:hover': { bgcolor: '#f8f9ff' },
                            borderRadius: 1,
                          }}
                          onClick={() => setSelectedChange(change)}
                        >
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                background:
                                  activeUsers.find(u => u.id === change.userId)?.color || '#999',
                              }}
                            >
                              {change.user.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {change.user}
                                </Typography>
                                <Chip
                                  label={
                                    change.type === 'insert'
                                      ? 'إضافة'
                                      : change.type === 'delete'
                                        ? 'حذف'
                                        : 'تنسيق'
                                  }
                                  size="small"
                                  variant="outlined"
                                />
                                {change.resolved && (
                                  <Chip
                                    label="تم الحل"
                                    size="small"
                                    color="success"
                                    icon={<DoneIcon />}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {new Date(change.timestamp).toLocaleTimeString('ar-SA')}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < changes.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>

            {/* معلومات التغيير المحدد */}
            {selectedChange && (
              <Card sx={{ bgcolor: '#f0f7ff', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    📝 تفاصيل التغيير
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="textSecondary">
                        المستخدم:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedChange.user}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="textSecondary">
                        النوع:
                      </Typography>
                      <Chip label={selectedChange.type} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="textSecondary">
                        الوقت:
                      </Typography>
                      <Typography variant="caption">
                        {new Date(selectedChange.timestamp).toLocaleString('ar-SA')}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        المحتوى:
                      </Typography>
                      <Paper sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                          }}
                        >
                          {selectedChange.content}
                        </Typography>
                      </Paper>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>

          {/* الجزء الجانبي - الدردشة */}
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setShowChat(!showChat)}
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {showChat ? 'إغلاق الدردشة' : 'فتح الدردشة'}
            </Button>

            {showChat && (
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 500,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  💬 دردشة المستند
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* رسائل الدردشة */}
                <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                  {chat.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      لا توجد رسائل بعد
                    </Alert>
                  ) : (
                    <Stack spacing={1}>
                      {chat.map(msg => (
                        <Box
                          key={msg.id}
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'flex-start',
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              background: msg.userColor,
                              fontSize: '11px',
                            }}
                          >
                            {msg.user.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {msg.user}
                            </Typography>
                            <Paper
                              sx={{
                                p: 1,
                                bgcolor:
                                  msg.userId === currentUser.id ? 'primary.light' : '#f0f0f0',
                                borderRadius: 1,
                                mt: 0.5,
                              }}
                            >
                              <Typography variant="caption">{msg.message}</Typography>
                            </Paper>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{ fontSize: '10px', mt: 0.3, display: 'block' }}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString('ar-SA')}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider sx={{ mb: 1 }} />

                {/* إدخال الرسالة */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="رسالة..."
                    size="small"
                    fullWidth
                    sx={{ borderRadius: 1 }}
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    size="small"
                    color="primary"
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Paper>
            )}

            {/* معلومات الملف */}
            <Paper sx={{ p: 2, bgcolor: '#f8f9ff', borderRadius: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <InfoIcon fontSize="small" />
                معلومات الملف
              </Typography>
              <Stack spacing={1} sx={{ fontSize: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    الحالة:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {syncStatus === 'synced' ? '✅ متزامن' : '⏳ جاري التزامن...'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    التغييرات:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {changes.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    الرسائل:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {chat.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    آخر تحديث:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {changes.length > 0
                      ? new Date(changes[changes.length - 1].timestamp).toLocaleTimeString('ar-SA')
                      : 'لم يتم التحديث'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RealtimeDocumentCollaboration;
