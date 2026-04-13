/**
 * WorkflowMyTasks — مهامي في سير العمل
 *
 * Task inbox with SLA countdown, priority indicators, filters,
 * bulk actions, complete/reassign dialogs, and overdue highlighting.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tabs,
  Tab,
  alpha,
  LinearProgress,
  InputAdornment,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as CompleteIcon,
  PlayArrow as StartIcon,
  SwapHoriz as ReassignIcon,
  Timer as SLAIcon,
  Warning as OverdueIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as RejectIcon,
  Undo as ReturnIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  assigned: 'معين',
  in_progress: 'جاري العمل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  pending: 'قيد الانتظار',
  skipped: 'تم تخطيه',
};

const STATUS_COLORS = {
  assigned: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
  pending: 'default',
  skipped: 'default',
};

const PRIORITY_CONFIG = {
  low: { label: 'منخفض', color: '#10B981' },
  medium: { label: 'متوسط', color: '#3B82F6' },
  high: { label: 'مرتفع', color: '#F59E0B' },
  urgent: { label: 'عاجل', color: '#EF4444' },
};

const slaRemaining = deadline => {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) {
    const overMs = Math.abs(diff);
    const hrs = Math.floor(overMs / 3600000);
    return {
      text: `متأخر ${hrs > 0 ? hrs + ' ساعة' : 'الآن'}`,
      color: '#EF4444',
      overdue: true,
      pct: 100,
    };
  }
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs < 2)
    return {
      text: `${hrs}:${String(mins).padStart(2, '0')}`,
      color: '#EF4444',
      overdue: false,
      pct: 85,
    };
  if (hrs < 8) return { text: `${hrs} ساعة`, color: '#F59E0B', overdue: false, pct: 60 };
  if (hrs < 24) return { text: `${hrs} ساعة`, color: '#3B82F6', overdue: false, pct: 30 };
  return { text: `${Math.floor(hrs / 24)} يوم`, color: '#10B981', overdue: false, pct: 10 };
};

const timeAgo = date => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
};

export default function WorkflowMyTasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 0, limit: 15, total: 0 });
  const [tab, setTab] = useState(0); // 0 = active, 1 = completed, 2 = all
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  // Complete dialog
  const [completeDialog, setCompleteDialog] = useState({ open: false, task: null });
  const [completeForm, setCompleteForm] = useState({ action: '', comment: '' });

  // Reassign dialog
  const [reassignDialog, setReassignDialog] = useState({ open: false, task: null });
  const [reassignForm, setReassignForm] = useState({ assigneeId: '', reason: '' });

  const fetchTasks = useCallback(async () => {
    const TAB_STATUSES = [
      'assigned,in_progress', // Active
      'completed', // Completed
      '', // All
    ];
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
      };
      const statusStr = TAB_STATUSES[tab];
      if (statusStr) params.status = statusStr;
      if (searchParams.get('overdue') === 'true') params.overdue = 'true';

      const res = await workflowService.getTasks(params);
      const d = res.data;
      setTasks(d.data || []);
      setCounts(d.counts || {});
      setPagination(prev => ({ ...prev, total: d.pagination?.total || 0 }));
    } catch {
      showSnackbar('خطأ في تحميل المهام', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, tab, searchParams, showSnackbar]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Start task
  const handleStart = async taskId => {
    try {
      await workflowService.startTask(taskId);
      showSnackbar('تم بدء العمل على المهمة', 'success');
      fetchTasks();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  // Complete task
  const handleComplete = async () => {
    if (!completeForm.action) {
      showSnackbar('يرجى اختيار الإجراء', 'warning');
      return;
    }
    try {
      await workflowService.completeTask(completeDialog.task._id, {
        action: completeForm.action,
        comment: completeForm.comment,
      });
      showSnackbar('تم إتمام المهمة بنجاح', 'success');
      setCompleteDialog({ open: false, task: null });
      setCompleteForm({ action: '', comment: '' });
      fetchTasks();
    } catch (err) {
      showSnackbar('خطأ في إتمام المهمة', 'error');
    }
  };

  // Reassign task
  const handleReassign = async () => {
    if (!reassignForm.assigneeId) {
      showSnackbar('يرجى تحديد المسؤول الجديد', 'warning');
      return;
    }
    try {
      await workflowService.reassignTask(reassignDialog.task._id, reassignForm);
      showSnackbar('تم إعادة التعيين', 'success');
      setReassignDialog({ open: false, task: null });
      setReassignForm({ assigneeId: '', reason: '' });
      fetchTasks();
    } catch {
      showSnackbar('خطأ في إعادة التعيين', 'error');
    }
  };

  // Bulk complete
  const handleBulkComplete = async () => {
    if (selected.length === 0) return;
    try {
      await workflowService.bulkCompleteTasks({
        taskIds: selected,
        action: 'approve',
        comment: 'موافقة جماعية',
      });
      showSnackbar(`تم معالجة ${selected.length} مهمة`, 'success');
      setSelected([]);
      fetchTasks();
    } catch {
      showSnackbar('خطأ في المعالجة الجماعية', 'error');
    }
  };

  const toggleSelect = id => {
    setSelected(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === tasks.length) {
      setSelected([]);
    } else {
      setSelected(tasks.map(t => t._id));
    }
  };

  // Get step actions from workflow definition embedded in task
  const getTaskActions = task => {
    const def = task.workflowInstance?.definition;
    if (!def?.steps)
      return [
        { id: 'approve', labelAr: 'موافقة', type: 'approve' },
        { id: 'reject', labelAr: 'رفض', type: 'reject' },
      ];
    const step = def.steps.find(s => s.id === task.stepId);
    return step?.taskConfig?.actions || [{ id: 'approve', labelAr: 'إتمام', type: 'approve' }];
  };

  const activeCount = (counts.assigned || 0) + (counts.in_progress || 0);
  const completedCount = counts.completed || 0;

  // Client-side search filter
  const filteredTasks = search
    ? tasks.filter(t => {
        const q = search.toLowerCase();
        return (
          (t.nameAr || '').toLowerCase().includes(q) ||
          (t.name || '').toLowerCase().includes(q) ||
          (t.workflowInstance?.definition?.nameAr || '').toLowerCase().includes(q) ||
          (t.stepId || '').toLowerCase().includes(q)
        );
      })
    : tasks;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TaskIcon color="primary" /> مهامي
            </Typography>
            <Typography variant="body2" color="text.secondary">
              صندوق المهام المعينة لك في سير العمل
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selected.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CompleteIcon />}
              onClick={handleBulkComplete}
            >
              موافقة جماعية ({selected.length})
            </Button>
          )}
          <Tooltip title="تحديث">
            <IconButton onClick={fetchTasks}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="بحث في المهام..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setPagination(p => ({ ...p, page: 0 }));
          }}
        >
          <Tab
            label={
              <Badge badgeContent={activeCount} color="primary" max={99}>
                <Box sx={{ pr: 2 }}>نشطة</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={completedCount} color="success" max={99}>
                <Box sx={{ pr: 2 }}>مكتملة</Box>
              </Badge>
            }
          />
          <Tab label="الكل" />
        </Tabs>
      </Paper>

      {/* Tasks Table */}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {tab === 0 && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={tasks.length > 0 && selected.length === tasks.length}
                      indeterminate={selected.length > 0 && selected.length < tasks.length}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell>المهمة</TableCell>
                <TableCell>سير العمل</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الأولوية</TableCell>
                <TableCell>المهلة (SLA)</TableCell>
                <TableCell>مقدم الطلب</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tab === 0 ? 9 : 8} align="center">
                    <Box sx={{ py: 6 }}>
                      <TaskIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        {tab === 0 ? 'لا توجد مهام نشطة حالياً — أحسنت!' : 'لا توجد مهام'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map(task => {
                  const sla = slaRemaining(task.sla?.deadline);
                  const priority =
                    PRIORITY_CONFIG[task.workflowInstance?.priority] || PRIORITY_CONFIG.medium;
                  const isActive = ['assigned', 'in_progress'].includes(task.status);

                  return (
                    <TableRow
                      key={task._id}
                      hover
                      sx={{
                        bgcolor: sla?.overdue ? alpha('#EF4444', 0.04) : 'inherit',
                        borderRight: sla?.overdue ? '4px solid #EF4444' : 'none',
                      }}
                    >
                      {tab === 0 && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected.includes(task._id)}
                            onChange={() => toggleSelect(task._id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {task.nameAr || task.name}
                        </Typography>
                        {task.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 200, display: 'block' }}
                          >
                            {task.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <WorkflowIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {task.workflowInstance?.definition?.nameAr || '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[task.status] || task.status}
                          color={STATUS_COLORS[task.status] || 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={priority.label}
                          sx={{
                            bgcolor: alpha(priority.color, 0.1),
                            color: priority.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {sla ? (
                          <Box>
                            <Chip
                              size="small"
                              icon={sla.overdue ? <OverdueIcon /> : <SLAIcon />}
                              label={sla.text}
                              sx={{
                                bgcolor: alpha(sla.color, 0.1),
                                color: sla.color,
                                fontWeight: 700,
                                animation: sla.overdue ? 'pulse 1.5s infinite' : 'none',
                                '@keyframes pulse': {
                                  '0%': { opacity: 1 },
                                  '50%': { opacity: 0.6 },
                                  '100%': { opacity: 1 },
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" noWrap>
                            {task.workflowInstance?.requester?.name || '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {timeAgo(task.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {isActive && (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {task.status === 'assigned' && (
                              <Tooltip title="بدء العمل">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleStart(task._id)}
                                >
                                  <StartIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="إتمام المهمة">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setCompleteDialog({ open: true, task });
                                  setCompleteForm({ action: '', comment: '' });
                                }}
                              >
                                <CompleteIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="إعادة تعيين">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setReassignDialog({ open: true, task });
                                  setReassignForm({ assigneeId: '', reason: '' });
                                }}
                              >
                                <ReassignIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        {task.status === 'completed' && (
                          <Chip
                            size="small"
                            icon={<CompleteIcon />}
                            label="مكتمل"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          onPageChange={(_, p) => setPagination(prev => ({ ...prev, page: p }))}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={e =>
            setPagination({ page: 0, limit: parseInt(e.target.value), total: pagination.total })
          }
          rowsPerPageOptions={[10, 15, 25, 50]}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </Paper>

      {/* ─── Complete Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={completeDialog.open}
        onClose={() => setCompleteDialog({ open: false, task: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          إتمام المهمة: {completeDialog.task?.nameAr || completeDialog.task?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              اختر الإجراء المطلوب لإتمام هذه المهمة
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {completeDialog.task &&
                getTaskActions(completeDialog.task).map(act => (
                  <Button
                    key={act.id}
                    variant={completeForm.action === act.id ? 'contained' : 'outlined'}
                    color={
                      act.type === 'approve'
                        ? 'success'
                        : act.type === 'reject'
                          ? 'error'
                          : 'primary'
                    }
                    startIcon={
                      act.type === 'approve' ? (
                        <ApproveIcon />
                      ) : act.type === 'reject' ? (
                        <RejectIcon />
                      ) : act.type === 'return' ? (
                        <ReturnIcon />
                      ) : (
                        <CompleteIcon />
                      )
                    }
                    onClick={() => setCompleteForm({ ...completeForm, action: act.id })}
                  >
                    {act.labelAr || act.label}
                  </Button>
                ))}
            </Box>
            <TextField
              label="التعليق"
              multiline
              rows={3}
              value={completeForm.comment}
              onChange={e => setCompleteForm({ ...completeForm, comment: e.target.value })}
              fullWidth
              placeholder="أضف تعليقاً (اختياري)..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialog({ open: false, task: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleComplete} disabled={!completeForm.action}>
            تأكيد الإتمام
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Reassign Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={reassignDialog.open}
        onClose={() => setReassignDialog({ open: false, task: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إعادة تعيين المهمة</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="معرف المسؤول الجديد"
              value={reassignForm.assigneeId}
              onChange={e => setReassignForm({ ...reassignForm, assigneeId: e.target.value })}
              fullWidth
              size="small"
              placeholder="أدخل معرف المستخدم"
            />
            <TextField
              label="السبب"
              multiline
              rows={2}
              value={reassignForm.reason}
              onChange={e => setReassignForm({ ...reassignForm, reason: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialog({ open: false, task: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleReassign}>
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
