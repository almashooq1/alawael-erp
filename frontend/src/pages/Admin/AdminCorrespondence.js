import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import administrationService from '../../services/administration.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Search,
  Refresh,
  Mail,
  MailOutline,
  MoreVert,
  Visibility,
  Forward,
  CheckCircle,
  Archive,
  Reply,
  AddTask,
  ArrowBack,
  CallReceived,
  CallMade,
  WarningAmber,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const statusConfig = {
  received: { label: 'مستلم', color: 'info' },
  under_processing: { label: 'قيد المعالجة', color: 'warning' },
  forwarded: { label: 'محوّل', color: 'info' },
  pending_reply: { label: 'بانتظار الرد', color: 'warning' },
  replied: { label: 'تم الرد', color: 'success' },
  completed: { label: 'مكتمل', color: 'success' },
  archived: { label: 'مؤرشف', color: 'default' },
  returned: { label: 'مُعاد', color: 'error' },
};

const typeLabels = {
  letter: 'خطاب',
  fax: 'فاكس',
  email: 'بريد إلكتروني',
  report: 'تقرير',
  invoice: 'فاتورة',
  contract: 'عقد',
  complaint: 'شكوى',
  request: 'طلب',
  notification: 'إشعار',
  other: 'أخرى',
};

const categoryLabels = {
  administrative: 'إداري',
  financial: 'مالي',
  medical: 'طبي',
  legal: 'قانوني',
  hr: 'موارد بشرية',
  academic: 'أكاديمي',
  technical: 'تقني',
  general: 'عام',
};

const priorityLabels = { low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' };
const priorityColors = { low: 'default', normal: 'info', high: 'warning', urgent: 'error' };

const directionTabs = [
  { value: '', label: 'الكل' },
  { value: 'incoming', label: 'وارد' },
  { value: 'outgoing', label: 'صادر' },
];

const statusTabs = [
  { value: '', label: 'الكل' },
  { value: 'received', label: 'مستلم' },
  { value: 'under_processing', label: 'قيد المعالجة' },
  { value: 'forwarded', label: 'محوّل' },
  { value: 'pending_reply', label: 'بانتظار الرد' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'archived', label: 'مؤرشف' },
];

const departmentOptions = [
  'الإدارة العامة',
  'الموارد البشرية',
  'المالية',
  'تقنية المعلومات',
  'الشؤون الطبية',
  'التأهيل',
  'التعليم',
  'الشؤون القانونية',
  'العلاقات العامة',
  'المشتريات',
  'الصيانة',
  'الجودة',
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminCorrespondence() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [directionFilter, setDirectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selected, setSelected] = useState(null);

  /* dialogs */
  const [createDialog, setCreateDialog] = useState(false);
  const [forwardDialog, setForwardDialog] = useState(false);
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [newForm, setNewForm] = useState({
    direction: 'incoming',
    correspondenceType: 'letter',
    subject: '',
    senderName: '',
    senderOrganization: '',
    receiverName: '',
    receiverDepartment: '',
    category: 'administrative',
    priority: 'normal',
    body: '',
  });
  const [forwardForm, setForwardForm] = useState({ toDepartment: '', toName: '', notes: '' });
  const [followUpForm, setFollowUpForm] = useState({ note: '', dueDate: '', assignedToName: '' });

  /* ─── Load ──────────────────────────────────────────────────────────────── */
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (directionFilter) params.direction = directionFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await administrationService.getCorrespondence(params);
      if (res?.data?.data) {
        setItems(res.data.data);
        setPagination(res.data.pagination || {});
      }
    } catch {
      showSnackbar('خطأ في تحميل المراسلات', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, directionFilter, statusFilter, search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /* ─── Context menu ──────────────────────────────────────────────────────── */
  const openMenu = (e, item) => {
    setAnchorEl(e.currentTarget);
    setSelected(item);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleQuickAction = async action => {
    closeMenu();
    if (!selected) return;
    try {
      switch (action) {
        case 'complete':
          await administrationService.completeCorrespondence(selected._id, {});
          showSnackbar('تم إكمال المراسلة', 'success');
          loadItems();
          break;
        case 'archive':
          await administrationService.archiveCorrespondence(selected._id);
          showSnackbar('تم الأرشفة', 'success');
          loadItems();
          break;
        case 'forward':
          setForwardDialog(true);
          return;
        case 'follow-up':
          setFollowUpDialog(true);
          return;
        default:
          break;
      }
    } catch {
      showSnackbar('خطأ في تنفيذ العملية', 'error');
    }
  };

  /* ─── Create ────────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newForm.subject.trim()) {
      showSnackbar('يرجى إدخال الموضوع', 'error');
      return;
    }
    try {
      await administrationService.createCorrespondence(newForm);
      showSnackbar('تم إنشاء المراسلة', 'success');
      setCreateDialog(false);
      setNewForm({
        direction: 'incoming',
        correspondenceType: 'letter',
        subject: '',
        senderName: '',
        senderOrganization: '',
        receiverName: '',
        receiverDepartment: '',
        category: 'administrative',
        priority: 'normal',
        body: '',
      });
      loadItems();
    } catch {
      showSnackbar('خطأ في إنشاء المراسلة', 'error');
    }
  };

  /* ─── Forward ───────────────────────────────────────────────────────────── */
  const handleForward = async () => {
    if (!selected) return;
    try {
      await administrationService.forwardCorrespondence(selected._id, forwardForm);
      showSnackbar('تم تحويل المراسلة', 'success');
      setForwardDialog(false);
      setForwardForm({ toDepartment: '', toName: '', notes: '' });
      setSelected(null);
      loadItems();
    } catch {
      showSnackbar('خطأ في تحويل المراسلة', 'error');
    }
  };

  /* ─── Follow-up ─────────────────────────────────────────────────────────── */
  const handleFollowUp = async () => {
    if (!selected) return;
    try {
      await administrationService.addFollowUp(selected._id, followUpForm);
      showSnackbar('تم إضافة المتابعة', 'success');
      setFollowUpDialog(false);
      setFollowUpForm({ note: '', dueDate: '', assignedToName: '' });
      setSelected(null);
      loadItems();
    } catch {
      showSnackbar('خطأ في إضافة المتابعة', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/administration')} sx={{ color: 'white' }}>
              <ArrowBack />
            </IconButton>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Mail sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                المراسلات
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                تتبع المراسلات الواردة والصادرة
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
            sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            مراسلة جديدة
          </Button>
        </Box>
      </Box>

      {/* ─── Direction tabs ──────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 2 }}>
        <Tabs
          value={directionFilter}
          onChange={(_, v) => {
            setDirectionFilter(v);
            setPage(0);
          }}
        >
          {directionTabs.map(t => (
            <Tab
              key={t.value}
              value={t.value}
              label={t.label}
              icon={
                t.value === 'incoming' ? (
                  <CallReceived />
                ) : t.value === 'outgoing' ? (
                  <CallMade />
                ) : undefined
              }
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              {statusTabs.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="تحديث">
            <IconButton onClick={loadItems}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <MailOutline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">لا توجد مراسلات</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الرقم المرجعي</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاتجاه</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الموضوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المرسل/المستلم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(item => {
                    const sc = statusConfig[item.status] || statusConfig.received;
                    const pc = priorityColors[item.priority] || 'default';
                    const isOverdue =
                      item.dueDate &&
                      new Date(item.dueDate) < new Date() &&
                      !['completed', 'archived'].includes(item.status);
                    return (
                      <TableRow
                        key={item._id}
                        hover
                        sx={{ cursor: 'pointer', bgcolor: isOverdue ? 'error.50' : undefined }}
                        onClick={() => navigate(`/administration/correspondence/${item._id}`)}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                          >
                            {item.referenceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.direction === 'incoming' ? 'وارد' : 'صادر'}
                            size="small"
                            icon={item.direction === 'incoming' ? <CallReceived /> : <CallMade />}
                            color={item.direction === 'incoming' ? 'info' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {typeLabels[item.correspondenceType] || item.correspondenceType}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isOverdue && (
                              <WarningAmber sx={{ fontSize: 16, color: 'error.main' }} />
                            )}
                            <Typography fontWeight="600" noWrap sx={{ maxWidth: 220 }}>
                              {item.subject}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item.direction === 'incoming'
                            ? item.senderName || item.senderOrganization || '—'
                            : item.receiverName || item.receiverDepartment || '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={priorityLabels[item.priority] || item.priority}
                            size="small"
                            color={pc}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" />
                        </TableCell>
                        <TableCell>
                          {item.receivedDate || item.sentDate || item.createdAt
                            ? new Date(
                                item.receivedDate || item.sentDate || item.createdAt
                              ).toLocaleDateString('ar-SA')
                            : '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <IconButton size="small" onClick={e => openMenu(e, item)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={pagination.total || 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              labelRowsPerPage="عدد الصفوف:"
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* ─── Context Menu ────────────────────────────────────────────────── */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu();
            if (selected) navigate(`/administration/correspondence/${selected._id}`);
          }}
        >
          <Visibility sx={{ ml: 1 }} /> عرض التفاصيل
        </MenuItem>
        {selected && !['completed', 'archived'].includes(selected.status) && (
          <MenuItem onClick={() => handleQuickAction('forward')}>
            <Forward sx={{ ml: 1, color: 'info.main' }} /> تحويل
          </MenuItem>
        )}
        {selected && !['completed', 'archived'].includes(selected.status) && (
          <MenuItem onClick={() => handleQuickAction('follow-up')}>
            <AddTask sx={{ ml: 1, color: 'warning.main' }} /> إضافة متابعة
          </MenuItem>
        )}
        {selected && !['completed', 'archived'].includes(selected.status) && (
          <MenuItem onClick={() => handleQuickAction('complete')}>
            <CheckCircle sx={{ ml: 1, color: 'success.main' }} /> إكمال
          </MenuItem>
        )}
        {selected && selected.status !== 'archived' && (
          <MenuItem onClick={() => handleQuickAction('archive')}>
            <Archive sx={{ ml: 1 }} /> أرشفة
          </MenuItem>
        )}
      </Menu>

      {/* ─── Create Dialog ───────────────────────────────────────────────── */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>مراسلة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الاتجاه</InputLabel>
                <Select
                  value={newForm.direction}
                  label="الاتجاه"
                  onChange={e => setNewForm(p => ({ ...p, direction: e.target.value }))}
                >
                  <MenuItem value="incoming">وارد</MenuItem>
                  <MenuItem value="outgoing">صادر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  value={newForm.correspondenceType}
                  label="النوع"
                  onChange={e => setNewForm(p => ({ ...p, correspondenceType: e.target.value }))}
                >
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="الموضوع *"
                value={newForm.subject}
                onChange={e => setNewForm(p => ({ ...p, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المرسل"
                value={newForm.senderName}
                onChange={e => setNewForm(p => ({ ...p, senderName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="جهة المرسل"
                value={newForm.senderOrganization}
                onChange={e => setNewForm(p => ({ ...p, senderOrganization: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المستلم"
                value={newForm.receiverName}
                onChange={e => setNewForm(p => ({ ...p, receiverName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>قسم المستلم</InputLabel>
                <Select
                  value={newForm.receiverDepartment}
                  label="قسم المستلم"
                  onChange={e => setNewForm(p => ({ ...p, receiverDepartment: e.target.value }))}
                >
                  {departmentOptions.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={newForm.category}
                  label="التصنيف"
                  onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={newForm.priority}
                  label="الأولوية"
                  onChange={e => setNewForm(p => ({ ...p, priority: e.target.value }))}
                >
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="المحتوى"
                value={newForm.body}
                multiline
                rows={4}
                onChange={e => setNewForm(p => ({ ...p, body: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Forward Dialog ──────────────────────────────────────────────── */}
      <Dialog open={forwardDialog} onClose={() => setForwardDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تحويل المراسلة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>القسم المستلم</InputLabel>
                <Select
                  value={forwardForm.toDepartment}
                  label="القسم المستلم"
                  onChange={e => setForwardForm(p => ({ ...p, toDepartment: e.target.value }))}
                >
                  {departmentOptions.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="اسم المستلم"
                value={forwardForm.toName}
                onChange={e => setForwardForm(p => ({ ...p, toName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="ملاحظات"
                value={forwardForm.notes}
                multiline
                rows={2}
                onChange={e => setForwardForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleForward}>
            تحويل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Follow-up Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={followUpDialog}
        onClose={() => setFollowUpDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة متابعة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="ملاحظة المتابعة *"
                value={followUpForm.note}
                multiline
                rows={2}
                onChange={e => setFollowUpForm(p => ({ ...p, note: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ الاستحقاق"
                type="date"
                value={followUpForm.dueDate}
                onChange={e => setFollowUpForm(p => ({ ...p, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="المسؤول عن المتابعة"
                value={followUpForm.assignedToName}
                onChange={e => setFollowUpForm(p => ({ ...p, assignedToName: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleFollowUp} disabled={!followUpForm.note.trim()}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
