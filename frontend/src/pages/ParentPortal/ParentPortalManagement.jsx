/**
 * صفحة إدارة بوابة أولياء الأمور
 * Parent Portal Management Page
 * AlAwael ERP — للموظفين والمدراء فقط
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Avatar,
  Tooltip,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  People as PeopleIcon,
  Message as MessageIcon,
  Report as ReportIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Reply as ReplyIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import axios from 'axios';

// ─── الثوابت ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const STATUS_COLORS = {
  submitted: 'warning',
  under_review: 'info',
  in_progress: 'primary',
  resolved: 'success',
  closed: 'default',
};

const STATUS_LABELS = {
  submitted: 'مُقدَّمة',
  under_review: 'قيد المراجعة',
  in_progress: 'قيد المعالجة',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

const TYPE_LABELS = {
  complaint: 'شكوى',
  suggestion: 'اقتراح',
  inquiry: 'استفسار',
};

const TYPE_COLORS = {
  complaint: 'error',
  suggestion: 'success',
  inquiry: 'info',
};

const PRIORITY_COLORS = {
  low: 'default',
  medium: 'warning',
  high: 'error',
};

const PRIORITY_LABELS = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
};

// ─── مكوّن الإحصائيات ────────────────────────────────────────────────────────

function StatsCard({ title, value, icon, color, subtitle }) {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={`${color}.main`} mt={0.5}>
              {value ?? '—'}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Dialog تحديث الشكوى ─────────────────────────────────────────────────────

function UpdateComplaintDialog({ complaint, open, onClose, onUpdated }) {
  const [status, setStatus] = useState(complaint?.status || '');
  const [resolution, setResolution] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setResolution(complaint.resolution || '');
    }
  }, [complaint]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.put(
        `${API_BASE}/parent-portal/admin/complaints/${complaint._id}`,
        { status, resolution, response: response || undefined },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في التحديث');
    } finally {
      setLoading(false);
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>تحديث الشكوى #{complaint.ticketNumber}</span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box mb={2}>
          <Typography variant="subtitle2" mb={0.5}>
            الموضوع
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {complaint.subject}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="subtitle2" mb={0.5}>
            الوصف
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {complaint.description}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={status} onChange={e => setStatus(e.target.value)} label="الحالة">
            <MenuItem value="under_review">قيد المراجعة</MenuItem>
            <MenuItem value="in_progress">قيد المعالجة</MenuItem>
            <MenuItem value="resolved">تم الحل</MenuItem>
            <MenuItem value="closed">مغلقة</MenuItem>
          </Select>
        </FormControl>

        {status === 'resolved' && (
          <TextField
            label="قرار الحل"
            multiline
            rows={3}
            fullWidth
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="اكتب ملخصاً لكيفية معالجة الشكوى..."
          />
        )}

        <TextField
          label="رد على ولي الأمر (اختياري)"
          multiline
          rows={3}
          fullWidth
          value={response}
          onChange={e => setResponse(e.target.value)}
          placeholder="اكتب رداً يظهر لولي الأمر..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !status}
          startIcon={<SendIcon />}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ التحديث'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────────────

export default function ParentPortalManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [complaints, setComplaints] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', type: '', priority: '', search: '' });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  // ─── جلب الإحصائيات ───────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [complaintsRes, messagesRes] = await Promise.all([
        axios.get(`${API_BASE}/parent-portal/admin/complaints`, {
          headers: authHeader,
          params: { limit: 1 },
        }),
        axios.get(`${API_BASE}/parent-portal/messages`, {
          headers: authHeader,
          params: { limit: 1, direction: 'inbound' },
        }),
      ]);

      // إحصاءات حسب الحالة
      const statusCounts = { submitted: 0, in_progress: 0, resolved: 0 };
      const [sub, inprog, res] = await Promise.all([
        axios.get(`${API_BASE}/parent-portal/admin/complaints?status=submitted&limit=1`, {
          headers: authHeader,
        }),
        axios.get(`${API_BASE}/parent-portal/admin/complaints?status=in_progress&limit=1`, {
          headers: authHeader,
        }),
        axios.get(`${API_BASE}/parent-portal/admin/complaints?status=resolved&limit=1`, {
          headers: authHeader,
        }),
      ]);

      setStats({
        totalComplaints: complaintsRes.data?.pagination?.total || 0,
        totalMessages: messagesRes.data?.pagination?.total || 0,
        submitted: sub.data?.pagination?.total || 0,
        inProgress: inprog.data?.pagination?.total || 0,
        resolved: res.data?.pagination?.total || 0,
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  // ─── جلب الشكاوى ──────────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.priority) params.priority = filters.priority;

      const res = await axios.get(`${API_BASE}/parent-portal/admin/complaints`, {
        headers: authHeader,
        params,
      });
      setComplaints(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Complaints fetch error:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // ─── جلب الرسائل ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/parent-portal/messages`, {
        headers: authHeader,
        params: { page, limit: 15, direction: 'inbound' },
      });
      setMessages(res.data?.data || []);
    } catch (err) {
      console.error('Messages fetch error:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 0) fetchComplaints();
    if (activeTab === 1) fetchMessages();
  }, [activeTab, fetchComplaints, fetchMessages]);

  const handleUpdateComplaint = complaint => {
    setSelectedComplaint(complaint);
    setUpdateDialogOpen(true);
  };

  const handleUpdated = () => {
    fetchComplaints();
    fetchStats();
  };

  const formatDate = dateStr => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredComplaints = complaints.filter(c => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      c.subject?.toLowerCase().includes(q) ||
      c.ticketNumber?.toLowerCase().includes(q) ||
      c.guardianId?.nameAr?.toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* الرأس */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            إدارة بوابة أولياء الأمور
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متابعة الشكاوى والرسائل والمقترحات الواردة من أولياء الأمور
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchStats();
            if (activeTab === 0) fetchComplaints();
            else fetchMessages();
          }}
        >
          تحديث
        </Button>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="إجمالي الشكاوى"
            value={stats?.totalComplaints}
            icon={<ReportIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="مُقدَّمة / بانتظار"
            value={stats?.submitted}
            icon={<WarningIcon />}
            color="warning"
            subtitle="تحتاج معالجة"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="قيد المعالجة"
            value={stats?.inProgress}
            icon={<ScheduleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="تم الحل"
            value={stats?.resolved}
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label={
            <Badge badgeContent={stats?.submitted || 0} color="error">
              <Box sx={{ pr: 1 }}>الشكاوى والمقترحات</Box>
            </Badge>
          }
        />
        <Tab label="الرسائل الواردة" />
      </Tabs>

      {/* تبويب الشكاوى */}
      {activeTab === 0 && (
        <Box>
          {/* الفلاتر */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث برقم التذكرة أو الموضوع أو الاسم..."
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{ startAdornment: <SearchIcon sx={{ ml: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    label="الحالة"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="submitted">مُقدَّمة</MenuItem>
                    <MenuItem value="under_review">قيد المراجعة</MenuItem>
                    <MenuItem value="in_progress">قيد المعالجة</MenuItem>
                    <MenuItem value="resolved">تم الحل</MenuItem>
                    <MenuItem value="closed">مغلقة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>النوع</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    label="النوع"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="complaint">شكوى</MenuItem>
                    <MenuItem value="suggestion">اقتراح</MenuItem>
                    <MenuItem value="inquiry">استفسار</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الأولوية</InputLabel>
                  <Select
                    value={filters.priority}
                    onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    label="الأولوية"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="high">عالية</MenuItem>
                    <MenuItem value="medium">متوسطة</MenuItem>
                    <MenuItem value="low">منخفضة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setFilters({ status: '', type: '', priority: '', search: '' })}
                  startIcon={<FilterIcon />}
                >
                  مسح الفلاتر
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {loading && <LinearProgress sx={{ mb: 1 }} />}

          {/* الجدول */}
          <TableContainer component={Paper} elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    رقم التذكرة
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    ولي الأمر
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    الموضوع
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    النوع
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    الأولوية
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    الحالة
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    التاريخ
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    إجراء
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      لا توجد شكاوى مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComplaints.map(complaint => (
                    <TableRow key={complaint._id} hover>
                      <TableCell align="right">
                        <Typography variant="caption" fontFamily="monospace" fontWeight="bold">
                          {complaint.ticketNumber}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {complaint.guardianId?.nameAr || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {complaint.guardianId?.phone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={complaint.description || ''}>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {complaint.subject}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={TYPE_LABELS[complaint.type] || complaint.type}
                          color={TYPE_COLORS[complaint.type] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={PRIORITY_LABELS[complaint.priority] || complaint.priority}
                          color={PRIORITY_COLORS[complaint.priority] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={STATUS_LABELS[complaint.status] || complaint.status}
                          color={STATUS_COLORS[complaint.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(complaint.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {!['resolved', 'closed'].includes(complaint.status) && (
                          <Tooltip title="معالجة الشكوى">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleUpdateComplaint(complaint)}
                            >
                              <ReplyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {complaint.satisfactionRating && (
                          <Tooltip title={`تقييم ولي الأمر: ${complaint.satisfactionRating}/5`}>
                            <IconButton size="small" color="warning">
                              <StarIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* التنقل بين الصفحات */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Typography variant="caption" color="text.secondary">
              إجمالي: {total} شكوى
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                السابق
              </Button>
              <Typography variant="body2" sx={{ px: 2, py: 0.5 }}>
                صفحة {page}
              </Typography>
              <Button
                size="small"
                disabled={page * 15 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                التالي
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* تبويب الرسائل */}
      {activeTab === 1 && (
        <Box>
          {loading && <LinearProgress sx={{ mb: 1 }} />}
          <TableContainer component={Paper} elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    ولي الأمر
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    الموضوع
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    الرسالة
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    النوع
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    الحالة
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    التاريخ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      لا توجد رسائل واردة
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map(msg => (
                    <TableRow key={msg._id} hover>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {msg.guardianId?.nameAr || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{msg.subject || '(بدون موضوع)'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: 250,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {msg.body}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            {
                              general: 'عام',
                              appointment_request: 'طلب موعد',
                              schedule_change: 'تغيير جدول',
                              leave_request: 'طلب إجازة',
                              inquiry: 'استفسار',
                            }[msg.messageType] || msg.messageType
                          }
                          size="small"
                          variant="outlined"
                          color={msg.messageType === 'appointment_request' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={msg.isRead ? 'مقروءة' : 'جديدة'}
                          color={msg.isRead ? 'default' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(msg.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Dialog تحديث الشكوى */}
      <UpdateComplaintDialog
        complaint={selectedComplaint}
        open={updateDialogOpen}
        onClose={() => {
          setUpdateDialogOpen(false);
          setSelectedComplaint(null);
        }}
        onUpdated={handleUpdated}
      />
    </Box>
  );
}
