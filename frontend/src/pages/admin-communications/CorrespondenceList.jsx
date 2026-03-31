/**
 * Correspondence List — قائمة المراسلات (الوارد / الصادر / الكل)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,  Chip,
  IconButton,
  TextField,
  InputAdornment,  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Badge,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Search,
  Refresh,
  MoreVert,
  Visibility,
  Forward,
  CheckCircle,
  Archive,
  Reply,  CallReceived,
  CallMade,
  DoneAll,  Mail,
  MailOutline,  ArrowBack,} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';
import adminCommunicationsService from '../../services/adminCommunications.service';
import {
  CORRESPONDENCE_TYPES,
  CORRESPONDENCE_STATUS,
  PRIORITY_LEVELS,} from './constants';

/* ═══ View Modes ═════════════════════════════════════════════════════════ */
const VIEW_MODES = {
  all: { title: 'جميع المراسلات', icon: <Mail />, color: '#1976d2' },
  inbox: { title: 'صندوق الوارد', icon: <CallReceived />, color: '#0288d1' },
  outbox: { title: 'صندوق الصادر', icon: <CallMade />, color: '#2e7d32' },
};

/* ═══ Main Component ════════════════════════════════════════════════════ */
export default function CorrespondenceList({ viewMode = 'all' }) {
  const navigate = useNavigate();
  const _location = useLocation();
  const [searchParams] = useSearchParams();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [_showFilters, _setShowFilters] = useState(false);

  // Context menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const modeConfig = VIEW_MODES[viewMode] || VIEW_MODES.all;

  /* ─── Load Data ────────────────────────────────────────────────────────── */
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (search) params.q = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      if (viewMode === 'inbox') {
        if (statusFilter) params.status = statusFilter;
        res = await adminCommunicationsService.getInbox(params);
      } else if (viewMode === 'outbox') {
        if (statusFilter) params.status = statusFilter;
        res = await adminCommunicationsService.getOutbox(params);
      } else {
        res = await adminCommunicationsService.search(params);
      }

      const data = res?.data;
      setItems(data?.data || []);
      setPagination(data?.pagination || { total: 0, pages: 0 });
    } catch {
      showSnackbar('خطأ في تحميل المراسلات', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, typeFilter, statusFilter, priorityFilter, viewMode, showSnackbar]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /* ─── Handlers ─────────────────────────────────────────────────────────── */
  const openMenu = (e, item) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setSelectedItem(item);
  };

  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleAction = async action => {
    closeMenu();
    if (!selectedItem) return;
    const id = selectedItem._id;

    try {
      switch (action) {
        case 'view':
          navigate(`/admin-communications/view/${id}`);
          break;
        case 'forward':
          navigate(`/admin-communications/view/${id}?action=forward`);
          break;
        case 'reply':
          navigate(`/admin-communications/compose?replyTo=${id}`);
          break;
        case 'archive':
          await adminCommunicationsService.archive(id);
          showSnackbar('تم أرشفة المراسلة بنجاح', 'success');
          loadItems();
          break;
        case 'markRead':
          await adminCommunicationsService.markAsRead(id);
          showSnackbar('تم تحديد المراسلة كمقروءة', 'success');
          loadItems();
          break;
        case 'approve':
          await adminCommunicationsService.approve(id);
          showSnackbar('تم اعتماد المراسلة', 'success');
          loadItems();
          break;
        default:
          break;
      }
    } catch {
      showSnackbar('حدث خطأ أثناء تنفيذ الإجراء', 'error');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setPage(0);
  };

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background:
            gradients?.primary || 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff',
          borderRadius: 2,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              sx={{ color: '#fff' }}
              onClick={() => navigate('/admin-communications')}
            >
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {modeConfig.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {pagination.total || 0} مراسلة
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="تحديث">
              <IconButton sx={{ color: '#fff' }} onClick={loadItems}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin-communications/compose')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              مراسلة جديدة
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── Filters ─────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="بحث في المراسلات..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>النوع</InputLabel>
            <Select
              value={typeFilter}
              label="النوع"
              onChange={e => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(CORRESPONDENCE_TYPES).map(([key, val]) => (
                <MenuItem key={key} value={key}>
                  {val.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(CORRESPONDENCE_STATUS).map(([key, val]) => (
                <MenuItem key={key} value={key}>
                  {val.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={priorityFilter}
              label="الأولوية"
              onChange={e => {
                setPriorityFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(PRIORITY_LEVELS).map(([key, val]) => (
                <MenuItem key={key} value={key}>
                  {val.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {(search || typeFilter || statusFilter || priorityFilter) && (
            <Button size="small" onClick={resetFilters} color="inherit">
              مسح التصفية
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── Table ───────────────────────────────────────────── */}
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell width={50} />
                <TableCell sx={{ fontWeight: 'bold' }}>الرقم المرجعي</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الموضوع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {viewMode === 'outbox' ? 'المستلم' : 'المرسل'}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <MailOutline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      لا توجد مراسلات
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/admin-communications/compose')}
                    >
                      إنشاء مراسلة جديدة
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => {
                  const isIncoming =
                    item.type === 'incoming' || item.correspondenceType === 'incoming';
                  const typeConfig = CORRESPONDENCE_TYPES[item.type || item.correspondenceType] || {};
                  const statusConfig = CORRESPONDENCE_STATUS[item.status] || {};
                  const priorityConfig = PRIORITY_LEVELS[item.priority] || {};
                  const isUnread = !item.readAt && isIncoming;

                  return (
                    <TableRow
                      key={item._id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isUnread ? '#f5f9ff' : 'inherit',
                        fontWeight: isUnread ? 'bold' : 'normal',
                        '&:hover': { bgcolor: '#f0f7ff' },
                      }}
                      onClick={() => navigate(`/admin-communications/view/${item._id}`)}
                    >
                      <TableCell>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: typeConfig.bg || '#e3f2fd',
                            color: typeConfig.color || '#1976d2',
                          }}
                        >
                          {isIncoming ? (
                            <CallReceived fontSize="small" />
                          ) : (
                            <CallMade fontSize="small" />
                          )}
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={isUnread ? 'bold' : 'normal'}>
                          {item.referenceNumber || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={isUnread ? 'bold' : 'normal'}
                          noWrap
                          sx={{ maxWidth: 250 }}
                        >
                          {isUnread && (
                            <Badge
                              color="primary"
                              variant="dot"
                              sx={{ mr: 1 }}
                            />
                          )}
                          {item.subject || 'بدون عنوان'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {viewMode === 'outbox'
                            ? item.recipients?.[0]?.entityId?.nameAr ||
                              item.recipients?.[0]?.entityId?.name ||
                              item.receiverName ||
                              '-'
                            : item.sender?.entityId?.nameAr ||
                              item.sender?.entityId?.name ||
                              item.senderName ||
                              '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeConfig.label || item.type || '-'}
                          size="small"
                          sx={{
                            bgcolor: typeConfig.bg,
                            color: typeConfig.color,
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={priorityConfig.label || item.priority || '-'}
                          size="small"
                          color={priorityConfig.chipColor || 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusConfig.label || item.status || '-'}
                          size="small"
                          color={statusConfig.color || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('ar-SA')
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={e => openMenu(e, item)}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
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
          count={pagination.total || 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 15, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </Paper>

      {/* ── Context Menu ────────────────────────────────────── */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={() => handleAction('view')}>
          <Visibility fontSize="small" sx={{ mr: 1 }} /> عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={() => handleAction('markRead')}>
          <DoneAll fontSize="small" sx={{ mr: 1 }} /> تحديد كمقروء
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('forward')}>
          <Forward fontSize="small" sx={{ mr: 1 }} /> تحويل
        </MenuItem>
        <MenuItem onClick={() => handleAction('reply')}>
          <Reply fontSize="small" sx={{ mr: 1 }} /> رد
        </MenuItem>
        <MenuItem onClick={() => handleAction('approve')}>
          <CheckCircle fontSize="small" sx={{ mr: 1 }} /> اعتماد
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('archive')}>
          <Archive fontSize="small" sx={{ mr: 1 }} /> أرشفة
        </MenuItem>
      </Menu>
    </Box>
  );
}
