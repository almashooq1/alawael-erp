import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Tooltip,
  Divider,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Send as SendIcon,
  Drafts as DraftsIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import axios from 'axios';

// تصنيفات المراسلات
const COMMUNICATION_TYPES = {
  incoming: { label: 'وارد', color: 'primary', icon: <EmailIcon /> },
  outgoing: { label: 'صادر', color: 'success', icon: <SendIcon /> },
  internal: { label: 'داخلي', color: 'info', icon: <MessageIcon /> },
  external: { label: 'خارجي', color: 'warning', icon: <BusinessIcon /> },
};

// حالات المراسلات
const COMMUNICATION_STATUS = {
  draft: { label: 'مسودة', color: 'default', icon: <DraftsIcon /> },
  pending: { label: 'قيد الانتظار', color: 'warning', icon: <PendingIcon /> },
  sent: { label: 'تم الإرسال', color: 'info', icon: <SendIcon /> },
  delivered: { label: 'تم التسليم', color: 'primary', icon: <CheckCircleIcon /> },
  read: { label: 'تمت القراءة', color: 'success', icon: <VisibilityIcon /> },
  replied: { label: 'تم الرد', color: 'success', icon: <ReplyIcon /> },
  archived: { label: 'مؤرشف', color: 'default', icon: <ArchiveIcon /> },
  failed: { label: 'فشل', color: 'error', icon: <ErrorIcon /> },
};

// مستويات الأولوية
const PRIORITY_LEVELS = {
  low: { label: 'منخفضة', color: 'default' },
  normal: { label: 'عادية', color: 'info' },
  high: { label: 'عالية', color: 'warning' },
  urgent: { label: 'عاجلة', color: 'error' },
};

const CommunicationsSystem = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [communications, setCommunications] = useState([]);
  const [filteredCommunications, setFilteredCommunications] = useState([]);
  const [selectedCommunication, setSelectedCommunication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    pending: 0,
    today: 0,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // نموذج مراسلة جديدة
  const [newCommunication, setNewCommunication] = useState({
    type: 'outgoing',
    subject: '',
    content: '',
    recipientType: 'external',
    recipientName: '',
    recipientContact: '',
    department: '',
    priority: 'normal',
    category: '',
    tags: [],
    attachments: [],
    requiresApproval: false,
    requiresReply: false,
    dueDate: '',
  });

  const loadCommunications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/communications');
      setCommunications(response.data);
    } catch (error) {
      console.error('Error loading communications:', error);
      showSnackbar('خطأ في تحميل المراسلات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const loadStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/communications/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const filterCommunications = useCallback(() => {
    let filtered = [...communications];

    // تصفية حسب نوع التبويب
    if (activeTab === 1) filtered = filtered.filter(c => c.type === 'incoming');
    if (activeTab === 2) filtered = filtered.filter(c => c.type === 'outgoing');
    if (activeTab === 3) filtered = filtered.filter(c => c.type === 'internal');
    if (activeTab === 4) filtered = filtered.filter(c => c.starred);
    if (activeTab === 5) filtered = filtered.filter(c => c.status === 'archived');

    // بحث
    if (searchQuery) {
      filtered = filtered.filter(
        c =>
          c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // تصفية حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    // تصفية حسب الحالة
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // تصفية حسب الأولوية
    if (filterPriority !== 'all') {
      filtered = filtered.filter(c => c.priority === filterPriority);
    }

    setFilteredCommunications(filtered);
  }, [communications, searchQuery, filterType, filterStatus, filterPriority, activeTab]);

  useEffect(() => {
    loadCommunications();
    loadStats();
  }, [loadCommunications, loadStats]);

  useEffect(() => {
    filterCommunications();
  }, [filterCommunications]);

  const handleCreateCommunication = async () => {
    try {
      const response = await axios.post('/api/communications', newCommunication);
      setCommunications([response.data, ...communications]);
      setShowNewDialog(false);
      resetNewCommunication();
      showSnackbar('تم إنشاء المراسلة بنجاح', 'success');
      loadStats();
    } catch (error) {
      console.error('Error creating communication:', error);
      showSnackbar('خطأ في إنشاء المراسلة', 'error');
    }
  };

  const handleToggleStar = async id => {
    try {
      const communication = communications.find(c => c.id === id);
      await axios.patch(`/api/communications/${id}`, { starred: !communication.starred });
      setCommunications(communications.map(c => (c.id === id ? { ...c, starred: !c.starred } : c)));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const handleArchive = async id => {
    try {
      await axios.patch(`/api/communications/${id}`, { status: 'archived' });
      setCommunications(communications.map(c => (c.id === id ? { ...c, status: 'archived' } : c)));
      showSnackbar('تم أرشفة المراسلة', 'success');
    } catch (error) {
      console.error('Error archiving:', error);
      showSnackbar('خطأ في الأرشفة', 'error');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المراسلة؟')) return;
    try {
      await axios.delete(`/api/communications/${id}`);
      setCommunications(communications.filter(c => c.id !== id));
      showSnackbar('تم حذف المراسلة', 'success');
      loadStats();
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetNewCommunication = () => {
    setNewCommunication({
      type: 'outgoing',
      subject: '',
      content: '',
      recipientType: 'external',
      recipientName: '',
      recipientContact: '',
      department: '',
      priority: 'normal',
      category: '',
      tags: [],
      attachments: [],
      requiresApproval: false,
      requiresReply: false,
      dueDate: '',
    });
  };

  const formatDate = date => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* رأس الصفحة */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          📧 نظام الاتصالات الإدارية
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setShowNewDialog(true)}
            sx={{ mr: 1 }}
          >
            مراسلة جديدة
          </Button>
          <IconButton onClick={loadCommunications}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">إجمالي المراسلات</Typography>
              <Typography variant="h3">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">غير مقروءة</Typography>
              <Typography variant="h3">{stats.unread}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">قيد الانتظار</Typography>
              <Typography variant="h3">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">اليوم</Typography>
              <Typography variant="h3">{stats.today}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات والفلاتر */}
      <Card sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
          <Tab label="الكل" />
          <Tab label="وارد" />
          <Tab label="صادر" />
          <Tab label="داخلي" />
          <Tab label="المميزة" icon={<StarIcon />} />
          <Tab label="الأرشيف" />
        </Tabs>
      </Card>

      {/* شريط البحث والفلاتر */}
      <Card sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="بحث في المراسلات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>النوع</InputLabel>
              <Select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                label="النوع"
              >
                <MenuItem value="all">الكل</MenuItem>
                {Object.entries(COMMUNICATION_TYPES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                label="الحالة"
              >
                <MenuItem value="all">الكل</MenuItem>
                {Object.entries(COMMUNICATION_STATUS).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الأولوية</InputLabel>
              <Select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                label="الأولوية"
              >
                <MenuItem value="all">الكل</MenuItem>
                {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Chip
              label={`${filteredCommunications.length} مراسلة`}
              color="primary"
              icon={<FilterIcon />}
            />
          </Grid>
        </Grid>
      </Card>

      {/* قائمة المراسلات */}
      <Card>
        {loading && <LinearProgress />}
        <List>
          {filteredCommunications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="لا توجد مراسلات"
                secondary="ابدأ بإنشاء مراسلة جديدة"
                sx={{ textAlign: 'center', py: 4 }}
              />
            </ListItem>
          ) : (
            filteredCommunications.map((comm, index) => (
              <React.Fragment key={comm.id}>
                {index > 0 && <Divider />}
                <ListItem
                  button
                  onClick={() => setSelectedCommunication(comm)}
                  sx={{
                    bgcolor: !comm.isRead ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={comm.attachmentsCount}
                      color="primary"
                      invisible={!comm.attachmentsCount}
                    >
                      <Avatar
                        sx={{
                          bgcolor: COMMUNICATION_TYPES[comm.type]?.color + '.main' || 'grey.500',
                        }}
                      >
                        {COMMUNICATION_TYPES[comm.type]?.icon || <EmailIcon />}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: !comm.isRead ? 'bold' : 'normal', flex: 1 }}
                        >
                          {comm.subject || 'بدون موضوع'}
                        </Typography>
                        {comm.priority !== 'normal' && (
                          <Chip
                            size="small"
                            label={PRIORITY_LEVELS[comm.priority]?.label}
                            color={PRIORITY_LEVELS[comm.priority]?.color}
                          />
                        )}
                        {comm.requiresReply && (
                          <Tooltip title="يتطلب رد">
                            <ReplyIcon fontSize="small" color="warning" />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {comm.content}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={COMMUNICATION_STATUS[comm.status]?.label}
                            color={COMMUNICATION_STATUS[comm.status]?.color}
                            icon={COMMUNICATION_STATUS[comm.status]?.icon}
                          />
                          <Chip size="small" label={comm.recipientName} variant="outlined" />
                          <Chip
                            size="small"
                            label={formatDate(comm.createdAt)}
                            variant="outlined"
                          />
                          {comm.referenceNumber && (
                            <Chip
                              size="small"
                              label={`#${comm.referenceNumber}`}
                              variant="outlined"
                              color="primary"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleStar(comm.id);
                      }}
                    >
                      {comm.starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        handleArchive(comm.id);
                      }}
                    >
                      <ArchiveIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(comm.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
      </Card>

      {/* نافذة مراسلة جديدة */}
      <Dialog open={showNewDialog} onClose={() => setShowNewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>مراسلة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع المراسلة</InputLabel>
                <Select
                  value={newCommunication.type}
                  onChange={e => setNewCommunication({ ...newCommunication, type: e.target.value })}
                  label="نوع المراسلة"
                >
                  {Object.entries(COMMUNICATION_TYPES).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={newCommunication.priority}
                  onChange={e =>
                    setNewCommunication({ ...newCommunication, priority: e.target.value })
                  }
                  label="الأولوية"
                >
                  {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الموضوع"
                value={newCommunication.subject}
                onChange={e =>
                  setNewCommunication({ ...newCommunication, subject: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم المستلم"
                value={newCommunication.recipientName}
                onChange={e =>
                  setNewCommunication({ ...newCommunication, recipientName: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني / رقم الهاتف"
                value={newCommunication.recipientContact}
                onChange={e =>
                  setNewCommunication({ ...newCommunication, recipientContact: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المحتوى"
                multiline
                rows={6}
                value={newCommunication.content}
                onChange={e =>
                  setNewCommunication({ ...newCommunication, content: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateCommunication} variant="contained" startIcon={<SendIcon />}>
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar للإشعارات */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CommunicationsSystem;
