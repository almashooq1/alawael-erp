/**
 * WorkflowInstances — قائمة نسخ سير العمل
 *
 * List all workflow instances with status tabs, search,
 * pagination, and navigation to instance detail.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import StartIcon from '@mui/icons-material/Start';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { ViewIcon } from 'utils/iconAliases';

// ─── Constants ──────────────────────────────────────────────────────────────
const INSTANCE_STATUS = {
  running: { label: 'جارٍ', color: 'info', icon: <RunningIcon sx={{ fontSize: 16 }} /> },
  completed: { label: 'مكتمل', color: 'success', icon: <CompleteIcon sx={{ fontSize: 16 }} /> },
  cancelled: { label: 'ملغي', color: 'error', icon: <CancelIcon sx={{ fontSize: 16 }} /> },
  suspended: { label: 'معلّق', color: 'warning', icon: <SuspendIcon sx={{ fontSize: 16 }} /> },
  error: { label: 'خطأ', color: 'error', icon: <ErrorIcon sx={{ fontSize: 16 }} /> },
};

const TAB_STATUSES = ['', 'running', 'completed', 'cancelled,suspended'];

const fmtDate = d =>
  d
    ? new Date(d).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function WorkflowInstances() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 0, limit: 15, total: 0 });

  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
      };
      if (TAB_STATUSES[tab]) params.status = TAB_STATUSES[tab];

      const res = await workflowService.getInstances(params);
      const d = res.data;
      setInstances(d.data || []);
      setPagination(prev => ({ ...prev, total: d.pagination?.total || 0 }));
    } catch {
      showSnackbar('خطأ في تحميل النسخ', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, tab, showSnackbar]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // Client-side search filter
  const filtered = search
    ? instances.filter(inst => {
        const q = search.toLowerCase();
        return (
          (inst.definition?.nameAr || '').toLowerCase().includes(q) ||
          (inst.definition?.name || '').toLowerCase().includes(q) ||
          (inst.title || '').toLowerCase().includes(q) ||
          (inst._id || '').toLowerCase().includes(q)
        );
      })
    : instances;

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
              <WorkflowIcon color="primary" /> نسخ سير العمل
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جميع النسخ المنفذة من تعريفات سير العمل
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<StartIcon />}
            onClick={() => navigate('/workflow')}
          >
            بدء سير عمل جديد
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchInstances}>
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
          placeholder="بحث في النسخ..."
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
          <Tab label="الكل" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <RunningIcon sx={{ fontSize: 16 }} /> جارٍ
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CompleteIcon sx={{ fontSize: 16 }} /> مكتمل
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SuspendIcon sx={{ fontSize: 16 }} /> ملغي / معلّق
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Table */}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>سير العمل</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الخطوة الحالية</TableCell>
                <TableCell>تاريخ البدء</TableCell>
                <TableCell>تاريخ الإتمام</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 6 }}>
                      <WorkflowIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">لا توجد نسخ</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(inst => {
                  const statusCfg = INSTANCE_STATUS[inst.status] || INSTANCE_STATUS.running;

                  return (
                    <TableRow
                      key={inst._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/workflow/instances/${inst._id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: alpha('#3B82F6', 0.1),
                              color: '#3B82F6',
                            }}
                          >
                            <WorkflowIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {inst.definition?.nameAr ||
                                inst.definition?.name ||
                                inst.title ||
                                'سير عمل'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {inst.definition?.code || inst._id?.slice(-8)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={statusCfg.icon}
                          label={statusCfg.label}
                          color={statusCfg.color}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {inst.currentStep || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {fmtDate(inst.startedAt || inst.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fmtDate(inst.completedAt)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض التفاصيل">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/workflow/instances/${inst._id}`);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
            setPagination(prev => ({ ...prev, limit: parseInt(e.target.value, 10), page: 0 }))
          }
          rowsPerPageOptions={[10, 15, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </Paper>
    </Box>
  );
}
